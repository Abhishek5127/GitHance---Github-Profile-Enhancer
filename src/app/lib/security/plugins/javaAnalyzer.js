import { VULNERABILITY_DEFINITIONS } from "@/app/lib/security/rules";

const JAVA_SOURCE_PATTERNS = [
  "@RequestParam",
  "@PathVariable",
  "@RequestBody",
  "getParameter(",
];

const JAVA_SINK_PATTERNS = [
  "Runtime.getRuntime().exec(",
  "new ProcessBuilder(",
  ".executeQuery(",
  ".executeUpdate(",
  "Files.readString(",
  "Files.readAllBytes(",
  "new File(",
  ".readObject(",
  "new Random(",
  "Math.random(",
];

const HTTP_ANNOTATION_PATTERN =
  /@(RestController|Controller|RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)\b/;
const REQUEST_PARAM_PATTERN =
  /@(RequestParam|PathVariable|RequestBody)\b(?:\([^)]*\))?\s+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)/g;
const GET_PARAMETER_ASSIGNMENT_PATTERN =
  /\b(?:String\s+)?([A-Za-z_]\w*)\s*=\s*[^;]*\b(?:[A-Za-z_]\w*\.)?getParameter\s*\(/;
const SIMPLE_ASSIGNMENT_PATTERN = /\b(?:String\s+)?([A-Za-z_]\w*)\s*=\s*([^;]+);/;
const SECRET_VAR_PATTERN = /(password|secret|api[_-]?key|token)/i;
const SECRET_PLACEHOLDER_PATTERN = /^(changeme|example|sample|dummy|test|password|secret|token)$/i;
const RANDOM_SECURITY_CONTEXT_PATTERN = /(token|otp|session|auth|nonce|id)/i;

const EXECUTION_CONTEXTS = {
  WEB_SERVER: "WEB_SERVER",
  BACKEND_SERVICE: "BACKEND_SERVICE",
  TEST_FILE: "TEST_FILE",
  INTERNAL_LIB: "INTERNAL_LIB",
};

const INPUT_RANK = {
  CRITICAL: "CRITICAL",
  UNKNOWN: "UNKNOWN",
};

const ATTACK_SURFACE = {
  PUBLIC_HTTP: "PUBLIC_HTTP",
  INTERNAL_SERVICE: "INTERNAL_SERVICE",
  TEST_ONLY: "TEST_ONLY",
};

const PREVIEW_CONTEXT_BEFORE = 4;
const PREVIEW_CONTEXT_AFTER = 4;
const MAX_PREVIEW_LINES = 20;

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
    const row = `${String(line).padStart(4, " ")} | ${escapeHtml(lines[line - 1] ?? "")}`;
    if (line >= startLine && line <= endLine) {
      rendered.push(`<span class="vuln-line">${row}</span>`);
    } else {
      rendered.push(row);
    }
  }
  return rendered.join("\n");
}

function classifyExecutionContext(path, content) {
  const normalizedPath = String(path || "").replace(/\\/g, "/").toLowerCase();
  if (
    normalizedPath.includes("/src/test/java/") ||
    normalizedPath.endsWith("test.java")
  ) {
    return EXECUTION_CONTEXTS.TEST_FILE;
  }
  if (
    HTTP_ANNOTATION_PATTERN.test(content) ||
    normalizedPath.includes("/controllers/") ||
    normalizedPath.includes("/controller/")
  ) {
    return EXECUTION_CONTEXTS.WEB_SERVER;
  }
  if (
    normalizedPath.includes("/services/") ||
    normalizedPath.includes("/service/") ||
    normalizedPath.includes("/repositories/") ||
    normalizedPath.includes("/repository/") ||
    normalizedPath.includes("/src/main/java/")
  ) {
    return EXECUTION_CONTEXTS.BACKEND_SERVICE;
  }
  return EXECUTION_CONTEXTS.INTERNAL_LIB;
}

function mapAttackSurface(executionContext) {
  if (executionContext === EXECUTION_CONTEXTS.WEB_SERVER) return ATTACK_SURFACE.PUBLIC_HTTP;
  if (executionContext === EXECUTION_CONTEXTS.TEST_FILE) return ATTACK_SURFACE.TEST_ONLY;
  return ATTACK_SURFACE.INTERNAL_SERVICE;
}

function toConfidenceLabel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function computeOverallConfidence({
  detectionConfidence,
  flowConfidence,
  exploitabilityConfidence,
}) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        0.4 * Number(detectionConfidence || 0) +
          0.3 * Number(flowConfidence || 0) +
          0.3 * Number(exploitabilityConfidence || 0)
      )
    )
  );
}

function buildFlowSources(userInputNames, line) {
  const names = Array.from(userInputNames).slice(0, 4);
  return names.map((name) => ({
    label: `user_input.${name}`,
    line,
    type: "user_input",
  }));
}

