import { VULNERABILITY_DEFINITIONS } from "@/app/lib/security/rules";

const PYTHON_SOURCE_PATTERNS = [
  "request.args",
  "request.form",
  "request.json",
  "request.values",
  "request.data",
  "request.GET",
  "request.POST",
  "request.body",
  "input(",
];

const PYTHON_SINK_PATTERNS = [
  "os.system(",
  "os.popen(",
  "subprocess.call(",
  "subprocess.run(",
  "subprocess.Popen(",
  "cursor.execute(",
  "conn.execute(",
  "open(",
  "Path(",
  "os.open(",
  "os.path.join(",
  "eval(",
  "exec(",
  "pickle.loads(",
  "yaml.load(",
  "random.random(",
  "random.randint(",
  "hashlib.md5(",
  "hashlib.sha1(",
  "render_template_string(",
];

const PYTHON_ROUTE_PATTERN =
  /^\s*@app\.(route|get|post|put|delete|patch|options|head)\s*\(/;
const PYTHON_FRAMEWORK_HINT_PATTERN =
  /(from\s+flask\s+import|import\s+flask|from\s+fastapi\s+import|import\s+fastapi|from\s+django|import\s+django)/;
const PYTHON_HTTP_INPUT_PATTERN =
  /\brequest\.(args|form|json|values|data|GET|POST|body)\b|\binput\s*\(/;
const ASSIGNMENT_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
const SECRET_VAR_PATTERN = /(password|secret|api[_-]?key|token)/i;
const SECRET_PLACEHOLDER_PATTERN = /^(changeme|example|sample|dummy|test|password|secret|token)$/i;
const SECURITY_RANDOM_CONTEXT_PATTERN = /(token|otp|session|auth|nonce|identifier|id)/i;

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

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").toLowerCase();
}

function classifyExecutionContext(path, content) {
  const normalizedPath = normalizePath(path);
  const isTestPath =
    normalizedPath.includes("/tests/") ||
    normalizedPath.includes("/test/") ||
    normalizedPath.endsWith("_test.py") ||
    normalizedPath.endsWith("test.py");
  if (isTestPath) return EXECUTION_CONTEXTS.TEST_FILE;

  const isFrameworkExposed =
    PYTHON_ROUTE_PATTERN.test(content) ||
    PYTHON_FRAMEWORK_HINT_PATTERN.test(content) ||
    PYTHON_HTTP_INPUT_PATTERN.test(content);

  if (isFrameworkExposed) return EXECUTION_CONTEXTS.WEB_SERVER;

  const isServicePath =
    normalizedPath.includes("/app/") ||
    normalizedPath.includes("/src/") ||
    normalizedPath.includes("/api/") ||
    normalizedPath.includes("/controllers/") ||
    normalizedPath.includes("/routes/");
  if (isServicePath) return EXECUTION_CONTEXTS.BACKEND_SERVICE;

  return EXECUTION_CONTEXTS.INTERNAL_LIB;
}

function mapAttackSurface(executionContext) {
  if (executionContext === EXECUTION_CONTEXTS.WEB_SERVER) return ATTACK_SURFACE.PUBLIC_HTTP;
  if (executionContext === EXECUTION_CONTEXTS.TEST_FILE) return ATTACK_SURFACE.TEST_ONLY;
  return ATTACK_SURFACE.INTERNAL_SERVICE;
}

function hasAnyPattern(text, patterns) {
  const source = String(text || "");
  return patterns.some((pattern) => source.includes(pattern));
}

function stripInlineComment(line) {
  return String(line || "").replace(/\s+#.*$/, "");
}

function expressionUsesVariable(expression, variableName) {
  const pattern = new RegExp(`\\b${variableName}\\b`);
  return pattern.test(String(expression || ""));
}

function expressionUsesAnyTainted(expression, taintedVariables) {
  for (const variable of taintedVariables) {
    if (expressionUsesVariable(expression, variable)) return true;
  }
  return false;
}

function isUserInputExpression(expression) {
  return hasAnyPattern(expression, PYTHON_SOURCE_PATTERNS);
}

function inferFlowSignals(lines) {
  const assignments = new Map();
  const tainted = new Set();
  const directSources = new Set();

  for (const rawLine of lines) {
    const line = stripInlineComment(rawLine);
    const assignment = line.match(ASSIGNMENT_PATTERN);
    if (!assignment) continue;
    const lhs = String(assignment[1] || "").trim();
    const rhs = String(assignment[2] || "").trim();
    if (!lhs || !rhs) continue;
    assignments.set(lhs, rhs);
    if (isUserInputExpression(rhs)) {
      tainted.add(lhs);
      directSources.add(lhs);
    }
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < 8) {
    changed = false;
    guard += 1;
    for (const [lhs, rhs] of assignments.entries()) {
      if (tainted.has(lhs)) continue;
      if (isUserInputExpression(rhs) || expressionUsesAnyTainted(rhs, tainted)) {
        tainted.add(lhs);
        changed = true;
      }
    }
  }

  return {
    assignments,
    tainted,
    directSources,
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

function resolveWeakCryptoDefinition() {
  const base = resolveDefinition("weak_crypto");
  return {
    ...base,
    cwe: "CWE-327",
    rootCausePattern: "weak-python-hash-algorithm",
  };
}

function resolveTemplateInjectionDefinition() {
  return {
    id: "template_injection",
    category: "Injection",
    concept: "Template injection",
    cwe: "CWE-94",
    title: "Dynamic template rendering with user-controlled input",
    description:
      "Template rendering API receives user-controlled template content.",
    impact: "Server-side template injection can lead to remote code execution.",
    recommendation:
      "Avoid rendering untrusted template strings. Use strict allowlisted templates.",
    rootCausePattern: "template-string-user-input-to-renderer",
  };
}

function createPythonFinding({
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
  detectionConfidence = 90,
  flowConfidence = 55,
  exploitabilityConfidence = 72,
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
        ? "Flow confirmed from user-controlled source to Python sink."
        : "No strong source-to-sink confirmation for this Python sink.",
    codeBlock: buildCodeBlock(lines, lineStart, lineEnd),
    codeBlockHtml: buildCodeBlockHtml(lines, lineStart, lineEnd),
    fullyQualifiedFunction: matchedExpression,
    resolvedModuleSource: "python.local",
    importVerified: true,
    sourceToSinkDetected,
    flowStatus,
    confidenceReason:
      confidenceReason ||
      `Confidence ${overallConfidence}/100 based on Python sink classification and flow evidence.`,
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
        ? "This path appears web-exposed; attacker-controlled input is plausible."
        : "This path appears internal; remote exploitability is lower.",
    developerAction: definition.recommendation,
    suppressed: false,
  };
}

function expressionIsDynamicSql(expression) {
  const expr = String(expression || "");
  return expr.includes("+") || /\bf["'].*\{.+\}.*["']/.test(expr);
}

function expressionHasUserFlow(expression, tainted, assignments) {
  const expr = String(expression || "");
  if (isUserInputExpression(expr)) return true;
  if (expressionUsesAnyTainted(expr, tainted)) return true;
  for (const [name, assignedExpression] of assignments.entries()) {
    if (expressionUsesVariable(expr, name)) {
      if (isUserInputExpression(assignedExpression)) return true;
      if (expressionUsesAnyTainted(assignedExpression, tainted)) return true;
    }
  }
  return false;
}

function extractCallArguments(line) {
  const text = String(line || "");
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + 1, end);
}

function analyzePythonFile(file) {
  const content = String(file.content || "");
  const lines = content.split(/\r?\n/);
  const executionContext = classifyExecutionContext(file.path, content);
  const attackSurface = mapAttackSurface(executionContext);
  const findings = [];
  const dedupe = new Set();
  const flowSignals = inferFlowSignals(lines);

  const metrics = {
    httpRoutesAnalyzed: 0,
    sinksReviewed: 0,
    secretPatternsChecked: 0,
  };

  for (const line of lines) {
    if (PYTHON_ROUTE_PATTERN.test(line)) metrics.httpRoutesAnalyzed += 1;
  }

  const addFinding = (finding) => {
    const key = `${finding.ruleId}|${finding.filePath}|${finding.lineStart}|${finding.matchedExpression}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    findings.push(finding);
  };

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripInlineComment(rawLine);
    const lower = line.toLowerCase();
    const argumentText = extractCallArguments(line);

    if (lower.includes("request.") || lower.includes("input(")) {
      metrics.secretPatternsChecked += 1;
    }

    if (
      /\bos\.(system|popen)\s*\(/.test(line) ||
      /\bsubprocess\.(call|run|Popen)\s*\(/.test(line)
    ) {
      metrics.sinksReviewed += 1;
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      if (!hasFlow) return;
      const definition = resolveDefinition("command_execution");
      addFinding(
        createPythonFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity: "high",
          executionContext,
          sourceToSinkDetected: true,
          flowStatus: "confirmed",
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: os.system/os.popen/subprocess.*",
            "Source flow: confirmed user input reaches command execution sink.",
          ],
          matchedExpression: /subprocess/.test(line)
            ? "subprocess.*"
            : "os.system",
          reasoning:
            "Python command execution sink receives user-controlled input.",
          inputSourceRank: INPUT_RANK.CRITICAL,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Likely" : "Possible",
          flowConfidence: 92,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 88 : 72,
        })
      );
      return;
    }

    if (/\b(eval|exec)\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      if (!hasFlow) return;
      const definition = resolveDefinition("dynamic_code_execution");
      addFinding(
        createPythonFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity: "critical",
          executionContext,
          sourceToSinkDetected: true,
          flowStatus: "confirmed",
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: eval/exec",
            "Source flow: confirmed user input reaches dangerous code execution primitive.",
          ],
          matchedExpression: /\bexec\s*\(/.test(line) ? "python.exec" : "python.eval",
          reasoning:
            "Untrusted input reaches dynamic code execution in Python.",
          inputSourceRank: INPUT_RANK.CRITICAL,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Likely" : "Possible",
          flowConfidence: 96,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 90 : 74,
        })
      );
      return;
    }

    if (/\b(cursor|conn)\.execute\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const isDynamicSql = expressionIsDynamicSql(argumentText);
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      if (!isDynamicSql) return;
      const definition = resolveDefinition("sql_injection");
      addFinding(
        createPythonFinding({
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
            `Matched call: ${line.trim()}`,
            "Resolved API: cursor.execute/conn.execute",
            hasFlow
              ? "Source flow: dynamic query includes user-controlled value."
              : "Dynamic SQL string detected; source flow is partial.",
          ],
          matchedExpression: "python.db.execute",
          reasoning:
            "Dynamic SQL execution in Python can enable SQL injection when user input is concatenated.",
          inputSourceRank: hasFlow ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
          exploitability:
            hasFlow && attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
              ? "Likely"
              : "Possible",
          flowConfidence: hasFlow ? 88 : 56,
          exploitabilityConfidence:
            hasFlow && attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 86 : 68,
        })
      );
      return;
    }

    if (
      /\bopen\s*\(/.test(line) ||
      /\bPath\s*\(/.test(line) ||
      /\bos\.open\s*\(/.test(line) ||
      /\bos\.path\.join\s*\(/.test(line)
    ) {
      metrics.sinksReviewed += 1;
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      if (!hasFlow) return;
      const definition = resolveDefinition("path_traversal");
      addFinding(
        createPythonFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "high" : "medium",
          executionContext,
          sourceToSinkDetected: true,
          flowStatus: "confirmed",
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: open/Path/os.open/os.path.join",
            "Source flow: user-controlled input reaches filesystem path operation.",
          ],
          matchedExpression: "python.filesystem.path_operation",
          reasoning:
            "Filesystem path built from user input may allow path traversal.",
          inputSourceRank: INPUT_RANK.CRITICAL,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Likely" : "Possible",
          flowConfidence: 84,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 82 : 66,
        })
      );
      return;
    }

    if (/\bpickle\.loads\s*\(/.test(line) || /\byaml\.load\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      const definition = resolveDefinition("unsafe_deserialization");
      addFinding(
        createPythonFinding({
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
            `Matched call: ${line.trim()}`,
            "Resolved API: pickle.loads/yaml.load",
            hasFlow
              ? "Source flow: user data reaches deserialization sink."
              : "Deserialization sink found; source flow is partial.",
          ],
          matchedExpression: /\bpickle\.loads/.test(line)
            ? "pickle.loads"
            : "yaml.load",
          reasoning:
            "Unsafe Python deserialization can lead to code execution.",
          inputSourceRank: hasFlow ? INPUT_RANK.CRITICAL : INPUT_RANK.UNKNOWN,
          exploitability:
            hasFlow && attackSurface === ATTACK_SURFACE.PUBLIC_HTTP
              ? "Likely"
              : "Possible",
          flowConfidence: hasFlow ? 86 : 55,
          exploitabilityConfidence:
            hasFlow && attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 84 : 66,
        })
      );
      return;
    }

    if (
      /\brandom\.random\s*\(/.test(line) ||
      /\brandom\.randint\s*\(/.test(line)
    ) {
      metrics.sinksReviewed += 1;
      const windowText = lines
        .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
        .join(" ");
      if (!SECURITY_RANDOM_CONTEXT_PATTERN.test(windowText)) return;
      const definition = resolveDefinition("insecure_randomness");
      addFinding(
        createPythonFinding({
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
            `Matched call: ${line.trim()}`,
            "Resolved API: random.random/random.randint",
            "Security context hint: token/auth/session indicator near randomness usage.",
          ],
          matchedExpression: /\brandom\.randint/.test(line)
            ? "random.randint"
            : "random.random",
          reasoning:
            "Predictable randomness appears in security-sensitive context.",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Possible" : "Unlikely",
          flowConfidence: 32,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 62 : 50,
        })
      );
      return;
    }

    if (/\bhashlib\.(md5|sha1)\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const definition = resolveWeakCryptoDefinition();
      addFinding(
        createPythonFinding({
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
            `Matched call: ${line.trim()}`,
            "Resolved API: hashlib.md5/hashlib.sha1",
            "Weak hash algorithm detected.",
          ],
          matchedExpression: /\bhashlib\.sha1/.test(line)
            ? "hashlib.sha1"
            : "hashlib.md5",
          reasoning:
            "Weak hashing algorithm is used in Python cryptographic operation.",
          inputSourceRank: INPUT_RANK.UNKNOWN,
          exploitability: "Possible",
          flowConfidence: 30,
          exploitabilityConfidence: 58,
        })
      );
      return;
    }

    if (/\brender_template_string\s*\(/.test(line)) {
      metrics.sinksReviewed += 1;
      const hasFlow = expressionHasUserFlow(argumentText, flowSignals.tainted, flowSignals.assignments);
      if (!hasFlow) return;
      const definition = resolveTemplateInjectionDefinition();
      addFinding(
        createPythonFinding({
          file,
          lines,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          definition,
          severity: "high",
          executionContext,
          sourceToSinkDetected: true,
          flowStatus: "confirmed",
          evidenceParts: [
            `Matched call: ${line.trim()}`,
            "Resolved API: flask.render_template_string",
            "Source flow: user input reaches dynamic template rendering sink.",
          ],
          matchedExpression: "flask.render_template_string",
          reasoning:
            "User-controlled template strings can trigger server-side template injection.",
          inputSourceRank: INPUT_RANK.CRITICAL,
          exploitability:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? "Likely" : "Possible",
          flowConfidence: 90,
          exploitabilityConfidence:
            attackSurface === ATTACK_SURFACE.PUBLIC_HTTP ? 86 : 68,
        })
      );
      return;
    }

    const assignment = line.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(['"])([^'"\r\n]{8,})\2\s*$/
    );
    if (!assignment) return;
    const keyName = String(assignment[1] || "");
    const literal = String(assignment[3] || "");
    metrics.secretPatternsChecked += 1;
    if (!SECRET_VAR_PATTERN.test(keyName)) return;
    if (SECRET_PLACEHOLDER_PATTERN.test(literal)) return;
    const definition = resolveDefinition("hardcoded_secret");
    addFinding(
      createPythonFinding({
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
          `Matched assignment: ${keyName} = "<secret_literal>"`,
          "Resolved API: python constant assignment",
        ],
        matchedExpression: "python.constant_assignment",
        reasoning: "Secret-like value is hardcoded in Python source code.",
        inputSourceRank: INPUT_RANK.UNKNOWN,
        exploitability: "Possible",
        flowConfidence: 30,
        exploitabilityConfidence: 60,
        confidenceReason: "Direct hardcoded secret literal found in Python code.",
      })
    );
  });

  return {
    findings,
    parseError: false,
    metrics,
    metadata: {
      parsing_strategy: "python_token_lite",
      frameworks_detected: [
        ...(content.includes("flask") ? ["Flask"] : []),
        ...(content.includes("fastapi") ? ["FastAPI"] : []),
        ...(content.includes("django") ? ["Django"] : []),
      ],
      sources: PYTHON_SOURCE_PATTERNS,
      sinks: PYTHON_SINK_PATTERNS,
    },
  };
}

export const pythonAnalyzerPlugin = {
  key: "python",
  name: "Python Analyzer",
  parsingStrategy: "token_lite",
  frameworkDetection: ["Flask", "FastAPI", "Django"],
  sources: PYTHON_SOURCE_PATTERNS,
  sinks: PYTHON_SINK_PATTERNS,
  analyze: analyzePythonFile,
};
