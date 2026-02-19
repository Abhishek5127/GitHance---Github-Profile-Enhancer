import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export default function ReadmeRenderer({ readme, compact = false, className = "" }) {
  const compactStyle = compact
    ? {
        padding: 0,
        margin: 0,
        backgroundColor: "transparent",
        border: "none",
        maxWidth: "none",
        minWidth: 0,
        color: "rgb(229, 231, 235)",
      }
    : undefined;

  return (
    <article className={`markdown-body max-w-none ${className}`} style={compactStyle}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {readme}
      </ReactMarkdown>
    </article>
  );
}
