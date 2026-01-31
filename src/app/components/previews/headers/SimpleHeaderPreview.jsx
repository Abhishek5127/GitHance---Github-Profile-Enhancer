"use client";
import HexColorPicker from "../../pickers/HexColorPicker";
import { useEffect, useState } from "react";

export default function SimpleHeaderPreview({
  textInput,
  subTextInput,
  setTextInput,
  setSubTextInput,
  color,
  subcolor,
  setColor,
  setSubColor
}) {

  return (
    <div className="rounded p-4 flex flex-col gap-2">

      <div className="flex items-center gap-1">
        <input
        onKeyDown={(e)=>e.stopPropagation()}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          style={{ backgroundColor: color }}
          className="h-8 w-80 pl-2 bg-white font-bold focus:outline-none text-black"
        />

        <HexColorPicker
          color={color}
          setColor={setColor}
        />
      </div>

  
      <div className="flex items-center gap-1">
        <input
          value={subTextInput}
          onKeyDown={(e)=>e.stopPropagation()}
          onChange={(e) => setSubTextInput(e.target.value)}
          style={{ backgroundColor: subcolor }}
          className="h-6 w-60 pl-2 bg-gray-700 text-black focus:outline-none"
        />

        <HexColorPicker
          color={subcolor}
          setColor={setSubColor}
        />
      </div>

    </div>

  );
}


