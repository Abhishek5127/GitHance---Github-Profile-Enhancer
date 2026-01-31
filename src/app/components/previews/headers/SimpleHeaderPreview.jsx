"use client";
import HexColorPicker from "../../pickers/HexColorPicker";
import { useEffect, useState } from "react";

export default function SimpleHeaderPreview({
  textInput,
  setTextInput,
  subTextInput,
  setSubTextInput
}) {
 


  return (
    <div className="rounded p-4 flex flex-col">
      <input
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-8 w-80 pl-2 font-bold bg-white/80 mb-2 focus:outline-none text-black"
        type="text"
      />

      <input
        value={subTextInput}
        onChange={(e) => setSubTextInput(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-6 w-60 pl-2 bg-white/40 text-black focus:outline-none"
        type="text"
      />
    </div>
  );
}


