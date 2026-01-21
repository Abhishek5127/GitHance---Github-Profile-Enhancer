"use client";
export default function SimpleHeaderPreview({
  userTextInput,
  setUserTextInput,
  userSubTextInput,
  setUserSubTextInput,
}) {
  return (
    <div className="rounded bg-[#0b0d0f] p-4 flex flex-col border border-white/10">
      <input
        value={userTextInput}
        placeholder="I am John"
        onChange={(e) => setUserTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-8 w-60 pl-2 font-bold bg-white/80 mb-2 focus:outline-none text-black"
        type="text"
      />

      <input
        value={userSubTextInput}
        placeholder="Senior Developer at Microsoft"
        onChange={(e) => setUserSubTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-6 w-50 pl-2 bg-white/40 text-black focus:outline-none"
        type="text"
      />
    </div>
  );
}
