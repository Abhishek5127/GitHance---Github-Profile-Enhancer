import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import {
  DEFAULT_MAX_FINDINGS_RETURNED,
  isLikelyTextContent,
} from "@/app/lib/security/config";
import {
  JS_TS_SINK_CATALOG,
  NON_JS_SINK_CATALOG,
  SEVERITY_WEIGHTS,
  SUPPORTED_SEMANTIC_LANGUAGES,
  VULNERABILITY_DEFINITIONS,
  normalizeLanguage,
  severityRank,
} from "@/app/lib/security/rules";
import { isLikelyThirdPartyCode } from "@/app/lib/security/thirdPartySignatures";

const traverse = traverseModule.default || traverseModule;

const PREVIEW_CONTEXT_BEFORE = 4;
const PREVIEW_CONTEXT_AFTER = 4;
const MAX_PREVIEW_LINES = 20;
const MAX_DEPTH = 8;
const REQUEST_ROOTS = new Set(["req", "request", "ctx", "context"]);
const REQUEST_FIELDS = new Set([
  "query",
  "body",
  "params",
  "headers",
  "cookies",
  "files",
  "request",
]);
const GLOBAL_OBJECTS = new Set(["console", "Math", "process", "JSON"]);
const GLOBAL_FUNCTIONS = new Set(["eval", "Function", "setTimeout", "setInterval"]);
const SENSITIVE_NAME =
  /(password|passwd|token|secret|api[_-]?key|authorization|private[_-]?key|client[_-]?secret|access[_-]?key)/i;
const SECURITY_CONTEXT = /(token|secret|nonce|otp|session|auth|password|key)/i;
const WEAK_HASH = /^(md5|sha1|sha-1)$/i;
const PLACEHOLDER_SECRET =
  /^(changeme|change-me|example|sample|dummy|test|password|secret|token|your[_-]?key|xxxx+|<.*>)$/i;

const DANGEROUS_METHOD_TO_VULN = (() => {
  const out = new Map();
  for (const [vulnId, sinks] of Object.entries(JS_TS_SINK_CATALOG)) {
    for (const sink of sinks || []) {
      if (sink.global) out.set(sink.global, vulnId);
      for (const member of sink.members || []) {
        if (!out.has(member)) out.set(member, vulnId);
      }
    }
  }
  return out;
})();

function toTitleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .map((token) =>
      token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : ""
    )
    .join(" ")
    .trim();
}

function confidenceRank(confidence) {
  const normalized = String(confidence || "").toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
}

function mergeSeverity(current, incoming) {
  return severityRank(incoming) > severityRank(current) ? incoming : current;
}

function mergeConfidence(current, incoming) {
  return confidenceRank(incoming) > confidenceRank(current) ? incoming : current;
}

function normalizeModuleName(value) {
  return String(value || "").trim().toLowerCase();
}

function getStaticPropertyName(node) {
  if (!node) return null;
  if (node.computed) {
    if (node.property?.type === "StringLiteral") return node.property.value;
    return null;
  }
  if (node.property?.type === "Identifier") return node.property.name;
  return null;
}

function getMemberChain(node) {
  const chain = [];
  let current = node;
  while (current) {
    if (current.type === "Identifier") {
      chain.unshift(current.name);
      return chain;
    }
    if (current.type === "MemberExpression" || current.type === "OptionalMemberExpression") {
      const name = getStaticPropertyName(current);
      if (!name) return null;
      chain.unshift(name);
      current = current.object;
      continue;
    }
    return null;
  }
  return null;
}

function getNodeText(content, node, max = 220) {
  if (!node || node.start == null || node.end == null) return "";
  return String(content || "")
    .slice(node.start, node.end)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function buildCodeBlock(lines, lineStart, lineEnd) {
  const startLine = Math.max(1, Number(lineStart) || 1);
  const endLine = Math.max(startLine, Number(lineEnd) || startLine);
  const totalLines = lines.length;
  let start = Math.max(1, startLine - PREVIEW_CONTEXT_BEFORE);
  let end = Math.min(totalLines, endLine + PREVIEW_CONTEXT_AFTER);
  if (end - start + 1 > MAX_PREVIEW_LINES) {
    end = Math.min(totalLines, start + MAX_PREVIEW_LINES - 1);
  }
  const rendered = [];
  for (let line = start; line <= end; line += 1) {
    const marker = line >= startLine && line <= endLine ? ">" : " ";
    rendered.push(`${marker} ${String(line).padStart(4, " ")} | ${lines[line - 1] ?? ""}`);
  }
  return rendered.join("\n");
}

function bindingKey(scope, name) {
  const binding = scope?.getBinding?.(name);
  if (binding?.identifier?.start != null && binding?.identifier?.end != null) {
    return `${binding.identifier.start}:${binding.identifier.end}:${name}`;
  }
  return `global:${name}`;
}

function literalString(node) {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((item) => item.value?.cooked || "").join("");
  }
  return "";
}

function isRequestChain(chain) {
  return (
    Array.isArray(chain) &&
    chain.length >= 2 &&
    REQUEST_ROOTS.has(chain[0]) &&
    REQUEST_FIELDS.has(chain[1])
  );
}

function isEnvChain(chain) {
  return Array.isArray(chain) && chain.length >= 2 && chain[0] === "process" && chain[1] === "env";
}

function traceRank(kind) {
  if (kind === "confirmed") return 3;
  if (kind === "partial") return 2;
  return 1;
}

