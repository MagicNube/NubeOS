import { Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCoverRevision } from "../ui/coverRefresh";
import { gamesApi } from "./api";

export default function GameCoverImage({ gameId, hasCover, alt, className = "", positionX = 50, positionY = 50, zoom = 1 }: { gameId: string; hasCover: boolean; alt: string; className?: string; positionX?: number; positionY?: number; zoom?: number }) {
  const [source, setSource] = useState<string | null>(null);
  const revision = useCoverRevision(gameId);
  useEffect(() => {
    let active = true; let url: string | null = null;
    if (!hasCover) { setSource(null); return () => { active = false; }; }
    void gamesApi.readCover(gameId).then((bytes) => {
      if (!active) return; url = URL.createObjectURL(new Blob([bytes])); setSource(url);
    }).catch(() => { if (active) setSource(null); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [gameId, hasCover, revision]);
  return <div className={`game-cover ${className}`}>{source ? <img alt={alt} src={source} style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` }} /> : <Gamepad2 aria-hidden="true" size={32} />}</div>;
}
