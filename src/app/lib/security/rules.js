export const SEVERITY_WEIGHTS = {
  critical: 18,
  high: 11,
  medium: 6,
  low: 3,
  informational: 1,
};

export const SUPPORTED_SEMANTIC_LANGUAGES = new Set(["javascript", "typescript"]);

export const VULNERABILITY_DEFINITIONS = {
  command_execution: {
    id: "command_execution",
    category: "Injection",
    concept: "OS command injection",
    cwe: "CWE-78",
    title: "User-controlled data reaches command execution sink",
    description:
      "OS command APIs are invoked with values that can be influenced by external input.",
    impact:
      "Potential remote command execution on application host with service privileges.",
    recommendation:
      "Avoid shell execution for untrusted input. Use strict allowlists and argument arrays.",
    rootCausePattern: "confirmed-command-execution-sink",
  },
  dynamic_code_execution: {
    id: "dynamic_code_execution",
    category: "Unsafe Execution",
    concept: "Dynamic code execution",
    cwe: "CWE-95",
    title: "Dynamic code execution primitive with untrusted input",
    description:
      "Runtime code execution primitives (eval/Function/vm) are called with tainted input.",
    impact: "Arbitrary code execution and full compromise of application runtime.",
    recommendation:
      "Replace runtime code execution with safe parsers and constrained interpreters.",
    rootCausePattern: "dynamic-code-execution-dangerous-sink",
  },
  sql_injection: {
    id: "sql_injection",
    category: "Injection",
    concept: "SQL injection",
    cwe: "CWE-89",
    title: "Dynamic SQL construction in database sink",
    description:
      "A SQL execution API receives query text built from externally controlled values.",
    impact: "Database data exposure, tampering, or destructive query execution.",
    recommendation: "Use parameterized statements and strict query builders.",
    rootCausePattern: "sql-query-construction-tainted-input",
  },
  nosql_injection: {
    id: "nosql_injection",
    category: "Injection",
    concept: "NoSQL injection",
    cwe: "CWE-943",
    title: "NoSQL filter/query sink receives untrusted object",
    description: "NoSQL query APIs consume externally controlled filters or operators.",
    impact: "Unauthorized data access and bypass of intended query restrictions.",
    recommendation:
      "Whitelist fields and operators before using request data in query filters.",
    rootCausePattern: "nosql-query-tainted-filter",
  },
  path_traversal: {
    id: "path_traversal",
    category: "File Handling",
    concept: "Path traversal",
    cwe: "CWE-22",
    title: "Filesystem sink consumes untrusted path",
    description:
      "File access APIs are invoked with path components that can be controlled by external input.",
    impact: "Unauthorized file read/write outside allowed directory boundaries.",
    recommendation:
      "Canonicalize and validate paths against strict allowed base directories.",
    rootCausePattern: "filesystem-path-tainted-input",
  },
  weak_crypto: {
    id: "weak_crypto",
    category: "Cryptography",
    concept: "Insecure cryptography",
    cwe: "CWE-328",
    title: "Weak hash algorithm in cryptographic sink",
    description: "Weak algorithms such as MD5 or SHA1 are used in cryptographic operations.",
    impact: "Collision and integrity-bypass risk for signatures and integrity checks.",
    recommendation: "Use SHA-256/SHA-512 and modern password hashing primitives.",
    rootCausePattern: "weak-hash-algorithm-in-crypto-sink",
  },
  insecure_token_validation: {
    id: "insecure_token_validation",
    category: "Authentication",
    concept: "Broken authentication logic",
    cwe: "CWE-347",
    title: "Token parsing without strict verification",
    description:
      "Token handling API allows decode-only or weakened verification configuration.",
    impact: "Authentication bypass via forged or tampered tokens.",
    recommendation:
      "Use strict signature verification and validate issuer, audience, and expiration.",
    rootCausePattern: "token-verification-bypass-configuration",
  },
  sensitive_logging: {
    id: "sensitive_logging",
    category: "Information Exposure",
    concept: "Logging sensitive information",
    cwe: "CWE-532",
    title: "Sensitive values passed to logging sink",
    description:
      "Log APIs receive secrets, passwords, tokens, or authorization material.",
    impact: "Credential leakage through application logs and monitoring systems.",
    recommendation:
      "Mask/redact sensitive fields before logging and reduce logging of auth payloads.",
    rootCausePattern: "sensitive-data-sent-to-logging-sink",
  },
  hardcoded_secret: {
    id: "hardcoded_secret",
    category: "Secrets",
    concept: "Hardcoded secret",
    cwe: "CWE-798",
    title: "Hardcoded credential or secret value",
    description: "Credential-like constants are embedded directly in source code.",
    impact: "Secret leakage and unauthorized access through repository exposure.",
    recommendation:
      "Move secrets to managed secret storage and rotate exposed credentials.",
    rootCausePattern: "hardcoded-credential-constant",
  },
  insecure_randomness: {
    id: "insecure_randomness",
    category: "Cryptography",
    concept: "Insecure random generation",
    cwe: "CWE-338",
    title: "Non-cryptographic randomness in security context",
    description:
      "Predictable random generation is used where cryptographic randomness is expected.",
    impact: "Token/session predictability and potential account compromise.",
    recommendation:
      "Use cryptographic randomness APIs for secrets, tokens, and nonces.",
    rootCausePattern: "non-cryptographic-randomness-security-context",
  },
};

