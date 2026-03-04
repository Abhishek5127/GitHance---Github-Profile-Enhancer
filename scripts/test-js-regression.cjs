const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();
const ANALYZER_PATH = path.join(
  ROOT,
  "src",
  "app",
  "lib",
  "security",
  "analyzeDeveloperSecurity.js"
);
const REGISTRY_PATH = path.join(
  ROOT,
  "src",
  "app",
  "lib",
  "security",
  "plugins",
  "languageRegistry.js"
);

const EXPECTED_JS_ANALYZER_HASH =
  "818d3722dff12821a9113ff74f16c964cb047551c5d29636852c3e751d067e09";

function extractJsAnalyzerSegment(source) {
  const match = source.match(
    /function analyzeJsTsFile\(file\) \{[\s\S]*?\n\}\n\nfunction groupFindings/
  );
  if (!match) return "";
  return match[0].replace(/\nfunction groupFindings$/, "");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const analyzerSource = fs.readFileSync(ANALYZER_PATH, "utf8");
  const registrySource = fs.readFileSync(REGISTRY_PATH, "utf8");

  const jsAnalyzerSegment = extractJsAnalyzerSegment(analyzerSource);
  assert(jsAnalyzerSegment, "Unable to locate analyzeJsTsFile function block.");
  const jsAnalyzerHash = sha256(jsAnalyzerSegment);

  assert(
    jsAnalyzerHash === EXPECTED_JS_ANALYZER_HASH,
    `JS analyzer regression detected. Expected ${EXPECTED_JS_ANALYZER_HASH}, got ${jsAnalyzerHash}.`
  );

  const requiredMappings = [
    "js: javascriptAnalyzerPlugin",
    "jsx: javascriptAnalyzerPlugin",
    "ts: javascriptAnalyzerPlugin",
    "tsx: javascriptAnalyzerPlugin",
    "java: javaAnalyzerPlugin",
  ];

  for (const mapping of requiredMappings) {
    assert(
      registrySource.includes(mapping),
      `Language registry mapping missing: ${mapping}`
    );
  }

  console.log("JS regression test passed: analyzer hash and language registry mappings are stable.");
}

run();
