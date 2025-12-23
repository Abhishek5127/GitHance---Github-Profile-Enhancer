export default function HeaderBlock({ data }) {
  return (
    <div className="border p-3 rounded bg-white shadow">
      <h1 className="text-xl font-bold">
        👋 Hi, I'm {data?.name || "abhishek Name"}
      </h1>
    </div>
  );
}
