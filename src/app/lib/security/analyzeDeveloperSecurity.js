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

function lineFromIndex(source, index) {
  const safeIndex = Math.max(0, Number(index) || 0);
  let line = 1;
  for (let i = 0; i < safeIndex && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function snippetFromIndex(source, index) {
  const safeIndex = Math.max(0, Number(index) || 0);
  const lineStart = source.lastIndexOf("\n", safeIndex) + 1;
  const lineEndCandidate = source.indexOf("\n", safeIndex);
  const lineEnd = lineEndCandidate === -1 ? source.length : lineEndCandidate;
  return source.slice(lineStart, lineEnd).trim().slice(0, 220);
}

function sanitizeEvidence(ruleId, value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  if (ruleId.includes("hardcoded") || ruleId.includes("private-key")) {
    return "[REDACTED_SENSITIVE_MATCH]";
  }
  return normalized;
}

function sanitizeSnippet(ruleId, snippet) {
  if (ruleId.includes("hardcoded") || ruleId.includes("private-key")) {
    return "Sensitive value redacted.";
  }
  return snippet;
}

function isLanguageApplicable(detector, language) {
  if (!Array.isArray(detector.languages) || detector.languages.length === 0) return true;
  return detector.languages.includes(language);
}

function shouldSuppressLowSignalFinding(ruleId, snippet) {
  const text = String(snippet || "").toLowerCase();
  if (ruleId !== "missing-auth-check-endpoint") return false;
  return /\b(auth|authorize|authorization|jwt|session|guard|middleware|permission|rbac)\b/.test(text);
}

function collectFindingsForFile(file) {
  const findings = [];
  const language = normalizeLanguage(file.language);

  for (const rule of SECURITY_RULES) {
    let matchesInRule = 0;
    for (const detector of rule.detectors || []) {
      if (!isLanguageApplicable(detector, language)) continue;

      const flags = detector.regex.flags.includes("g")
        ? detector.regex.flags
        : `${detector.regex.flags}g`;
      const regex = new RegExp(detector.regex.source, flags);
      let match;

      while ((match = regex.exec(file.content)) !== null) {
        const index = Number(match.index || 0);
        const snippet = sanitizeSnippet(rule.id, snippetFromIndex(file.content, index));
        if (shouldSuppressLowSignalFinding(rule.id, snippet)) {
          if (match.index === regex.lastIndex) regex.lastIndex += 1;
          continue;
        }

        findings.push({
          filePath: file.path,
          language: file.language,
          line: lineFromIndex(file.content, index),
          ruleId: rule.id,
          category: rule.category,
          concept: rule.concept,
          severity: rule.severity,
          title: rule.title,
          message: rule.message,
          explanation: rule.explanation,
          impact: rule.impact,
          remediation: rule.remediation,
          cwe: rule.cwe || null,
          confidence: rule.confidence || "low",
          evidence: sanitizeEvidence(rule.id, match?.[0] || ""),
          snippet,
        });

        matchesInRule += 1;
        if (matchesInRule >= (rule.maxPerFile || 4)) break;
        if (match.index === regex.lastIndex) regex.lastIndex += 1;
      }

      if (matchesInRule >= (rule.maxPerFile || 4)) break;
    }
  }

  return findings;
}

function toRating(score) {
  if (score >= 92) return { grade: "A", label: "Excellent" };
  if (score >= 84) return { grade: "B", label: "Good" };
  if (score >= 72) return { grade: "C", label: "Moderate" };
  if (score >= 58) return { grade: "D", label: "Weak" };
  return { grade: "F", label: "High Risk" };
}

function buildReport({
  findings,
  analyzedFiles,
  totalDeveloperFiles,
  skipped,
  classification,
  options,
}) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categoryMap = new Map();
  const conceptMap = new Map();
  const ruleMap = new Map();
  const fileRiskMap = new Map();
  const fileFindingCountMap = new Map();

  let totalRiskPoints = 0;

  for (const finding of findings) {
    const weight = SEVERITY_WEIGHTS[finding.severity] || 0;
    severityCounts[finding.severity] += 1;

    const category = categoryMap.get(finding.category) || {
      category: finding.category,
      findings: 0,
      riskPoints: 0,
    };
    category.findings += 1;
    category.riskPoints += weight;
    categoryMap.set(finding.category, category);

    const concept = conceptMap.get(finding.concept) || {
      concept: finding.concept,
      category: finding.category,
      findings: 0,
      riskPoints: 0,
    };
    concept.findings += 1;
    concept.riskPoints += weight;
    conceptMap.set(finding.concept, concept);

    const rule = ruleMap.get(finding.ruleId) || {
      ruleId: finding.ruleId,
      title: finding.title,
      category: finding.category,
      concept: finding.concept,
      severity: finding.severity,
      cwe: finding.cwe,
      confidence: finding.confidence,
      findings: 0,
      riskPoints: 0,
      explanation: finding.explanation,
    };
    rule.findings += 1;
    rule.riskPoints += weight;
    ruleMap.set(finding.ruleId, rule);

    fileRiskMap.set(finding.filePath, (fileRiskMap.get(finding.filePath) || 0) + weight);
    fileFindingCountMap.set(
      finding.filePath,
      (fileFindingCountMap.get(finding.filePath) || 0) + 1
    );

    totalRiskPoints += weight;
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings
  );
  const conceptBreakdown = Array.from(conceptMap.values()).sort(
    (a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings
  );
  const ruleBreakdown = Array.from(ruleMap.values()).sort(
    (a, b) =>
      b.riskPoints - a.riskPoints ||
      severityRank(b.severity) - severityRank(a.severity) ||
      b.findings - a.findings
  );
  const topRiskFiles = Array.from(fileRiskMap.entries())
    .map(([path, riskPoints]) => ({
      path,
      riskPoints,
      findings: fileFindingCountMap.get(path) || 0,
    }))
    .sort((a, b) => b.riskPoints - a.riskPoints || b.findings - a.findings)
    .slice(0, 12);

  const issuesFound = findings.length;
  const riskBudget = Math.max(25, analyzedFiles * 22);
  const rawRiskPercent = issuesFound === 0 ? 0 : Math.round((totalRiskPoints / riskBudget) * 100);
  const riskPercent = Math.min(100, rawRiskPercent);
  const securityScore = issuesFound === 0 ? 100 : Math.max(0, 100 - riskPercent);
  const rating = toRating(securityScore);
  const skippedFiles = Object.values(skipped).reduce((sum, n) => sum + Number(n || 0), 0);

  const insights = [];
  if (issuesFound === 0) {
    insights.push("No developer-code security findings were detected in this scan.");
  } else {
    if (severityCounts.critical > 0 || severityCounts.high > 0) {
      insights.push(
        `${severityCounts.critical} critical and ${severityCounts.high} high severity findings need immediate remediation.`
      );
    }
    if (conceptBreakdown[0]) {
      insights.push(
        `Highest risk concept: ${conceptBreakdown[0].concept} (${conceptBreakdown[0].findings} findings).`
      );
    }
    if (topRiskFiles[0]) {
      insights.push(
        `Most exposed file: ${topRiskFiles[0].path} (${topRiskFiles[0].riskPoints} risk points).`
      );
    }
  }

  if (skippedFiles > 0) {
    insights.push(
      `${skippedFiles} files were skipped due to exclusion rules or safety limits.`
    );
  }

  const dependencyRisk = {
    status: "excluded",
    issues_found: null,
    security_score: null,
    note: "Dependency risk is intentionally excluded. This analyzer computes developer risk only.",
  };

  return {
    issues_found: issuesFound,
    security_score: securityScore,
    score: securityScore,
    rating: rating.grade,
    ratingLabel: rating.label,
    risk_scope: "developer_code_only",
    developer_risk: {
      issues_found: issuesFound,
      security_score: securityScore,
      risk_points: totalRiskPoints,
      files_analyzed: analyzedFiles,
      total_developer_files: totalDeveloperFiles,
    },
    dependency_risk: dependencyRisk,
    repository_classification: classification,
    exclusion_summary: skipped,
    totals: {
      findings: issuesFound,
      filesAnalyzed: analyzedFiles,
      totalCodeFiles: totalDeveloperFiles,
      riskPoints: totalRiskPoints,
    },
    severityCounts,
    categoryBreakdown,
    conceptBreakdown,
    ruleBreakdown,
    topRiskFiles,
    findings: findings.slice(0, options.maxFindingsReturned || DEFAULT_MAX_FINDINGS_RETURNED),
    coverage: {
      analyzedFiles,
      skippedFiles,
      totalCodeFiles: totalDeveloperFiles,
      analyzedPercent:
        totalDeveloperFiles > 0
          ? Math.round((analyzedFiles / totalDeveloperFiles) * 100)
          : 0,
    },
    insights,
    generatedAt: new Date().toISOString(),
  };
}

export function analyzeDeveloperSecurity({
  sourceFiles,
  classification,
  skipped,
  options = {},
}) {
  const allFindings = [];
  const safeSkipped = {
    ...skipped,
    non_text_content: skipped?.non_text_content || 0,
    third_party_signature: skipped?.third_party_signature || 0,
  };

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
    const findings = collectFindingsForFile(file);
    if (findings.length > 0) allFindings.push(...findings);
  }

  allFindings.sort((a, b) => {
    const weightA = SEVERITY_WEIGHTS[a.severity] || 0;
    const weightB = SEVERITY_WEIGHTS[b.severity] || 0;
    if (weightA !== weightB) return weightB - weightA;
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    return a.line - b.line;
  });

  return buildReport({
    findings: allFindings,
    analyzedFiles,
    totalDeveloperFiles: Number(sourceFiles?.length || 0),
    skipped: safeSkipped,
    classification,
    options,
  });
}
