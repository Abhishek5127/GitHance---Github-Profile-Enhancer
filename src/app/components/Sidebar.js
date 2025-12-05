export default function Sidebar() {
  return (
    <div className="flex flex-col h-screen w-72 bg-[#0d1117] border-r border-[#30363d]">
      <div className="p-4">
        <ul className="space-y-1 text-sm font-medium text-[#c9d1d9]">
          <li className="px-3 py-2 rounded hover:bg-[#21262d] cursor-pointer">
            H1
          </li>
          <li className="px-3 py-2 rounded hover:bg-[#21262d] cursor-pointer">
            H2
          </li>
          <li className="px-3 py-2 rounded hover:bg-[#21262d] cursor-pointer">
            H3
          </li>
        </ul>
      </div>
    </div>
  );
}