function mergeTrace(a, b) {
  const left = a || { kind: "none", sources: [] };
  const right = b || { kind: "none", sources: [] };
  const kind = traceRank(left.kind) >= traceRank(right.kind) ? left.kind : right.kind;
  const map = new Map();
  for (const source of [...(left.sources || []), ...(right.sources || [])]) {
    const key = `${source.label}|${source.type}|${source.line || 0}`;
    map.set(key, source);
  }
  return { kind, sources: Array.from(map.values()) };
}

function makeTrace(kind, label, line, type) {
  return { kind, sources: [{ label, line: Number(line || 0), type }] };
}

function traceExpression(node, scope, state, depth = 0) {
  if (!node || depth > MAX_DEPTH) return { kind: "none", sources: [] };

  if (node.type === "Identifier") {
    return state.taint.get(bindingKey(scope, node.name)) || { kind: "none", sources: [] };
  }

  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    const chain = getMemberChain(node);
    if (isRequestChain(chain)) {
      return makeTrace("confirmed", chain.join("."), node.loc?.start?.line, "user_input");
    }
    if (isEnvChain(chain)) {
      return makeTrace("partial", chain.join("."), node.loc?.start?.line, "environment");
    }
    const objectTrace = traceExpression(node.object, scope, state, depth + 1);
    if (node.computed) {
      return mergeTrace(objectTrace, traceExpression(node.property, scope, state, depth + 1));
    }
    return objectTrace;
  }

  if (node.type === "TemplateLiteral") {
    return (node.expressions || []).reduce(
      (acc, expression) => mergeTrace(acc, traceExpression(expression, scope, state, depth + 1)),
      { kind: "none", sources: [] }
    );
  }

  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    return mergeTrace(
      traceExpression(node.left, scope, state, depth + 1),
      traceExpression(node.right, scope, state, depth + 1)
    );
  }

  if (node.type === "ConditionalExpression") {
    return mergeTrace(
      traceExpression(node.consequent, scope, state, depth + 1),
      traceExpression(node.alternate, scope, state, depth + 1)
    );
  }

  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    const chain = getMemberChain(node.callee);
    if (Array.isArray(chain) && chain[0] === "fetch") {
      return makeTrace("partial", "fetch(...) result", node.loc?.start?.line, "external_api");
    }
    return (node.arguments || []).reduce(
      (acc, arg) => mergeTrace(acc, traceExpression(arg, scope, state, depth + 1)),
      { kind: "none", sources: [] }
    );
  }

  if (node.type === "ArrayExpression") {
    return (node.elements || []).reduce(
      (acc, item) => mergeTrace(acc, traceExpression(item, scope, state, depth + 1)),
      { kind: "none", sources: [] }
    );
  }

  if (node.type === "ObjectExpression") {
    return (node.properties || []).reduce((acc, property) => {
      if (property?.type === "ObjectProperty") {
        return mergeTrace(acc, traceExpression(property.value, scope, state, depth + 1));
      }
      if (property?.type === "SpreadElement") {
        return mergeTrace(acc, traceExpression(property.argument, scope, state, depth + 1));
      }
      return acc;
    }, { kind: "none", sources: [] });
  }

  if (node.type === "AwaitExpression") return traceExpression(node.argument, scope, state, depth + 1);
  if (node.type === "TSAsExpression") return traceExpression(node.expression, scope, state, depth + 1);
  return { kind: "none", sources: [] };
}

function flattenPattern(pattern, acc = []) {
  if (!pattern) return acc;
  if (pattern.type === "Identifier") {
    acc.push(pattern.name);
    return acc;
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties || []) {
      if (property?.type === "ObjectProperty") flattenPattern(property.value, acc);
      if (property?.type === "RestElement") flattenPattern(property.argument, acc);
    }
  }
  if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements || []) flattenPattern(element, acc);
  }
  if (pattern.type === "AssignmentPattern") flattenPattern(pattern.left, acc);
  if (pattern.type === "RestElement") flattenPattern(pattern.argument, acc);
  return acc;
}

function setImport(state, scope, local, data) {
  if (!local) return;
  state.imports.set(bindingKey(scope, local), { ...data, local });
}

function getImport(state, scope, name) {
  return state.imports.get(bindingKey(scope, name)) || null;
}

