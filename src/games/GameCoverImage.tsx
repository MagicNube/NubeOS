import { Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { gamesApi } from "./api";

export default function GameCoverImage({ gameId, hasCover, alt, className = "" }: { gameId: string; hasCover: boolean; alt: string; className?: string }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true; let url: string | null = null;
    if (!hasCover) { setSource(null); return () => { active = false; }; }
    void gamesApi.readCover(gameId).then((bytes) => {
      if (!active) return; url = URL.createObjectURL(new Blob([bytes])); setSource(url);
    }).catch(() => { if (active) setSource(null); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [gameId, hasCover]);
  return <div className={`game-cover ${className}`}>{source ? <img alt={alt} src={source} /> : <Gamepad2 aria-hidden="true" size={32} />}</div>;
}
