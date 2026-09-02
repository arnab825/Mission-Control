"use client";

import { useState, useEffect } from "react";

interface SafeBlogImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
}

export default function SafeBlogImage({
  src,
  alt,
  category = "",
  className = "w-full h-full object-cover",
}: SafeBlogImageProps) {
  const fallbackSrc =
    category === "GPU News" || category === "Hardware Deep-Dive"
      ? "/images/gpu-placeholder.png"
      : "/images/game-placeholder.png";

  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}