function resolveCallee(callee, scope, state) {
  const calleeText = getNodeText(state.content, callee);
  if (callee?.type === "Identifier") {
    const imp = getImport(state, scope, callee.name);
    if (imp) {
      const memberName = imp.imported && imp.imported !== "default" ? imp.imported : callee.name;
      return {
        calleeText,
        fullyQualifiedFunction: `${imp.module}.${memberName}`,
        resolvedModuleSource: imp.module,
        importVerified: true,
        memberName,
        rootName: callee.name,
        unresolvedReason: null,
      };
    }
    if (GLOBAL_FUNCTIONS.has(callee.name)) {
      return {
        calleeText,
        fullyQualifiedFunction: `global.${callee.name}`,
        resolvedModuleSource: "global",
        importVerified: true,
        memberName: callee.name,
        rootName: callee.name,
        unresolvedReason: null,
      };
    }
    return {
      calleeText,
      fullyQualifiedFunction: `unresolved.${callee.name}`,
      resolvedModuleSource: "unresolved",
      importVerified: false,
      memberName: callee.name,
      rootName: callee.name,
      unresolvedReason: "Unresolved call - insufficient context",
    };
  }

  if (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") {
    const chain = getMemberChain(callee);
    if (!chain || chain.length === 0) {
      return {
        calleeText,
        fullyQualifiedFunction: "unresolved.dynamic_member_call",
        resolvedModuleSource: "unresolved",
        importVerified: false,
        memberName: null,
        rootName: null,
        unresolvedReason: "Dynamic member call cannot be resolved",
      };
    }

    const root = chain[0];
    const memberName = chain[chain.length - 1];
    const imp = getImport(state, scope, root);
    if (imp) {
      return {
        calleeText,
        fullyQualifiedFunction: `${imp.module}.${chain.slice(1).join(".") || imp.imported || memberName}`,
        resolvedModuleSource: imp.module,
        importVerified: true,
        memberName,
        rootName: root,
        unresolvedReason: null,
      };
    }
    if (GLOBAL_OBJECTS.has(root)) {
      return {
        calleeText,
        fullyQualifiedFunction: `global.${chain.join(".")}`,
        resolvedModuleSource: "global",
        importVerified: true,
        memberName,
        rootName: root,
        unresolvedReason: null,
      };
    }
    return {
      calleeText,
      fullyQualifiedFunction: `unresolved.${chain.join(".")}`,
      resolvedModuleSource: "unresolved",
      importVerified: false,
      memberName,
      rootName: root,
      unresolvedReason: "Unresolved object ownership",
    };
  }

  return {
    calleeText,
    fullyQualifiedFunction: "unresolved.call",
    resolvedModuleSource: "unresolved",
    importVerified: false,
    memberName: null,
    rootName: null,
    unresolvedReason: "Unsupported callee type",
  };
}

function sinkMatch(callInfo, sink) {
  if (sink.module) {
    if (!callInfo.importVerified) return false;
    if (normalizeModuleName(sink.module) !== normalizeModuleName(callInfo.resolvedModuleSource))
      return false;
    return (sink.members || []).includes(callInfo.memberName);
  }
  if (sink.global) {
    return (
      callInfo.importVerified &&
      callInfo.resolvedModuleSource === "global" &&
      callInfo.memberName === sink.global
    );
  }
  if (sink.globalObject) {
    return (
      callInfo.importVerified &&
      callInfo.resolvedModuleSource === "global" &&
      callInfo.rootName === sink.globalObject &&
      (sink.members || []).includes(callInfo.memberName)
    );
  }
  return false;
}

function matchedVulns(callInfo) {
  return Object.entries(JS_TS_SINK_CATALOG)
    .filter(([, sinks]) => (sinks || []).some((sink) => sinkMatch(callInfo, sink)))
    .map(([id]) => id);
}

function severityFromTrace(kind, options = {}) {
  if (kind === "confirmed") {
    return {
      severity: options.allowCritical === false ? "high" : "critical",
      confidence: "high",
      sourceToSinkDetected: true,
      flowStatus: "confirmed",
      needsManualReview: false,
      confidenceReason: "Confirmed source-to-sink flow from external input.",
    };
  }
  if (kind === "partial") {
    return {
      severity: "high",
      confidence: "medium",
      sourceToSinkDetected: false,
      flowStatus: "partial",
      needsManualReview: true,
      confidenceReason: "Partial input trace detected; manual validation needed.",
    };
  }
  return {
    severity: options.defaultNoFlowSeverity || "medium",
    confidence: "low",
    sourceToSinkDetected: false,
    flowStatus: "none",
    needsManualReview: true,
    confidenceReason: "Sink confirmed but no explicit source-to-sink flow detected.",
  };
}

function sourceSummary(trace) {
  return (trace.sources || [])
    .slice(0, 4)
    .map((source) => `${source.label} (${source.type}${source.line ? ` line ${source.line}` : ""})`)
    .join("; ");
}

function sanitizeMatch(vulnId, value) {
  if (vulnId === "hardcoded_secret") return "[REDACTED_SECRET_LITERAL]";
  return String(value || "").slice(0, 220);
}

function sanitizeBlock(vulnId, block) {
  if (vulnId === "hardcoded_secret") return "Sensitive value redacted in preview.";
  return block;
}

function addFinding(state, finding) {
  const key = `${finding.rootCausePattern}|${finding.filePath}|${finding.lineStart}|${finding.fullyQualifiedFunction}|${finding.matchedExpression}`;
  if (state.dedupe.has(key)) return;
  state.dedupe.add(key);
  state.findings.push(finding);
}

