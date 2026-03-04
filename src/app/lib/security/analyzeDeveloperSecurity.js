import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import {
  DEFAULT_MAX_FINDINGS_RETURNED,
  getExtension,
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
import {
  createLanguagePluginCatalog,
  createLanguageRegistry,
  getAnalyzerForFile,
  getFuturePluginBlueprints,
} from "@/app/lib/security/plugins/languageRegistry";
import {
  getSinkRegistryForLanguage,
  getSourceRegistryForLanguage,
} from "@/app/lib/security/plugins/unifiedRegistry";

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
const HTTP_ROUTE_METHODS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "all",
  "use",
]);
const WEB_FRAMEWORK_MODULES = new Set([
  "express",
  "fastify",
  "koa",
  "@koa/router",
  "hono",
  "next/server",
  "next",
  "@nestjs/common",
  "flask",
  "spring",
]);
const BUILD_TOOL_MODULES = new Set([
  "webpack",
  "vite",
  "rollup",
  "esbuild",
  "gulp",
  "grunt",
  "tsup",
  "swc",
]);
const CLI_MODULES = new Set(["commander", "yargs", "oclif", "cac"]);
const EXECUTION_CONTEXTS = {
  WEB_SERVER: "WEB_SERVER",
  BACKEND_SERVICE: "BACKEND_SERVICE",
  CLI_TOOL: "CLI_TOOL",
  BUILD_SCRIPT: "BUILD_SCRIPT",
  TEST_FILE: "TEST_FILE",
  CONFIG_FILE: "CONFIG_FILE",
  INTERNAL_LIB: "INTERNAL_LIB",
  MIXED: "MIXED",
};
const INPUT_RANK = {
  CRITICAL: "CRITICAL",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN",
};
const INPUT_RANK_SCORE = {
  [INPUT_RANK.CRITICAL]: 3,
  [INPUT_RANK.MEDIUM]: 2,
  [INPUT_RANK.LOW]: 1,
  [INPUT_RANK.UNKNOWN]: 0,
};
const EXPLOITABILITY_SCORE = {
  Confirmed: 4,
  Likely: 3,
  Possible: 2,
  Unlikely: 1,
};
const ATTACK_SURFACE = {
  PUBLIC_HTTP: "PUBLIC_HTTP",
  INTERNAL_SERVICE: "INTERNAL_SERVICE",
  CLI_LOCAL: "CLI_LOCAL",
  BUILD_TIME: "BUILD_TIME",
  TEST_ONLY: "TEST_ONLY",
  MIXED: "MIXED",
};
const REPORTING_EXECUTION_CONTEXTS = {
  WEB_SERVER: "WEB_SERVER",
  API_SERVER: "API_SERVER",
  CLI_TOOL: "CLI_TOOL",
  LOCAL_SCRIPT: "LOCAL_SCRIPT",
  CONFIG_FILE: "CONFIG_FILE",
};
const INPUT_TRUST_LEVEL = {
  USER_CONTROLLED: "USER_CONTROLLED",
  EXTERNAL_SERVICE: "EXTERNAL_SERVICE",
  ENVIRONMENT_VARIABLE: "ENVIRONMENT_VARIABLE",
  CONFIG_FILE: "CONFIG_FILE",
  LOCAL_CONSTANT: "LOCAL_CONSTANT",
};
const TRUST_LEVEL_SCORE = {
  [INPUT_TRUST_LEVEL.USER_CONTROLLED]: 4,
  [INPUT_TRUST_LEVEL.EXTERNAL_SERVICE]: 3,
  [INPUT_TRUST_LEVEL.ENVIRONMENT_VARIABLE]: 2,
  [INPUT_TRUST_LEVEL.CONFIG_FILE]: 1,
  [INPUT_TRUST_LEVEL.LOCAL_CONSTANT]: 0,
};
const INFRASTRUCTURE_PATH_SEGMENTS = [
  "/security/",
  "/analyzer/",
  "/scanner/",
  "/rules/",
  "/benchmark/",
  "/tests/",
  "/test/",
  "/fixtures/",
  "/mock/",
];
const DANGEROUS_SINK_RULE_IDS = new Set([
  "command_execution",
  "dynamic_code_execution",
  "sql_injection",
  "path_traversal",
  "unsafe_deserialization",
  "template_injection",
]);
const LOG_SECRET_NAME_PATTERN =
  /(token|password|secret|key|auth|credential|jwt|session)/i;
const NODE_FS_MODULE = "node:fs";
const NODE_FS_PROMISES_MODULE = "node:fs/promises";
const SCORE_DEDUCTION_BY_SEVERITY = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  informational: 1,
};
const SCORE_CAP_BY_SEVERITY = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10,
};
const VULN_LINE_CSS =
  ".vuln-line { background-color: rgba(255, 0, 0, 0.15); border-left: 4px solid red; display: block; padding-left: 6px; }";

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

function flattenLanguageSinks(languageKey) {
  return Object.values(getSinkRegistryForLanguage(languageKey) || {})
    .flat()
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

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

function inputRankValue(rank) {
  return INPUT_RANK_SCORE[rank] ?? 0;
}

function mergeInputRank(current, incoming) {
  const left = current || INPUT_RANK.UNKNOWN;
  const right = incoming || INPUT_RANK.UNKNOWN;
  return inputRankValue(right) > inputRankValue(left) ? right : left;
}

function trustLevelValue(level) {
  return TRUST_LEVEL_SCORE[level] ?? -1;
}

function mergeTrustLevel(current, incoming) {
  const left = current || INPUT_TRUST_LEVEL.LOCAL_CONSTANT;
  const right = incoming || INPUT_TRUST_LEVEL.LOCAL_CONSTANT;
  return trustLevelValue(right) > trustLevelValue(left) ? right : left;
}

function mapTrustLevelToInputRank(level) {
  if (level === INPUT_TRUST_LEVEL.USER_CONTROLLED) return INPUT_RANK.CRITICAL;
  if (level === INPUT_TRUST_LEVEL.EXTERNAL_SERVICE) return INPUT_RANK.MEDIUM;
  if (level === INPUT_TRUST_LEVEL.ENVIRONMENT_VARIABLE) return INPUT_RANK.MEDIUM;
  if (level === INPUT_TRUST_LEVEL.CONFIG_FILE) return INPUT_RANK.LOW;
  if (level === INPUT_TRUST_LEVEL.LOCAL_CONSTANT) return INPUT_RANK.LOW;
  return INPUT_RANK.UNKNOWN;
}

function exploitabilityValue(label) {
  return EXPLOITABILITY_SCORE[label] ?? 1;
}

function mergeExploitability(current, incoming) {
  const left = current || "Unlikely";
  const right = incoming || "Unlikely";
  return exploitabilityValue(right) > exploitabilityValue(left) ? right : left;
}

function mergeAttackSurface(current, incoming) {
  if (!current) return incoming || ATTACK_SURFACE.INTERNAL_SERVICE;
  if (!incoming) return current;
  if (current === incoming) return current;
  return ATTACK_SURFACE.MIXED;
}

function toConfidenceLabel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function downgradeSeverityOneLevel(severity) {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "critical") return "high";
  if (normalized === "high") return "medium";
  if (normalized === "medium") return "low";
  if (normalized === "low") return "informational";
  return "informational";
}

function trackSecretPatternCheck(state) {
  if (state?.metrics) {
    state.metrics.secretPatternsChecked = Number(state.metrics.secretPatternsChecked || 0) + 1;
  }
}

function testSensitiveNamePattern(state, value) {
  trackSecretPatternCheck(state);
  return SENSITIVE_NAME.test(String(value || ""));
}

function testLogSecretNamePattern(state, value) {
  trackSecretPatternCheck(state);
  return LOG_SECRET_NAME_PATTERN.test(String(value || ""));
}

function getPathLower(filePath) {
  return String(filePath || "").replace(/\\/g, "/").toLowerCase();
}

function hasPathSegment(filePath, segment) {
  const normalized = getPathLower(filePath);
  return normalized.includes(`/${segment}/`) || normalized.startsWith(`${segment}/`);
}

function isAuthenticationRelatedFile(filePath, content = "") {
  const normalizedPath = getPathLower(filePath);
  if (/(^|\/)(auth|authentication|login|session|token|jwt|credential|oauth|passport)(\/|$)/.test(normalizedPath)) {
    return true;
  }
  const contentHint = String(content || "").slice(0, 5000).toLowerCase();
  return /(jsonwebtoken|next-auth|passport|authorization|access[_-]?token|refresh[_-]?token|session)/.test(
    contentHint
  );
}

function mapAttackSurface(executionContext) {
  if (executionContext === EXECUTION_CONTEXTS.WEB_SERVER) return ATTACK_SURFACE.PUBLIC_HTTP;
  if (executionContext === EXECUTION_CONTEXTS.BACKEND_SERVICE) {
    return ATTACK_SURFACE.INTERNAL_SERVICE;
  }
  if (executionContext === EXECUTION_CONTEXTS.CLI_TOOL) return ATTACK_SURFACE.CLI_LOCAL;
  if (executionContext === EXECUTION_CONTEXTS.BUILD_SCRIPT) return ATTACK_SURFACE.BUILD_TIME;
  if (executionContext === EXECUTION_CONTEXTS.TEST_FILE) return ATTACK_SURFACE.TEST_ONLY;
  return ATTACK_SURFACE.INTERNAL_SERVICE;
}

function classifyExecutionContext({ filePath, content, ast }) {
  const normalizedPath = getPathLower(filePath);
  const fileName = normalizedPath.split("/").pop() || "";
  const imports = new Set();
  let hasHttpRouting = false;
  let hasCliSignals = false;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = String(path.node.source?.value || "").toLowerCase();
      if (source) imports.add(source);
    },
    VariableDeclarator(path) {
      const init = path.node.init;
      if (
        init?.type === "CallExpression" &&
        init.callee?.type === "Identifier" &&
        init.callee.name === "require" &&
        init.arguments?.[0]?.type === "StringLiteral"
      ) {
        imports.add(String(init.arguments[0].value || "").toLowerCase());
      }
    },
    CallExpression(path) {
      const chain = getMemberChain(path.node.callee);
      if (Array.isArray(chain) && chain.length >= 2) {
        const root = String(chain[0] || "").toLowerCase();
        const method = String(chain[chain.length - 1] || "").toLowerCase();
        if ((root === "app" || root === "router" || root === "fastify") && HTTP_ROUTE_METHODS.has(method)) {
          hasHttpRouting = true;
        }
        if (root === "program" && method === "command") hasCliSignals = true;
      }
    },
    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      const fnName =
        declaration?.type === "FunctionDeclaration" ? declaration.id?.name : null;
      if (fnName && /^(GET|POST|PUT|DELETE|PATCH|OPTIONS)$/i.test(fnName)) {
        hasHttpRouting = true;
      }
    },
    MemberExpression(path) {
      const chain = getMemberChain(path.node);
      if (Array.isArray(chain) && chain[0] === "process" && chain[1] === "argv") {
        hasCliSignals = true;
      }
    },
  });

  const isTestPath =
    hasPathSegment(normalizedPath, "__tests__") ||
    hasPathSegment(normalizedPath, "test") ||
    /\.(spec|test)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(fileName);
  if (isTestPath) return EXECUTION_CONTEXTS.TEST_FILE;

  const isConfigPath =
    hasPathSegment(normalizedPath, "config") ||
    /\.config\.(js|ts|mjs|cjs)$/.test(fileName) ||
    /^(package|tsconfig|eslint|prettier|babel|jest|vitest|webpack|vite|rollup|gulp|grunt)\./.test(
      fileName
    );
  if (isConfigPath) return EXECUTION_CONTEXTS.CONFIG_FILE;

  const hasBuildImport = Array.from(imports).some((moduleName) =>
    BUILD_TOOL_MODULES.has(moduleName)
  );
  const isBuildPath =
    hasPathSegment(normalizedPath, "build") ||
    hasPathSegment(normalizedPath, "scripts/build") ||
    /^webpack\.config|^vite\.config|^rollup\.config|^gulpfile|^gruntfile|^postcss\.config/.test(
      fileName
    );
  if (isBuildPath || hasBuildImport) return EXECUTION_CONTEXTS.BUILD_SCRIPT;

  const hasCliImport = Array.from(imports).some((moduleName) => CLI_MODULES.has(moduleName));
  const hasShebang = String(content || "").startsWith("#!/usr/bin/env node");
  const isCliPath = hasPathSegment(normalizedPath, "bin") || hasPathSegment(normalizedPath, "scripts");
  if (isCliPath || hasCliImport || hasShebang || hasCliSignals) {
    return EXECUTION_CONTEXTS.CLI_TOOL;
  }

  const hasWebImport = Array.from(imports).some((moduleName) =>
    WEB_FRAMEWORK_MODULES.has(moduleName)
  );
  const isWebPath =
    hasPathSegment(normalizedPath, "api") ||
    hasPathSegment(normalizedPath, "routes") ||
    hasPathSegment(normalizedPath, "controllers") ||
    hasPathSegment(normalizedPath, "middleware") ||
    normalizedPath.includes("/app/api/");
  if (isWebPath || hasWebImport || hasHttpRouting) return EXECUTION_CONTEXTS.WEB_SERVER;

  const isServicePath =
    hasPathSegment(normalizedPath, "service") ||
    hasPathSegment(normalizedPath, "services") ||
    hasPathSegment(normalizedPath, "worker") ||
    hasPathSegment(normalizedPath, "workers") ||
    hasPathSegment(normalizedPath, "jobs");
  if (isServicePath) return EXECUTION_CONTEXTS.BACKEND_SERVICE;

  return EXECUTION_CONTEXTS.INTERNAL_LIB;
}