export const JS_TS_SINK_CATALOG = {
  command_execution: [
    { module: "child_process", members: ["exec", "execSync", "spawn", "spawnSync", "execFile", "execFileSync", "fork"] },
    { module: "node:child_process", members: ["exec", "execSync", "spawn", "spawnSync", "execFile", "execFileSync", "fork"] },
    { module: "execa", members: ["execa", "execaCommand", "execaCommandSync"] },
  ],
  dynamic_code_execution: [
    { global: "eval" },
    { global: "Function" },
    { global: "setTimeout" },
    { global: "setInterval" },
    { module: "vm", members: ["runInNewContext", "runInThisContext", "runInContext", "compileFunction"] },
    { module: "node:vm", members: ["runInNewContext", "runInThisContext", "runInContext", "compileFunction"] },
  ],
  sql_injection: [
    { module: "mysql", members: ["query", "execute"] },
    { module: "mysql2", members: ["query", "execute"] },
    { module: "pg", members: ["query"] },
    { module: "knex", members: ["raw"] },
    { module: "sequelize", members: ["query"] },
  ],
  nosql_injection: [
    { module: "mongodb", members: ["find", "findOne", "aggregate", "updateOne", "updateMany"] },
    { module: "mongoose", members: ["find", "findOne", "aggregate", "updateOne", "updateMany", "where"] },
  ],
  path_traversal: [
    { module: "fs", members: ["readFile", "readFileSync", "writeFile", "writeFileSync", "open", "openSync", "createReadStream", "createWriteStream", "rm", "unlink"] },
    { module: "node:fs", members: ["readFile", "readFileSync", "writeFile", "writeFileSync", "open", "openSync", "createReadStream", "createWriteStream", "rm", "unlink"] },
    { module: "node:fs/promises", members: ["readFile", "writeFile", "open", "rm", "unlink"] },
  ],
  weak_crypto: [
    { module: "crypto", members: ["createHash"] },
    { module: "node:crypto", members: ["createHash"] },
  ],
  insecure_token_validation: [
    { module: "jsonwebtoken", members: ["decode", "verify"] },
    { module: "jose", members: ["decodeJwt", "jwtVerify"] },
  ],
  sensitive_logging: [
    { globalObject: "console", members: ["log", "info", "warn", "error", "debug"] },
    { module: "pino", members: ["info", "warn", "error", "debug"] },
    { module: "winston", members: ["info", "warn", "error", "debug"] },
    { module: "bunyan", members: ["info", "warn", "error", "debug"] },
  ],
  insecure_randomness: [
    { globalObject: "Math", members: ["random"] },
  ],
};

export const NON_JS_SINK_CATALOG = {
  python: {
    command_execution: ["os.system", "subprocess.run", "subprocess.Popen"],
    dynamic_code_execution: ["eval", "exec"],
  },
  java: {
    command_execution: ["Runtime.getRuntime().exec", "ProcessBuilder.start"],
    dynamic_code_execution: ["ScriptEngine.eval"],
  },
  php: {
    command_execution: ["shell_exec", "system", "exec"],
    dynamic_code_execution: ["eval"],
  },
  go: {
    command_execution: ["os/exec.Command", "os/exec.CommandContext"],
  },
  c: {
    command_execution: ["system"],
  },
  "c++": {
    command_execution: ["system"],
  },
  csharp: {
    command_execution: ["System.Diagnostics.Process.Start"],
  },
  rust: {
    command_execution: ["std::process::Command::new"],
  },
  ruby: {
    command_execution: ["Kernel.system", "Open3.capture3"],
  },
};

export function normalizeLanguage(language) {
  const normalized = String(language || "").trim().toLowerCase();
  if (normalized === "js") return "javascript";
  if (normalized === "ts") return "typescript";
  if (normalized === "c#") return "csharp";
  if (normalized === "c/c++") return "c++";
  return normalized;
}

export function severityRank(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}