function createCallFinding({
  state,
  path,
  definition,
  callInfo,
  trace,
  reason,
  model,
  matchedExpression,
}) {
  const lineStart = Number(path.node?.loc?.start?.line || 1);
  const lineEnd = Number(path.node?.loc?.end?.line || lineStart);
  const severityModel = model || severityFromTrace(trace.kind);
  const codeBlock = sanitizeBlock(definition.id, buildCodeBlock(state.lines, lineStart, lineEnd));
  const evidence = [
    `Matched call: ${callInfo.calleeText || callInfo.fullyQualifiedFunction}`,
    `Resolved API: ${callInfo.fullyQualifiedFunction}`,
    `Module source: ${callInfo.resolvedModuleSource}`,
    `Import verified: ${callInfo.importVerified ? "yes" : "no"}`,
    `Why matched: ${reason}`,
    trace.kind !== "none"
      ? `Source flow: ${trace.kind}. ${sourceSummary(trace)}.`
      : "Source flow: explicit source-to-sink chain not confidently detected.",
    callInfo.unresolvedReason ? `Resolution: ${callInfo.unresolvedReason}` : "Resolution: call origin resolved.",
  ].join(" | ");

  addFinding(state, {
    filePath: state.file.path,
    language: state.file.language,
    lineStart,
    lineEnd,
    ruleId: definition.id,
    rootCausePattern: definition.rootCausePattern,
    category: toTitleCase(definition.concept || definition.category),
    cwe: definition.cwe || "CWE-NA",
    severity: severityModel.severity,
    confidence: severityModel.confidence,
    title: definition.title,
    description: definition.description,
    impact: definition.impact,
    recommendation: definition.recommendation,
    evidence,
    matchedExpression: sanitizeMatch(definition.id, matchedExpression || callInfo.calleeText),
    flowHint:
      trace.kind !== "none"
        ? `Flow ${trace.kind}: ${sourceSummary(trace)}`
        : "No explicit source-to-sink chain confirmed.",
    codeBlock,
    fullyQualifiedFunction: callInfo.fullyQualifiedFunction || "unresolved",
    resolvedModuleSource: callInfo.resolvedModuleSource || "unresolved",
    importVerified: Boolean(callInfo.importVerified),
    sourceToSinkDetected: Boolean(severityModel.sourceToSinkDetected),
    flowStatus: severityModel.flowStatus || "none",
    confidenceReason: severityModel.confidenceReason,
    needsManualReview: Boolean(severityModel.needsManualReview),
  });
}

function dynamicString(node) {
  if (!node) return false;
  if (node.type === "TemplateLiteral") return node.expressions.length > 0;
  if (node.type === "BinaryExpression" && node.operator === "+") return true;
  return false;
}

function hasBypassOptions(node) {
  if (!node || node.type !== "ObjectExpression") return false;
  for (const property of node.properties || []) {
    if (property?.type !== "ObjectProperty") continue;
    const key =
      property.key?.type === "Identifier" ? property.key.name : literalString(property.key);
    if (key === "ignoreExpiration" && property.value?.type === "BooleanLiteral" && property.value.value) {
      return true;
    }
    if (key === "algorithms" && property.value?.type === "ArrayExpression") {
      const values = property.value.elements
        .map((item) => literalString(item).toLowerCase())
        .filter(Boolean);
      if (values.includes("none")) return true;
    }
  }
  return false;
}

function containsSensitive(node, depth = 0) {
  if (!node || depth > MAX_DEPTH) return false;
  if (node.type === "Identifier") return SENSITIVE_NAME.test(node.name);
  if (node.type === "StringLiteral") return SENSITIVE_NAME.test(node.value || "");
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    const chain = getMemberChain(node);
    if (Array.isArray(chain) && chain.some((part) => SENSITIVE_NAME.test(part))) return true;
    return containsSensitive(node.object, depth + 1);
  }
  if (node.type === "TemplateLiteral") {
    const text = node.quasis.map((item) => item.value?.cooked || "").join(" ");
    if (SENSITIVE_NAME.test(text)) return true;
    return (node.expressions || []).some((item) => containsSensitive(item, depth + 1));
  }
  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    return (node.arguments || []).some((item) => containsSensitive(item, depth + 1));
  }
  if (node.type === "ObjectExpression") {
    return (node.properties || []).some((property) => {
      if (property?.type !== "ObjectProperty") return false;
      const key =
        property.key?.type === "Identifier" ? property.key.name : literalString(property.key);
      if (SENSITIVE_NAME.test(key)) return true;
      return containsSensitive(property.value, depth + 1);
    });
  }
  if (node.type === "ArrayExpression") {
    return (node.elements || []).some((item) => containsSensitive(item, depth + 1));
  }
  return false;
}

function looksLikeSecret(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length < 10) return false;
  if (raw.startsWith("-----BEGIN") && raw.includes("PRIVATE KEY")) return true;
  if (PLACEHOLDER_SECRET.test(raw.toLowerCase())) return false;
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(raw)) return true;
  let classes = 0;
  if (/[a-z]/.test(raw)) classes += 1;
  if (/[A-Z]/.test(raw)) classes += 1;
  if (/\d/.test(raw)) classes += 1;
  if (/[^A-Za-z0-9]/.test(raw)) classes += 1;
  return raw.length >= 12 && classes >= 2;
}

function securityContext(path, state) {
  const declarator = path.findParent((nodePath) => nodePath.isVariableDeclarator());
  if (
    declarator?.node?.id?.type === "Identifier" &&
    SECURITY_CONTEXT.test(declarator.node.id.name)
  )
    return true;
  const fn = path.getFunctionParent();
  if (fn?.node?.id?.type === "Identifier" && SECURITY_CONTEXT.test(fn.node.id.name)) return true;
  return SECURITY_CONTEXT.test(getNodeText(state.content, path.parentPath?.node, 200));
}

