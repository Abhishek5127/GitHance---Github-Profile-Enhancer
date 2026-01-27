"use client";
export default function SimpleHeaderPreview({
  userTextInput,
  setUserTextInput,
  userSubTextInput,
  setUserSubTextInput,
}){

  return (
    <div className="rounded p-4 flex flex-col">
      <input
        placeholder={userTextInput}
        onChange={(e) => setUserTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-8 w-80 pl-2 font-bold bg-white/80 mb-2 focus:outline-none text-black"
        type="text"
      />

      <input
        placeholder={userSubTextInput}
        onChange={(e) => setUserSubTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-6 w-60 pl-2 bg-white/40 text-black focus:outline-none"
        type="text"
      />
    </div>
  );
}
