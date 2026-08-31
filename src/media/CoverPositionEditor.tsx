import CoverCropEditor from "../ui/CoverCropEditor";
import type { MediaTitle } from "./api";
import CoverImage from "./CoverImage";

export default function CoverPositionEditor({ title, landscape, busy, close, save }: {
  title: MediaTitle;
  landscape: boolean;
  busy: boolean;
  close: () => void;
  save: (x: number, y: number, zoom: number) => Promise<boolean>;
}) {
  return <CoverCropEditor busy={busy} close={close} initial={{ x: title.coverPositionX, y: title.coverPositionY, zoom: title.coverZoom }} landscape={landscape} preview={(crop) => <CoverImage alt={`Portada de ${title.name}`} animated={title.animatedCover} hasCover={title.hasCover} positionX={crop.x} positionY={crop.y} titleId={title.id} zoom={crop.zoom} />} save={(crop) => save(crop.x, crop.y, crop.zoom)} title={title.name} />;
}
