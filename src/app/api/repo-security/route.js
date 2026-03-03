import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";

const MAX_REPO_TREE_ITEMS = 7000;
const MAX_ANALYZED_CODE_FILES = 220;
const MAX_FILE_SIZE_BYTES = 250_000;
const FETCH_CONCURRENCY = 8;
const MAX_FINDINGS_RETURNED = 180;

const CODE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "cs",
  "cpp",
  "cxx",
  "cc",
  "c",
  "h",
  "hpp",
  "php",
  "rb",
  "swift",
  "scala",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "lua",
  "dart",
  "ex",
  "exs",
  "sql",
  "r",
  "vue",
  "svelte",
  "yml",
  "yaml",
  "toml",
  "ini",
  "cfg",
  "env",
]);

const CODE_FILE_NAMES = new Set([
  "dockerfile",
  "makefile",
  "cmakelists.txt",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
]);

const SEVERITY_WEIGHTS = {
  critical: 15,
  high: 9,
  medium: 5,
  low: 2,
};

function severityRank(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

const VULNERABILITY_RULES = [
  {
    id: "private-key-material",
    category: "Secrets",
    severity: "critical",
    message: "Private key material appears to be committed.",
    regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/gi,
    maxPerFile: 2,
  },
  {
    id: "hardcoded-secret",
    category: "Secrets",
    severity: "high",
    message: "Potential hardcoded credential detected.",
    regex:
      /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-+=\/]{12,}["']/gi,
    maxPerFile: 6,
  },
  {
    id: "tls-verification-disabled",
    category: "Transport",
    severity: "high",
    message: "TLS verification appears disabled.",
    regex: /(?:NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0["']?|rejectUnauthorized\s*:\s*false)/gi,
    maxPerFile: 3,
  },
  {
    id: "unsafe-eval",
    category: "Unsafe Code",
    severity: "high",
    message: "Dynamic code execution primitive found (eval/new Function).",
    regex: /\b(?:eval|Function)\s*\(/gi,
    maxPerFile: 8,
  },
  {
    id: "command-injection",
    category: "Injection",
    severity: "high",
    message: "Shell execution with dynamic input may be vulnerable to command injection.",
    regex: /\b(?:exec|spawn|execSync|spawnSync)\s*\(\s*(?:[^"'`\n]|`[^`]*\$\{[^}]+}[^`]*`)/gi,
    maxPerFile: 4,
  },
  {
    id: "sql-string-concat",
    category: "Injection",
    severity: "high",
    message: "SQL query appears to be built with string concatenation/interpolation.",
    regex:
      /\b(?:query|execute)\s*\(\s*(?:`[^`]*\$\{[^}]+}[^`]*`|[^,\n;)]*\+\s*(?:req\.|params|query|body))/gi,
    maxPerFile: 5,
  },
  {
    id: "dangerous-html",
    category: "XSS",
    severity: "high",
    message: "HTML injection sink detected (dangerouslySetInnerHTML/innerHTML).",
    regex: /(?:dangerouslySetInnerHTML|\.innerHTML\s*=)/gi,
    maxPerFile: 6,
  },
  {
    id: "cors-any-origin",
    category: "Configuration",
    severity: "medium",
    message: "Wildcard CORS configuration can expose sensitive endpoints.",
    regex: /(?:origin\s*:\s*["']\*["']|Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*["'])/gi,
    maxPerFile: 4,
  },
  {
    id: "insecure-http-url",
    category: "Transport",
    severity: "medium",
    message: "Insecure HTTP URL found. Prefer HTTPS for external calls.",
    regex: /\bhttp:\/\/[^\s"'`]+/gi,
    maxPerFile: 10,
  },
  {
    id: "weak-hash-function",
    category: "Crypto",
    severity: "medium",
    message: "Weak hash function usage detected (md5/sha1).",
    regex: /\b(?:md5|sha1)\s*\(/gi,
    maxPerFile: 4,
  },
  {
    id: "insecure-randomness",
    category: "Crypto",
    severity: "low",
    message: "Math.random is not suitable for cryptographic randomness.",
    regex: /\bMath\.random\s*\(/g,
    maxPerFile: 6,
  },
  {
    id: "open-redirect",
    category: "Auth & Access",
    severity: "medium",
    message: "Potential open redirect using untrusted request values.",
    regex: /\bredirect\s*\(\s*(?:req\.query|req\.params|req\.body)/gi,
    maxPerFile: 4,
  },
  {
    id: "path-traversal",
    category: "File Access",
    severity: "high",
    message: "Potential path traversal via filesystem access with request input.",
    regex:
      /\b(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync)\s*\([^)]*(?:req\.query|req\.params|req\.body)/gi,
    maxPerFile: 4,
  },
];

const RULE_DETAILS = {
  "private-key-material": {
    title: "Private key committed",
    explanation:
      "A private key block is present in source control. Keys in a public or shared repository are considered compromised.",
    impact:
      "Attackers can impersonate services, decrypt traffic, or access infrastructure if the key is still valid.",
    remediation:
      "Revoke and rotate the key immediately. Remove key material from git history and load secrets from a secure vault.",
    cwe: "CWE-798",
    confidence: "high",
  },
  "hardcoded-secret": {
    title: "Hardcoded credential",
    explanation:
      "The code appears to contain a static token/password-like value assigned directly in source.",
    impact:
      "Leaked credentials can allow unauthorized access to APIs, databases, or cloud resources.",
    remediation:
      "Move secrets to environment variables or secret managers. Rotate exposed credentials and invalidate old tokens.",
    cwe: "CWE-798",
    confidence: "medium",
  },
  "tls-verification-disabled": {
    title: "TLS verification disabled",
    explanation:
      "Certificate verification is turned off, which allows untrusted certificates during secure connections.",
    impact:
      "Enables man-in-the-middle attacks and data interception on supposedly secure channels.",
    remediation:
      "Enable certificate validation in all environments. Use valid CA chains and avoid bypass flags.",
    cwe: "CWE-295",
    confidence: "high",
  },
  "unsafe-eval": {
    title: "Dynamic code execution primitive",
    explanation:
      "The code uses eval/new Function, which executes runtime-generated code and is dangerous with untrusted input.",
    impact:
      "Can lead to remote code execution or arbitrary logic injection.",
    remediation:
      "Replace with structured parsing, whitelisted logic, or safe expression evaluators.",
    cwe: "CWE-95",
    confidence: "medium",
  },
  "command-injection": {
    title: "Potential command injection path",
    explanation:
      "Shell/process execution appears to include dynamic values, often a source of injection risk.",
    impact:
      "An attacker may execute arbitrary operating system commands.",
    remediation:
      "Use allowlisted command arguments and parameterized process APIs. Never pass raw user input to shell commands.",
    cwe: "CWE-78",
    confidence: "medium",
  },
  "sql-string-concat": {
    title: "Dynamic SQL construction",
    explanation:
      "SQL query strings seem assembled with interpolation or concatenation instead of parameters.",
    impact:
      "May enable SQL injection, exposing or modifying sensitive data.",
    remediation:
      "Use parameterized queries/prepared statements and strict input validation.",
    cwe: "CWE-89",
    confidence: "medium",
  },
  "dangerous-html": {
    title: "HTML injection sink",
    explanation:
      "An HTML sink (dangerouslySetInnerHTML/innerHTML) is used and can be exploitable without sanitization.",
    impact:
      "May allow stored/reflected XSS and session hijacking.",
    remediation:
      "Render text safely by default. If raw HTML is required, sanitize with a trusted HTML sanitizer.",
    cwe: "CWE-79",
    confidence: "medium",
  },
  "cors-any-origin": {
    title: "Wildcard CORS policy",
    explanation:
      "The app appears configured to allow all origins, which broadens browser access to endpoints.",
    impact:
      "Sensitive API responses may be exposed to untrusted web origins.",
    remediation:
      "Restrict CORS origins to trusted domains and scope methods/headers minimally.",
    cwe: "CWE-942",
    confidence: "medium",
  },
  "insecure-http-url": {
    title: "Insecure HTTP endpoint usage",
    explanation:
      "A non-TLS URL is referenced, which transmits data without transport encryption.",
    impact:
      "Traffic may be sniffed or modified in transit.",
    remediation:
      "Use HTTPS endpoints and enforce secure transport policies.",
    cwe: "CWE-319",
    confidence: "low",
  },
  "weak-hash-function": {
    title: "Weak hash algorithm usage",
    explanation:
      "MD5/SHA1 usage is detected. These algorithms are weak for security-sensitive contexts.",
    impact:
      "Increases risk of collisions and compromised integrity checks/signatures.",
    remediation:
      "Use SHA-256/512 or modern password hashing algorithms (Argon2, bcrypt, scrypt).",
    cwe: "CWE-328",
    confidence: "medium",
  },
  "insecure-randomness": {
    title: "Non-cryptographic randomness",
    explanation:
      "Math.random is used where cryptographic randomness may be expected.",
    impact:
      "Predictable values can break token/session/nonce security.",
    remediation:
      "Use cryptographically secure RNG APIs (crypto.randomBytes, crypto.getRandomValues).",
    cwe: "CWE-338",
    confidence: "low",
  },
  "open-redirect": {
    title: "Potential open redirect",
    explanation:
      "Redirect target seems derived from request data without strict allowlisting.",
    impact:
      "Users may be redirected to phishing domains or malicious sites.",
    remediation:
      "Allowlist redirect targets and reject absolute external URLs unless explicitly trusted.",
    cwe: "CWE-601",
    confidence: "low",
  },
  "path-traversal": {
    title: "Potential path traversal",
    explanation:
      "Filesystem calls appear to include request-derived path segments.",
    impact:
      "Attackers may read/write files outside intended directories.",
    remediation:
      "Normalize and validate paths, enforce base-directory constraints, and reject traversal sequences.",
    cwe: "CWE-22",
    confidence: "medium",
  },
};

function getExtension(filePath) {
  const fileName = filePath.split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function isCodeFile(path) {
  if (typeof path !== "string" || !path) return false;
  const fileName = path.split("/").pop()?.toLowerCase() || "";
  if (CODE_FILE_NAMES.has(fileName)) return true;
  const extension = getExtension(path);
  return CODE_EXTENSIONS.has(extension);
}

function isLikelyTextContent(content) {
  if (typeof content !== "string" || !content) return false;
  if (content.includes("\u0000")) return false;
  return true;
}

function toRelativePath(pathValue) {
  return pathValue
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function lineFromIndex(source, index) {
  if (!Number.isFinite(index) || index <= 0) return 1;
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function snippetFromIndex(source, index) {
  const safeIndex = Number.isFinite(index) ? Math.max(0, index) : 0;
  const lineStart = source.lastIndexOf("\n", safeIndex) + 1;
  const lineEndCandidate = source.indexOf("\n", safeIndex);
  const lineEnd = lineEndCandidate === -1 ? source.length : lineEndCandidate;
  return source.slice(lineStart, lineEnd).trim().slice(0, 180);
}

function sanitizeMatch(ruleId, matchValue) {
  const normalized = String(matchValue || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  if (ruleId === "private-key-material") {
    return "-----BEGIN ... PRIVATE KEY-----";
  }

  if (ruleId === "hardcoded-secret") {
    return "Sensitive credential-like value detected and redacted.";
  }

  return normalized;
}

function sanitizeSnippet(ruleId, snippetValue) {
  if (ruleId === "private-key-material" || ruleId === "hardcoded-secret") {
    return "Sensitive value redacted for safety.";
  }
  return snippetValue;
}

function collectFindingsForFile(path, content) {
  const findings = [];

  for (const rule of VULNERABILITY_RULES) {
    const details = RULE_DETAILS[rule.id] || {};
    const flags = rule.regex.flags.includes("g")
      ? rule.regex.flags
      : `${rule.regex.flags}g`;
    const regex = new RegExp(rule.regex.source, flags);
    let match;
    let foundCount = 0;

    while ((match = regex.exec(content)) !== null) {
      const index = Number.isFinite(match.index) ? match.index : 0;
      const line = lineFromIndex(content, index);
      const snippet = sanitizeSnippet(rule.id, snippetFromIndex(content, index));
      findings.push({
        filePath: path,
        line,
        ruleId: rule.id,
        title: details.title || rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.message,
        explanation: details.explanation || "",
        impact: details.impact || "",
        remediation: details.remediation || "",
        cwe: details.cwe || null,
        confidence: details.confidence || "low",
        evidence: sanitizeMatch(rule.id, match?.[0] || ""),
        snippet,
      });

      foundCount += 1;
      if (foundCount >= (rule.maxPerFile || 4)) break;
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
      if (findings.length >= 60) break;
    }
  }

  return findings;
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const safeLimit = Math.max(1, Math.min(limit, items.length || 1));

  const workers = Array.from({ length: safeLimit }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchRepoInfoAndTree({ username, reponame, headers }) {
  const repoInfoRes = await fetch(
    `https://api.github.com/repos/${username}/${reponame}`,
    { headers }
  );

  if (!repoInfoRes.ok) {
    return {
      error: "Repository not found",
      status: repoInfoRes.status,
    };
  }

  const repoInfo = await repoInfoRes.json();
  const defaultBranch = repoInfo.default_branch;

  const treeRes = await fetch(
    `https://api.github.com/repos/${username}/${reponame}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );

  if (!treeRes.ok) {
    return {
      error: "Failed to fetch repository tree",
      status: treeRes.status,
    };
  }

  const treeData = await treeRes.json();
  if (!Array.isArray(treeData?.tree)) {
    return {
      error: "Invalid repository tree response",
      status: 502,
    };
  }

  if (treeData.tree.length > MAX_REPO_TREE_ITEMS) {
    return {
      error: "Repository too large to analyze",
      status: 413,
    };
  }

  const normalizedTree = treeData.tree.map((item) => ({
    path: item.path,
    type: item.type === "tree" ? "folder" : "file",
  }));

  return {
    branch: defaultBranch,
    normalizedTree,
    repoInfo,
  };
}

async function fetchCodeFileContent({ username, reponame, branch, path, headers }) {
  const encodedPath = toRelativePath(path);
  const url = `https://api.github.com/repos/${username}/${reponame}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    return { path, skippedReason: "unavailable" };
  }

  const data = await res.json();
  if (!data || Array.isArray(data) || data.type !== "file") {
    return { path, skippedReason: "unsupported" };
  }

  if (Number(data?.size || 0) > MAX_FILE_SIZE_BYTES) {
    return { path, skippedReason: "too_large" };
  }

  if (data.encoding !== "base64" || typeof data.content !== "string") {
    return { path, skippedReason: "unsupported" };
  }

  const content = Buffer.from(data.content, "base64").toString("utf8");
  if (!isLikelyTextContent(content)) {
    return { path, skippedReason: "binary" };
  }

  return { path, content };
}

function toRating(score) {
  if (score >= 92) return { grade: "A", label: "Excellent" };
  if (score >= 84) return { grade: "B", label: "Good" };
  if (score >= 72) return { grade: "C", label: "Moderate" };
  if (score >= 58) return { grade: "D", label: "Weak" };
  return { grade: "F", label: "High Risk" };
}

function buildSecurityReport({
  findings,
  filesAnalyzed,
  totalCodeFiles,
  skippedSummary,
}) {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const categoryMap = new Map();
  const ruleMap = new Map();
  const fileRiskPoints = new Map();
  const fileFindingCounts = new Map();

  let totalRiskPoints = 0;

  for (const finding of findings) {
    const severity = finding.severity;
    const weight = SEVERITY_WEIGHTS[severity] || 0;

    if (severityCounts[severity] !== undefined) {
      severityCounts[severity] += 1;
    }

    const prevCategory = categoryMap.get(finding.category) || {
      category: finding.category,
      findings: 0,
      riskPoints: 0,
    };
    prevCategory.findings += 1;
    prevCategory.riskPoints += weight;
    categoryMap.set(finding.category, prevCategory);

    const prevRule = ruleMap.get(finding.ruleId) || {
      ruleId: finding.ruleId,
      title: finding.title,
      category: finding.category,
      severity: finding.severity,
      cwe: finding.cwe || null,
      confidence: finding.confidence || "low",
      findings: 0,
      riskPoints: 0,
      explanation: finding.explanation || finding.message,
    };
    prevRule.findings += 1;
    prevRule.riskPoints += weight;
    ruleMap.set(finding.ruleId, prevRule);

    fileRiskPoints.set(
      finding.filePath,
      (fileRiskPoints.get(finding.filePath) || 0) + weight
    );
    fileFindingCounts.set(
      finding.filePath,
      (fileFindingCounts.get(finding.filePath) || 0) + 1
    );

    totalRiskPoints += weight;
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings
  );

  const ruleBreakdown = Array.from(ruleMap.values()).sort(
    (a, b) =>
      b.riskPoints - a.riskPoints ||
      severityRank(b.severity) - severityRank(a.severity) ||
      b.findings - a.findings
  );

  const topRiskFiles = Array.from(fileRiskPoints.entries())
    .map(([path, riskPoints]) => ({
      path,
      riskPoints,
      findings: fileFindingCounts.get(path) || 0,
    }))
    .sort((a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings)
    .slice(0, 10);

  const riskBudget = Math.max(20, filesAnalyzed * 18);
  const riskPercent = Math.min(
    100,
    Math.round((totalRiskPoints / riskBudget) * 100)
  );
  const score = Math.max(0, 100 - riskPercent);
  const rating = toRating(score);
  const totalFindings = findings.length;
  const severityPercentages = Object.fromEntries(
    Object.entries(severityCounts).map(([severity, count]) => [
      severity,
      totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0,
    ])
  );
  const skippedFiles = Object.values(skippedSummary).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const insights = [];
  if (totalFindings === 0) {
    insights.push(
      "No high-signal vulnerability patterns were detected in the analyzed files."
    );
    insights.push(
      "This does not guarantee security; dependency checks, runtime testing, and manual review are still required."
    );
  } else {
    if (severityCounts.critical > 0 || severityCounts.high > 0) {
      insights.push(
        `${severityCounts.critical} critical and ${severityCounts.high} high severity findings require immediate review.`
      );
    }

    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      insights.push(
        `Highest concentration of risk is in ${topCategory.category} (${topCategory.findings} findings, ${topCategory.riskPoints} risk points).`
      );
    }

    if (topRiskFiles.length > 0) {
      const topFile = topRiskFiles[0];
      insights.push(
        `Most exposed file is ${topFile.path} with ${topFile.findings} findings (${topFile.riskPoints} risk points).`
      );
    }

    if (ruleBreakdown.length > 0) {
      const topRule = ruleBreakdown[0];
      insights.push(
        `Most frequent issue type is "${topRule.title}" (${topRule.findings} occurrences).`
      );
    }
  }

  if (skippedFiles > 0) {
    insights.push(
      `${skippedFiles} files were skipped due to size/encoding/availability constraints, so results may be incomplete.`
    );
  }

  return {
    score,
    rating: rating.grade,
    ratingLabel: rating.label,
    totals: {
      findings: findings.length,
      filesAnalyzed,
      totalCodeFiles,
      riskPoints: totalRiskPoints,
    },
    severityCounts,
    severityPercentages,
    categoryBreakdown,
    ruleBreakdown,
    topRiskFiles,
    findings: findings.slice(0, MAX_FINDINGS_RETURNED),
    skippedSummary,
    coverage: {
      analyzedFiles: filesAnalyzed,
      skippedFiles,
      totalCodeFiles,
      analyzedPercent:
        totalCodeFiles > 0
          ? Math.round((filesAnalyzed / totalCodeFiles) * 100)
          : 0,
    },
    insights,
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(req) {
  try {
    const { username, reponame, token } = await req.json();

    if (!username || !reponame) {
      return Response.json(
        { error: "Username and repository name are required" },
        { status: 400 }
      );
    }

    if (!token) {
      return Response.json(
        { error: "Auth token missing, login again" },
        { status: 401 }
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    const treeResult = await fetchRepoInfoAndTree({ username, reponame, headers });
    if (treeResult?.error) {
      return Response.json(
        { error: treeResult.error },
        { status: treeResult.status || 500 }
      );
    }

    const { branch, normalizedTree } = treeResult;

    const relevantFiles = getRelevantFiles(normalizedTree, { maxFiles: 120 });
    const codeFiles = normalizedTree.filter(
      (item) => item.type === "file" && isCodeFile(item.path)
    );

    const prioritizedPathSet = new Set(relevantFiles.map((file) => file.path));
    const prioritizedCode = codeFiles.filter((file) =>
      prioritizedPathSet.has(file.path)
    );
    const remainingCode = codeFiles.filter(
      (file) => !prioritizedPathSet.has(file.path)
    );
    const orderedCodeFiles = [...prioritizedCode, ...remainingCode];
    const filesToAnalyze = orderedCodeFiles.slice(0, MAX_ANALYZED_CODE_FILES);
    const isTruncated = orderedCodeFiles.length > filesToAnalyze.length;

    const skippedSummary = {
      unavailable: 0,
      unsupported: 0,
      too_large: 0,
      binary: 0,
    };

    const fetchedFiles = await runWithConcurrency(
      filesToAnalyze,
      FETCH_CONCURRENCY,
      async (file) =>
        fetchCodeFileContent({
          username,
          reponame,
          branch,
          path: file.path,
          headers,
        })
    );

    const findings = [];
    let analyzedFiles = 0;

    for (const file of fetchedFiles) {
      if (!file?.content) {
        if (file?.skippedReason && skippedSummary[file.skippedReason] !== undefined) {
          skippedSummary[file.skippedReason] += 1;
        }
        continue;
      }

      analyzedFiles += 1;
      const fileFindings = collectFindingsForFile(file.path, file.content);
      if (fileFindings.length > 0) findings.push(...fileFindings);
    }

    findings.sort((a, b) => {
      const weightA = SEVERITY_WEIGHTS[a.severity] || 0;
      const weightB = SEVERITY_WEIGHTS[b.severity] || 0;
      if (weightA !== weightB) return weightB - weightA;
      if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
      return a.line - b.line;
    });

    const report = buildSecurityReport({
      findings,
      filesAnalyzed: analyzedFiles,
      totalCodeFiles: codeFiles.length,
      skippedSummary,
    });

    return Response.json({
      success: true,
      repo: reponame,
      branch,
      relevantFiles,
      analysisMeta: {
        totalTreeFiles: normalizedTree.length,
        totalCodeFiles: codeFiles.length,
        analyzedFiles,
        truncated: isTruncated,
        maxAnalyzedFiles: MAX_ANALYZED_CODE_FILES,
      },
      report,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