function analyzeJsTsFile(file) {
  const content = String(file.content || "");
  let ast;
  try {
    ast = parse(content, {
      sourceType: "unambiguous",
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "importMeta",
        "optionalChaining",
        "nullishCoalescingOperator",
        "topLevelAwait",
        "objectRestSpread",
      ],
    });
  } catch {
    return { findings: [], parseError: true };
  }

  const state = {
    file,
    content,
    lines: content.split(/\r?\n/),
    imports: new Map(),
    taint: new Map(),
    findings: [],
    dedupe: new Set(),
  };

  const trackHardcodedSecret = (lineNode, keyName, rawValue) => {
    if (!SENSITIVE_NAME.test(String(keyName || ""))) return;
    if (!looksLikeSecret(rawValue)) return;
    const def = VULNERABILITY_DEFINITIONS.hardcoded_secret;
    if (!def) return;
    const lineStart = Number(lineNode?.loc?.start?.line || 1);
    const lineEnd = Number(lineNode?.loc?.end?.line || lineStart);
    addFinding(state, {
      filePath: file.path,
      language: file.language,
      lineStart,
      lineEnd,
      ruleId: def.id,
      rootCausePattern: def.rootCausePattern,
      category: toTitleCase(def.concept || def.category),
      cwe: def.cwe,
      severity: rawValue.startsWith("-----BEGIN") ? "critical" : "high",
      confidence: rawValue.startsWith("-----BEGIN") ? "high" : "medium",
      title: def.title,
      description: def.description,
      impact: def.impact,
      recommendation: def.recommendation,
      evidence: [
        `Matched assignment: ${sanitizeMatch(def.id, `${keyName} = <secret_literal>`)}`,
        "Resolved API: constant/object literal assignment",
        "Module source: local source file",
        "Import verified: not applicable",
        "Why matched: credential-like hardcoded secret literal in source code.",
      ].join(" | "),
      matchedExpression: sanitizeMatch(def.id, `${keyName} = <literal>`),
      flowHint: "Hardcoded secret literal detected by AST literal analysis.",
      codeBlock: sanitizeBlock(def.id, buildCodeBlock(state.lines, lineStart, lineEnd)),
      fullyQualifiedFunction: "local.constant_assignment",
      resolvedModuleSource: "local",
      importVerified: false,
      sourceToSinkDetected: false,
      flowStatus: "none",
      confidenceReason: "Credential-like name and secret-like literal value.",
      needsManualReview: !rawValue.startsWith("-----BEGIN"),
    });
  };

  traverse(ast, {
    ImportDeclaration(path) {
      const moduleName = String(path.node.source?.value || "");
      for (const specifier of path.node.specifiers || []) {
        if (specifier.type === "ImportSpecifier") {
          setImport(state, path.scope, specifier.local?.name, {
            module: moduleName,
            imported: specifier.imported?.name || "",
          });
        } else if (specifier.type === "ImportDefaultSpecifier") {
          setImport(state, path.scope, specifier.local?.name, {
            module: moduleName,
            imported: "default",
          });
        } else if (specifier.type === "ImportNamespaceSpecifier") {
          setImport(state, path.scope, specifier.local?.name, {
            module: moduleName,
            imported: "*",
          });
        }
      }
    },

    VariableDeclarator(path) {
      const id = path.node.id;
      const init = path.node.init;
      if (!id || !init) return;

      if (
        init.type === "CallExpression" &&
        init.callee?.type === "Identifier" &&
        init.callee.name === "require" &&
        init.arguments?.[0]?.type === "StringLiteral"
      ) {
        const moduleName = init.arguments[0].value;
        if (id.type === "Identifier") {
          setImport(state, path.scope, id.name, { module: moduleName, imported: "*" });
        } else if (id.type === "ObjectPattern") {
          for (const property of id.properties || []) {
            if (property?.type !== "ObjectProperty") continue;
            const imported =
              property.key?.type === "Identifier"
                ? property.key.name
                : literalString(property.key);
            const local =
              property.value?.type === "Identifier"
                ? property.value.name
                : property.value?.type === "AssignmentPattern" &&
                  property.value.left?.type === "Identifier"
                ? property.value.left.name
                : "";
            if (imported && local) {
              setImport(state, path.scope, local, { module: moduleName, imported });
            }
          }
        }
      } else if (
        id.type === "Identifier" &&
        (init.type === "MemberExpression" || init.type === "OptionalMemberExpression")
      ) {
        if (
          init.object?.type === "CallExpression" &&
          init.object.callee?.type === "Identifier" &&
          init.object.callee.name === "require" &&
          init.object.arguments?.[0]?.type === "StringLiteral"
        ) {
          const imported = getStaticPropertyName(init);
          const moduleName = init.object.arguments[0].value;
          if (imported && moduleName) {
            setImport(state, path.scope, id.name, { module: moduleName, imported });
          }
        } else {
          const chain = getMemberChain(init);
          if (Array.isArray(chain) && chain.length >= 2) {
            const rootImp = getImport(state, path.scope, chain[0]);
            if (rootImp) {
              setImport(state, path.scope, id.name, {
                module: rootImp.module,
                imported: chain.slice(1).join("."),
              });
            }
          }
        }
      }

      const trace = traceExpression(init, path.scope, state);
      if (trace.kind !== "none") {
        for (const name of flattenPattern(id, [])) {
          state.taint.set(bindingKey(path.scope, name), trace);
        }
      }

      if (id.type === "Identifier") {
        const raw = literalString(init);
        if (raw) trackHardcodedSecret(path.node, id.name, raw);
      }
    },

    AssignmentExpression(path) {
      const trace = traceExpression(path.node.right, path.scope, state);
      if (trace.kind === "none") return;
      for (const name of flattenPattern(path.node.left, [])) {
        state.taint.set(bindingKey(path.scope, name), trace);
      }
    },

    ObjectProperty(path) {
      const key =
        path.node.key?.type === "Identifier" ? path.node.key.name : literalString(path.node.key);
      const raw = literalString(path.node.value);
      if (key && raw) trackHardcodedSecret(path.node, key, raw);
    },

    CallExpression(path) {
      const callInfo = resolveCallee(path.node.callee, path.scope, state);
      const matched = matchedVulns(callInfo);
      const args = path.node.arguments || [];
      const firstArg = args[0] || null;
      const firstTrace = traceExpression(firstArg, path.scope, state);
      const allTrace = args.reduce(
        (acc, arg) => mergeTrace(acc, traceExpression(arg, path.scope, state)),
        { kind: "none", sources: [] }
      );

      for (const vulnId of matched) {
        const def = VULNERABILITY_DEFINITIONS[vulnId];
        if (!def) continue;

        if (vulnId === "command_execution") {
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: allTrace,
            reason: "OS command execution sink invoked with potentially external input.",
          });
          continue;
        }

        if (vulnId === "dynamic_code_execution") {
          const timer =
            callInfo.memberName === "setTimeout" || callInfo.memberName === "setInterval";
          if (timer && firstArg && firstArg.type !== "StringLiteral" && firstTrace.kind === "none")
            continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: firstTrace.kind !== "none" ? firstTrace : allTrace,
            reason: "Runtime dynamic code execution primitive detected.",
          });
          continue;
        }

        if (vulnId === "sql_injection") {
          if (!firstArg) continue;
          const dynamic = dynamicString(firstArg);
          if (!dynamic && firstTrace.kind === "none") continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: firstTrace,
            model: severityFromTrace(firstTrace.kind, {
              defaultNoFlowSeverity: dynamic ? "medium" : "low",
            }),
            reason: dynamic
              ? "SQL query text appears dynamically composed at DB sink."
              : "SQL sink consumes externally influenced query input.",
          });
          continue;
        }

        if (vulnId === "nosql_injection") {
          if (firstTrace.kind === "none") continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: firstTrace,
            reason: "NoSQL filter/query sink receives untrusted input object.",
          });
          continue;
        }

        if (vulnId === "path_traversal") {
          if (firstTrace.kind === "none") continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: firstTrace,
            reason: "Filesystem sink receives path derived from external input.",
          });
          continue;
        }

        if (vulnId === "weak_crypto") {
          if (!WEAK_HASH.test(literalString(firstArg).trim())) continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: { kind: "none", sources: [] },
            model: {
              severity: "medium",
              confidence: "high",
              sourceToSinkDetected: false,
              flowStatus: "none",
              needsManualReview: false,
              confidenceReason: "Weak algorithm literal present in crypto sink.",
            },
            reason: `Weak hash algorithm "${literalString(firstArg)}" used in cryptographic sink.`,
          });
          continue;
        }

        if (vulnId === "insecure_token_validation") {
          const member = String(callInfo.memberName || "").toLowerCase();
          if (
            !(
              member === "decode" ||
              member === "decodejwt" ||
              member === "verify" ||
              member === "jwtverify"
            )
          ) {
            continue;
          }
          if ((member === "verify" || member === "jwtverify") && !hasBypassOptions(args[1] || args[2])) {
            continue;
          }
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: firstTrace,
            reason:
              member === "decode" || member === "decodejwt"
                ? "Token decode used without signature verification."
                : "Token verification options weaken validation checks.",
          });
          continue;
        }

        if (vulnId === "sensitive_logging") {
          const sensitiveArg = args.some((arg) => containsSensitive(arg));
          if (!sensitiveArg && allTrace.kind === "none") continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: allTrace,
            reason: "Logging sink receives sensitive fields or auth-related payload.",
          });
          continue;
        }

        if (vulnId === "insecure_randomness") {
          if (!securityContext(path, state)) continue;
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: { kind: "none", sources: [] },
            model: {
              severity: "medium",
              confidence: "medium",
              sourceToSinkDetected: false,
              flowStatus: "none",
              needsManualReview: true,
              confidenceReason: "Predictable randomness used in security-sensitive context.",
            },
            reason: "Math.random used for security-sensitive value generation.",
          });
        }
      }

      if (!callInfo.importVerified && callInfo.memberName) {
        const inferred = DANGEROUS_METHOD_TO_VULN.get(callInfo.memberName);
        if (inferred && VULNERABILITY_DEFINITIONS[inferred] && allTrace.kind !== "none") {
          const def = VULNERABILITY_DEFINITIONS[inferred];
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo: { ...callInfo, unresolvedReason: "Unresolved call - insufficient context" },
            trace: allTrace,
            model: {
              severity: allTrace.kind === "confirmed" ? "medium" : "low",
              confidence: "low",
              sourceToSinkDetected: false,
              flowStatus: allTrace.kind === "confirmed" ? "partial" : "none",
              needsManualReview: true,
              confidenceReason:
                "Potential dangerous method name but namespace/module ownership unresolved.",
            },
            reason: "Potential dangerous sink name found, but call ownership is unresolved.",
          });
        }
      }
    },

    NewExpression(path) {
      if (path.node.callee?.type !== "Identifier" || path.node.callee.name !== "Function") return;
      const def = VULNERABILITY_DEFINITIONS.dynamic_code_execution;
      if (!def) return;
      const callInfo = resolveCallee(path.node.callee, path.scope, state);
      const trace = traceExpression(path.node.arguments?.[0], path.scope, state);
      createCallFinding({
        state,
        path,
        definition: def,
        callInfo,
        trace,
        reason: "Function constructor executes dynamically generated code.",
      });
    },
  });

  return { findings: state.findings, parseError: false };
}

