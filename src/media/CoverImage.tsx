import { useEffect, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { useCoverRevision } from "../ui/coverRefresh";
import { mediaApi } from "./api";

const MAX_ANIMATED_COVERS = 4;
const animatedCoverCache = new Map<string, string>();
const animatedCoverLoads = new Map<string, Promise<string>>();
const thumbnailBackfills = new Map<string, Promise<Blob>>();
let thumbnailBackfillQueue = Promise.resolve();

function bytesFrom(buffer: ArrayBuffer) {
  return new Uint8Array(buffer);
}

function cachedAnimatedCover(key: string, titleId: string) {
  const cached = animatedCoverCache.get(key);
  if (cached) {
    animatedCoverCache.delete(key);
    animatedCoverCache.set(key, cached);
    return Promise.resolve(cached);
  }
  const pending = animatedCoverLoads.get(key);
  if (pending) return pending;
  const load = mediaApi.readCover(titleId).then((buffer) => {
    const url = URL.createObjectURL(new Blob([bytesFrom(buffer)], { type: "image/gif" }));
    for (const [oldKey, oldUrl] of animatedCoverCache) {
      if (oldKey.startsWith(`${titleId}:`) && oldKey !== key) {
        URL.revokeObjectURL(oldUrl);
        animatedCoverCache.delete(oldKey);
      }
    }
    animatedCoverCache.set(key, url);
    while (animatedCoverCache.size > MAX_ANIMATED_COVERS) {
      const oldest = animatedCoverCache.entries().next().value as [string, string] | undefined;
      if (!oldest) break;
      animatedCoverCache.delete(oldest[0]);
      URL.revokeObjectURL(oldest[1]);
    }
    return url;
  }).finally(() => animatedCoverLoads.delete(key));
  animatedCoverLoads.set(key, load);
  return load;
}

function discardBrokenAnimatedCover(key: string, url: string) {
  if (animatedCoverCache.get(key) !== url) return;
  animatedCoverCache.delete(key);
  URL.revokeObjectURL(url);
}

async function thumbnailFromGif(url: string) {
  const response = await fetch(url);
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error("No se pudo crear la miniatura.")),
    "image/jpeg",
    0.82,
  ));
}

function idleTurn() {
  return new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    } else globalThis.setTimeout(resolve, 250);
  });
}

function backfillThumbnail(key: string, titleId: string) {
  const pending = thumbnailBackfills.get(key);
  if (pending) return pending;
  const task = thumbnailBackfillQueue.then(idleTurn).then(async () => {
    const blob = await thumbnailFromGif(await cachedAnimatedCover(key, titleId));
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    await mediaApi.saveCoverThumbnail(titleId, bytes);
    return blob;
  }).finally(() => thumbnailBackfills.delete(key));
  thumbnailBackfillQueue = task.then(() => undefined, () => undefined);
  thumbnailBackfills.set(key, task);
  return task;
}

export default function CoverImage({
  titleId,
  hasCover,
  animated = false,
  alt,
  className = "",
  positionX = 50,
  positionY = 50,
  zoom = 1,
}: {
  titleId: string;
  hasCover: boolean;
  animated?: boolean;
  alt: string;
  className?: string;
  positionX?: number;
  positionY?: number;
  zoom?: number;
}) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [animatedUrl, setAnimatedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const generatedPosterRef = useRef<string | null>(null);
  const revision = useCoverRevision(titleId);
  const cacheKey = `${titleId}:${revision}`;

  useEffect(() => () => {
    if (generatedPosterRef.current) URL.revokeObjectURL(generatedPosterRef.current);
  }, []);

  useEffect(() => {
    const card = coverRef.current?.closest<HTMLElement>(".library-card, .watching-card");
    if (!card || !animated) return;
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
  }, [animated]);

  useEffect(() => {
    if (generatedPosterRef.current) {
      URL.revokeObjectURL(generatedPosterRef.current);
      generatedPosterRef.current = null;
    }
    if (!hasCover) {
      setPosterUrl(null);
      setAnimatedUrl(null);
      return;
    }
    let alive = true;
    let localUrl: string | null = null;
    setAnimatedUrl(null);
    const request = animated ? mediaApi.readCoverThumbnail(titleId) : mediaApi.readCover(titleId);
    void request.then((buffer) => {
      if (!alive) return;
      const bytes = bytesFrom(buffer);
      localUrl = URL.createObjectURL(new Blob([bytes], {
        type: animated ? "image/jpeg" : imageMime(bytes),
      }));
      setPosterUrl(localUrl);
    }).catch(() => {
      if (!alive || !animated) return setPosterUrl(null);
      void backfillThumbnail(cacheKey, titleId).then((thumbnail) => {
        if (!alive) return;
        if (generatedPosterRef.current) URL.revokeObjectURL(generatedPosterRef.current);
        generatedPosterRef.current = URL.createObjectURL(thumbnail);
        setPosterUrl(generatedPosterRef.current);
      }).catch(() => alive && setPosterUrl(null));
    });
    return () => {
      alive = false;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [animated, cacheKey, hasCover, revision, titleId]);

  useEffect(() => {
    if (!animated || !hasCover || !playing || animatedUrl) return;
    let alive = true;
    void cachedAnimatedCover(cacheKey, titleId).then(async (url) => {
      if (!alive) return;
      setAnimatedUrl(url);
      if (posterUrl) return;
      try {
        const thumbnail = await thumbnailFromGif(url);
        if (!alive) return;
        if (generatedPosterRef.current) URL.revokeObjectURL(generatedPosterRef.current);
        generatedPosterRef.current = URL.createObjectURL(thumbnail);
        setPosterUrl(generatedPosterRef.current);
        const bytes = Array.from(new Uint8Array(await thumbnail.arrayBuffer()));
        void mediaApi.saveCoverThumbnail(titleId, bytes).catch(() => undefined);
      } catch { /* La animación sigue disponible aunque falle su miniatura. */ }
    }).catch(() => alive && setAnimatedUrl(null));
    return () => { alive = false; };
  }, [animated, animatedUrl, cacheKey, hasCover, playing, posterUrl, titleId]);

  useEffect(() => {
    if (!playing) setAnimatedUrl(null);
  }, [playing]);

  const showingAnimation = Boolean(animated && playing && animatedUrl);
  const visibleUrl = showingAnimation ? animatedUrl : posterUrl;
  return (
    <div ref={coverRef} className={`media-cover ${className}`.trim()} onBlur={() => setPlaying(false)} onFocus={() => setPlaying(true)} onMouseEnter={() => setPlaying(true)} onMouseLeave={() => setPlaying(false)}>
      {visibleUrl ? <img
        alt={alt}
        onError={() => {
          if (showingAnimation && animatedUrl) {
            discardBrokenAnimatedCover(cacheKey, animatedUrl);
            setAnimatedUrl(null);
            setPlaying(false);
          } else {
            setPosterUrl(null);
          }
        }}
        src={visibleUrl}
        style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` }}
      /> : <Clapperboard aria-hidden="true" />}
      {animated && !playing && <span className="media-gif-badge">GIF</span>}
    </div>
  );
}

function imageMime(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return "application/octet-stream";
}
