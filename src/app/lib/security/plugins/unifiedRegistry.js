import { JS_TS_SINK_CATALOG } from "@/app/lib/security/rules";

export const PYTHON_SOURCE_REGISTRY = [
  "request.args",
  "request.form",
  "request.json",
  "request.values",
  "request.data",
  "request.GET",
  "request.POST",
  "request.body",
  "input",
];

export const PYTHON_SINK_REGISTRY = {
  command_execution: [
    "os.system",
    "os.popen",
    "subprocess.call",
    "subprocess.run",
    "subprocess.Popen",
  ],
  code_execution: ["eval", "exec"],
  sql_execution: ["cursor.execute", "conn.execute", "execute_query"],
  deserialization: ["pickle.loads", "yaml.load"],
  template_injection: ["render_template_string"],
  filesystem: ["open", "Path", "os.open", "os.path.join"],
  weak_crypto: ["hashlib.md5", "hashlib.sha1"],
  insecure_randomness: ["random.random", "random.randint"],
  hardcoded_secret: ["SECRET", "TOKEN", "PASSWORD", "API_KEY", "PRIVATE_KEY"],
  insecure_temp_file: ["tempfile.mktemp"],
  archive_extraction: [
    "zipfile.ZipFile.extractall",
    "zipfile.ZipFile.extract",
    "tarfile.extractall",
    "tarfile.extract",
  ],
  debug_mode: ["app.run(debug=True)"],
  format_string_injection: ["% operator"],
};

export const JAVA_SINK_REGISTRY = {
  command_execution: [
    "Runtime.getRuntime().exec",
    "ProcessBuilder",
  ],
  sql_injection: ["Statement.executeQuery", "Statement.executeUpdate"],
  path_traversal: ["Files.readString", "Files.readAllBytes", "new File"],
  insecure_randomness: ["new Random", "Math.random"],
  hardcoded_secret: ["password", "secret", "apikey", "token"],
  unsafe_deserialization: ["ObjectInputStream.readObject"],
};

function flattenJsCatalog() {
  const output = {};
  for (const [category, sinks] of Object.entries(JS_TS_SINK_CATALOG || {})) {
    output[category] = (sinks || [])
      .flatMap((sink) => {
        if (sink.global) return [sink.global];
        if (sink.globalObject) {
          return (sink.members || []).map((member) => `${sink.globalObject}.${member}`);
        }
        if (sink.module) {
          return (sink.members || []).map((member) => `${sink.module}.${member}`);
        }
        return [];
      })
      .filter(Boolean);
  }
  return output;
}

const JS_UNIFIED_SINKS = flattenJsCatalog();

export const UNIFIED_SINK_REGISTRY = {
  javascript: JS_UNIFIED_SINKS,
  typescript: JS_UNIFIED_SINKS,
  java: JAVA_SINK_REGISTRY,
  python: PYTHON_SINK_REGISTRY,
};

export function getSinkRegistryForLanguage(language) {
  const key = String(language || "").trim().toLowerCase();
  return UNIFIED_SINK_REGISTRY[key] || {};
}
