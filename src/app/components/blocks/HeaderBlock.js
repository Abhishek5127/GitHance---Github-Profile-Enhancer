import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SimpleHeaderPreview from "../previews/headers/SimpleHeaderPreview";
import { useState } from "react";

export default function HeaderBlock({ item,userTextInput,userSubTextInput,setUserSubTextInput,setUserTextInput }) {
  const { variant, data } = item;

  if (variant === "image") {
    return (
      <div className="rounded overflow-hidden border border-white/10">
        <ImageHeaderPreview />
      </div>
    );
  }

  if (variant === "simple") {
    const [text, setText] = useState("");
    const [subText, setSubText] = useState("");
    return (
      <SimpleHeaderPreview />
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
