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
const JAVA_ANALYZER_PATH = path.join(
  ROOT,
  "src",
  "app",
  "lib",
  "security",
  "plugins",
  "javaAnalyzer.js"
);

const EXPECTED_JS_ANALYZER_HASH =
  "818d3722dff12821a9113ff74f16c964cb047551c5d29636852c3e751d067e09";
const EXPECTED_JAVA_ANALYZER_HASH =
  "e5cead2be487cca2c24f84bc21ffca1a4df93b0d5eadcac7b805f442ed129f86";

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
  const javaAnalyzerSource = fs.readFileSync(JAVA_ANALYZER_PATH, "utf8");

  const jsAnalyzerSegment = extractJsAnalyzerSegment(analyzerSource);
  assert(jsAnalyzerSegment, "Unable to locate analyzeJsTsFile function block.");
  const jsAnalyzerHash = sha256(jsAnalyzerSegment);

  assert(
    jsAnalyzerHash === EXPECTED_JS_ANALYZER_HASH,
    `JS analyzer regression detected. Expected ${EXPECTED_JS_ANALYZER_HASH}, got ${jsAnalyzerHash}.`
  );

  const javaAnalyzerHash = sha256(javaAnalyzerSource);
  assert(
    javaAnalyzerHash === EXPECTED_JAVA_ANALYZER_HASH,
    `Java analyzer regression detected. Expected ${EXPECTED_JAVA_ANALYZER_HASH}, got ${javaAnalyzerHash}.`
  );

  const requiredMappings = [
    "js: javascriptAnalyzerPlugin",
    "jsx: javascriptAnalyzerPlugin",
    "ts: javascriptAnalyzerPlugin",
    "tsx: javascriptAnalyzerPlugin",
    "java: javaAnalyzerPlugin",
    "py: pythonAnalyzerPlugin",
  ];

  for (const mapping of requiredMappings) {
    assert(
      registrySource.includes(mapping),
      `Language registry mapping missing: ${mapping}`
    );
  }

  const pythonOnlyMappingGuards = [
    "js: pythonAnalyzerPlugin",
    "ts: pythonAnalyzerPlugin",
    "jsx: pythonAnalyzerPlugin",
    "tsx: pythonAnalyzerPlugin",
    "java: pythonAnalyzerPlugin",
  ];
  for (const invalidMapping of pythonOnlyMappingGuards) {
    assert(
      !registrySource.includes(invalidMapping),
      `Python analyzer must not be mapped to non-.py extension: ${invalidMapping}`
    );
  }

  console.log(
    "JS/Java regression test passed: analyzer hashes and language registry mappings are stable."
  );
}

run();
