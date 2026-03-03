import {
  DEFAULT_MAX_FINDINGS_RETURNED,
  isLikelyTextContent,
} from "@/app/lib/security/config";
import {
  SEVERITY_WEIGHTS,
  SECURITY_RULES,
  normalizeLanguage,
  severityRank,
} from "@/app/lib/security/rules";
import { isLikelyThirdPartyCode } from "@/app/lib/security/thirdPartySignatures";

const SCAN_CHUNK_LINES = 120;
const SCAN_CHUNK_OVERLAP = 12;
const PREVIEW_CONTEXT_BEFORE = 4;
const PREVIEW_CONTEXT_AFTER = 4;
const MAX_PREVIEW_LINES = 20;

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

function countNewLines(text) {
  return (String(text || "").match(/\n/g) || []).length;
}

function lineFromIndex(text, index) {
  const safeIndex = Math.max(0, Number(index) || 0);
  let line = 1;
  for (let i = 0; i < safeIndex && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function normalizeMatchText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function sanitizeSensitiveMatch(ruleId, value) {
  const normalizedRule = String(ruleId || "").toLowerCase();
  if (normalizedRule.includes("hardcoded") || normalizedRule.includes("private-key")) {
    return "[REDACTED_SENSITIVE_MATCH]";
  }
  return normalizeMatchText(value);
}

function sanitizeSensitiveSnippet(ruleId, snippet) {
  const normalizedRule = String(ruleId || "").toLowerCase();
  if (normalizedRule.includes("hardcoded") || normalizedRule.includes("private-key")) {
    return "Sensitive value redacted.";
  }
  return snippet;
}

function shouldIgnoreLowValueMatch(matchText) {
  const text = normalizeMatchText(matchText);
  if (!text) return true;
  if (text === "../" || text === "..\\") return true;
  if (text.length < 4) return true;
  return false;
}

function isLanguageApplicable(detector, language) {
  if (!Array.isArray(detector.languages) || detector.languages.length === 0) return true;
  return detector.languages.includes(language);
}

function buildCodeBlock(lines, lineStart, lineEnd) {
  const safeLineStart = Math.max(1, Number(lineStart) || 1);
  const safeLineEnd = Math.max(safeLineStart, Number(lineEnd) || safeLineStart);
  const totalLines = lines.length;

  let start = Math.max(1, safeLineStart - PREVIEW_CONTEXT_BEFORE);
  let end = Math.min(totalLines, safeLineEnd + PREVIEW_CONTEXT_AFTER);

  if (end - start + 1 > MAX_PREVIEW_LINES) {
    const half = Math.floor((MAX_PREVIEW_LINES - (safeLineEnd - safeLineStart + 1)) / 2);
    start = Math.max(1, safeLineStart - Math.max(2, half));
    end = Math.min(totalLines, start + MAX_PREVIEW_LINES - 1);
    if (end - start + 1 > MAX_PREVIEW_LINES) {
      start = end - MAX_PREVIEW_LINES + 1;
    }
  }

  const rendered = [];
  for (let line = start; line <= end; line += 1) {
    const marker = line >= safeLineStart && line <= safeLineEnd ? ">" : " ";
    const lineNumber = String(line).padStart(4, " ");
    const text = lines[line - 1] ?? "";
    rendered.push(`${marker} ${lineNumber} | ${text}`);
  }

  return rendered.join("\n");
}

function findVariableSources(lines, lineStart) {
  const sources = [];
  const fromLine = Math.max(1, lineStart - 18);
  const toLine = Math.min(lines.length, lineStart + 1);

  for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
    const line = String(lines[lineNumber - 1] || "");

    const patterns = [
      /(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(req|request)\.(query|body|params)\.([A-Za-z_]\w*)/,
      /([A-Za-z_]\w*)\s*=\s*request\.args\.get\(\s*["']([^"']+)["']\s*\)/,
      /([A-Za-z_]\w*)\s*=\s*params\[\s*["']([^"']+)["']\s*\]/,
      /([A-Za-z_]\w*)\s*=\s*(?:ctx\.queryParam|r\.URL\.Query\(\)\.Get)\(/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      if (match[2] && match[3] && match[4]) {
        sources.push({
          variable: match[1],
          source: `${match[2]}.${match[3]}.${match[4]}`,
          line: lineNumber,
        });
      } else if (match[2]) {
        sources.push({
          variable: match[1],
          source: match[2],
          line: lineNumber,
        });
      } else {
        sources.push({
          variable: match[1],
          source: "request input",
          line: lineNumber,
        });
      }
    }
  }

  return sources;
}

function detectDataFlowHint(lines, lineStart, lineEnd) {
  const sinkText = lines.slice(lineStart - 1, lineEnd).join(" ");
  const directSourceMatch = sinkText.match(
    /\b(?:req|request)\.(?:query|body|params)\.[A-Za-z_]\w*/
  );
  if (directSourceMatch) {
    return `Direct user input ${directSourceMatch[0]} flows into a sensitive operation.`;
  }

  const variableSources = findVariableSources(lines, lineStart);
  for (const source of variableSources) {
    const variablePattern = new RegExp(`\\b${source.variable}\\b`);
    if (variablePattern.test(sinkText)) {
      return `${source.variable} originates from ${source.source} (line ${source.line}) and is used in a sensitive operation.`;
    }
  }

  return null;
}

function buildEvidenceText({ matchedExpression, vulnerableUsage, flowHint, rule }) {
  const parts = [
    `Matched expression: ${matchedExpression}`,
    `Vulnerable usage: ${normalizeMatchText(vulnerableUsage) || "N/A"}`,
    `Why flagged: ${rule.message}`,
  ];

  if (flowHint) parts.push(`Input flow: ${flowHint}`);
  else parts.push("Input flow: explicit source-to-sink chain not confidently detected in local window.");

  return parts.join(" | ");
}

function* scanChunks(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return;
  const step = Math.max(1, SCAN_CHUNK_LINES - SCAN_CHUNK_OVERLAP);
  for (let startIndex = 0; startIndex < lines.length; startIndex += step) {
    const endIndex = Math.min(lines.length, startIndex + SCAN_CHUNK_LINES);
    const chunkLines = lines.slice(startIndex, endIndex);
    const chunkText = chunkLines.join("\n");
    yield {
      startLine: startIndex + 1,
      endLine: endIndex,
      chunkText,
    };
    if (endIndex >= lines.length) break;
  }
}

function scanRuleInFile({ file, lines, rule, language, dedupeKeys }) {
  const findings = [];
  let totalMatchesForRule = 0;

  for (const detector of rule.detectors || []) {
    if (!isLanguageApplicable(detector, language)) continue;

    for (const chunk of scanChunks(lines)) {
      const flags = detector.regex.flags.includes("g")
        ? detector.regex.flags
        : `${detector.regex.flags}g`;
      const regex = new RegExp(detector.regex.source, flags);
      let match;

      while ((match = regex.exec(chunk.chunkText)) !== null) {
        const rawMatch = String(match?.[0] || "");
        if (shouldIgnoreLowValueMatch(rawMatch)) {
          if (match.index === regex.lastIndex) regex.lastIndex += 1;
          continue;
        }

        const offsetLine = lineFromIndex(chunk.chunkText, Number(match.index || 0));
        const lineStart = chunk.startLine + offsetLine - 1;
        const lineEnd = Math.min(lines.length, lineStart + countNewLines(rawMatch));
        const dedupeKey = `${rule.id}|${file.path}|${lineStart}|${normalizeMatchText(rawMatch).slice(0, 90)}`;
        if (dedupeKeys.has(dedupeKey)) {
          if (match.index === regex.lastIndex) regex.lastIndex += 1;
          continue;
        }
        dedupeKeys.add(dedupeKey);

        const lineText = lines[lineStart - 1] || "";
        const flowHint = detectDataFlowHint(lines, lineStart, lineEnd);
        const matchedExpression = sanitizeSensitiveMatch(rule.id, rawMatch);
        const evidence = buildEvidenceText({
          matchedExpression,
          vulnerableUsage: lineText,
          flowHint,
          rule,
        });

        findings.push({
          filePath: file.path,
          language: file.language,
          lineStart,
          lineEnd,
          ruleId: rule.id,
          rootCausePattern: rule.id,
          category: toTitleCase(rule.concept || rule.category),
          cwe: rule.cwe || "CWE-NA",
          severity: String(rule.severity || "low").toLowerCase(),
          confidence: String(rule.confidence || "low").toLowerCase(),
          title: rule.title,
          description: rule.explanation || rule.message,
          impact: rule.impact,
          recommendation: rule.remediation,
          evidence,
          matchedExpression,
          flowHint,
          codeBlock: sanitizeSensitiveSnippet(rule.id, buildCodeBlock(lines, lineStart, lineEnd)),
        });

        totalMatchesForRule += 1;
        if (totalMatchesForRule >= (rule.maxPerFile || 4)) break;
        if (match.index === regex.lastIndex) regex.lastIndex += 1;
      }

      if (totalMatchesForRule >= (rule.maxPerFile || 4)) break;
    }

    if (totalMatchesForRule >= (rule.maxPerFile || 4)) break;
  }

  return findings;
}

function scanFile(file) {
  const findings = [];
  const language = normalizeLanguage(file.language);
  const lines = String(file.content || "").split(/\r?\n/);
  const dedupeKeys = new Set();

  for (const rule of SECURITY_RULES) {
    const ruleFindings = scanRuleInFile({
      file,
      lines,
      rule,
      language,
      dedupeKeys,
    });
    if (ruleFindings.length > 0) findings.push(...ruleFindings);
  }

  return findings;
}

function mergeSeverity(current, incoming) {
  return severityRank(incoming) > severityRank(current) ? incoming : current;
}

function mergeConfidence(current, incoming) {
  return confidenceRank(incoming) > confidenceRank(current) ? incoming : current;
}

function groupFindings(findings) {
  const groups = new Map();

  for (const finding of findings) {
    const key = `${finding.cwe}|${finding.category}|${finding.rootCausePattern}`;
    const existing = groups.get(key);
    const instance = {
      file: finding.filePath,
      line_start: finding.lineStart,
      line_end: finding.lineEnd,
      evidence: finding.evidence,
      code_block: finding.codeBlock,
      matched_expression: finding.matchedExpression,
      flow_hint: finding.flowHint || null,
      language: finding.language,
    };

    if (!existing) {
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

    existing.severity = toTitleCase(
      mergeSeverity(String(existing.severity || "").toLowerCase(), finding.severity)
    );
    existing.confidence = toTitleCase(
      mergeConfidence(String(existing.confidence || "").toLowerCase(), finding.confidence)
    );
    existing.instances.push(instance);
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
    const issueWeight = SEVERITY_WEIGHTS[severity] || 0;
    const instanceCount = issue.instances.length;
    const totalIssueRisk = issueWeight * instanceCount;
    severityCounts[severity] += instanceCount;
    riskPoints += totalIssueRisk;

    const category = categoryMap.get(issue.category) || {
      category: issue.category,
      findings: 0,
      riskPoints: 0,
    };
    category.findings += instanceCount;
    category.riskPoints += totalIssueRisk;
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
    rule.findings += instanceCount;
    rule.riskPoints += totalIssueRisk;
    ruleMap.set(issue.root_cause_pattern, rule);

    for (const instance of issue.instances) {
      fileRiskMap.set(instance.file, (fileRiskMap.get(instance.file) || 0) + issueWeight);
      fileFindingCountMap.set(
        instance.file,
        (fileFindingCountMap.get(instance.file) || 0) + 1
      );
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings
  );
  const ruleBreakdown = Array.from(ruleMap.values()).sort(
    (a, b) =>
      b.riskPoints - a.riskPoints ||
      severityRank(String(b.severity || "").toLowerCase()) -
        severityRank(String(a.severity || "").toLowerCase()) ||
      b.findings - a.findings
  );
  const topRiskFiles = Array.from(fileRiskMap.entries())
    .map(([path, points]) => ({
      path,
      riskPoints: points,
      findings: fileFindingCountMap.get(path) || 0,
    }))
    .sort((a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings)
    .slice(0, 12);

  return {
    severityCounts,
    categoryBreakdown,
    ruleBreakdown,
    topRiskFiles,
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
}) {
  const insights = [];
  if (totalInstances === 0) {
    insights.push("No developer-code security findings were detected in this scan.");
    return insights;
  }

  const critical = analytics.severityCounts.critical || 0;
  const high = analytics.severityCounts.high || 0;
  if (critical > 0 || high > 0) {
    insights.push(`${critical} critical and ${high} high severity instances require immediate remediation.`);
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

  if (skippedFiles > 0) {
    insights.push(
      `${skippedFiles} files were excluded/skipped by dependency, generated, artifact, or safety filters.`
    );
  }

  return insights;
}

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
  };

  const rawFindings = [];
  let analyzedFiles = 0;

  for (const file of sourceFiles || []) {
    if (!isLikelyTextContent(file.content)) {
      safeSkipped.non_text_content += 1;
      continue;
    }

    if (isLikelyThirdPartyCode({ path: file.path, content: file.content })) {
      safeSkipped.third_party_signature += 1;
      continue;
    }

    analyzedFiles += 1;
    const fileFindings = scanFile(file);
    if (fileFindings.length > 0) rawFindings.push(...fileFindings);
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

  const summary = {
    total_issue_types: groupedIssues.length,
    total_instances: totalInstances,
    security_score: securityScore,
  };

  const dependencyRisk = {
    status: "excluded",
    issues_found: null,
    security_score: null,
    note: "Dependency risk is intentionally excluded. This analyzer computes developer risk only.",
  };

  return {
    summary,
    grouped_issues: groupedIssues.slice(0, options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED),
    issues_found: totalInstances,
    security_score: securityScore,
    score: securityScore,
    rating: rating.grade,
    ratingLabel: rating.label,
    risk_scope: "developer_code_only",
    developer_risk: {
      issues_found: totalInstances,
      security_score: securityScore,
      risk_points: analytics.riskPoints,
      files_analyzed: analyzedFiles,
      total_developer_files: totalDeveloperFiles,
    },
    dependency_risk: dependencyRisk,
    repository_classification: classification,
    exclusion_summary: safeSkipped,
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
    findings: groupedIssues.slice(0, options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED),
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
    }),
    generatedAt: new Date().toISOString(),
  };
}
