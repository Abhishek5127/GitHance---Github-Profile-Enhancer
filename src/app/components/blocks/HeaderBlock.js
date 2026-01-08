import Image from "next/image";
import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";

export default function HeaderBlock({ item }) {
  const { variant, data } = item;

  if (variant === "image") {
    return (
      <div className="rounded overflow-hidden border border-white/10">
        <ImageHeaderPreview/>        
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <h1 className="text-3xl font-bold text-white">
        {data.text}
      </h1>
    );
  }

  if (variant === "typingHeader") {
    return (
      <div className="text-white">
        <TypingHeaderPreview/>
      </div>
    );
  }

  return null;
}
