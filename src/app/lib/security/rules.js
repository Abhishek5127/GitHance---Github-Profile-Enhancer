export const SEVERITY_WEIGHTS = {
  critical: 18,
  high: 11,
  medium: 6,
  low: 3,
};

function languages(list = []) {
  return list.map((item) => String(item || "").toLowerCase());
}

export const SECURITY_RULES = [
  {
    id: "sql-injection-dynamic-query",
    category: "Injection",
    concept: "SQL injection",
    severity: "high",
    title: "Dynamic SQL query composition",
    message: "SQL query appears to be built from dynamic input.",
    explanation: "Concatenated/interpolated SQL strings can allow attacker-controlled query manipulation.",
    impact: "Database read/write bypass, data leakage, or destructive query execution.",
    remediation: "Use parameterized queries or prepared statements for all user-controlled values.",
    cwe: "CWE-89",
    confidence: "medium",
    maxPerFile: 6,
    detectors: [
      {
        regex:
          /\b(?:query|execute|rawQuery)\s*\(\s*(?:`[^`]*\$\{[^}]+}[^`]*`|["'][^"']*["']\s*\+\s*(?:req\.|request\.|params|query|body|input))/gi,
      },
      {
        regex:
          /\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,140}(?:\+|\$\{)\s*(?:req\.|request\.|params|query|body|input)/gi,
      },
    ],
  },
  {
    id: "nosql-injection-user-filter",
    category: "Injection",
    concept: "NoSQL injection",
    severity: "high",
    title: "User-controlled NoSQL filter",
    message: "Database query filter appears directly user-controlled.",
    explanation: "Passing raw request objects/filters into NoSQL queries can bypass intended restrictions.",
    impact: "Unauthorized data access or privileged query logic execution.",
    remediation: "Validate and whitelist query operators/fields before constructing NoSQL filters.",
    cwe: "CWE-943",
    confidence: "medium",
    maxPerFile: 6,
    detectors: [
      {
        regex:
          /\b(?:find|findOne|aggregate|where)\s*\(\s*(?:req\.query|req\.body|request\.query|request\.body|params|input)\b/gi,
      },
      {
        regex: /\$where\s*:\s*(?:req\.|request\.|params|query|body|input)/gi,
      },
    ],
  },
  {
    id: "command-injection-dynamic-command",
    category: "Injection",
    concept: "OS command injection",
    severity: "high",
    title: "Shell command built from dynamic input",
    message: "Dynamic process execution pattern can lead to command injection.",
    explanation: "User-controlled shell arguments can escape command boundaries.",
    impact: "Remote command execution on the host running the application.",
    remediation: "Avoid shell invocation; use argument arrays and strict allowlists.",
    cwe: "CWE-78",
    confidence: "medium",
    maxPerFile: 5,
    detectors: [
      {
        regex:
          /\b(?:exec|execSync|spawn|spawnSync|system|popen|Runtime\.getRuntime\(\)\.exec)\s*\([^)]*(?:req\.|request\.|params|query|body|input)/gi,
      },
      {
        regex:
          /\b(?:exec|spawn|system|popen)\s*\(\s*(?:`[^`]*\$\{[^}]+}[^`]*`|["'][^"']*["']\s*\+\s*(?:req\.|request\.|params|query|body|input))/gi,
      },
    ],
  },
  {
    id: "ldap-injection-filter-build",
    category: "Injection",
    concept: "LDAP injection",
    severity: "medium",
    title: "LDAP filter built from dynamic input",
    message: "LDAP query/filter appears to include unsanitized user input.",
    explanation: "Unsafe LDAP filter construction can alter intended directory queries.",
    impact: "Directory data exposure or authentication bypass.",
    remediation: "Escape LDAP special characters and use safe LDAP query builders.",
    cwe: "CWE-90",
    confidence: "low",
    maxPerFile: 4,
    detectors: [
      {
        regex:
          /\b(?:ldap|Ldap|DirectorySearcher|search)\b[\s\S]{0,120}(?:req\.|request\.|params|query|body|input)/gi,
      },
      {
        regex: /\(\s*uid=\$\{?(?:req\.|request\.|params|query|body|input)/gi,
      },
    ],
  },
  {
    id: "template-injection-render-user-input",
    category: "Injection",
    concept: "Template injection",
    severity: "medium",
    title: "Template/render source appears user-controlled",
    message: "Template rendering with dynamic untrusted input can lead to server-side injection.",
    explanation: "User-influenced template strings can execute unintended template logic.",
    impact: "Potential server-side template injection and code execution.",
    remediation: "Render fixed templates only; pass user input as escaped data variables.",
    cwe: "CWE-1336",
    confidence: "low",
    maxPerFile: 4,
    detectors: [
      {
        regex:
          /\b(?:render|renderString|compile|Template\.fromString|jinja2\.Template|twig->render)\s*\([^)]*(?:req\.|request\.|params|query|body|input)/gi,
      },
    ],
  },
  {
    id: "unsafe-eval-exec",
    category: "Unsafe Execution",
    concept: "Dynamic code execution",
    severity: "high",
    title: "Unsafe dynamic code execution primitive",
    message: "Dynamic code execution (eval/Function/exec) detected.",
    explanation: "Executing runtime-generated code is dangerous, especially with untrusted data.",
    impact: "Arbitrary code execution and complete application compromise.",
    remediation: "Replace with safe parsing and constrained evaluation mechanisms.",
    cwe: "CWE-95",
    confidence: "medium",
    maxPerFile: 8,
    detectors: [
      {
        regex:
          /\b(?:eval|Function|new Function|setTimeout|setInterval)\s*\([^)]*(?:req\.|request\.|params|query|body|input)?/gi,
      },
      {
        regex: /\b(?:exec|execSync|Runtime\.getRuntime\(\)\.exec|system|popen)\s*\(/gi,
      },
    ],
  },
  {
    id: "hardcoded-private-key",
    category: "Secrets",
    concept: "Hardcoded secret",
    severity: "critical",
    title: "Private key material in source",
    message: "Private key block detected in repository source.",
    explanation: "Private keys in source control are considered leaked and compromised.",
    impact: "Unauthorized service access and identity impersonation.",
    remediation: "Rotate keys immediately and remove key material from history.",
    cwe: "CWE-798",
    confidence: "high",
    maxPerFile: 2,
    detectors: [{ regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/gi }],
  },
  {
    id: "hardcoded-credential-value",
    category: "Secrets",
    concept: "Hardcoded secret",
    severity: "high",
    title: "Credential-like constant detected",
    message: "Secret/token/password appears hardcoded.",
    explanation: "Embedding credentials in code increases leakage and unauthorized access risk.",
    impact: "Credential exposure can lead to account takeover or data breach.",
    remediation: "Move credentials to a secure secret manager and rotate exposed values.",
    cwe: "CWE-798",
    confidence: "medium",
    maxPerFile: 8,
    detectors: [
      {
        regex:
          /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-+=\/]{10,}["']/gi,
      },
      {
        regex: /\b(?:Authorization|Bearer)\s*[:=]\s*["'][A-Za-z0-9._\-]{20,}["']/gi,
      },
    ],
  },
  {
    id: "weak-hash-usage",
    category: "Cryptography",
    concept: "Insecure cryptography",
    severity: "medium",
    title: "Weak hashing algorithm",
    message: "Weak hash algorithm (MD5/SHA1) usage detected.",
    explanation: "Weak hash algorithms are vulnerable to collisions and security bypasses.",
    impact: "Integrity checks and signatures may be forgeable.",
    remediation: "Use SHA-256/512 for integrity and Argon2/bcrypt/scrypt for passwords.",
    cwe: "CWE-328",
    confidence: "medium",
    maxPerFile: 5,
    detectors: [
      { regex: /\b(?:md5|sha1)\s*\(/gi },
      { regex: /\b(?:MessageDigest\.getInstance\(["'](?:MD5|SHA-1)["']\))/gi },
    ],
  },
  {
    id: "hardcoded-encryption-key",
    category: "Cryptography",
    concept: "Insecure cryptography",
    severity: "high",
    title: "Hardcoded encryption key",
    message: "Encryption key-like value appears hardcoded.",
    explanation: "Static keys in source defeat key lifecycle controls and confidentiality guarantees.",
    impact: "Encrypted data may be decrypted by attackers with repository access.",
    remediation: "Store keys in managed KMS/secret stores and rotate regularly.",
    cwe: "CWE-321",
    confidence: "medium",
    maxPerFile: 6,
    detectors: [
      {
        regex:
          /\b(?:encryption[_-]?key|aes[_-]?key|secret[_-]?key|jwt[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_\-+=\/]{12,}["']/gi,
      },
    ],
  },
  {
    id: "insecure-randomness",
    category: "Cryptography",
    concept: "Insecure random generation",
    severity: "medium",
    title: "Non-cryptographic randomness for security-sensitive value",
    message: "Insecure random generator appears in security-sensitive context.",
    explanation: "Predictable randomness can break token, nonce, or password-reset security.",
    impact: "Session/token prediction and unauthorized account actions.",
    remediation: "Use cryptographically secure RNG APIs for secrets and tokens.",
    cwe: "CWE-338",
    confidence: "low",
    maxPerFile: 6,
    detectors: [
      { regex: /\bMath\.random\s*\(/g, languages: languages(["javascript", "typescript"]) },
      { regex: /\brandom\.random\s*\(/g, languages: languages(["python"]) },
      { regex: /\brand\s*\(\s*\)/g, languages: languages(["c", "c++"]) },
    ],
  },
  {
    id: "insecure-token-validation",
    category: "Authentication",
    concept: "Broken authentication logic",
    severity: "high",
    title: "Token verification bypass pattern",
    message: "Token appears decoded/accepted without full signature validation.",
    explanation: "Decoding without verification allows forged or tampered tokens.",
    impact: "Authentication bypass and account impersonation.",
    remediation: "Always verify token signature, issuer, audience, and expiration.",
    cwe: "CWE-347",
    confidence: "medium",
    maxPerFile: 5,
    detectors: [
      { regex: /\bjwt\.decode\s*\(/gi, languages: languages(["javascript", "typescript", "python"]) },
      { regex: /\bverify_signature\s*=\s*False\b/gi, languages: languages(["python"]) },
      { regex: /\bignoreExpiration\s*:\s*true\b/gi, languages: languages(["javascript", "typescript"]) },
    ],
  },
  {
    id: "missing-auth-check-endpoint",
    category: "Authentication",
    concept: "Broken authentication logic",
    severity: "medium",
    title: "Endpoint handler may be missing explicit auth guard",
    message: "Route/controller pattern found without nearby auth/verify guard keywords.",
    explanation: "Handlers that process sensitive data without auth checks may expose protected actions.",
    impact: "Unauthorized API access and data exposure.",
    remediation: "Enforce authentication middleware/guards for protected routes.",
    cwe: "CWE-306",
    confidence: "low",
    maxPerFile: 4,
    detectors: [
      {
        regex:
          /\b(?:app\.(?:get|post|put|delete|patch)|router\.(?:get|post|put|delete|patch)|@(?:GetMapping|PostMapping|PutMapping|DeleteMapping)|def\s+\w+\(request\)|func\s+\w+\(w\s+http\.ResponseWriter,\s*r\s+\*http\.Request\))/gi,
      },
    ],
  },
  {
    id: "broken-access-control-idor",
    category: "Access Control",
    concept: "Broken access control",
    severity: "high",
    title: "Potential IDOR/object access without permission check",
    message: "Direct object lookup from request identifiers detected.",
    explanation: "Accessing records by user-supplied IDs without ownership checks can leak data.",
    impact: "Unauthorized read/write of other users' resources.",
    remediation: "Add ownership and role-based authorization before object fetch/update.",
    cwe: "CWE-639",
    confidence: "medium",
    maxPerFile: 6,
    detectors: [
      {
        regex:
          /\b(?:findById|find_one|findOne|GetById|SelectById|where\s+id\s*=)\b[\s\S]{0,100}(?:req\.params|req\.query|request\.args|request\.query|params\["id"\]|query\["id"\])/gi,
      },
    ],
  },
  {
    id: "unsafe-deserialization",
    category: "Deserialization",
    concept: "Unsafe deserialization",
    severity: "high",
    title: "Unsafe deserialization primitive",
    message: "Deserialization of potentially untrusted data detected.",
    explanation: "Unsafe object deserialization can trigger gadget chains and remote code execution.",
    impact: "Arbitrary code execution or privilege escalation.",
    remediation: "Avoid native object deserialization for untrusted data; use safe schemas.",
    cwe: "CWE-502",
    confidence: "medium",
    maxPerFile: 5,
    detectors: [
      { regex: /\bpickle\.loads\s*\(/gi, languages: languages(["python"]) },
      { regex: /\byaml\.load\s*\((?![^)]*SafeLoader)/gi, languages: languages(["python"]) },
      { regex: /\bObjectInputStream\s*\(/gi, languages: languages(["java"]) },
      { regex: /\bunserialize\s*\(/gi, languages: languages(["php", "ruby"]) },
      { regex: /\bBinaryFormatter\s*\(/gi, languages: languages(["c#"]) },
    ],
  },
  {
    id: "path-traversal-file-access",
    category: "File Handling",
    concept: "Path traversal",
    severity: "high",
    title: "Path traversal risk in file access",
    message: "Filesystem operation appears to consume user-controlled path data.",
    explanation: "Unsanitized paths can escape intended directories using traversal sequences.",
    impact: "Unauthorized file read/write/delete outside allowed scope.",
    remediation: "Normalize paths and enforce strict base directory allowlists.",
    cwe: "CWE-22",
    confidence: "medium",
    maxPerFile: 6,
    detectors: [
      {
        regex:
          /\b(?:readFile|readFileSync|writeFile|writeFileSync|open|openSync|createReadStream|createWriteStream|File\.)\s*\([^)]*(?:req\.|request\.|params|query|body|input)/gi,
      },
      { regex: /\.\.[\\/]/g },
    ],
  },
  {
    id: "insecure-file-upload",
    category: "File Handling",
    concept: "Insecure file handling",
    severity: "medium",
    title: "Potential insecure file upload handling",
    message: "Upload/save operation detected without obvious content/type restriction.",
    explanation: "Unrestricted uploads can allow malware or executable payload storage.",
    impact: "Remote code execution or stored malware distribution.",
    remediation: "Validate MIME/extension, scan files, and store outside executable paths.",
    cwe: "CWE-434",
    confidence: "low",
    maxPerFile: 4,
    detectors: [
      { regex: /\b(?:multer\.any|save\(|upload\(|IFormFile|request\.files|req\.files)\b/gi },
      { regex: /\bmove_uploaded_file\s*\(/gi, languages: languages(["php"]) },
    ],
  },
  {
    id: "race-condition-check-then-act",
    category: "Concurrency",
    concept: "Race condition",
    severity: "medium",
    title: "Check-then-act file operation",
    message: "File existence check followed by separate write/open operation detected.",
    explanation: "TOCTOU patterns can be raced between check and use, leading to unintended behavior.",
    impact: "Privilege abuse, file clobbering, or bypass of intended checks.",
    remediation: "Use atomic filesystem operations and lock-sensitive resources.",
    cwe: "CWE-367",
    confidence: "low",
    maxPerFile: 3,
    detectors: [
      { regex: /\bexistsSync\s*\([^)]*\)[\s\S]{0,100}\b(?:writeFile|open|rename|unlink)\b/gi },
      { regex: /\bif\s*\(\s*os\.path\.exists\([^)]*\)\s*\)[\s\S]{0,100}\bopen\s*\(/gi, languages: languages(["python"]) },
    ],
  },
  {
    id: "debug-endpoint-enabled",
    category: "Operational Security",
    concept: "Debug endpoints left enabled",
    severity: "medium",
    title: "Debug mode/endpoint appears enabled",
    message: "Debug route or debug runtime mode found in code.",
    explanation: "Debug utilities can expose stack traces, internals, or privileged actions in production.",
    impact: "Information disclosure and increased exploitability.",
    remediation: "Disable debug endpoints in production and guard with strict admin controls.",
    cwe: "CWE-489",
    confidence: "medium",
    maxPerFile: 5,
    detectors: [
      { regex: /\b(?:debug\s*=\s*true|FLASK_DEBUG\s*=\s*1|app\.run\([^)]*debug\s*=\s*True)\b/gi },
      { regex: /\/(?:debug|internal|admin\/debug|test\/only)\b/gi },
    ],
  },
  {
    id: "sensitive-data-logging",
    category: "Information Exposure",
    concept: "Logging sensitive information",
    severity: "medium",
    title: "Sensitive data may be logged",
    message: "Log statement appears to include credentials or secret-bearing fields.",
    explanation: "Sensitive values in logs increase breach impact and insider exposure risk.",
    impact: "Credential leakage and unauthorized access through log compromise.",
    remediation: "Mask/redact sensitive fields before logging.",
    cwe: "CWE-532",
    confidence: "medium",
    maxPerFile: 8,
    detectors: [
      {
        regex:
          /\b(?:console\.log|logger\.(?:info|debug|warn|error)|print|fmt\.Print|System\.out\.println)\b[\s\S]{0,120}(?:password|passwd|token|secret|authorization|api[_-]?key)/gi,
      },
    ],
  },
];

export function normalizeLanguage(language) {
  return String(language || "").toLowerCase();
}

export function severityRank(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
