export default function BioBlock({ data }) {
  return (
    <div className="border p-3 rounded bg-white shadow">
      <p>{data?.bio || "A short developer bio goes here..."}</p>
    </div>
  );
}