function containsAnyVar(expression, variables) {
  const expr = String(expression || "");
  for (const variable of variables) {
    const pattern = new RegExp(`\\b${variable}\\b`);
    if (pattern.test(expr)) return true;
  }
  return false;
}

function detectUserInputs(lines) {
  const directSources = new Set();
  const tainted = new Set();

  lines.forEach((line) => {
    REQUEST_PARAM_PATTERN.lastIndex = 0;
    let match = REQUEST_PARAM_PATTERN.exec(line);
    while (match) {
      const varName = String(match[2] || "").trim();
      if (varName) {
        directSources.add(varName);
        tainted.add(varName);
      }
      match = REQUEST_PARAM_PATTERN.exec(line);
    }
    const paramAssignment = line.match(GET_PARAMETER_ASSIGNMENT_PATTERN);
    if (paramAssignment?.[1]) {
      directSources.add(paramAssignment[1]);
      tainted.add(paramAssignment[1]);
    }
  });

  let changed = true;
  let guard = 0;
  while (changed && guard < 8) {
    changed = false;
    guard += 1;
    for (const line of lines) {
      const assignment = line.match(SIMPLE_ASSIGNMENT_PATTERN);
      if (!assignment) continue;
      const lhs = String(assignment[1] || "").trim();
      const rhs = String(assignment[2] || "");
      if (!lhs) continue;
      if (containsAnyVar(rhs, tainted)) {
        if (!tainted.has(lhs)) {
          tainted.add(lhs);
          changed = true;
        }
      }
    }
  }

  return { directSources, tainted };
}

function createJavaFinding({
  file,
  lines,
  lineStart,
  lineEnd,
  definition,
  severity,
  executionContext,
  sourceToSinkDetected,
  flowStatus,
  evidenceParts,
  matchedExpression,
  reasoning,
  inputSourceRank = INPUT_RANK.UNKNOWN,
  exploitability = "Possible",
  detectionConfidence = 92,
  flowConfidence = 55,
  exploitabilityConfidence = 70,
  confidenceReason = "",
}) {
  const attackSurface = mapAttackSurface(executionContext);
  const overallConfidence = computeOverallConfidence({
    detectionConfidence,
    flowConfidence,
    exploitabilityConfidence,
  });

  return {
    filePath: file.path,
    language: file.language,
    lineStart,
    lineEnd,
    ruleId: definition.id,
    rootCausePattern: definition.rootCausePattern,
    category: definition.concept,
    cwe: definition.cwe || "CWE-NA",
    severity,
    confidence: toConfidenceLabel(overallConfidence),
    title: definition.title,
    description: definition.description,
    impact: definition.impact,
    recommendation: definition.recommendation,
    evidence: evidenceParts.join(" | "),
    matchedExpression: String(matchedExpression || "").slice(0, 220),
    flowHint:
      sourceToSinkDetected && flowStatus !== "none"
        ? "Flow confirmed from user-controlled source to Java sink."
        : "No strong user input flow confirmation for this Java sink.",
    codeBlock: buildCodeBlock(lines, lineStart, lineEnd),
    codeBlockHtml: buildCodeBlockHtml(lines, lineStart, lineEnd),
    fullyQualifiedFunction: matchedExpression,
    resolvedModuleSource: "java.local",
    importVerified: true,
    sourceToSinkDetected,
    flowStatus,
    confidenceReason:
      confidenceReason ||
      `Confidence ${overallConfidence}/100 based on Java sink classification and flow signal.`,
    needsManualReview: overallConfidence < 60,
    executionContext,
    attackSurface,
    inputSourceRank,
    exploitability,
    confidenceScore: overallConfidence,
    detectionConfidence,
    flowConfidenceValue: flowConfidence,
    exploitabilityConfidence,
    overallConfidence,
    reasoning,
    whyThisMatters: definition.impact,
    realisticRiskAssessment:
      attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
        ? "Code path appears reachable from web-exposed Java handlers."
        : "Code path appears internal; remote exploitability is lower.",
    developerAction: definition.recommendation,
    suppressed: false,
  };
}

function resolveDefinition(id) {
  return (
    VULNERABILITY_DEFINITIONS[id] || {
      id,
      cwe: "CWE-NA",
      concept: id,
      title: id,
      description: "",
      impact: "",
      recommendation: "",
      rootCausePattern: id,
    }
  );
}

