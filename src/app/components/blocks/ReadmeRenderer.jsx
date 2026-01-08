import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export default function ReadmeRenderer({ readme }) {
  return (
    <article className="markdown-body max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {readme}
      </ReactMarkdown>
    </article>
  );
}