function groupFindings(findings) {
  const groups = new Map();

  for (const finding of findings) {
    const key = `${finding.cwe}|${finding.category}|${finding.rootCausePattern}`;
    const instance = {
      file: finding.filePath,
      line_start: finding.lineStart,
      line_end: finding.lineEnd,
      evidence: finding.evidence,
      code_block: finding.codeBlock,
      matched_expression: finding.matchedExpression,
      flow_hint: finding.flowHint || null,
      language: finding.language,
      fully_qualified_function: finding.fullyQualifiedFunction || "unresolved",
      resolved_module_source: finding.resolvedModuleSource || "unresolved",
      import_verified: Boolean(finding.importVerified),
      source_to_sink_detected: Boolean(finding.sourceToSinkDetected),
      flow_status: finding.flowStatus || "none",
      confidence_reason: finding.confidenceReason || "",
      needs_manual_review: Boolean(finding.needsManualReview),
    };

    if (!groups.has(key)) {
      groups.set(key, {
        category: finding.category,
        cwe: finding.cwe,
        severity: toTitleCase(finding.severity),
        confidence: toTitleCase(finding.confidence),
        root_cause_pattern: finding.rootCausePattern,
        title: finding.title,
        description: finding.description,
        impact: finding.impact,
        recommendation: finding.recommendation,
        instances: [instance],
      });
      continue;
    }

    const current = groups.get(key);
    current.severity = toTitleCase(
      mergeSeverity(String(current.severity || "").toLowerCase(), finding.severity)
    );
    current.confidence = toTitleCase(
      mergeConfidence(String(current.confidence || "").toLowerCase(), finding.confidence)
    );
    current.instances.push(instance);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      instances: group.instances.sort((a, b) => {
        if (a.file !== b.file) return a.file.localeCompare(b.file);
        return a.line_start - b.line_start;
      }),
    }))
    .sort((a, b) => {
      const severityDiff =
        severityRank(String(b.severity || "").toLowerCase()) -
        severityRank(String(a.severity || "").toLowerCase());
      if (severityDiff !== 0) return severityDiff;
      return b.instances.length - a.instances.length;
    });
}