function normalizeModuleName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "fs" || normalized === "node:fs") return NODE_FS_MODULE;
  if (normalized === "fs/promises" || normalized === "node:fs/promises") {
    return NODE_FS_PROMISES_MODULE;
  }
  return normalized;
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
    const marker = line >= startLine && line <= endLine ? ">>>" : "   ";
    rendered.push(`${marker}${String(line).padStart(4, " ")} | ${lines[line - 1] ?? ""}`);
  }
  return rendered.join("\n");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCodeBlockHtml(lines, lineStart, lineEnd) {
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
    const content = `${String(line).padStart(4, " ")} | ${escapeHtml(lines[line - 1] ?? "")}`;
    if (line >= startLine && line <= endLine) {
      rendered.push(`<span class="vuln-line">${content}</span>`);
    } else {
      rendered.push(content);
    }
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

function isCliArgChain(chain) {
  return Array.isArray(chain) && chain.length >= 2 && chain[0] === "process" && chain[1] === "argv";
}

function isWebSocketChain(chain) {
  if (!Array.isArray(chain) || chain.length < 2) return false;
  const root = String(chain[0] || "").toLowerCase();
  const joined = chain.join(".").toLowerCase();
  if (!["ws", "socket", "websocket", "connection", "message", "event"].includes(root)) {
    return false;
  }
  return joined.includes("message") || joined.endsWith(".data");
}

function isBrowserLocationChain(chain) {
  if (!Array.isArray(chain) || chain.length < 2) return false;
  const root = String(chain[0] || "").toLowerCase();
  const second = String(chain[1] || "").toLowerCase();
  return (root === "window" || root === "document") && second === "location";
}

function sourceMetaFromChain(chain) {
  if (isRequestChain(chain)) {
    const requestField = String(chain[1] || "").toLowerCase();
    if (requestField === "files") {
      return { kind: "confirmed", type: "file_upload", rank: INPUT_RANK.MEDIUM };
    }
    return { kind: "confirmed", type: "user_input", rank: INPUT_RANK.CRITICAL };
  }
  if (isWebSocketChain(chain)) {
    return { kind: "confirmed", type: "websocket_message", rank: INPUT_RANK.CRITICAL };
  }
  if (isCliArgChain(chain)) {
    return { kind: "confirmed", type: "cli_argument", rank: INPUT_RANK.MEDIUM };
  }
  if (isEnvChain(chain)) {
    return { kind: "confirmed", type: "user_input", rank: INPUT_RANK.CRITICAL };
  }
  if (isBrowserLocationChain(chain)) {
    return { kind: "confirmed", type: "user_input", rank: INPUT_RANK.CRITICAL };
  }
  return null;
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
    const sourceMeta = sourceMetaFromChain(chain);
    if (sourceMeta) {
      return makeTrace(sourceMeta.kind, chain.join("."), node.loc?.start?.line, sourceMeta.type);
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
  const normalizedModule = normalizeModuleName(data?.module);
  const entry = { ...data, module: normalizedModule, local };
  state.imports.set(bindingKey(scope, local), entry);
  if (!state.importsByName.has(local)) {
    state.importsByName.set(local, entry);
  }
}

function getImport(state, scope, name) {
  return state.imports.get(bindingKey(scope, name)) || state.importsByName.get(name) || null;
}

function resolveImportedTarget(imp, memberSegments = [], fallbackName = "") {
  const imported = String(imp?.imported || "");
  const importedPath =
    imported && imported !== "*" && imported !== "default"
      ? imported.split(".").filter(Boolean)
      : [];
  let moduleName = normalizeModuleName(imp?.module);
  let segments = Array.isArray(memberSegments) ? memberSegments.filter(Boolean) : [];

  if (moduleName === NODE_FS_MODULE && importedPath[0] === "promises") {
    moduleName = NODE_FS_PROMISES_MODULE;
    importedPath.shift();
  }
  if (moduleName === NODE_FS_MODULE && segments[0] === "promises") {
    moduleName = NODE_FS_PROMISES_MODULE;
    segments = segments.slice(1);
  }
  if (moduleName === NODE_FS_PROMISES_MODULE && segments[0] === "promises") {
    segments = segments.slice(1);
  }

  let callPath = [];
  if (segments.length > 0) {
    callPath = segments;
  } else if (importedPath.length > 0) {
    callPath = importedPath;
  } else if (fallbackName) {
    callPath = [fallbackName];
  }

  const memberName = callPath.length > 0 ? callPath[callPath.length - 1] : fallbackName || null;
  const callPathText = callPath.join(".") || memberName || "call";
  return {
    moduleName,
    memberName,
    fullyQualifiedFunction: `${moduleName}.${callPathText}`,
  };
}

function resolveCallee(callee, scope, state) {
  const calleeText = getNodeText(state.content, callee);
  if (callee?.type === "Identifier") {
    const imp = getImport(state, scope, callee.name);
    if (imp) {
      const target = resolveImportedTarget(imp, [], callee.name);
      return {
        calleeText,
        fullyQualifiedFunction: target.fullyQualifiedFunction,
        resolvedModuleSource: target.moduleName,
        importVerified: true,
        memberName: target.memberName,
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
      const target = resolveImportedTarget(imp, chain.slice(1), memberName);
      return {
        calleeText,
        fullyQualifiedFunction: target.fullyQualifiedFunction,
        resolvedModuleSource: target.moduleName,
        importVerified: true,
        memberName: target.memberName,
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

function sourceSummary(trace) {
  return (trace.sources || [])
    .slice(0, 4)
    .map((source) => `${source.label} (${source.type}${source.line ? ` line ${source.line}` : ""})`)
    .join("; ");
}

function detectionConfidenceFromCall(callInfo) {
  let score = 20;
  if (!callInfo?.unresolvedReason) score += 25;
  if (callInfo?.importVerified) score += 35;
  const normalizedModule = normalizeModuleName(callInfo?.resolvedModuleSource);
  if (normalizedModule && normalizedModule !== "unresolved") {
    score += 10;
  }
  if (callInfo?.fullyQualifiedFunction && !String(callInfo.fullyQualifiedFunction).startsWith("unresolved.")) {
    score += 10;
  }
  if (
    callInfo?.importVerified &&
    (normalizedModule === NODE_FS_MODULE || normalizedModule === NODE_FS_PROMISES_MODULE)
  ) {
    score = Math.max(score, 90);
  }
  return Math.max(0, Math.min(100, score));
}

function flowConfidenceScoreFromTrace(trace) {
  if (!trace || trace.kind === "none") return 20;
  const sourceCount = Math.min(3, Number(trace?.sources?.length || 0));
  if (trace.kind === "confirmed") return Math.min(100, 72 + sourceCount * 8);
  if (trace.kind === "partial") return Math.min(80, 52 + sourceCount * 7);
  return 20;
}

function flowConfidenceLabel(score) {
  if (score >= 81) return "HIGH";
  if (score >= 46) return "PARTIAL";
  return "NONE";
}

function exploitabilityConfidenceScore({
  executionContext,
  attackSurface,
  sourceRank,
  exploitability,
}) {
  let score = 20;
  if (attackSurface === ATTACK_SURFACE.PUBLIC_HTTP) score += 35;
  else if (attackSurface === ATTACK_SURFACE.INTERNAL_SERVICE) score += 18;
  else if (attackSurface === ATTACK_SURFACE.CLI_LOCAL) score += 10;
  else if (attackSurface === ATTACK_SURFACE.BUILD_TIME) score += 8;
  else score += 6;

  if (sourceRank === INPUT_RANK.CRITICAL) score += 30;
  else if (sourceRank === INPUT_RANK.MEDIUM) score += 18;
  else if (sourceRank === INPUT_RANK.LOW) score += 8;

  if (executionContext === EXECUTION_CONTEXTS.WEB_SERVER) score += 10;
  if (exploitability === "Confirmed") score += 8;
  if (exploitability === "Unlikely") score -= 10;
  return Math.max(0, Math.min(100, score));
}

function computeOverallConfidence({
  detectionConfidence,
  flowConfidence,
  exploitabilityConfidence,
  flowConfidenceLabelValue,
  exploitability,
}) {
  let score = Math.round(
    0.4 * detectionConfidence + 0.3 * flowConfidence + 0.3 * exploitabilityConfidence
  );
  if (flowConfidenceLabelValue === "PARTIAL") score = Math.min(score, 80);
  if (exploitability === "Unlikely") score = Math.min(score, 70);
  return Math.max(0, Math.min(100, score));
}

function severityLabel(severity) {
  return toTitleCase(severity || "informational");
}

function sanitizeMatch(vulnId, value) {
  if (vulnId === "hardcoded_secret") return "[REDACTED_SECRET_LITERAL]";
  return String(value || "").slice(0, 220);
}

function sanitizeBlock(vulnId, block) {
  if (vulnId === "hardcoded_secret") return "Sensitive value redacted in preview.";
  return block;
}

function sanitizeBlockHtml(vulnId, block) {
  if (vulnId === "hardcoded_secret") {
    return '<span class="vuln-line">Sensitive value redacted in preview.</span>';
  }
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
  meta = {},
}) {
  const lineStart = Number(path.node?.loc?.start?.line || 1);
  const lineEnd = Number(path.node?.loc?.end?.line || lineStart);
  const threat = evaluateThreatModel({
    definition,
    callInfo,
    trace,
    executionContext: state.executionContext,
    path,
    state,
    meta,
  });
  const severityModel = {
    severity: model?.severity || threat.severity,
    confidence: model?.confidence || threat.confidence,
    sourceToSinkDetected:
      model?.sourceToSinkDetected !== undefined
        ? model.sourceToSinkDetected
        : threat.flowConfidence === "HIGH" && threat.sourceRank !== INPUT_RANK.UNKNOWN,
    flowStatus:
      model?.flowStatus ||
      (threat.flowConfidence === "HIGH"
        ? "confirmed"
        : threat.flowConfidence === "PARTIAL"
        ? "partial"
        : "none"),
    needsManualReview:
      model?.needsManualReview !== undefined
        ? model.needsManualReview
        : threat.manualReviewSuggested,
    confidenceReason:
      model?.confidenceReason ||
      `Confidence ${threat.confidenceScore}/100 based on sink/source/flow/context certainty.`,
  };
  const codeBlock = sanitizeBlock(definition.id, buildCodeBlock(state.lines, lineStart, lineEnd));
  const codeBlockHtml = sanitizeBlockHtml(
    definition.id,
    buildCodeBlockHtml(state.lines, lineStart, lineEnd)
  );
  const evidence = [
    `Matched call: ${callInfo.calleeText || callInfo.fullyQualifiedFunction}`,
    `Resolved API: ${callInfo.fullyQualifiedFunction}`,
    `Module source: ${callInfo.resolvedModuleSource}`,
    `Import verified: ${callInfo.importVerified ? "yes" : "no"}`,
    `Execution context: ${state.executionContext}`,
    `Attack surface: ${threat.attackSurface}`,
    `Input source rank: ${threat.sourceRank}`,
    `Exploitability: ${threat.exploitability}`,
    `Detection confidence: ${threat.detectionConfidence}`,
    `Flow confidence: ${threat.flowConfidenceScore}`,
    `Exploitability confidence: ${threat.exploitabilityConfidence}`,
    `Overall confidence: ${threat.overallConfidence}`,
    `Why matched: ${reason}`,
    trace.kind !== "none"
      ? `Source flow: ${trace.kind}. ${sourceSummary(trace)}.`
      : "Source flow: explicit source-to-sink chain not confidently detected.",
    callInfo.unresolvedReason ? `Resolution: ${callInfo.unresolvedReason}` : "Resolution: call origin resolved.",
    `Reasoning: ${threat.reasoning}`,
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
    codeBlockHtml,
    fullyQualifiedFunction: callInfo.fullyQualifiedFunction || "unresolved",
    resolvedModuleSource: callInfo.resolvedModuleSource || "unresolved",
    importVerified: Boolean(callInfo.importVerified),
    sourceToSinkDetected: Boolean(severityModel.sourceToSinkDetected),
    flowStatus: severityModel.flowStatus || "none",
    confidenceReason: severityModel.confidenceReason,
    needsManualReview: Boolean(severityModel.needsManualReview),
    executionContext: state.executionContext,
    attackSurface: threat.attackSurface,
    inputSourceRank: threat.sourceRank,
    exploitability: threat.exploitability,
    confidenceScore: threat.confidenceScore,
    detectionConfidence: threat.detectionConfidence,
    flowConfidenceValue: threat.flowConfidenceScore,
    exploitabilityConfidence: threat.exploitabilityConfidence,
    overallConfidence: threat.overallConfidence,
    reasoning: threat.reasoning,
    whyThisMatters:
      definition.impact ||
      "This pattern can create a real security path if untrusted input reaches sensitive code.",
    realisticRiskAssessment:
      threat.attackSurface !== ATTACK_SURFACE.PUBLIC_HTTP
        ? `This occurs in ${state.executionContext} with ${threat.attackSurface} exposure. Remote exploitability is limited.`
        : `This occurs in a public HTTP surface and can be exploited if attacker-controlled input reaches the sink.`,
    developerAction:
      severityRank(threat.severity) <= severityRank("informational")
        ? "No urgent action required; monitor and keep current safeguards."
        : definition.recommendation || "Apply secure coding controls around this sink.",
    suppressed: false,
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

function getPropertyKeyName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((item) => item.value?.cooked || "").join("");
  }
  return "";
}

function isPureStringLogArgument(node) {
  if (!node) return false;
  if (node.type === "StringLiteral") return true;
  if (node.type === "TemplateLiteral") return node.expressions.length === 0;
  return false;
}

function sensitiveTraceEvidence(trace) {
  for (const source of trace?.sources || []) {
    const label = String(source?.label || "").toLowerCase();
    if (!label) continue;
    if (LOG_SECRET_NAME_PATTERN.test(label)) return true;
    if (label.includes("headers.authorization")) return true;
    if (label.includes("access_token") || label.includes("accesstoken")) return true;
    if (label.includes("id_token") || label.includes("idtoken")) return true;
    if (label.includes("refresh_token") || label.includes("refreshtoken")) return true;
  }
  return false;
}

function sensitiveChainInfo(chain = [], state) {
  const parts = (chain || []).map((item) => String(item || "").toLowerCase());
  if (parts.length === 0) {
    return { sensitive: false, rank: INPUT_RANK.UNKNOWN, reason: "" };
  }

  const hasSecretName = parts.some((part) => testLogSecretNamePattern(state, part));
  const startsReq = parts[0] === "req" || parts[0] === "request" || parts[0] === "ctx";
  const isHeadersAuth =
    startsReq &&
    parts.includes("headers") &&
    (parts.includes("authorization") || parts.includes("auth"));
  const isSessionAccessToken =
    (parts[0] === "session" || parts[0] === "auth" || parts[0] === "user") &&
    parts.some((part) =>
      /(access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|token)/i.test(part)
    );
  const isEnvSecret =
    parts[0] === "process" &&
    parts[1] === "env" &&
    parts.slice(2).some((part) => testLogSecretNamePattern(state, part));

  if (isHeadersAuth) {
    return {
      sensitive: true,
      rank: INPUT_RANK.CRITICAL,
      reason: "Headers authorization field is logged.",
    };
  }

  if (isSessionAccessToken) {
    return {
      sensitive: true,
      rank: INPUT_RANK.MEDIUM,
      reason: "Session/auth token-like field is logged.",
    };
  }

  if (isEnvSecret) {
    return {
      sensitive: true,
      rank: INPUT_RANK.LOW,
      reason: "Environment secret-like variable is logged.",
    };
  }

  if (hasSecretName) {
    return {
      sensitive: true,
      rank: INPUT_RANK.MEDIUM,
      reason: "Identifier/property matches secret naming pattern.",
    };
  }

  return { sensitive: false, rank: INPUT_RANK.UNKNOWN, reason: "" };
}

function combineLogAnalysis(current, incoming) {
  return {
    confirmed: Boolean(current.confirmed || incoming.confirmed),
    trace: mergeTrace(current.trace, incoming.trace),
    rank:
      inputRankValue(incoming.rank) > inputRankValue(current.rank)
        ? incoming.rank
        : current.rank,
    clearFlow: Boolean(current.clearFlow || incoming.clearFlow),
    reasons: [...(current.reasons || []), ...(incoming.reasons || [])],
  };
}

function analyzeLoggingArgument(node, scope, state, depth = 0) {
  const empty = {
    confirmed: false,
    trace: { kind: "none", sources: [] },
    rank: INPUT_RANK.UNKNOWN,
    clearFlow: false,
    reasons: [],
  };
  if (!node || depth > MAX_DEPTH) return empty;
  if (isPureStringLogArgument(node)) return empty;

  if (node.type === "TemplateLiteral") {
    return (node.expressions || []).reduce(
      (acc, expr) =>
        combineLogAnalysis(acc, analyzeLoggingArgument(expr, scope, state, depth + 1)),
      empty
    );
  }

  if (node.type === "Identifier") {
    const trace = traceExpression(node, scope, state, depth + 1);
    const nameSensitive = testLogSecretNamePattern(state, node.name);
    const traceSensitive = sensitiveTraceEvidence(trace);
    const confirmed = nameSensitive || traceSensitive;
    const rank = nameSensitive
      ? rankFromTrace(trace) === INPUT_RANK.UNKNOWN
        ? INPUT_RANK.MEDIUM
        : rankFromTrace(trace)
      : rankFromTrace(trace);
    const reasons = [];
    if (nameSensitive) reasons.push(`Sensitive identifier logged: ${node.name}`);
    if (traceSensitive) reasons.push(`Identifier trace contains sensitive source: ${node.name}`);
    return {
      confirmed,
      trace,
      rank: confirmed ? (rank === INPUT_RANK.UNKNOWN ? INPUT_RANK.MEDIUM : rank) : rank,
      clearFlow: confirmed && trace.kind === "confirmed",
      reasons,
    };
  }

  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    const chain = getMemberChain(node) || [];
    const chainInfo = sensitiveChainInfo(chain, state);
    const trace = traceExpression(node, scope, state, depth + 1);
    const traceSensitive = sensitiveTraceEvidence(trace);
    const confirmed = chainInfo.sensitive || traceSensitive;
    const rankFromChain = chainInfo.rank;
    const rankFromTraceValue = rankFromTrace(trace);
    const rank =
      inputRankValue(rankFromTraceValue) > inputRankValue(rankFromChain)
        ? rankFromTraceValue
        : rankFromChain;
    const reasons = [];
    if (chainInfo.reason) reasons.push(chainInfo.reason);
    if (traceSensitive) reasons.push("Member expression trace includes sensitive source.");
    return {
      confirmed,
      trace,
      rank: confirmed ? (rank === INPUT_RANK.UNKNOWN ? INPUT_RANK.MEDIUM : rank) : rank,
      clearFlow: confirmed && trace.kind === "confirmed",
      reasons,
    };
  }

  if (node.type === "ObjectExpression") {
    let result = { ...empty };
    for (const property of node.properties || []) {
      if (property?.type === "ObjectProperty") {
        const keyName = getPropertyKeyName(property.key);
        const keySensitive = testLogSecretNamePattern(state, keyName);
        const valueIsStaticString = isPureStringLogArgument(property.value);
        if (keySensitive && !valueIsStaticString) {
          result = combineLogAnalysis(result, {
            confirmed: true,
            trace: { kind: "partial", sources: [] },
            rank: INPUT_RANK.MEDIUM,
            clearFlow: false,
            reasons: [`Object property key is sensitive: ${keyName}`],
          });
        }
        result = combineLogAnalysis(
          result,
          analyzeLoggingArgument(property.value, scope, state, depth + 1)
        );
      } else if (property?.type === "SpreadElement") {
        result = combineLogAnalysis(
          result,
          analyzeLoggingArgument(property.argument, scope, state, depth + 1)
        );
      }
    }
    return result;
  }

  if (node.type === "ArrayExpression") {
    return (node.elements || []).reduce(
      (acc, entry) =>
        combineLogAnalysis(acc, analyzeLoggingArgument(entry, scope, state, depth + 1)),
      empty
    );
  }

  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    return (node.arguments || []).reduce(
      (acc, entry) =>
        combineLogAnalysis(acc, analyzeLoggingArgument(entry, scope, state, depth + 1)),
      empty
    );
  }

  if (node.type === "ConditionalExpression") {
    return combineLogAnalysis(
      analyzeLoggingArgument(node.consequent, scope, state, depth + 1),
      analyzeLoggingArgument(node.alternate, scope, state, depth + 1)
    );
  }

  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    return combineLogAnalysis(
      analyzeLoggingArgument(node.left, scope, state, depth + 1),
      analyzeLoggingArgument(node.right, scope, state, depth + 1)
    );
  }

  return empty;
}

function analyzeLoggingArguments(args, scope, state) {
  const nonNullArgs = (args || []).filter(Boolean);
  const pureStringOnly = nonNullArgs.length > 0 && nonNullArgs.every(isPureStringLogArgument);
  let combined = {
    confirmed: false,
    trace: { kind: "none", sources: [] },
    rank: INPUT_RANK.UNKNOWN,
    clearFlow: false,
    reasons: [],
  };
  for (const arg of nonNullArgs) {
    combined = combineLogAnalysis(combined, analyzeLoggingArgument(arg, scope, state));
  }
  return {
    pureStringOnly,
    confirmedSensitiveSource: combined.confirmed,
    trace: combined.trace,
    sourceRank: combined.rank,
    clearFlow: combined.clearFlow,
    reasons: combined.reasons,
  };
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

function sourceRankFromType(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "user_input" || normalized === "websocket_message") {
    return INPUT_RANK.CRITICAL;
  }
  if (
    normalized === "cli_argument" ||
    normalized === "file_upload" ||
    normalized === "external_api"
  ) {
    return INPUT_RANK.MEDIUM;
  }
  if (
    normalized === "environment" ||
    normalized === "config" ||
    normalized === "hardcoded"
  ) {
    return INPUT_RANK.LOW;
  }
  return INPUT_RANK.UNKNOWN;
}

function rankFromTrace(trace) {
  let best = INPUT_RANK.UNKNOWN;
  for (const source of trace?.sources || []) {
    const sourceRank = sourceRankFromType(source.type);
    if (inputRankValue(sourceRank) > inputRankValue(best)) best = sourceRank;
  }
  return best;
}

function flowConfidenceFromTrace(trace) {
  if (trace?.kind === "confirmed") return "HIGH";
  if (trace?.kind === "partial") return "PARTIAL";
  return "NONE";
}

function isNetworkExposedContext(executionContext) {
  return executionContext === EXECUTION_CONTEXTS.WEB_SERVER;
}

function detectPathValidation(path, firstArg, state) {
  const argText = getNodeText(state.content, firstArg, 240).toLowerCase();
  if (
    argText.includes("path.normalize") ||
    argText.includes("path.resolve") ||
    argText.includes("path.basename") ||
    argText.includes("sanitize")
  ) {
    return true;
  }

  const line = Number(path.node?.loc?.start?.line || 1);
  const from = Math.max(1, line - 4);
  const to = Math.min(state.lines.length, line + 4);
  const localWindow = state.lines.slice(from - 1, to).join("\n").toLowerCase();
  return /(sanitize|validate|whitelist|allowlist|normalize|canonical|safepath|safe_path)/.test(
    localWindow
  );
}

function isStaticPathExpression(node, depth = 0) {
  if (!node || depth > MAX_DEPTH) return false;
  if (node.type === "StringLiteral") return true;
  if (node.type === "TemplateLiteral") return node.expressions.length === 0;
  if (node.type === "Identifier") {
    return node.name === "__dirname" || node.name === "__filename";
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    return (
      isStaticPathExpression(node.left, depth + 1) &&
      isStaticPathExpression(node.right, depth + 1)
    );
  }
  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    const chain = getMemberChain(node.callee) || [];
    const leaf = String(chain[chain.length - 1] || "").toLowerCase();
    if (!["join", "resolve", "normalize", "basename"].includes(leaf)) return false;
    return (node.arguments || []).every((arg) => isStaticPathExpression(arg, depth + 1));
  }
  return false;
}

function capSeverityForAttackSurface(severity, attackSurface) {
  if (attackSurface === ATTACK_SURFACE.PUBLIC_HTTP) return severity;
  return severityRank(severity) > severityRank("medium") ? "medium" : severity;
}

function classifyExploitability({
  sinkConfirmed,
  sourceRank,
  flowConfidence,
}) {
  if (!sinkConfirmed || flowConfidence === "NONE") return "Unlikely";
  if (sourceRank === INPUT_RANK.CRITICAL && flowConfidence === "HIGH") return "Confirmed";
  if (sourceRank === INPUT_RANK.CRITICAL && flowConfidence === "PARTIAL") return "Likely";
  if (sourceRank === INPUT_RANK.MEDIUM) return "Possible";
  if (sourceRank === INPUT_RANK.LOW) return "Unlikely";
  return "Possible";
}

function baseSeverityFromExploitability({
  sinkConfirmed,
  sourceRank,
  flowConfidence,
}) {
  if (!sinkConfirmed || flowConfidence === "NONE") return "informational";
  if (sourceRank === INPUT_RANK.CRITICAL && flowConfidence === "HIGH") return "critical";
  if (sourceRank === INPUT_RANK.CRITICAL && flowConfidence === "PARTIAL") return "high";
  if (sourceRank === INPUT_RANK.MEDIUM) return "medium";
  if (sourceRank === INPUT_RANK.LOW) return "low";
  return "informational";
}

function evaluateThreatModel({
  definition,
  callInfo,
  trace,
  executionContext,
  path,
  state,
  meta = {},
}) {
  const sinkConfirmed = Boolean(
    meta.sinkConfirmedOverride !== undefined
      ? meta.sinkConfirmedOverride
      : callInfo.importVerified
  );
  const sourceRank = meta.inputSourceRankOverride || rankFromTrace(trace);
  const initialFlowConfidence = meta.flowConfidenceOverride || flowConfidenceFromTrace(trace);
  const computedFlowConfidenceScore = flowConfidenceScoreFromTrace(trace);
  const flowConfidenceScoreRaw =
    typeof meta.flowConfidenceScoreOverride === "number"
      ? Math.max(0, Math.min(100, Math.round(meta.flowConfidenceScoreOverride)))
      : computedFlowConfidenceScore;
  const flowConfidence = meta.flowConfidenceOverride || flowConfidenceLabel(flowConfidenceScoreRaw);
  const attackSurface = mapAttackSurface(executionContext);
  let severity = baseSeverityFromExploitability({
    sinkConfirmed,
    sourceRank,
    flowConfidence,
  });
  let exploitability = classifyExploitability({
    sinkConfirmed,
    sourceRank,
    flowConfidence,
  });

  const vulnerabilityId = definition?.id || "";
  const notes = [];

  if (vulnerabilityId === "path_traversal") {
    const firstArg = path.node.arguments?.[0] || null;
    const isValidated = detectPathValidation(path, firstArg, state);
    const networkExposed = attackSurface === ATTACK_SURFACE.PUBLIC_HTTP;
    const staticPath = isStaticPathExpression(firstArg);
    const hasCliSource = (trace?.sources || []).some((source) => source.type === "cli_argument");
    const envOnly =
      trace?.sources?.length > 0 &&
      trace.sources.every((source) => source.type === "environment");

    if (staticPath && flowConfidence === "NONE") {
      severity = "informational";
      exploitability = "Unlikely";
      notes.push("Path operation uses static constant path components.");
    } else if (envOnly) {
      severity = "low";
      exploitability = "Unlikely";
      notes.push("Path is derived from environment values only.");
    } else if (hasCliSource) {
      severity = "medium";
      exploitability = "Possible";
      notes.push("Path is influenced by CLI arguments.");
    } else if (
      sourceRank === INPUT_RANK.CRITICAL &&
      flowConfidence === "HIGH" &&
      !isValidated &&
      networkExposed
    ) {
      severity = "high";
      exploitability = "Likely";
      notes.push("Path comes from network input, no clear validation/normalization, and network exposure is present.");
    } else if (
      executionContext === EXECUTION_CONTEXTS.CLI_TOOL ||
      executionContext === EXECUTION_CONTEXTS.BUILD_SCRIPT
    ) {
      severity = flowConfidence === "NONE" ? "informational" : "low";
      exploitability = "Unlikely";
      notes.push("Path handling occurs in CLI/build context; downgraded due to limited remote attack surface.");
    } else if (isValidated) {
      severity = severityRank(severity) > severityRank("low") ? "low" : severity;
      notes.push("Path appears normalized or validated near sink.");
    } else if (sourceRank === INPUT_RANK.CRITICAL && flowConfidence !== "NONE") {
      severity = networkExposed ? "medium" : "low";
      exploitability = networkExposed ? "Possible" : "Unlikely";
      notes.push("Path traversal prerequisites are partial; high severity is not assigned.");
    } else {
      severity = flowConfidence === "NONE" ? "informational" : "low";
      exploitability = "Unlikely";
    }
  }

  if (vulnerabilityId === "sensitive_logging") {
    const hasSecretEvidence = Boolean(meta.hasSecretEvidence);
    const sourceRiskCondition =
      sourceRank === INPUT_RANK.CRITICAL || sourceRank === INPUT_RANK.MEDIUM;
    if (!hasSecretEvidence && !sourceRiskCondition) {
      severity = "informational";
      exploitability = "Unlikely";
      notes.push("No secret evidence or medium/critical source risk found in logging arguments.");
    } else if (
      executionContext === EXECUTION_CONTEXTS.CLI_TOOL &&
      sourceRank === INPUT_RANK.LOW &&
      !hasSecretEvidence
    ) {
      severity = "informational";
      exploitability = "Unlikely";
      notes.push("CLI logging with LOW-ranked source and no secret evidence is treated as suppressed noise.");
    } else if (sourceRank === INPUT_RANK.LOW && !hasSecretEvidence) {
      severity = "low";
      notes.push("Logged source appears low-risk (environment/config) and not direct attacker input.");
    }
  }

  if (sourceRank === INPUT_RANK.LOW && vulnerabilityId !== "hardcoded_secret") {
    severity = severityRank(severity) > severityRank("low") ? "low" : severity;
    notes.push("Input source rank is LOW (env/config/static), so high severity is not assigned.");
  }

  severity = capSeverityForAttackSurface(severity, attackSurface);

  const detectionConfidence =
    typeof meta.detectionConfidenceOverride === "number"
      ? Math.max(0, Math.min(100, Math.round(meta.detectionConfidenceOverride)))
      : detectionConfidenceFromCall(callInfo);
  const flowConfidenceScore = flowConfidenceScoreRaw;
  const flowConfidenceLabelValue = flowConfidence;
  const exploitabilityConfidence =
    typeof meta.exploitabilityConfidenceOverride === "number"
      ? Math.max(0, Math.min(100, Math.round(meta.exploitabilityConfidenceOverride)))
      : exploitabilityConfidenceScore({
          executionContext,
          attackSurface,
          sourceRank,
          exploitability,
        });
  const overallConfidence = computeOverallConfidence({
    detectionConfidence,
    flowConfidence: flowConfidenceScore,
    exploitabilityConfidence,
    flowConfidenceLabelValue,
    exploitability,
  });
  const confidenceScore = overallConfidence;
  const confidence = toConfidenceLabel(overallConfidence);
  const manualReviewSuggested = overallConfidence < 60;
  const suppressionEligible =
    [EXECUTION_CONTEXTS.CLI_TOOL, EXECUTION_CONTEXTS.BUILD_SCRIPT, EXECUTION_CONTEXTS.TEST_FILE].includes(
      executionContext
    ) &&
    sourceRank === INPUT_RANK.LOW &&
    exploitability === "Unlikely" &&
    flowConfidenceLabelValue !== "HIGH";

  const whyThisMatters =
    definition?.impact ||
    "This pattern can become a security issue when attacker-controlled data reaches a sensitive operation.";
  const realisticRiskAssessment =
    attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
      ? "Code appears reachable from a public HTTP surface, so attacker-controlled requests are plausible."
      : `This runs in ${executionContext} with ${attackSurface} exposure, which lowers realistic remote exploitability.`;
  const developerAction =
    severityRank(severity) <= severityRank("informational")
      ? "No urgent fix required. Keep safeguards and monitor changes to exposure."
      : definition?.recommendation ||
        "Apply input validation, safe API usage, and strict authorization checks.";

  const reasoningParts = [
    `Execution context: ${executionContext}`,
    `Attack surface: ${attackSurface}`,
    `Sink confirmed: ${sinkConfirmed ? "yes" : "no"}`,
    `Input source rank: ${sourceRank}`,
    `Flow confidence: ${flowConfidenceLabelValue}`,
    `Exploitability: ${exploitability}`,
    `Detection confidence: ${detectionConfidence}`,
    `Flow confidence score: ${flowConfidenceScore}`,
    `Exploitability confidence: ${exploitabilityConfidence}`,
    `Overall confidence: ${overallConfidence}`,
  ];
  if (notes.length > 0) reasoningParts.push(...notes);
  if (manualReviewSuggested) reasoningParts.push("Manual Review Suggested (confidence < 60).");

  return {
    severity,
    confidence,
    confidenceScore,
    sourceRank,
    flowConfidence: flowConfidenceLabelValue,
    exploitability,
    sinkConfirmed,
    manualReviewSuggested,
    attackSurface,
    detectionConfidence,
    flowConfidenceScore,
    exploitabilityConfidence,
    overallConfidence,
    suppressionEligible,
    whyThisMatters,
    realisticRiskAssessment,
    developerAction,
    reasoning: reasoningParts.join(" "),
    flowConfidenceRaw: initialFlowConfidence,
  };
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
    return {
      findings: [],
      parseError: true,
      metrics: {
        httpRoutesAnalyzed: 0,
        sinksReviewed: 0,
        secretPatternsChecked: 0,
      },
    };
  }

  const state = {
    file,
    content,
    lines: content.split(/\r?\n/),
    imports: new Map(),
    importsByName: new Map(),
    taint: new Map(),
    findings: [],
    dedupe: new Set(),
    metrics: {
      httpRoutesAnalyzed: 0,
      sinksReviewed: 0,
      secretPatternsChecked: 0,
    },
    executionContext: classifyExecutionContext({
      filePath: file.path,
      content,
      ast,
    }),
  };

  const trackHardcodedSecret = (lineNode, keyName, rawValue) => {
    if (!testSensitiveNamePattern(state, keyName)) return;
    if (!looksLikeSecret(rawValue)) return;
    const def = VULNERABILITY_DEFINITIONS.hardcoded_secret;
    if (!def) return;
    const lineStart = Number(lineNode?.loc?.start?.line || 1);
    const lineEnd = Number(lineNode?.loc?.end?.line || lineStart);
    const executionContext = state.executionContext;
    const attackSurface = mapAttackSurface(executionContext);
    const baseSeverity = rawValue.startsWith("-----BEGIN") ? "critical" : "high";
    const severity = capSeverityForAttackSurface(baseSeverity, attackSurface);
    const detectionConfidence = 95;
    const flowConfidenceValue = 35;
    const exploitabilityConfidence = exploitabilityConfidenceScore({
      executionContext,
      attackSurface,
      sourceRank: INPUT_RANK.LOW,
      exploitability: rawValue.startsWith("-----BEGIN") ? "Likely" : "Possible",
    });
    const overallConfidence = computeOverallConfidence({
      detectionConfidence,
      flowConfidence: flowConfidenceValue,
      exploitabilityConfidence,
      flowConfidenceLabelValue: "NONE",
      exploitability: attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Likely" : "Possible",
    });
    const confidenceScore = overallConfidence;
    addFinding(state, {
      filePath: file.path,
      language: file.language,
      lineStart,
      lineEnd,
      ruleId: def.id,
      rootCausePattern: def.rootCausePattern,
      category: toTitleCase(def.concept || def.category),
      cwe: def.cwe,
      severity,
      confidence: toConfidenceLabel(overallConfidence),
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
      codeBlockHtml: sanitizeBlockHtml(
        def.id,
        buildCodeBlockHtml(state.lines, lineStart, lineEnd)
      ),
      fullyQualifiedFunction: "local.constant_assignment",
      resolvedModuleSource: "local",
      importVerified: false,
      sourceToSinkDetected: false,
      flowStatus: "none",
      confidenceReason: `Confidence ${confidenceScore}/100 based on direct literal detection.`,
      needsManualReview: confidenceScore < 60,
      executionContext,
      attackSurface,
      inputSourceRank: INPUT_RANK.LOW,
      exploitability:
        attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
          ? rawValue.startsWith("-----BEGIN")
            ? "Likely"
            : "Possible"
          : "Unlikely",
      confidenceScore,
      detectionConfidence,
      flowConfidenceValue,
      exploitabilityConfidence,
      overallConfidence,
      reasoning: `Execution context: ${executionContext}. Hardcoded secret in source can expose credentials if code or artifacts leak.`,
      whyThisMatters:
        "Hardcoded credentials can be leaked through source access, logs, backups, or build artifacts.",
      realisticRiskAssessment:
        attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
          ? "Public deployment increases blast radius if this secret is compromised."
          : "No direct public HTTP attack surface detected, but secret exposure still creates account compromise risk.",
      developerAction:
        "Move this secret to a secure secret manager and rotate any value already committed.",
      suppressed: false,
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

    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      const fnName =
        declaration?.type === "FunctionDeclaration" ? declaration.id?.name : null;
      if (fnName && /^(GET|POST|PUT|DELETE|PATCH|OPTIONS)$/i.test(fnName)) {
        state.metrics.httpRoutesAnalyzed += 1;
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
      if (matched.length > 0) {
        state.metrics.sinksReviewed += matched.length;
      }
      const callChain = getMemberChain(path.node.callee);
      if (Array.isArray(callChain) && callChain.length >= 2) {
        const root = String(callChain[0] || "").toLowerCase();
        const method = String(callChain[callChain.length - 1] || "").toLowerCase();
        if (
          (root === "app" || root === "router" || root === "fastify") &&
          HTTP_ROUTE_METHODS.has(method)
        ) {
          state.metrics.httpRoutesAnalyzed += 1;
        }
      }
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
          const staticPathCandidate = isStaticPathExpression(firstArg);
          if (firstTrace.kind === "none" && !staticPathCandidate) continue;
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
          const logging = analyzeLoggingArguments(args, path.scope, state);
          if (logging.pureStringOnly) continue;
          if (!logging.confirmedSensitiveSource) continue;

          const loggingTrace =
            logging.trace?.kind && logging.trace.kind !== "none"
              ? logging.trace
              : {
                  kind: "partial",
                  sources: [
                    {
                      label: "Sensitive value directly passed to logging sink",
                      line: Number(path.node?.loc?.start?.line || 0),
                      type: "auth_payload",
                    },
                  ],
                };
          const sourceRank =
            logging.sourceRank && logging.sourceRank !== INPUT_RANK.UNKNOWN
              ? logging.sourceRank
              : INPUT_RANK.MEDIUM;
          const hasConfirmedTrace = logging.trace?.kind === "confirmed";
          const hasPartialTrace = logging.trace?.kind === "partial";
          const flowScoreOverride = hasConfirmedTrace
            ? 100
            : hasPartialTrace || logging.clearFlow
            ? 72
            : 60;
          const flowLabelOverride = hasConfirmedTrace ? "HIGH" : "PARTIAL";
          const reasonDetail = logging.reasons.slice(0, 2).join(" ");
          createCallFinding({
            state,
            path,
            definition: def,
            callInfo,
            trace: loggingTrace,
            reason: reasonDetail
              ? `Logging sink outputs sensitive data. ${reasonDetail}`
              : "Logging sink outputs sensitive authentication or secret data.",
            meta: {
              hasSecretEvidence: true,
              inputSourceRankOverride: sourceRank,
              flowConfidenceOverride: flowLabelOverride,
              detectionConfidenceOverride: 100,
              flowConfidenceScoreOverride: flowScoreOverride,
            },
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
              severity: allTrace.kind === "confirmed" ? "low" : "informational",
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
      state.metrics.sinksReviewed += 1;
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

  return {
    findings: state.findings,
    parseError: false,
    metrics: state.metrics,
  };
}

function groupFindings(findings, options = {}) {
  const suppressed = Boolean(options?.suppressed);
  const groups = new Map();

  for (const finding of findings) {
    const key = `${finding.cwe}|${finding.category}|${finding.rootCausePattern}`;
    const instance = {
      file: finding.filePath,
      line_start: finding.lineStart,
      line_end: finding.lineEnd,
      evidence: finding.evidence,
      code_block: finding.codeBlock,
      code_block_html: finding.codeBlockHtml || "",
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
      execution_context: finding.executionContext || EXECUTION_CONTEXTS.INTERNAL_LIB,
      attack_surface: finding.attackSurface || ATTACK_SURFACE.INTERNAL_SERVICE,
      input_source_rank: finding.inputSourceRank || INPUT_RANK.UNKNOWN,
      trust_level: finding.trustLevel || INPUT_TRUST_LEVEL.LOCAL_CONSTANT,
      context_adjustment: finding.contextAdjustment || "",
      exploitability: finding.exploitability || "Unlikely",
      confidence_score: Number(finding.confidenceScore || 0),
      detection_confidence: Number(finding.detectionConfidence || 0),
      flow_confidence: Number(finding.flowConfidenceValue || 0),
      exploitability_confidence: Number(finding.exploitabilityConfidence || 0),
      overall_confidence: Number(finding.overallConfidence || finding.confidenceScore || 0),
      reasoning: finding.reasoning || "",
      why_this_matters: finding.whyThisMatters || "",
      realistic_risk_assessment: finding.realisticRiskAssessment || "",
      developer_action: finding.developerAction || "",
      suppressed,
    };

    if (!groups.has(key)) {
      groups.set(key, {
        category: finding.category,
        cwe: finding.cwe,
        severity: toTitleCase(finding.severity),
        confidence: toTitleCase(finding.confidence),
        confidence_score: Number(finding.confidenceScore || 0),
        detection_confidence: Number(finding.detectionConfidence || 0),
        flow_confidence: Number(finding.flowConfidenceValue || 0),
        exploitability_confidence: Number(finding.exploitabilityConfidence || 0),
        overall_confidence: Number(finding.overallConfidence || finding.confidenceScore || 0),
        execution_context: finding.executionContext || EXECUTION_CONTEXTS.INTERNAL_LIB,
        execution_contexts: [finding.executionContext || EXECUTION_CONTEXTS.INTERNAL_LIB],
        attack_surface: finding.attackSurface || ATTACK_SURFACE.INTERNAL_SERVICE,
        attack_surfaces: [finding.attackSurface || ATTACK_SURFACE.INTERNAL_SERVICE],
        input_source_rank: finding.inputSourceRank || INPUT_RANK.UNKNOWN,
        trust_level: finding.trustLevel || INPUT_TRUST_LEVEL.LOCAL_CONSTANT,
        context_adjustment: finding.contextAdjustment || "",
        exploitability: finding.exploitability || "Unlikely",
        reasoning: finding.reasoning || "",
        why_this_matters: finding.whyThisMatters || "",
        realistic_risk_assessment: finding.realisticRiskAssessment || "",
        developer_action: finding.developerAction || "",
        suppressed,
        root_cause_pattern: finding.rootCausePattern,
        title: finding.title,
        description: finding.description,
        impact: finding.impact,
        recommendation: finding.recommendation,
        instances: [instance],
        _confidence_score_sum: Number(finding.confidenceScore || 0),
        _confidence_score_count: 1,
        _detection_confidence_sum: Number(finding.detectionConfidence || 0),
        _flow_confidence_sum: Number(finding.flowConfidenceValue || 0),
        _exploitability_confidence_sum: Number(finding.exploitabilityConfidence || 0),
        _overall_confidence_sum: Number(
          finding.overallConfidence || finding.confidenceScore || 0
        ),
        _context_adjustments: finding.contextAdjustment ? [finding.contextAdjustment] : [],
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
    current.input_source_rank = mergeInputRank(
      current.input_source_rank,
      finding.inputSourceRank
    );
    current.trust_level = mergeTrustLevel(current.trust_level, finding.trustLevel);
    current.exploitability = mergeExploitability(
      current.exploitability,
      finding.exploitability
    );
    current.attack_surface = mergeAttackSurface(current.attack_surface, finding.attackSurface);
    current.attack_surfaces = Array.from(
      new Set([
        ...(current.attack_surfaces || []),
        finding.attackSurface || ATTACK_SURFACE.INTERNAL_SERVICE,
      ])
    );
    current.attack_surface =
      current.attack_surfaces.length === 1
        ? current.attack_surfaces[0]
        : ATTACK_SURFACE.MIXED;
    current.execution_contexts = Array.from(
      new Set([
        ...(current.execution_contexts || []),
        finding.executionContext || EXECUTION_CONTEXTS.INTERNAL_LIB,
      ])
    );
    current.execution_context =
      current.execution_contexts.length === 1
        ? current.execution_contexts[0]
        : EXECUTION_CONTEXTS.MIXED;
    current._confidence_score_sum += Number(finding.confidenceScore || 0);
    current._confidence_score_count += 1;
    current._detection_confidence_sum += Number(finding.detectionConfidence || 0);
    current._flow_confidence_sum += Number(finding.flowConfidenceValue || 0);
    current._exploitability_confidence_sum += Number(finding.exploitabilityConfidence || 0);
    current._overall_confidence_sum += Number(
      finding.overallConfidence || finding.confidenceScore || 0
    );
    if (finding.contextAdjustment) {
      current._context_adjustments = [
        ...(current._context_adjustments || []),
        finding.contextAdjustment,
      ];
      current.context_adjustment = Array.from(new Set(current._context_adjustments)).join("; ");
    }
    if (!current.reasoning && finding.reasoning) current.reasoning = finding.reasoning;
    if (!current.why_this_matters && finding.whyThisMatters) {
      current.why_this_matters = finding.whyThisMatters;
    }
    if (!current.realistic_risk_assessment && finding.realisticRiskAssessment) {
      current.realistic_risk_assessment = finding.realisticRiskAssessment;
    }
    if (!current.developer_action && finding.developerAction) {
      current.developer_action = finding.developerAction;
    }
    current.instances.push(instance);
  }

  return Array.from(groups.values())
    .map((group) => {
      const confidenceScore = group._confidence_score_count
        ? Math.round(group._confidence_score_sum / group._confidence_score_count)
        : 0;
      const detectionConfidence = group._confidence_score_count
        ? Math.round(group._detection_confidence_sum / group._confidence_score_count)
        : 0;
      const flowConfidence = group._confidence_score_count
        ? Math.round(group._flow_confidence_sum / group._confidence_score_count)
        : 0;
      const exploitabilityConfidence = group._confidence_score_count
        ? Math.round(group._exploitability_confidence_sum / group._confidence_score_count)
        : 0;
      const overallConfidence = group._confidence_score_count
        ? Math.round(group._overall_confidence_sum / group._confidence_score_count)
        : confidenceScore;
      const {
        _confidence_score_sum,
        _confidence_score_count,
        _detection_confidence_sum,
        _flow_confidence_sum,
        _exploitability_confidence_sum,
        _overall_confidence_sum,
        _context_adjustments,
        ...rest
      } = group;
      return {
        ...rest,
        context_adjustment:
          rest.context_adjustment ||
          Array.from(new Set(_context_adjustments || [])).join("; "),
        confidence_score: confidenceScore,
        detection_confidence: detectionConfidence,
        flow_confidence: flowConfidence,
        exploitability_confidence: exploitabilityConfidence,
        overall_confidence: overallConfidence,
        instances: group.instances.sort((a, b) => {
          if (a.file !== b.file) return a.file.localeCompare(b.file);
          return a.line_start - b.line_start;
        }),
      };
    })
    .sort((a, b) => {
      const severityDiff =
        severityRank(String(b.severity || "").toLowerCase()) -
        severityRank(String(a.severity || "").toLowerCase());
      if (severityDiff !== 0) return severityDiff;
      return b.instances.length - a.instances.length;
    });
}

function buildAnalytics({ groupedIssues, totalInstances }) {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
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
    if (severityCounts[severity] === undefined) severityCounts[severity] = 0;
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

function issueHasPublicHttpSurface(issue) {
  if (!issue) return false;
  if (issue.attack_surface === ATTACK_SURFACE.PUBLIC_HTTP) return true;
  return Array.isArray(issue.attack_surfaces)
    ? issue.attack_surfaces.includes(ATTACK_SURFACE.PUBLIC_HTTP)
    : false;
}

function computeSecurityScore({ groupedIssues }) {
  const deductions = [];
  let totalDeduction = 0;
  let highPublicHttpInstances = 0;

  for (const issue of groupedIssues || []) {
    const severity = String(issue?.severity || "informational").toLowerCase();
    const instanceCount = Number(issue?.instances?.length || 0);
    if (instanceCount <= 0) continue;

    const perInstance = SCORE_DEDUCTION_BY_SEVERITY[severity] ?? 1;
    const cap = SCORE_CAP_BY_SEVERITY[severity] ?? Number.POSITIVE_INFINITY;
    const rawDeduction = perInstance * instanceCount;
    const cappedDeduction = Math.min(rawDeduction, cap);
    const publicHttp = issueHasPublicHttpSurface(issue);
    const exploitability = String(issue?.exploitability || "Unlikely");

    let adjustedDeduction = cappedDeduction;
    const modifiers = [];
    if (publicHttp) {
      adjustedDeduction *= 1.2;
      modifiers.push("PUBLIC_HTTP:+20%");
    }
    if (exploitability === "Likely") {
      adjustedDeduction *= 1.15;
      modifiers.push("LIKELY:+15%");
    }

    const pointsDeducted = Math.max(0, Math.round(adjustedDeduction));
    totalDeduction += pointsDeducted;
    deductions.push({
      type: issue.category,
      severity: toTitleCase(severity),
      points_deducted: pointsDeducted,
      instance_count: instanceCount,
      attack_surface: issue.attack_surface || ATTACK_SURFACE.INTERNAL_SERVICE,
      exploitability,
      modifiers,
      cap_applied: rawDeduction > cappedDeduction,
    });

    if (severity === "high" && publicHttp) {
      highPublicHttpInstances += instanceCount;
    }
  }

  let securityScore = Math.max(0, 100 - totalDeduction);
  if (highPublicHttpInstances >= 3 && securityScore >= 80) {
    const guardrailDeduction = securityScore - 79;
    securityScore = 79;
    deductions.push({
      type: "Public HTTP High-Risk Guardrail",
      severity: "High",
      points_deducted: guardrailDeduction,
      instance_count: highPublicHttpInstances,
      attack_surface: ATTACK_SURFACE.PUBLIC_HTTP,
      exploitability: "Likely",
      modifiers: ["AUTO_RULE:3+HIGH_PUBLIC_HTTP"],
      cap_applied: false,
    });
    totalDeduction += guardrailDeduction;
  }

  deductions.sort((a, b) => b.points_deducted - a.points_deducted);
  return {
    securityScore,
    totalDeduction,
    deductions,
    highPublicHttpInstances,
  };
}

function buildSecurityCoverageSummary({
  filesScanned,
  httpRoutesAnalyzed,
  sinksReviewed,
  secretPatternsChecked,
  authenticationRelatedFilesInspected,
}) {
  return {
    http_routes_analyzed: Number(httpRoutesAnalyzed || 0),
    sinks_reviewed: Number(sinksReviewed || 0),
    files_scanned: Number(filesScanned || 0),
    secret_patterns_checked: Number(secretPatternsChecked || 0),
    authentication_related_files_inspected: Number(authenticationRelatedFilesInspected || 0),
  };
}

function buildPositiveSecuritySignals() {
  return [
    "No command injection patterns found.",
    "No dynamic code execution detected.",
    "No hardcoded secrets detected.",
    "No unvalidated filesystem access detected.",
    "No raw query string concatenation detected at SQL sinks.",
  ];
}

function buildHardeningRecommendations() {
  return [
    "Enable endpoint rate limiting for public APIs.",
    "Enforce schema-based input validation at request boundaries.",
    "Apply secure HTTP headers (CSP, HSTS, X-Content-Type-Options, frame restrictions).",
    "Run scheduled dependency audit checks in CI/CD.",
  ];
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
  suppressedGroupedIssues,
  totalInstances,
  analytics,
  securityCoverageSummary,
  skippedFiles,
  unsupportedLanguageFiles,
  unsupportedLanguagesDetected,
}) {
  const insights = [];
  if (totalInstances === 0) {
    insights.push("No exploitable vulnerabilities were detected in developer-written code.");
    if (securityCoverageSummary) {
      insights.push(
        `Coverage summary: ${securityCoverageSummary.files_scanned} files scanned, ${securityCoverageSummary.http_routes_analyzed} HTTP routes analyzed, ${securityCoverageSummary.sinks_reviewed} sinks reviewed.`
      );
    }
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
      `${unsupportedLanguageFiles} files were skipped because semantic adapters are currently active for JavaScript/TypeScript, Java, and Python only. Detected unsupported languages: ${list}.`
    );
  }

  if (skippedFiles > 0) {
    insights.push(
      `${skippedFiles} files were excluded/skipped by dependency, generated, artifact, or safety filters.`
    );
  }

  const suppressedCount = (suppressedGroupedIssues || []).reduce(
    (sum, issue) => sum + Number(issue?.instances?.length || 0),
    0
  );
  if (suppressedCount > 0) {
    insights.push(
      `${suppressedCount} low-value findings were suppressed by context-aware trust filters (expand suppressed issues to review).`
    );
  }

  return insights;
}

function getFindingSignalText(finding) {
  return [
    finding?.filePath,
    finding?.evidence,
    finding?.flowHint,
    finding?.matchedExpression,
    finding?.fullyQualifiedFunction,
    finding?.reasoning,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function classifyTrustLevelForFinding(finding) {
  const signalText = getFindingSignalText(finding);

  if (
    /\bprocess\.env\b|\bsystem\.getenv\b|\bos\.environ\b|\bdotenv\b/.test(signalText)
  ) {
    return INPUT_TRUST_LEVEL.ENVIRONMENT_VARIABLE;
  }

  if (
    /\.env(\.|\/|$)|application\.properties|application\.ya?ml|config\.json|config\/|\/config\//.test(
      signalText
    )
  ) {
    return INPUT_TRUST_LEVEL.CONFIG_FILE;
  }

  if (
    /\bfetch\s*\(|axios|resttemplate|httpclient|external_api|external service|third[- ]party|webhook/.test(
      signalText
    )
  ) {
    return INPUT_TRUST_LEVEL.EXTERNAL_SERVICE;
  }

  if (
    /\b(req|request)\.(body|query|params|headers|cookies|args|form|json|data|get|post)\b|@requestparam|@pathvariable|@requestbody|\binput\s*\(/.test(
      signalText
    )
  ) {
    return INPUT_TRUST_LEVEL.USER_CONTROLLED;
  }

  if (
    /static constant path|constant path|hardcoded|literal|__dirname|__filename|static join with constant filename/.test(
      signalText
    )
  ) {
    return INPUT_TRUST_LEVEL.LOCAL_CONSTANT;
  }

  const rank = String(finding?.inputSourceRank || "").toUpperCase();
  if (rank === INPUT_RANK.CRITICAL) return INPUT_TRUST_LEVEL.USER_CONTROLLED;
  if (rank === INPUT_RANK.MEDIUM) return INPUT_TRUST_LEVEL.EXTERNAL_SERVICE;
  if (rank === INPUT_RANK.LOW) return INPUT_TRUST_LEVEL.CONFIG_FILE;
  return INPUT_TRUST_LEVEL.LOCAL_CONSTANT;
}

function classifyReportingExecutionContext(finding) {
  const current = String(finding?.executionContext || "").toUpperCase();
  const path = getPathLower(finding?.filePath || "");

  if (current === EXECUTION_CONTEXTS.WEB_SERVER && path.includes("/api/")) {
    return REPORTING_EXECUTION_CONTEXTS.API_SERVER;
  }
  if (current === EXECUTION_CONTEXTS.CLI_TOOL) return REPORTING_EXECUTION_CONTEXTS.CLI_TOOL;
  if (current === EXECUTION_CONTEXTS.CONFIG_FILE) return REPORTING_EXECUTION_CONTEXTS.CONFIG_FILE;
  if (
    current === EXECUTION_CONTEXTS.BUILD_SCRIPT ||
    path.includes("/scripts/") ||
    /\.(sh|bash|zsh|ps1|psm1|psd1)$/.test(path)
  ) {
    return REPORTING_EXECUTION_CONTEXTS.LOCAL_SCRIPT;
  }
  if (current === EXECUTION_CONTEXTS.WEB_SERVER) return REPORTING_EXECUTION_CONTEXTS.WEB_SERVER;
  return current || REPORTING_EXECUTION_CONTEXTS.LOCAL_SCRIPT;
}

function isAnalyzerInfrastructurePath(filePath) {
  const normalized = getPathLower(filePath || "");
  return INFRASTRUCTURE_PATH_SEGMENTS.some((segment) => normalized.includes(segment));
}

function isFilesystemFinding(finding) {
  const category = String(finding?.category || "").toLowerCase();
  const ruleId = String(finding?.ruleId || "").toLowerCase();
  const pattern = String(finding?.rootCausePattern || "").toLowerCase();
  return (
    ruleId === "path_traversal" ||
    String(finding?.cwe || "").toUpperCase() === "CWE-22" ||
    category.includes("path traversal") ||
    pattern.includes("filesystem")
  );
}

function applyPostProcessSeverityAdjustments({ finding, trustLevel, reportingContext, adjustments }) {
  let severity = String(finding?.severity || "informational").toLowerCase();

  if (
    reportingContext === REPORTING_EXECUTION_CONTEXTS.CLI_TOOL ||
    reportingContext === REPORTING_EXECUTION_CONTEXTS.LOCAL_SCRIPT
  ) {
    const downgraded = downgradeSeverityOneLevel(severity);
    if (downgraded !== severity) {
      severity = downgraded;
      adjustments.push("Severity downgraded due to CLI execution context");
    }
  }

  if (
    trustLevel === INPUT_TRUST_LEVEL.ENVIRONMENT_VARIABLE &&
    !DANGEROUS_SINK_RULE_IDS.has(String(finding?.ruleId || ""))
  ) {
    if (severityRank(severity) > severityRank("medium")) {
      severity = "medium";
      adjustments.push("Severity capped at Medium for environment-variable source");
    }
  }

  if (
    trustLevel === INPUT_TRUST_LEVEL.CONFIG_FILE ||
    (trustLevel === INPUT_TRUST_LEVEL.LOCAL_CONSTANT &&
      String(finding?.ruleId || "") !== "hardcoded_secret")
  ) {
    if (severityRank(severity) > severityRank("low")) {
      severity = "low";
      adjustments.push("Severity capped due to low-trust config/local source");
    }
  }

  return severity;
}

function refineFilesystemClassification({ finding, trustLevel, adjustments }) {
  if (!isFilesystemFinding(finding)) return;

  if (trustLevel === INPUT_TRUST_LEVEL.ENVIRONMENT_VARIABLE) {
    finding.cwe = "CWE-73";
    finding.category = "Filesystem Path From Environment Input";
    finding.title = "Filesystem path operation influenced by environment source";
    adjustments.push("CWE refined from path traversal to environment-controlled filesystem path");
    if (severityRank(String(finding?.severity || "").toLowerCase()) > severityRank("medium")) {
      finding.severity = "medium";
      adjustments.push("Severity reduced: environment-based filesystem path is not direct remote input");
    }
    return;
  }

  if (trustLevel === INPUT_TRUST_LEVEL.LOCAL_CONSTANT) {
    finding.forceSuppressed = true;
    adjustments.push("Suppressed: filesystem operation uses constant path and is not exploitable");
  }
}

function adjustPublicHttpExploitability(finding, adjustments) {
  if (finding?.attackSurface !== ATTACK_SURFACE.PUBLIC_HTTP) return;
  const currentExploitability = String(finding?.exploitability || "Possible");
  if (currentExploitability === "Unlikely") {
    finding.exploitability = "Possible";
  } else if (currentExploitability === "Possible") {
    finding.exploitability = "Likely";
  }

  const boostedExploitabilityConfidence = Math.min(
    100,
    Number(finding?.exploitabilityConfidence || 0) + 10
  );
  finding.exploitabilityConfidence = boostedExploitabilityConfidence;

  const detectionConfidence = Math.max(0, Math.min(100, Number(finding?.detectionConfidence || 0)));
  const flowConfidenceValue = Math.max(0, Math.min(100, Number(finding?.flowConfidenceValue || 0)));
  const overallConfidence = computeOverallConfidence({
    detectionConfidence,
    flowConfidence: flowConfidenceValue,
    exploitabilityConfidence: boostedExploitabilityConfidence,
    flowConfidenceLabelValue: flowConfidenceLabel(flowConfidenceValue),
    exploitability: finding.exploitability || "Possible",
  });

  finding.confidenceScore = overallConfidence;
  finding.overallConfidence = overallConfidence;
  finding.confidence = toConfidenceLabel(overallConfidence);
  adjustments.push("Exploitability score increased due to PUBLIC_HTTP attack surface");
}

function postProcessFindings(findings) {
  return (findings || []).map((finding) => {
    const adjusted = { ...finding };
    const adjustments = [];

    const trustLevel = classifyTrustLevelForFinding(adjusted);
    adjusted.trustLevel = trustLevel;
    adjusted.inputSourceRank = mapTrustLevelToInputRank(trustLevel);

    const reportingContext = classifyReportingExecutionContext(adjusted);
    adjusted.executionContext = reportingContext;

    adjusted.severity = applyPostProcessSeverityAdjustments({
      finding: adjusted,
      trustLevel,
      reportingContext,
      adjustments,
    });

    refineFilesystemClassification({
      finding: adjusted,
      trustLevel,
      adjustments,
    });

    if (isAnalyzerInfrastructurePath(adjusted.filePath)) {
      adjusted.forceSuppressed = true;
      adjustments.push("Suppressed: analyzer/test infrastructure path");
    }

    adjustPublicHttpExploitability(adjusted, adjustments);

    adjusted.contextAdjustment = adjustments.join("; ");
    if (adjusted.contextAdjustment) {
      adjusted.reasoning = `${adjusted.reasoning || ""} ${adjusted.contextAdjustment}`.trim();
    }

    return adjusted;
  });
}

function shouldSuppressFinding(finding) {
  if (finding?.forceSuppressed) return true;
  const executionContext = finding.executionContext;
  const lowValueContext = [
    EXECUTION_CONTEXTS.CLI_TOOL,
    EXECUTION_CONTEXTS.BUILD_SCRIPT,
    EXECUTION_CONTEXTS.TEST_FILE,
    REPORTING_EXECUTION_CONTEXTS.LOCAL_SCRIPT,
  ].includes(executionContext);
  const lowRank = finding.inputSourceRank === INPUT_RANK.LOW;
  const lowExploitability = finding.exploitability === "Unlikely";
  const noConfirmedFlow = String(finding.flowStatus || "none").toLowerCase() !== "confirmed";
  return lowValueContext && lowRank && lowExploitability && noConfirmedFlow;
}

function splitSuppressedFindings(findings) {
  const active = [];
  const suppressed = [];

  for (const finding of findings || []) {
    if (shouldSuppressFinding(finding)) {
      suppressed.push({ ...finding, suppressed: true });
    } else {
      active.push({ ...finding, suppressed: false });
    }
  }

  return { active, suppressed };
}

function emptyAnalyzerMetrics() {
  return {
    httpRoutesAnalyzed: 0,
    sinksReviewed: 0,
    secretPatternsChecked: 0,
  };
}

function normalizeAnalyzerResult(result) {
  const safe = result || {};
  return {
    findings: Array.isArray(safe.findings) ? safe.findings : [],
    parseError: Boolean(safe.parseError),
    metrics: {
      httpRoutesAnalyzed: Number(safe.metrics?.httpRoutesAnalyzed || 0),
      sinksReviewed: Number(safe.metrics?.sinksReviewed || 0),
      secretPatternsChecked: Number(safe.metrics?.secretPatternsChecked || 0),
    },
    metadata: safe.metadata || {},
  };
}

function findingIdentityKey(finding) {
  return [
    finding?.ruleId || "",
    finding?.rootCausePattern || "",
    finding?.filePath || "",
    Number(finding?.lineStart || 0),
    Number(finding?.lineEnd || 0),
    finding?.matchedExpression || "",
  ].join("|");
}

function dedupeFindingList(findings) {
  const map = new Map();
  for (const finding of findings || []) {
    const key = findingIdentityKey(finding);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, finding);
      continue;
    }
    const incomingSeverity = severityRank(String(finding?.severity || "").toLowerCase());
    const existingSeverity = severityRank(String(existing?.severity || "").toLowerCase());
    if (incomingSeverity > existingSeverity) {
      map.set(key, finding);
      continue;
    }
    if (
      incomingSeverity === existingSeverity &&
      Number(finding?.overallConfidence || finding?.confidenceScore || 0) >
        Number(existing?.overallConfidence || existing?.confidenceScore || 0)
    ) {
      map.set(key, finding);
    }
  }
  return Array.from(map.values());
}

function mergeAnalyzerPhaseResults(results) {
  const normalized = (results || []).map((result) => normalizeAnalyzerResult(result));
  const findings = dedupeFindingList(normalized.flatMap((item) => item.findings || []));
  const parseError = normalized.some((item) => item.parseError);
  const metrics = normalized.reduce(
    (acc, item) => ({
      httpRoutesAnalyzed: acc.httpRoutesAnalyzed + Number(item.metrics?.httpRoutesAnalyzed || 0),
      sinksReviewed: acc.sinksReviewed + Number(item.metrics?.sinksReviewed || 0),
      secretPatternsChecked:
        acc.secretPatternsChecked + Number(item.metrics?.secretPatternsChecked || 0),
    }),
    emptyAnalyzerMetrics()
  );

  return {
    findings,
    parseError,
    metrics,
    metadata: {
      detection_layers: normalized.length > 1 ? "hybrid_pattern_flow_config" : "single_pass",
      phase_count: normalized.length,
    },
  };
}

function toLineNumberFromIndex(content, index) {
  const text = String(content || "");
  const bounded = Math.max(0, Math.min(Number(index || 0), text.length));
  return text.slice(0, bounded).split(/\r?\n/).length;
}

function extractCallArgsText(line) {
  const text = String(line || "");
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + 1, end);
}

function inferExecutionContextForSupplemental(filePath, content) {
  const normalizedPath = getPathLower(filePath);
  const fileName = normalizedPath.split("/").pop() || "";
  if (
    hasPathSegment(normalizedPath, "__tests__") ||
    hasPathSegment(normalizedPath, "test") ||
    /\.(spec|test)\.(js|jsx|ts|tsx|mjs|cjs|py|java)$/.test(fileName)
  ) {
    return EXECUTION_CONTEXTS.TEST_FILE;
  }
  if (
    hasPathSegment(normalizedPath, "config") ||
    /\.(properties|ya?ml|xml|toml|ini|cfg|conf)$/.test(fileName)
  ) {
    return EXECUTION_CONTEXTS.CONFIG_FILE;
  }
  if (
    hasPathSegment(normalizedPath, "api") ||
    hasPathSegment(normalizedPath, "routes") ||
    hasPathSegment(normalizedPath, "controllers") ||
    /\b(app|router|fastify)\.(get|post|put|delete|patch|use)\s*\(/.test(content) ||
    /@(RestController|Controller|RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)\b/.test(
      content
    ) ||
    /^\s*@app\.(route|get|post|put|delete|patch|options|head)\s*\(/m.test(content)
  ) {
    return EXECUTION_CONTEXTS.WEB_SERVER;
  }
  if (hasPathSegment(normalizedPath, "bin") || hasPathSegment(normalizedPath, "scripts")) {
    return EXECUTION_CONTEXTS.CLI_TOOL;
  }
  if (hasPathSegment(normalizedPath, "build")) {
    return EXECUTION_CONTEXTS.BUILD_SCRIPT;
  }
  if (
    hasPathSegment(normalizedPath, "services") ||
    hasPathSegment(normalizedPath, "service") ||
    hasPathSegment(normalizedPath, "workers")
  ) {
    return EXECUTION_CONTEXTS.BACKEND_SERVICE;
  }
  return EXECUTION_CONTEXTS.INTERNAL_LIB;
}

function resolveRuleDefinition(id, fallback) {
  if (VULNERABILITY_DEFINITIONS[id]) return VULNERABILITY_DEFINITIONS[id];
  return {
    id,
    category: fallback.category || "Configuration",
    concept: fallback.concept || id,
    cwe: fallback.cwe || "CWE-NA",
    title: fallback.title || id,
    description: fallback.description || "",
    impact: fallback.impact || "",
    recommendation: fallback.recommendation || "",
    rootCausePattern: fallback.rootCausePattern || id,
  };
}

function createSupplementalFinding({
  file,
  lines,
  lineStart,
  lineEnd,
  definition,
  severity,
  executionContext,
  evidenceParts,
  matchedExpression,
  fullyQualifiedFunction,
  resolvedModuleSource,
  importVerified = false,
  sourceToSinkDetected = false,
  flowStatus = "none",
  inputSourceRank = INPUT_RANK.UNKNOWN,
  exploitability = "Possible",
  detectionConfidence = 88,
  flowConfidenceValue = 35,
  exploitabilityConfidence = 65,
  reasoning = "",
}) {
  const safeLineStart = Math.max(1, Number(lineStart || 1));
  const safeLineEnd = Math.max(safeLineStart, Number(lineEnd || safeLineStart));
  const attackSurface = mapAttackSurface(executionContext);
  const flowLabel = flowConfidenceLabel(flowConfidenceValue);
  const overallConfidence = computeOverallConfidence({
    detectionConfidence,
    flowConfidence: flowConfidenceValue,
    exploitabilityConfidence,
    flowConfidenceLabelValue: flowLabel,
    exploitability,
  });

  return {
    filePath: file.path,
    language: file.language,
    lineStart: safeLineStart,
    lineEnd: safeLineEnd,
    ruleId: definition.id,
    rootCausePattern: definition.rootCausePattern,
    category: toTitleCase(definition.concept || definition.category),
    cwe: definition.cwe || "CWE-NA",
    severity,
    confidence: toConfidenceLabel(overallConfidence),
    title: definition.title,
    description: definition.description,
    impact: definition.impact,
    recommendation: definition.recommendation,
    evidence: (evidenceParts || []).join(" | "),
    matchedExpression: String(matchedExpression || "").slice(0, 220),
    flowHint:
      sourceToSinkDetected && flowStatus !== "none"
        ? "Supplemental rule indicates possible source-to-sink risk."
        : "Supplemental rule matched configuration/pattern signal.",
    codeBlock: buildCodeBlock(lines, safeLineStart, safeLineEnd),
    codeBlockHtml: buildCodeBlockHtml(lines, safeLineStart, safeLineEnd),
    fullyQualifiedFunction: fullyQualifiedFunction || "supplemental.rule",
    resolvedModuleSource: resolvedModuleSource || "supplemental",
    importVerified: Boolean(importVerified),
    sourceToSinkDetected: Boolean(sourceToSinkDetected),
    flowStatus,
    confidenceReason: `Confidence ${overallConfidence}/100 from supplemental pattern/config rule.`,
    needsManualReview: overallConfidence < 60,
    executionContext,
    attackSurface,
    inputSourceRank,
    exploitability,
    confidenceScore: overallConfidence,
    detectionConfidence,
    flowConfidenceValue,
    exploitabilityConfidence,
    overallConfidence,
    reasoning:
      reasoning ||
      `Supplemental rule triggered in ${executionContext} with ${attackSurface} exposure.`,
    whyThisMatters:
      definition.impact ||
      "Insecure configuration or pattern can increase exploitability when deployed.",
    realisticRiskAssessment:
      attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
        ? "Public HTTP exposure increases practical risk if this pattern is reachable."
        : "This issue is primarily configuration/pattern based with non-public attack surface.",
    developerAction:
      definition.recommendation ||
      "Apply secure configuration and hardening controls for this issue type.",
    suppressed: false,
  };
}

function runJsTsPatternRules(file) {
  const ext = getExtension(file.path);
  if (!new Set(["js", "jsx", "ts", "tsx", "mjs", "cjs"]).has(ext)) {
    return { findings: [], parseError: false, metrics: emptyAnalyzerMetrics() };
  }

  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const executionContext = inferExecutionContextForSupplemental(file.path, content);
  const attackSurface = mapAttackSurface(executionContext);
  const findings = [];
  const metrics = emptyAnalyzerMetrics();

  const sqlDefinition = resolveRuleDefinition("sql_injection", {
    category: "Injection",
    concept: "SQL injection",
    cwe: "CWE-89",
    title: "Dynamic SQL query call in unresolved DB object",
    description: "Dynamic SQL text is passed to db.query/connection.query call.",
    impact: "May allow attacker-controlled SQL execution.",
    recommendation: "Use parameterized queries and avoid string concatenation in SQL.",
    rootCausePattern: "sql-query-construction-tainted-input",
  });

  const weakCryptoDefinition = resolveRuleDefinition("weak_crypto", {
    category: "Cryptography",
    concept: "Insecure cryptography",
    cwe: "CWE-327",
    title: "Weak hash algorithm in JS crypto usage",
    description: "Weak hash algorithm literal is used in crypto.createHash.",
    impact: "Weak hashes are susceptible to collisions.",
    recommendation: "Use SHA-256 or stronger hashing algorithms.",
    rootCausePattern: "weak-hash-algorithm-in-crypto-sink",
  });

  lines.forEach((rawLine, index) => {
    const line = String(rawLine || "");
    const lineNumber = index + 1;

    if (/\b(?:db|connection)\.query\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const argText = extractCallArgsText(line);
      const isDynamic =
        argText.includes("+") ||
        argText.includes("${") ||
        (/`/.test(argText) && !/^`[^$`]*`$/.test(argText));
      if (!isDynamic) return;

      const hasCriticalInput =
        /\b(req|request)\.(body|query|params|headers|cookies)\b/.test(argText) ||
        /\bprocess\.env\b/.test(argText) ||
        /\bwindow\.location\b/.test(argText) ||
        /\bdocument\.location\b/.test(argText);

      findings.push(
        createSupplementalFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition: sqlDefinition,
          severity: hasCriticalInput ? "high" : "medium",
          executionContext,
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: unresolved db.query/connection.query",
            "Pattern rule: dynamic SQL argument detected at query sink.",
          ],
          matchedExpression: "db.query",
          fullyQualifiedFunction: "unresolved.db.query",
          resolvedModuleSource: "unresolved",
          importVerified: false,
          sourceToSinkDetected: hasCriticalInput,
          flowStatus: hasCriticalInput ? "partial" : "none",
          inputSourceRank: hasCriticalInput ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
              ? hasCriticalInput
                ? "Likely"
                : "Possible"
              : "Possible",
          detectionConfidence: 82,
          flowConfidenceValue: hasCriticalInput ? 64 : 30,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 78 : 58,
          reasoning:
            "Pattern layer detected dynamic SQL composition at unresolved database query call.",
        })
      );
      return;
    }

    if (/\bcrypto\.createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/i.test(line)) {
      metrics.sinksReviewed += 1;
      findings.push(
        createSupplementalFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition: weakCryptoDefinition,
          severity: "medium",
          executionContext,
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: crypto.createHash",
            "Pattern rule: weak hash algorithm literal (MD5/SHA1).",
          ],
          matchedExpression: /sha1/i.test(line)
            ? 'crypto.createHash("sha1")'
            : 'crypto.createHash("md5")',
          fullyQualifiedFunction: "crypto.createHash",
          resolvedModuleSource: "javascript.local",
          importVerified: false,
          sourceToSinkDetected: false,
          flowStatus: "none",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability: "Possible",
          detectionConfidence: 88,
          flowConfidenceValue: 25,
          exploitabilityConfidence: 60,
          reasoning:
            "Weak hash algorithm usage is detectable without full data-flow analysis.",
        })
      );
    }
  });

  return { findings, parseError: false, metrics };
}

function runJsTsConfigRules(file) {
  const ext = getExtension(file.path);
  if (!new Set(["js", "jsx", "ts", "tsx", "mjs", "cjs"]).has(ext)) {
    return { findings: [], parseError: false, metrics: emptyAnalyzerMetrics() };
  }

  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const executionContext = inferExecutionContextForSupplemental(file.path, content);
  const findings = [];
  const metrics = emptyAnalyzerMetrics();

  const corsDefinition = resolveRuleDefinition("insecure_cors_configuration", {
    category: "Configuration",
    concept: "Insecure CORS configuration",
    cwe: "CWE-489",
    title: "CORS appears configured with wildcard or implicit any-origin policy",
    description:
      "CORS middleware is enabled with permissive origin settings that may expose APIs broadly.",
    impact:
      "Overly permissive CORS can allow untrusted origins to issue browser-based authenticated requests.",
    recommendation:
      "Restrict CORS origins to explicit trusted domains and disable wildcard origins in production.",
    rootCausePattern: "cors-wildcard-or-open-origin-policy",
  });

  const directOpenCorsRegex = /\b(?:app|router|server)\.use\s*\(\s*cors\s*\(\s*\)\s*\)/g;
  const wildcardCorsRegex =
    /\b(?:app|router|server)\.use\s*\(\s*cors\s*\(\s*\{[\s\S]{0,300}?origin\s*:\s*["']\*["'][\s\S]{0,300}?\}\s*\)\s*\)/g;

  for (const regex of [directOpenCorsRegex, wildcardCorsRegex]) {
    let match = regex.exec(content);
    while (match) {
      metrics.sinksReviewed += 1;
      const lineStart = toLineNumberFromIndex(content, match.index);
      const matched = String(match[0] || "").replace(/\s+/g, " ").trim();
      findings.push(
        createSupplementalFinding({
          file,
          lines,
          lineStart,
          lineEnd: lineStart,
          definition: corsDefinition,
          severity: executionContext === EXECUTION_CONTEXTS.WEB_SERVER ? "medium" : "low",
          executionContext,
          evidenceParts: [
            `Matched configuration: ${matched}`,
            "Config rule: permissive CORS middleware usage.",
            "Why matched: wildcard or default any-origin policy detected.",
          ],
          matchedExpression: "cors()",
          fullyQualifiedFunction: "express.app.use(cors)",
          resolvedModuleSource: "config.javascript",
          importVerified: false,
          sourceToSinkDetected: false,
          flowStatus: "none",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability:
            executionContext === EXECUTION_CONTEXTS.WEB_SERVER ? "Possible" : "Unlikely",
          detectionConfidence: 86,
          flowConfidenceValue: 20,
          exploitabilityConfidence:
            executionContext === EXECUTION_CONTEXTS.WEB_SERVER ? 68 : 46,
          reasoning:
            "Configuration layer detected permissive CORS setup that broadens browser attack surface.",
        })
      );
      match = regex.exec(content);
    }
  }

  return { findings, parseError: false, metrics };
}

function runJavaPatternRules(file) {
  if (getExtension(file.path) !== "java") {
    return { findings: [], parseError: false, metrics: emptyAnalyzerMetrics() };
  }

  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const executionContext = inferExecutionContextForSupplemental(file.path, content);
  const findings = [];
  const metrics = emptyAnalyzerMetrics();

  const weakCryptoDefinition = resolveRuleDefinition("weak_crypto", {
    category: "Cryptography",
    concept: "Insecure cryptography",
    cwe: "CWE-327",
    title: "Weak hashing algorithm used in Java MessageDigest",
    description: "MD5 or SHA1 hash algorithm literal detected in MessageDigest.getInstance.",
    impact: "Weak hashing can permit collisions and integrity bypass.",
    recommendation: "Use SHA-256/SHA-512 or stronger algorithms for cryptographic integrity.",
    rootCausePattern: "weak-hash-algorithm-in-crypto-sink",
  });

  const insecureTempDefinition = resolveRuleDefinition("insecure_temp_file", {
    category: "File Handling",
    concept: "Insecure temporary file",
    cwe: "CWE-377",
    title: "Predictable temporary file naming in Java",
    description: "File.createTempFile uses potentially predictable naming values.",
    impact: "Predictable temp naming can increase race-condition and file overwrite risk.",
    recommendation:
      "Use securely random temporary file prefixes and strict directory controls.",
    rootCausePattern: "java-create-temp-file-predictable-name",
  });

  const archiveDefinition = resolveRuleDefinition("archive_zip_slip", {
    category: "File Handling",
    concept: "Archive extraction path traversal (Zip Slip)",
    cwe: "CWE-22",
    title: "Archive entry path used in file creation without validation",
    description:
      "ZipInputStream entry name appears used in file construction without canonical validation.",
    impact: "Archive extraction may write files outside intended directory.",
    recommendation:
      "Normalize and validate extracted entry paths before creating output files.",
    rootCausePattern: "archive-extract-without-path-validation",
  });

  lines.forEach((rawLine, index) => {
    const line = String(rawLine || "");
    const lineNumber = index + 1;

    if (/\bMessageDigest\.getInstance\s*\(\s*"(?:MD5|SHA1)"\s*\)/i.test(line)) {
      metrics.sinksReviewed += 1;
      findings.push(
        createSupplementalFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition: weakCryptoDefinition,
          severity: "medium",
          executionContext,
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: java.security.MessageDigest.getInstance",
            "Pattern rule: weak hash algorithm literal (MD5/SHA1).",
          ],
          matchedExpression: line.includes("SHA1")
            ? 'MessageDigest.getInstance("SHA1")'
            : 'MessageDigest.getInstance("MD5")',
          fullyQualifiedFunction: "java.security.MessageDigest.getInstance",
          resolvedModuleSource: "java.local",
          importVerified: false,
          sourceToSinkDetected: false,
          flowStatus: "none",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability: "Possible",
          detectionConfidence: 90,
          flowConfidenceValue: 20,
          exploitabilityConfidence: 58,
          reasoning:
            "Pattern layer detected weak Java hash algorithm usage without requiring taint-flow.",
        })
      );
    }

    if (/\bFile\.createTempFile\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const args = extractCallArgsText(line);
      const predictablePrefix =
        /"[^"]{1,6}"\s*,/.test(args) ||
        /"(tmp|temp|file|test)"/i.test(args);
      findings.push(
        createSupplementalFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition: insecureTempDefinition,
          severity: predictablePrefix ? "high" : "medium",
          executionContext,
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: java.io.File.createTempFile",
            predictablePrefix
              ? "Pattern rule: predictable temp-file prefix detected."
              : "Pattern rule: temp-file creation should be reviewed for naming predictability.",
          ],
          matchedExpression: "File.createTempFile",
          fullyQualifiedFunction: "java.io.File.createTempFile",
          resolvedModuleSource: "java.local",
          importVerified: false,
          sourceToSinkDetected: false,
          flowStatus: "none",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability: "Possible",
          detectionConfidence: 84,
          flowConfidenceValue: 20,
          exploitabilityConfidence: 56,
          reasoning:
            "Pattern layer detected temporary file creation with potentially predictable naming.",
        })
      );
    }

    const zipSlipSignal =
      /\bnew\s+File\s*\(\s*[^,]+,\s*[^)]*entry\.getName\s*\(\s*\)\s*\)/.test(line) ||
      /\bzipEntry\.getName\s*\(\s*\)/.test(line);
    if (zipSlipSignal) {
      const contextWindow = lines
        .slice(Math.max(0, index - 4), Math.min(lines.length, index + 5))
        .join("\n");
      const hasValidation =
        /\bnormalize|canonical|startsWith|getCanonicalPath|Path\.normalize|resolve\b/i.test(
          contextWindow
        );
      if (!hasValidation) {
        metrics.sinksReviewed += 1;
        findings.push(
          createSupplementalFinding({
            file,
            lines,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            definition: archiveDefinition,
            severity: "high",
            executionContext,
            evidenceParts: [
              `Matched pattern: ${line.trim()}`,
              "Resolved API: archive entry name used in filesystem path construction.",
              "Pattern rule: no nearby canonical path validation found for archive entry.",
            ],
            matchedExpression: "ZipInputStream.entry.getName -> File(...)",
            fullyQualifiedFunction: "java.util.zip.ZipInputStream.getNextEntry",
            resolvedModuleSource: "java.local",
            importVerified: false,
            sourceToSinkDetected: false,
            flowStatus: "none",
            inputSourceRank: INPUT_RANK.UNKNOWN,
            exploitability:
              executionContext === EXECUTION_CONTEXTS.WEB_SERVER ? "Likely" : "Possible",
            detectionConfidence: 82,
            flowConfidenceValue: 22,
            exploitabilityConfidence:
              executionContext === EXECUTION_CONTEXTS.WEB_SERVER ? 74 : 58,
            reasoning:
              "Pattern layer detected potential Zip Slip path construction without validation controls.",
          })
        );
      }
    }
  });

  return { findings, parseError: false, metrics };
}

function runStandaloneConfigRules(file) {
  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const normalizedPath = getPathLower(file.path);
  const findings = [];
  const metrics = emptyAnalyzerMetrics();

  const isSpringConfigCandidate =
    /(application.*\.(properties|ya?ml)|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|gradle\.properties)$/i.test(
      normalizedPath
    ) || /\bspring\b/i.test(content);

  if (!isSpringConfigCandidate) {
    return { findings, parseError: false, metrics };
  }

  const definition = resolveRuleDefinition("debug_mode_exposure", {
    category: "Configuration",
    concept: "Debug mode exposure",
    cwe: "CWE-489",
    title: "Potential debug tooling enabled for Spring runtime",
    description:
      "Spring devtools or debug restart/livereload configuration appears enabled.",
    impact:
      "Debug tooling in production can expose internals, reduce hardening, and increase exploitability.",
    recommendation:
      "Disable Spring devtools and debug runtime flags in production profiles.",
    rootCausePattern: "spring-devtools-debug-enabled",
  });

  const devtoolsPattern =
    /(spring\.devtools\.(restart|livereload)\.enabled\s*[:=]\s*true|spring-boot-devtools)/i;
  const match = devtoolsPattern.exec(content);
  if (!match) {
    return { findings, parseError: false, metrics };
  }

  metrics.sinksReviewed += 1;
  const lineStart = toLineNumberFromIndex(content, match.index);
  const executionContext = EXECUTION_CONTEXTS.CONFIG_FILE;
  const prodHint =
    /prod|production/.test(normalizedPath) ||
    /spring\.profiles\.active\s*[:=]\s*prod/i.test(content);
  const severity = prodHint ? "medium" : "low";

  findings.push(
    createSupplementalFinding({
      file,
      lines,
      lineStart,
      lineEnd: lineStart,
      definition,
      severity,
      executionContext,
      evidenceParts: [
        `Matched configuration: ${String(match[0] || "").trim()}`,
        "Config rule: Spring debug/devtools signal detected.",
        prodHint
          ? "Production profile indicator detected with debug/devtools setting."
          : "Debug/devtools setting detected; verify production profile exclusions.",
      ],
      matchedExpression: String(match[0] || "").trim(),
      fullyQualifiedFunction: "spring.config.debug",
      resolvedModuleSource: "config.spring",
      importVerified: false,
      sourceToSinkDetected: false,
      flowStatus: "none",
      inputSourceRank: INPUT_RANK.UNKNOWN,
      exploitability: prodHint ? "Possible" : "Unlikely",
      detectionConfidence: 84,
      flowConfidenceValue: 20,
      exploitabilityConfidence: prodHint ? 62 : 44,
      reasoning:
        "Configuration layer identified Spring debug/devtools signals that should be excluded from production runtime.",
    })
  );

  return { findings, parseError: false, metrics };
}

function runHybridScanForFile(analyzer, file) {
  const phaseResults = [];
  const hasPatternLayer = typeof analyzer?.runPatternRules === "function";
  const hasFlowLayer = typeof analyzer?.runFlowAnalysis === "function";
  const hasConfigLayer = typeof analyzer?.runConfigRules === "function";

  if (hasPatternLayer) phaseResults.push(analyzer.runPatternRules(file));
  if (hasFlowLayer) {
    phaseResults.push(analyzer.runFlowAnalysis(file));
  } else if (typeof analyzer?.analyze === "function") {
    phaseResults.push(analyzer.analyze(file));
  }
  if (hasConfigLayer) phaseResults.push(analyzer.runConfigRules(file));

  if (phaseResults.length === 0) {
    return normalizeAnalyzerResult({ findings: [], parseError: false, metrics: emptyAnalyzerMetrics() });
  }

  return mergeAnalyzerPhaseResults(phaseResults);
}

const JAVASCRIPT_TYPESCRIPT_SOURCES = [
  "req.body",
  "req.query",
  "req.params",
  "req.headers",
  "req.cookies",
  "request.body",
  "request.query",
  "request.params",
  "process.env",
  "window.location",
  "document.location",
];

const javascriptAnalyzerPlugin = {
  key: "javascript",
  name: "JavaScript/TypeScript Analyzer",
  parsingStrategy: "hybrid_pattern_flow_config",
  detectionLayers: ["pattern_rules", "flow_analysis", "config_rules"],
  frameworkDetection: ["Express", "Fastify", "Koa", "Next.js"],
  sources: JAVASCRIPT_TYPESCRIPT_SOURCES,
  sinks: Object.values(JS_TS_SINK_CATALOG)
    .flat()
    .map((sink) => sink.global || `${sink.module || sink.globalObject}.${(sink.members || [])[0] || ""}`)
    .filter(Boolean),
  patternRules: [
    "sql_injection_unresolved_db_query",
    "weak_crypto_literal",
  ],
  configRules: ["insecure_cors_wildcard_or_open_policy"],
  runPatternRules: runJsTsPatternRules,
  runFlowAnalysis: analyzeJsTsFile,
  runConfigRules: runJsTsConfigRules,
  analyze: analyzeJsTsFile,
};

const LANGUAGE_REGISTRY = createLanguageRegistry(javascriptAnalyzerPlugin);
const LANGUAGE_PLUGIN_CATALOG = createLanguagePluginCatalog(javascriptAnalyzerPlugin);
const FUTURE_LANGUAGE_PLUGIN_BLUEPRINTS = getFuturePluginBlueprints();

function attachHybridLayersToLanguagePlugins() {
  javascriptAnalyzerPlugin.sources = Array.from(
    new Set([
      ...(javascriptAnalyzerPlugin.sources || []),
      ...getSourceRegistryForLanguage("javascript"),
    ])
  );
  javascriptAnalyzerPlugin.sinks = Array.from(
    new Set([
      ...(javascriptAnalyzerPlugin.sinks || []),
      ...flattenLanguageSinks("javascript"),
    ])
  );

  const javaPlugin = LANGUAGE_REGISTRY.java;
  if (javaPlugin) {
    javaPlugin.parsingStrategy = javaPlugin.parsingStrategy || "token_lite";
    javaPlugin.detectionLayers = ["pattern_rules", "flow_analysis", "config_rules"];
    javaPlugin.patternRules = [
      ...(javaPlugin.patternRules || []),
      "weak_crypto_message_digest",
      "insecure_temp_file_createTempFile",
      "archive_zip_slip_pattern",
    ];
    javaPlugin.configRules = [...(javaPlugin.configRules || []), "spring_devtools_debug_mode"];
    javaPlugin.sources = Array.from(
      new Set([...(javaPlugin.sources || []), ...getSourceRegistryForLanguage("java")])
    );
    javaPlugin.sinks = Array.from(
      new Set([...(javaPlugin.sinks || []), ...flattenLanguageSinks("java")])
    );
    if (typeof javaPlugin.runPatternRules !== "function") {
      javaPlugin.runPatternRules = runJavaPatternRules;
    }
    if (typeof javaPlugin.runFlowAnalysis !== "function") {
      javaPlugin.runFlowAnalysis = (file) => javaPlugin.analyze(file);
    }
    if (typeof javaPlugin.runConfigRules !== "function") {
      javaPlugin.runConfigRules = () => ({
        findings: [],
        parseError: false,
        metrics: emptyAnalyzerMetrics(),
      });
    }
  }

  const pythonPlugin = LANGUAGE_REGISTRY.py;
  if (pythonPlugin) {
    pythonPlugin.detectionLayers = pythonPlugin.detectionLayers || [
      "pattern_rules",
      "flow_analysis",
      "config_rules",
    ];
    pythonPlugin.patternRules = pythonPlugin.patternRules || [
      "weak_crypto",
      "insecure_randomness",
      "hardcoded_secret",
      "archive_extraction_zip_slip",
      "insecure_temporary_file",
      "sql_injection_pattern",
      "format_string_injection",
    ];
    pythonPlugin.configRules = pythonPlugin.configRules || ["flask_debug_mode"];
    pythonPlugin.sources = Array.from(
      new Set([...(pythonPlugin.sources || []), ...getSourceRegistryForLanguage("python")])
    );
    pythonPlugin.sinks = Array.from(
      new Set([...(pythonPlugin.sinks || []), ...flattenLanguageSinks("python")])
    );
    if (typeof pythonPlugin.runPatternRules !== "function") {
      pythonPlugin.runPatternRules = () => ({
        findings: [],
        parseError: false,
        metrics: emptyAnalyzerMetrics(),
      });
    }
    if (typeof pythonPlugin.runFlowAnalysis !== "function") {
      pythonPlugin.runFlowAnalysis = (file) => pythonPlugin.analyze(file);
    }
    if (typeof pythonPlugin.runConfigRules !== "function") {
      pythonPlugin.runConfigRules = () => ({
        findings: [],
        parseError: false,
        metrics: emptyAnalyzerMetrics(),
      });
    }
  }
}

attachHybridLayersToLanguagePlugins();

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
  const aggregateMetrics = {
    httpRoutesAnalyzed: 0,
    sinksReviewed: 0,
    secretPatternsChecked: 0,
    authenticationRelatedFilesInspected: 0,
  };

  for (const file of sourceFiles || []) {
    if (!isLikelyTextContent(file.content)) {
      safeSkipped.non_text_content += 1;
      continue;
    }
    if (isLikelyThirdPartyCode({ path: file.path, content: file.content })) {
      safeSkipped.third_party_signature += 1;
      continue;
    }

    const standaloneConfigResult = normalizeAnalyzerResult(runStandaloneConfigRules(file));
    aggregateMetrics.httpRoutesAnalyzed += Number(
      standaloneConfigResult.metrics?.httpRoutesAnalyzed || 0
    );
    aggregateMetrics.sinksReviewed += Number(standaloneConfigResult.metrics?.sinksReviewed || 0);
    aggregateMetrics.secretPatternsChecked += Number(
      standaloneConfigResult.metrics?.secretPatternsChecked || 0
    );
    if (standaloneConfigResult.findings.length > 0) {
      rawFindings.push(...standaloneConfigResult.findings);
    }

    const normalizedLanguage = normalizeLanguage(file.language);
    const { ext, analyzer } = getAnalyzerForFile(LANGUAGE_REGISTRY, file.path);
    if (!analyzer) {
      safeSkipped.unsupported_language_semantic_parser += 1;
      unsupportedLanguagesDetected.add(normalizedLanguage || ext || "unknown");
      continue;
    }

    analyzedFiles += 1;
    if (isAuthenticationRelatedFile(file.path, file.content)) {
      aggregateMetrics.authenticationRelatedFilesInspected += 1;
    }
    const pluginKey = normalizedLanguage || analyzer.key || ext || "unknown";
    supportedLanguageFiles.set(pluginKey, (supportedLanguageFiles.get(pluginKey) || 0) + 1);
    const { findings, parseError, metrics } = runHybridScanForFile(analyzer, file);
    if (parseError && findings.length === 0) {
      safeSkipped.parser_error += 1;
      continue;
    }
    if (parseError) {
      safeSkipped.parser_error += 1;
    }
    aggregateMetrics.httpRoutesAnalyzed += Number(metrics?.httpRoutesAnalyzed || 0);
    aggregateMetrics.sinksReviewed += Number(metrics?.sinksReviewed || 0);
    aggregateMetrics.secretPatternsChecked += Number(metrics?.secretPatternsChecked || 0);
    if (findings.length > 0) rawFindings.push(...findings);
  }

  const dedupedRawFindings = dedupeFindingList(rawFindings);
  const postProcessedFindings = postProcessFindings(dedupedRawFindings);

  postProcessedFindings.sort((a, b) => {
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    return a.lineStart - b.lineStart;
  });

  const { active: activeFindings, suppressed: suppressedFindings } =
    splitSuppressedFindings(postProcessedFindings);
  const groupedIssues = groupFindings(activeFindings, { suppressed: false });
  const suppressedGroupedIssues = groupFindings(suppressedFindings, { suppressed: true });
  const totalInstances = activeFindings.length;
  const suppressedInstances = suppressedFindings.length;
  const analytics = buildAnalytics({ groupedIssues, totalInstances });
  const totalDeveloperFiles = Number(sourceFiles?.length || 0);
  const skippedFiles = Object.values(safeSkipped).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const scoreModel = computeSecurityScore({ groupedIssues });
  const securityScore = totalInstances === 0 ? 100 : scoreModel.securityScore;
  const rating = toRating(securityScore);
  const securityCoverageSummary = buildSecurityCoverageSummary({
    filesScanned: analyzedFiles,
    httpRoutesAnalyzed: aggregateMetrics.httpRoutesAnalyzed,
    sinksReviewed: aggregateMetrics.sinksReviewed,
    secretPatternsChecked: aggregateMetrics.secretPatternsChecked,
    authenticationRelatedFilesInspected:
      aggregateMetrics.authenticationRelatedFilesInspected,
  });
  const positiveSecuritySignals =
    totalInstances === 0 ? buildPositiveSecuritySignals() : [];
  const hardeningRecommendations =
    totalInstances === 0 ? buildHardeningRecommendations() : [];
  const cleanReport =
    totalInstances === 0
      ? {
          status: "clean",
          message: "No exploitable vulnerabilities were detected in developer-written code.",
          security_coverage_summary: securityCoverageSummary,
          positive_security_signals: positiveSecuritySignals,
          hardening_recommendations: hardeningRecommendations,
        }
      : null;

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
    suppressed_issues_found: suppressedInstances,
    security_score: securityScore,
    deductions: scoreModel.deductions,
    security_coverage_summary: securityCoverageSummary,
    positive_security_signals: positiveSecuritySignals,
    hardening_recommendations: hardeningRecommendations,
    clean_report: cleanReport,
    score: securityScore,
    rating: rating.grade,
    ratingLabel: rating.label,
    risk_scope: "developer_code_only",
    analysis_mode: "hybrid_multilanguage_sast",
    post_processing: {
      stage: "post_process_findings",
      trust_levels: INPUT_TRUST_LEVEL,
      false_positive_filters: INFRASTRUCTURE_PATH_SEGMENTS,
      notes: [
        "Trust-level classification and context adjustments are applied after core detection.",
        "Core taint-flow and pattern detection logic remains unchanged.",
      ],
    },
    developer_risk: {
      issues_found: totalInstances,
      security_score: securityScore,
      deductions: scoreModel.deductions,
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
      plugin_registry_extensions: Object.keys(LANGUAGE_REGISTRY).sort((a, b) =>
        a.localeCompare(b)
      ),
      language_plugins: Object.fromEntries(
        Object.entries(LANGUAGE_PLUGIN_CATALOG).map(([languageKey, plugin]) => [
          languageKey,
          {
            key: plugin.key,
            name: plugin.name,
            parsing_strategy: plugin.parsingStrategy,
            detection_layers: plugin.detectionLayers || ["analyze"],
            sources: plugin.sources || getSourceRegistryForLanguage(languageKey),
            sinks: plugin.sinks || [],
            pattern_rules: plugin.patternRules || [],
            config_rules: plugin.configRules || [],
          },
        ])
      ),
      active_plugins: Array.from(
        new Map(
          Object.values(LANGUAGE_REGISTRY).map((plugin) => [
            plugin.key || plugin.name,
            {
              key: plugin.key,
              name: plugin.name,
              parsing_strategy: plugin.parsingStrategy,
              detection_layers: plugin.detectionLayers || ["analyze"],
              framework_detection: plugin.frameworkDetection || [],
              sources:
                plugin.sources || getSourceRegistryForLanguage(plugin.key || plugin.name),
              sinks: plugin.sinks || [],
              sink_registry: getSinkRegistryForLanguage(plugin.key || plugin.name),
              pattern_rules: plugin.patternRules || [],
              config_rules: plugin.configRules || [],
            },
          ])
        ).values()
      ),
      supported_analyzed_files: Object.fromEntries(supportedLanguageFiles.entries()),
      unsupported_languages_detected: Array.from(unsupportedLanguagesDetected).sort((a, b) =>
        a.localeCompare(b)
      ),
      available_sink_catalog_languages: Object.keys(NON_JS_SINK_CATALOG),
      future_language_blueprints: FUTURE_LANGUAGE_PLUGIN_BLUEPRINTS,
    },
    totals: {
      findings: totalInstances,
      suppressedFindings: suppressedInstances,
      filesAnalyzed: analyzedFiles,
      totalCodeFiles: totalDeveloperFiles,
      riskPoints: analytics.riskPoints,
      scoreDeductions: scoreModel.totalDeduction,
    },
    severityCounts: analytics.severityCounts,
    categoryBreakdown: analytics.categoryBreakdown,
    ruleBreakdown: analytics.ruleBreakdown,
    topRiskFiles: analytics.topRiskFiles,
    findings: groupedIssues.slice(
      0,
      options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED
    ),
    suppressed_issues: suppressedGroupedIssues.slice(
      0,
      options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED
    ),
    suppressed_summary: {
      issue_types: suppressedGroupedIssues.length,
      instances: suppressedInstances,
    },
    coverage: {
      analyzedFiles,
      skippedFiles,
      totalCodeFiles: totalDeveloperFiles,
      analyzedPercent:
        totalDeveloperFiles > 0
          ? Math.round((analyzedFiles / totalDeveloperFiles) * 100)
          : 0,
    },
    ui_hints: {
      vuln_line_css: VULN_LINE_CSS,
      highlighted_code_format: ">>>line | code",
    },
    insights: buildInsights({
      groupedIssues,
      suppressedGroupedIssues,
      totalInstances,
      analytics,
      securityCoverageSummary,
      skippedFiles,
      unsupportedLanguageFiles: safeSkipped.unsupported_language_semantic_parser,
      unsupportedLanguagesDetected,
    }),
    generatedAt: new Date().toISOString(),
  };
}
