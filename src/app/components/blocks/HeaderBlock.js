import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SimpleHeaderPreview from "../previews/headers/SimpleHeaderPreview";
import { useState } from "react";

export default function HeaderBlock({ item, setItems }) {
  const { variant, data } = item;

  if (variant === "image") {
    return (
      <div className="rounded overflow-hidden border border-white/10">
        <ImageHeaderPreview />
      </div>
    );
  }

  if (variant === "simple") {
    const updateHeaderField = (field, value) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, data: { ...i.data, [field]: value } }
            : i
        )
      );
    };


    return (
      <SimpleHeaderPreview
        textInput={item.data.text}
        subTextInput={item.data.subText}
        setTextInput={(val) => updateHeaderField("text", val)}
        setSubTextInput={(val) => updateHeaderField("subText", val)}
      />


    );
  }


  if (variant === "typingHeader") {
    return (
      <div className="text-white">
        <TypingHeaderPreview />
      </div>
    );
  }

  return null;
}
