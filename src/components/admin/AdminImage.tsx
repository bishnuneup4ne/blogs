"use client";

import { useState } from "react";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

type AdminImageProps = {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function AdminImage({ src, alt = "", className, style }: AdminImageProps) {
  const url = normalizeImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          color: "#64748b",
          fontSize: 12,
          minHeight: 120,
        }}
      >
        {failed ? "Image failed to load" : "No image URL"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
