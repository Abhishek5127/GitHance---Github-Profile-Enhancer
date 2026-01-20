export default function SimpleHeaderPreview({defaultValues}) {
  return (
    <div className="rounded bg-[#0b0d0f] p-4 flex flex-col border border-white/10">
      <input onKeyDown={(e)=>{e.stopPropagation()}} className="h-8 w-60 bg-white/80 rounded mb-2 focus:outline-none text-black" type="text"/>
      <input onKeyDown={(e)=>{e.stopPropagation()}} className="h-5 w-50 bg-white/40 rounded text-black" type="text"/>
    </div>
  );
}
