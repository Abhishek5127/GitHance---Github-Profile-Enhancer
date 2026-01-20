"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import CanvasItem from "./CanvasItem";
import { useState } from "react";
import { useEffect } from "react";
import Navbar from "@/app/UI/home/Navbar";
export default function Canvas({ items, setItems, readmeData }) {
  const [readmeDataContent, setreadmeDataContent] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  useEffect(() => {
    setreadmeDataContent(readmeData);
  }, [readmeData]);

  useEffect(()=>{
    if(items.length > 0){
      setreadmeDataContent("");
    }
  },[items]);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[600px] p-4 relative rounded border-dashed border ${isOver ? "border-blue-500 bg-blue-50/10" : "border-gray-700 bg-white/2"
        }`}
    >
      <div className="h-15">

        <div className=" absolute right-1 top-1 mb-3 flex gap-2">
          {
            readmeDataContent ? (
              <div className="flex gap-2">
                <button onClick={() => setreadmeDataContent("")} className="bg-gray-700 text-white border-2 font-bold hover:bg-gray-800 cursor-pointer p-2 rounded-2xl">Create</button>
                <button onClick={() => {setItems([]);setreadmeDataContent("");}} className="rounded-2xl w-20 bg-red-600 hover:bg-red-900 border-2 p-1 cursor-pointer">Clear</button>
              </div>
            ) : <button onClick={() => setItems([])} className="rounded-2xl w-20 bg-red-600 hover:bg-red-900 border-2 p-1 cursor-pointer">Clear</button>
          }
        </div>
      </div>
      {/* README SECTION */}
      {readmeDataContent ? (
        <article
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: readmeDataContent }}
        />
      ) : items?.length === 0 ? (
        
        <div className="py-12 text-center text-gray-400">
          Create Readme 
        </div>
      ) : null}

      {/* DRAGGABLE ITEMS */}
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <CanvasItem key={item.id} item={item} setItems={setItems} />
        ))}
      </SortableContext>
    </div>
  );
}