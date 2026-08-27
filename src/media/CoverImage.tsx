import { useEffect, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { useCoverRevision } from "../ui/coverRefresh";
import { mediaApi } from "./api";

export default function CoverImage({
  titleId,
  hasCover,
  alt,
  className = "",
  positionX = 50,
  positionY = 50,
  zoom = 1,
}: {
  titleId: string;
  hasCover: boolean;
  alt: string;
  className?: string;
  positionX?: number;
  positionY?: number;
  zoom?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [still, setStill] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const revision = useCoverRevision(titleId);

  useEffect(() => {
    const card = coverRef.current?.closest<HTMLElement>(".library-card, .watching-card");
    if (!card || !still) return;
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    card.addEventListener("mouseenter", play);
    card.addEventListener("mouseleave", pause);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", pause);
    return () => {
      card.removeEventListener("mouseenter", play);
      card.removeEventListener("mouseleave", pause);
      card.removeEventListener("focusin", play);
      card.removeEventListener("focusout", pause);
    };
  }, [still]);

  useEffect(() => {
    if (!hasCover) {
      setUrl(null);
      setStill(null);
      return;
    }
    let alive = true;
    let objectUrl: string | null = null;
    let stillUrl: string | null = null;
    void mediaApi
      .readCover(titleId)
      .then((buffer) => {
        if (!alive) return;
        const bytes =
          buffer instanceof ArrayBuffer
            ? new Uint8Array(buffer)
            : new Uint8Array(buffer as ArrayBuffer);
        const mime = imageMime(bytes);
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
        setUrl(objectUrl);
        setStill(null);
        if (mime === "image/gif") {
          void createImageBitmap(new Blob([bytes], { type: mime })).then((bitmap) => {
            if (!alive) { bitmap.close(); return; }
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
            bitmap.close();
            canvas.toBlob((blob) => {
              if (!alive || !blob) return;
              stillUrl = URL.createObjectURL(blob);
              setStill(stillUrl);
            });
          }).catch(() => undefined);
        }
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (stillUrl) URL.revokeObjectURL(stillUrl);
    };
  }, [hasCover, revision, titleId]);

  return (
    <div ref={coverRef} className={`media-cover ${className}`.trim()} onBlur={() => setPlaying(false)} onFocus={() => setPlaying(true)} onMouseEnter={() => setPlaying(true)} onMouseLeave={() => setPlaying(false)}>
      {url ? <img alt={alt} src={still && !playing ? still : url} style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` }} /> : <Clapperboard aria-hidden="true" />}
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