function analyzeJavaFile(file) {
  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const executionContext = classifyExecutionContext(file.path, content);
  const findings = [];
  const metrics = {
    httpRoutesAnalyzed: 0,
    sinksReviewed: 0,
    secretPatternsChecked: 0,
  };
  const dedupe = new Set();

  metrics.httpRoutesAnalyzed += (content.match(new RegExp(HTTP_ANNOTATION_PATTERN, "g")) || [])
    .length;

  const userInput = detectUserInputs(lines);
  const webExposed = executionContext === EXECUTION_CONTEXTS.WEB_SERVER;
  const taintedOrDirect = new Set([...userInput.directSources, ...userInput.tainted]);

  const addFinding = (finding) => {
    const key = `${finding.ruleId}|${finding.filePath}|${finding.lineStart}|${finding.matchedExpression}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    findings.push(finding);
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = String(line || "");

    const sourceMatchCount = JAVA_SOURCE_PATTERNS.reduce(
      (count, token) => count + (trimmed.includes(token) ? 1 : 0),
      0
    );
    metrics.secretPatternsChecked += sourceMatchCount;

    if (/Runtime\.getRuntime\(\)\.exec\s*\(/.test(trimmed) || /new\s+ProcessBuilder\s*\(/.test(trimmed)) {
      metrics.sinksReviewed += 1;
      const definition = resolveDefinition("command_execution");
      const hasFlow = containsAnyVar(trimmed, taintedOrDirect);
      addFinding(
        createJavaFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity: "high",
          executionContext,
          sourceToSinkDetected: hasFlow,
          flowStatus: hasFlow ? "confirmed" : "partial",
          evidenceParts: [
            `Matched call: ${trimmed.trim()}`,
            "Resolved API: java.lang.Runtime.exec / ProcessBuilder",
            `Execution context: ${executionContext}`,
            hasFlow
              ? `Source flow: confirmed. ${Array.from(taintedOrDirect).join(", ")}`
              : "Source flow: partial; user input variable not fully confirmed at sink.",
          ],
          matchedExpression: /ProcessBuilder/.test(trimmed)
            ? "java.lang.ProcessBuilder.<init>"
            : "java.lang.Runtime.getRuntime().exec",
          reasoning:
            "Java command execution sink detected. Risk increases when request-derived input reaches exec.",
          inputSourceRank: hasFlow ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
          exploitability: hasFlow && webExposed ? "Likely" : "Possible",
          flowConfidence: hasFlow ? 90 : 55,
          exploitabilityConfidence: hasFlow && webExposed ? 88 : 70,
        })
      );
    }

    if (/\.\s*execute(Query|Update)\s*\(/.test(trimmed)) {
      metrics.sinksReviewed += 1;
      const hasConcat = trimmed.includes("+");
      const hasFlow = hasConcat && containsAnyVar(trimmed, taintedOrDirect);
      if (hasConcat) {
        const definition = resolveDefinition("sql_injection");
        addFinding(
          createJavaFinding({
            file,
            lines,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            definition,
            severity: "high",
            executionContext,
            sourceToSinkDetected: hasFlow,
            flowStatus: hasFlow ? "confirmed" : "partial",
            evidenceParts: [
              `Matched call: ${trimmed.trim()}`,
              "Resolved API: java.sql.Statement.executeQuery/executeUpdate",
              `Execution context: ${executionContext}`,
              hasFlow
                ? "Source flow: user input variable reaches concatenated SQL string."
                : "Source flow: SQL concatenation present but source is only partially resolved.",
            ],
            matchedExpression: "java.sql.Statement.executeQuery",
            reasoning:
              "Raw SQL execution with string concatenation can enable SQL injection when user input is included.",
            inputSourceRank: hasFlow ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
            exploitability: hasFlow && webExposed ? "Likely" : "Possible",
            flowConfidence: hasFlow ? 88 : 52,
            exploitabilityConfidence: hasFlow && webExposed ? 86 : 68,
          })
        );
      }
    }

    if (
      /Files\.(readString|readAllBytes)\s*\(/.test(trimmed) ||
      /new\s+File\s*\(/.test(trimmed)
    ) {
      metrics.sinksReviewed += 1;
      const hasFlow = containsAnyVar(trimmed, taintedOrDirect);
      if (hasFlow || trimmed.includes("+")) {
        const definition = resolveDefinition("path_traversal");
        addFinding(
          createJavaFinding({
            file,
            lines,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            definition,
            severity: webExposed && hasFlow ? "high" : "medium",
            executionContext,
            sourceToSinkDetected: hasFlow,
            flowStatus: hasFlow ? "confirmed" : "partial",
            evidenceParts: [
              `Matched call: ${trimmed.trim()}`,
              "Resolved API: java.nio.file.Files / java.io.File",
              `Execution context: ${executionContext}`,
              hasFlow
                ? "Source flow: request-derived path reaches filesystem sink."
                : "Source flow: path construction appears dynamic; user control is partial.",
            ],
            matchedExpression: /new\s+File\s*\(/.test(trimmed)
              ? "java.io.File.<init>"
              : "java.nio.file.Files.read*",
            reasoning:
              "Dynamic file path handling can allow path traversal when user-controlled input is not normalized.",
            inputSourceRank: hasFlow ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
            exploitability: hasFlow && webExposed ? "Likely" : "Possible",
            flowConfidence: hasFlow ? 82 : 50,
            exploitabilityConfidence: hasFlow && webExposed ? 82 : 64,
          })
        );
      }
    }

    if (/ObjectInputStream\s*\.\s*readObject\s*\(/.test(trimmed) || /\.readObject\s*\(/.test(trimmed)) {
      metrics.sinksReviewed += 1;
      const definition = resolveDefinition("unsafe_deserialization");
      addFinding(
        createJavaFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity: "high",
          executionContext,
          sourceToSinkDetected: containsAnyVar(trimmed, taintedOrDirect),
          flowStatus: "partial",
          evidenceParts: [
            `Matched call: ${trimmed.trim()}`,
            "Resolved API: java.io.ObjectInputStream.readObject",
            `Execution context: ${executionContext}`,
          ],
          matchedExpression: "java.io.ObjectInputStream.readObject",
          reasoning:
            "Unsafe Java deserialization can lead to remote code execution when untrusted serialized data is processed.",
          inputSourceRank: INPUT_RANK.CRITICAL,
          exploitability: webExposed ? "Likely" : "Possible",
          flowConfidence: 56,
          exploitabilityConfidence: webExposed ? 82 : 66,
        })
      );
    }

    if (/new\s+Random\s*\(/.test(trimmed) || /Math\.random\s*\(/.test(trimmed)) {
      metrics.sinksReviewed += 1;
      const contextWindow = lines
        .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
        .join(" ");
      if (RANDOM_SECURITY_CONTEXT_PATTERN.test(contextWindow)) {
        const definition = resolveDefinition("insecure_randomness");
        addFinding(
          createJavaFinding({
            file,
            lines,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            definition,
            severity: "medium",
            executionContext,
            sourceToSinkDetected: false,
            flowStatus: "none",
            evidenceParts: [
              `Matched call: ${trimmed.trim()}`,
              "Resolved API: java.util.Random / Math.random",
              "Security context: token/session/otp-like usage detected nearby.",
            ],
            matchedExpression: /Math\.random/.test(trimmed)
              ? "java.lang.Math.random"
              : "java.util.Random.<init>",
            reasoning:
              "Predictable randomness used for security-sensitive values can enable token prediction.",
            inputSourceRank: INPUT_RANK.UNKNOWN,
            exploitability: webExposed ? "Possible" : "Unlikely",
            flowConfidence: 35,
            exploitabilityConfidence: webExposed ? 62 : 52,
          })
        );
      }
    }

    const assignment = trimmed.match(
      /\b(?:String\s+)?([A-Za-z_]\w*)\s*=\s*"([^"\r\n]{6,})"\s*;/
    );
    if (assignment) {
      metrics.secretPatternsChecked += 1;
      const variable = String(assignment[1] || "");
      const literal = String(assignment[2] || "");
      if (
        SECRET_VAR_PATTERN.test(variable) &&
        !SECRET_PLACEHOLDER_PATTERN.test(literal) &&
        literal.length >= 8
      ) {
        const definition = resolveDefinition("hardcoded_secret");
        addFinding(
          createJavaFinding({
            file,
            lines,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            definition,
            severity: "high",
            executionContext,
            sourceToSinkDetected: false,
            flowStatus: "none",
            evidenceParts: [
              `Matched assignment: ${variable} = "<secret_literal>"`,
              "Resolved API: constant assignment in Java source",
              `Execution context: ${executionContext}`,
            ],
            matchedExpression: "java.constant_assignment",
            reasoning:
              "Secret-like literal is hardcoded in Java source and should be moved to secure configuration.",
            inputSourceRank: INPUT_RANK.UNKNOWN,
            exploitability: webExposed ? "Possible" : "Unlikely",
            flowConfidence: 30,
            exploitabilityConfidence: webExposed ? 60 : 48,
            confidenceReason: "Direct hardcoded secret literal in Java code.",
          })
        );
      }
    }
  });

  return {
    findings,
    parseError: false,
    metrics,
    metadata: {
      parsing_strategy: "java_token_lite",
      frameworks_detected: [
        ...(content.includes("org.springframework") ? ["Spring Boot"] : []),
        ...(content.includes("HttpServletRequest") ? ["Servlet API"] : []),
      ],
      sources: JAVA_SOURCE_PATTERNS,
      sinks: JAVA_SINK_PATTERNS,
    },
  };
}

export const javaAnalyzerPlugin = {
  key: "java",
  name: "Java Analyzer",
  parsingStrategy: "token_lite",
  frameworkDetection: ["Spring Boot", "Servlet API"],
  sources: JAVA_SOURCE_PATTERNS,
  sinks: JAVA_SINK_PATTERNS,
  analyze: analyzeJavaFile,
};
