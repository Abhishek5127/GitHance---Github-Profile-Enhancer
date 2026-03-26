"use client";

import Image from "next/image";
import { useState } from "react";

export default function SafeImage({
  src,
  alt,
  width = 128,
  height = 128,
  className = "",
  sizes,
  style,
  onErrorHide = false,
  onError,
  ...props
}) {
  const [hidden, setHidden] = useState(false);

  if (!src || hidden) {
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
      sizes={sizes}
      style={style}
      onError={(event) => {
        if (onErrorHide) {
          setHidden(true);
        }

        if (typeof onError === "function") {
          onError(event);
        }
      }}
      {...props}
    />
  );
}

