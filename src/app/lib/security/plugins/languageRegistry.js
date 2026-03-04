import { getExtension } from "@/app/lib/security/config";
import { javaAnalyzerPlugin } from "@/app/lib/security/plugins/javaAnalyzer";

const FUTURE_PLUGIN_BLUEPRINTS = {
  python: {
    key: "python",
    parsingStrategy: "python_ast",
    frameworkDetection: ["Flask", "Django", "FastAPI"],
    sources: ["request.args", "request.form", "request.json"],
    sinks: ["os.system", "subprocess.run", "eval", "exec"],
  },
  go: {
    key: "go",
    parsingStrategy: "go_parser",
    frameworkDetection: ["net/http", "gin", "echo"],
    sources: ["r.URL.Query()", "r.FormValue()", "json.Decoder.Decode"],
    sinks: ["exec.Command", "db.Query", "os.Open"],
  },
  php: {
    key: "php",
    parsingStrategy: "php_parser",
    frameworkDetection: ["Laravel", "Symfony"],
    sources: ["$_GET", "$_POST", "$_REQUEST"],
    sinks: ["shell_exec", "exec", "mysqli_query"],
  },
  csharp: {
    key: "csharp",
    parsingStrategy: "roslyn",
    frameworkDetection: ["ASP.NET Core"],
    sources: ["HttpRequest.Query", "HttpRequest.Body"],
    sinks: ["Process.Start", "SqlCommand.ExecuteReader"],
  },
};

export function createLanguageRegistry(javascriptAnalyzerPlugin) {
  return {
    js: javascriptAnalyzerPlugin,
    jsx: javascriptAnalyzerPlugin,
    ts: javascriptAnalyzerPlugin,
    tsx: javascriptAnalyzerPlugin,
    mjs: javascriptAnalyzerPlugin,
    cjs: javascriptAnalyzerPlugin,
    java: javaAnalyzerPlugin,
  };
}

export function getAnalyzerForFile(registry, filePath) {
  const ext = getExtension(filePath);
  return {
    ext,
    analyzer: registry?.[ext] || null,
  };
}

export function getFuturePluginBlueprints() {
  return FUTURE_PLUGIN_BLUEPRINTS;
}
