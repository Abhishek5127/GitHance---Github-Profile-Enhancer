export default function JsonLd({ data }) {
  const payloads = Array.isArray(data) ? data.filter(Boolean) : [data].filter(Boolean);

  return payloads.map((entry, index) => (
    <script
      key={`json-ld-${index}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(entry).replace(/</g, "\\u003c"),
      }}
    />
  ));
}

