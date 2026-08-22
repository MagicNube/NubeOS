import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { mediaApi } from "./api";

export default function CoverImage({
  titleId,
  hasCover,
  alt,
  className = "",
}: {
  titleId: string;
  hasCover: boolean;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCover) {
      setUrl(null);
      return;
    }
    let alive = true;
    let objectUrl: string | null = null;
    void mediaApi
      .readCover(titleId)
      .then((buffer) => {
        if (!alive) return;
        const bytes =
          buffer instanceof ArrayBuffer
            ? new Uint8Array(buffer)
            : new Uint8Array(buffer as ArrayBuffer);
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: imageMime(bytes) }));
        setUrl(objectUrl);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasCover, titleId]);

  return (
    <div className={`media-cover ${className}`.trim()}>
      {url ? <img alt={alt} src={url} /> : <Clapperboard aria-hidden="true" />}
    </div>
  );
}

function imageMime(bytes: Uint8Array) {
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return "application/octet-stream";
}