function buildAnalytics({ groupedIssues, totalInstances }) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categoryMap = new Map();
  const ruleMap = new Map();
  const fileRiskMap = new Map();
  const fileFindingCountMap = new Map();
  let riskPoints = 0;

  for (const issue of groupedIssues) {
    const severity = String(issue.severity || "low").toLowerCase();
    const weight = SEVERITY_WEIGHTS[severity] || 0;
    const instances = issue.instances.length;
    const issueRisk = weight * instances;
    severityCounts[severity] += instances;
    riskPoints += issueRisk;

    const category = categoryMap.get(issue.category) || {
      category: issue.category,
      findings: 0,
      riskPoints: 0,
    };
    category.findings += instances;
    category.riskPoints += issueRisk;
    categoryMap.set(issue.category, category);

    const rule = ruleMap.get(issue.root_cause_pattern) || {
      ruleId: issue.root_cause_pattern,
      title: issue.title || issue.category,
      category: issue.category,
      severity,
      cwe: issue.cwe,
      confidence: String(issue.confidence || "low").toLowerCase(),
      findings: 0,
      riskPoints: 0,
      explanation: issue.description,
    };
    rule.findings += instances;
    rule.riskPoints += issueRisk;
    ruleMap.set(issue.root_cause_pattern, rule);

    for (const instance of issue.instances) {
      fileRiskMap.set(instance.file, (fileRiskMap.get(instance.file) || 0) + weight);
      fileFindingCountMap.set(instance.file, (fileFindingCountMap.get(instance.file) || 0) + 1);
    }
  }

  return {
    severityCounts,
    categoryBreakdown: Array.from(categoryMap.values()).sort(
      (a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings
    ),
    ruleBreakdown: Array.from(ruleMap.values()).sort(
      (a, b) =>
        b.riskPoints - a.riskPoints ||
        severityRank(String(b.severity || "").toLowerCase()) -
          severityRank(String(a.severity || "").toLowerCase()) ||
        b.findings - a.findings
    ),
    topRiskFiles: Array.from(fileRiskMap.entries())
      .map(([path, points]) => ({
        path,
        riskPoints: points,
        findings: fileFindingCountMap.get(path) || 0,
      }))
      .sort((a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings)
      .slice(0, 12),
    riskPoints,
    totalInstances,
  };
}

function toRating(score) {
  if (score >= 92) return { grade: "A", label: "Excellent" };
  if (score >= 84) return { grade: "B", label: "Good" };
  if (score >= 72) return { grade: "C", label: "Moderate" };
  if (score >= 58) return { grade: "D", label: "Weak" };
  return { grade: "F", label: "High Risk" };
}

function buildInsights({
  groupedIssues,
  totalInstances,
  analytics,
  skippedFiles,
  unsupportedLanguageFiles,
  unsupportedLanguagesDetected,
}) {
  const insights = [];
  if (totalInstances === 0) {
    insights.push("No developer-code security findings were detected in this AST semantic scan.");
  } else {
    const critical = analytics.severityCounts.critical || 0;
    const high = analytics.severityCounts.high || 0;
    if (critical > 0 || high > 0) {
      insights.push(
        `${critical} critical and ${high} high severity instances require immediate remediation.`
      );
    }
    if (groupedIssues[0]) {
      insights.push(
        `Top issue type: ${groupedIssues[0].category} (${groupedIssues[0].instances.length} instances).`
      );
    }
    if (analytics.topRiskFiles[0]) {
      insights.push(
        `Most exposed file: ${analytics.topRiskFiles[0].path} (${analytics.topRiskFiles[0].findings} findings).`
      );
    }
  }

  if (unsupportedLanguageFiles > 0) {
    const list = Array.from(unsupportedLanguagesDetected)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
    insights.push(
      `${unsupportedLanguageFiles} files were skipped because semantic parser adapters are currently active for JavaScript/TypeScript only. Detected unsupported languages: ${list}.`
    );
  }

  if (skippedFiles > 0) {
    insights.push(
      `${skippedFiles} files were excluded/skipped by dependency, generated, artifact, or safety filters.`
    );
  }

  return insights;
}

const LANGUAGE_ANALYZERS = {
  javascript: analyzeJsTsFile,
  typescript: analyzeJsTsFile,
};

export function analyzeDeveloperSecurity({
  sourceFiles,
  classification,
  skipped,
  options = {},
}) {
  const safeSkipped = {
    ...skipped,
    non_text_content: skipped?.non_text_content || 0,
    third_party_signature: skipped?.third_party_signature || 0,
    parser_error: skipped?.parser_error || 0,
    unsupported_language_semantic_parser:
      skipped?.unsupported_language_semantic_parser || 0,
  };

  const rawFindings = [];
  let analyzedFiles = 0;
  const supportedLanguageFiles = new Map();
  const unsupportedLanguagesDetected = new Set();

  for (const file of sourceFiles || []) {
    if (!isLikelyTextContent(file.content)) {
      safeSkipped.non_text_content += 1;
      continue;
    }
    if (isLikelyThirdPartyCode({ path: file.path, content: file.content })) {
      safeSkipped.third_party_signature += 1;
      continue;
    }

    const language = normalizeLanguage(file.language);
    const analyzer = LANGUAGE_ANALYZERS[language];
    if (!analyzer || !SUPPORTED_SEMANTIC_LANGUAGES.has(language)) {
      safeSkipped.unsupported_language_semantic_parser += 1;
      unsupportedLanguagesDetected.add(language || "unknown");
      continue;
    }

    analyzedFiles += 1;
    supportedLanguageFiles.set(language, (supportedLanguageFiles.get(language) || 0) + 1);
    const { findings, parseError } = analyzer(file);
    if (parseError) {
      safeSkipped.parser_error += 1;
      continue;
    }
    if (findings.length > 0) rawFindings.push(...findings);
  }

  rawFindings.sort((a, b) => {
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    return a.lineStart - b.lineStart;
  });

  const groupedIssues = groupFindings(rawFindings);
  const totalInstances = rawFindings.length;
  const analytics = buildAnalytics({ groupedIssues, totalInstances });
  const totalDeveloperFiles = Number(sourceFiles?.length || 0);
  const skippedFiles = Object.values(safeSkipped).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const riskBudget = Math.max(25, analyzedFiles * 22);
  const riskPercent =
    totalInstances === 0
      ? 0
      : Math.min(100, Math.round((analytics.riskPoints / riskBudget) * 100));
  const securityScore = totalInstances === 0 ? 100 : Math.max(0, 100 - riskPercent);
  const rating = toRating(securityScore);

  return {
    summary: {
      total_issue_types: groupedIssues.length,
      total_instances: totalInstances,
      security_score: securityScore,
    },
    grouped_issues: groupedIssues.slice(
      0,
      options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED
    ),
    issues_found: totalInstances,
    security_score: securityScore,
    score: securityScore,
    rating: rating.grade,
    ratingLabel: rating.label,
    risk_scope: "developer_code_only",
    analysis_mode: "semantic_ast",
    developer_risk: {
      issues_found: totalInstances,
      security_score: securityScore,
      risk_points: analytics.riskPoints,
      files_analyzed: analyzedFiles,
      total_developer_files: totalDeveloperFiles,
    },
    dependency_risk: {
      status: "excluded",
      issues_found: null,
      security_score: null,
      note: "Dependency risk is intentionally excluded. This analyzer computes developer risk only.",
    },
    repository_classification: classification,
    exclusion_summary: safeSkipped,
    parser_support: {
      supported_semantic_languages: Array.from(SUPPORTED_SEMANTIC_LANGUAGES),
      supported_analyzed_files: Object.fromEntries(supportedLanguageFiles.entries()),
      unsupported_languages_detected: Array.from(unsupportedLanguagesDetected).sort((a, b) =>
        a.localeCompare(b)
      ),
      available_sink_catalog_languages: Object.keys(NON_JS_SINK_CATALOG),
    },
    totals: {
      findings: totalInstances,
      filesAnalyzed: analyzedFiles,
      totalCodeFiles: totalDeveloperFiles,
      riskPoints: analytics.riskPoints,
    },
    severityCounts: analytics.severityCounts,
    categoryBreakdown: analytics.categoryBreakdown,
    ruleBreakdown: analytics.ruleBreakdown,
    topRiskFiles: analytics.topRiskFiles,
    findings: groupedIssues.slice(
      0,
      options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED
    ),
    coverage: {
      analyzedFiles,
      skippedFiles,
      totalCodeFiles: totalDeveloperFiles,
      analyzedPercent:
        totalDeveloperFiles > 0
          ? Math.round((analyzedFiles / totalDeveloperFiles) * 100)
          : 0,
    },
    insights: buildInsights({
      groupedIssues,
      totalInstances,
      analytics,
      skippedFiles,
      unsupportedLanguageFiles: safeSkipped.unsupported_language_semantic_parser,
      unsupportedLanguagesDetected,
    }),
    generatedAt: new Date().toISOString(),
  };
}
