import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useCoverRevision } from "../ui/coverRefresh";
import { readingApi } from "./api";

export default function ReadingCoverImage({ bookId, hasCover, alt, className = "", positionX = 50, positionY = 50, zoom = 1 }: { bookId: string; hasCover: boolean; alt: string; className?: string; positionX?: number; positionY?: number; zoom?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const revision = useCoverRevision(bookId);
  useEffect(() => {
    if (!hasCover) { setUrl(null); return; }
    let alive = true;
    let objectUrl: string | null = null;
    void readingApi.readCover(bookId).then((buffer) => {
      if (!alive) return;
      const bytes = new Uint8Array(buffer);
      const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : bytes[0] === 0x89 ? "image/png" : "image/webp";
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setUrl(objectUrl);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [bookId, hasCover, revision]);
  return <div className={`reading-cover ${className}`}>{url ? <img alt={alt} className="reading-cover-image" src={url} style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` }} /> : <BookOpen aria-hidden="true" />}</div>;
}
