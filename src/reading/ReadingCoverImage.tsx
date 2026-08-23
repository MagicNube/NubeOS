import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { readingApi } from "./api";

export default function ReadingCoverImage({ bookId, hasCover, alt, className = "" }: { bookId: string; hasCover: boolean; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
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
  }, [bookId, hasCover]);
  return <div className={`reading-cover ${className}`}>{url ? <img alt={alt} src={url} /> : <BookOpen aria-hidden="true" />}</div>;
}
