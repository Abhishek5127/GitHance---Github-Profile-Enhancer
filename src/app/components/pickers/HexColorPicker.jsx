"use client";
import { useState } from "react";

export default function HexColorPicker() {
  const [color, setColor] = useState("#ffffff"); // green

  const handleHexInput = (e) => {
    const value = e.target.value;
    setColor(value);

    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setColor(value);
    }
  };

  return (
    <div className="w-22 mt-3 h-5 flex justify-center items-center">
      <div>


        {/* Native Color Picker */}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-5 h-5 cursor-pointer"
        />
      </div>

      {/* HEX Input */}
      <input
        type="text"
        value={color}
        onChange={handleHexInput}
        placeholder="#000000"
        className="w-15 px-3 py-2 h-2 text-[8px] rounded-md border border-gray-300 
                   focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    </div>
  );
}
