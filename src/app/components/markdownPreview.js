"use client";

export default function MarkdownPreview({ markdown, defaultData }) {
  if (!markdown) {
    return (
      <div className="p-4 border rounded text-gray-500">
        Click “Preview README” to see output
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-black text-green-300 whitespace-pre-wrap font-mono text-sm">
      {markdown}
    </div>
  );
}
