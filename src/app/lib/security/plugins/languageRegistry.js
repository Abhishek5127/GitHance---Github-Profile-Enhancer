import { getExtension } from "@/app/lib/security/config";
import { javaAnalyzerPlugin } from "@/app/lib/security/plugins/javaAnalyzer";
import { pythonAnalyzerPlugin } from "@/app/lib/security/plugins/pythonAnalyzer";

const FUTURE_PLUGIN_BLUEPRINTS = {
  go: {
    key: "go",
    parsingStrategy: "go_parser",
    frameworkDetection: ["net/http", "gin", "echo"],
    sources: ["r.URL.Query()", "r.FormValue()", "json.Decoder.Decode"],
    sinks: ["exec.Command", "db.Query", "os.Open"],
  },
  rust: {
    key: "rust",
    parsingStrategy: "rust_analyzer",
    frameworkDetection: ["actix-web", "axum", "warp"],
    sources: ["HttpRequest::query_string", "Json<T>", "Path<T>"],
    sinks: ["std::process::Command::new", "diesel::sql_query", "std::fs::read_to_string"],
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

export function createLanguagePluginCatalog(javascriptAnalyzerPlugin) {
  return {
    javascript: javascriptAnalyzerPlugin,
    typescript: javascriptAnalyzerPlugin,
    python: pythonAnalyzerPlugin,
    java: javaAnalyzerPlugin,
  };
}

export function createLanguageRegistry(javascriptAnalyzerPlugin) {
  return {
    js: javascriptAnalyzerPlugin,
    jsx: javascriptAnalyzerPlugin,
    ts: javascriptAnalyzerPlugin,
    tsx: javascriptAnalyzerPlugin,
    mjs: javascriptAnalyzerPlugin,
    cjs: javascriptAnalyzerPlugin,
    java: javaAnalyzerPlugin,
    py: pythonAnalyzerPlugin,
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
