import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { Move, RotateCcw, X } from "lucide-react";
import Modal from "./Modal";

export type CoverCrop = { x: number; y: number; zoom: number };

const clamp = (value: number) => Math.max(0, Math.min(100, value));
type SourceGeometry = { left: number; top: number; width: number; height: number; naturalWidth: number; naturalHeight: number };
type Size = { width: number; height: number };
type SourceDrag = { pointerId: number; clientX: number; clientY: number; x: number; y: number };

export default function CoverCropEditor({ title, landscape, busy, initial, close, save, preview }: {
  title: string;
  landscape: boolean;
  busy: boolean;
  initial: CoverCrop;
  close: () => void;
  save: (crop: CoverCrop) => Promise<boolean>;
  preview: (crop: CoverCrop) => ReactNode;
}) {
  const [crop, setCrop] = useState(initial);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [resultSize, setResultSize] = useState<Size | null>(null);
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const source = useRef<HTMLDivElement | null>(null);
  const [sourceGeometry, setSourceGeometry] = useState<SourceGeometry | null>(null);
  const sourceDrag = useRef<SourceDrag | null>(null);
  const drag = useRef<({ clientX: number; clientY: number } & CoverCrop) | null>(null);

  const measureSource = useCallback(() => {
    const container = source.current;
    if (!container || !naturalSize?.width || !naturalSize.height) return;
    const rect = container.getBoundingClientRect();
    const imageRatio = naturalSize.width / naturalSize.height;
    const containerRatio = rect.width / rect.height;
    let width = rect.width;
    let height = rect.height;
    let left = 0;
    let top = 0;
    if (imageRatio > containerRatio) {
      height = rect.width / imageRatio;
      top = (rect.height - height) / 2;
    } else {
      width = rect.height * imageRatio;
      left = (rect.width - width) / 2;
    }
    setSourceGeometry({ left, top, width, height, naturalWidth: naturalSize.width, naturalHeight: naturalSize.height });
  }, [naturalSize]);

  useEffect(() => {
    const container = source.current;
    if (!container) return;
    const observer = new ResizeObserver(measureSource);
    observer.observe(container);
    measureSource();
    return () => observer.disconnect();
  }, [measureSource]);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      setResultSize({ width: rect.width, height: rect.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => observer.disconnect();
  }, [imageSource, landscape]);

  useEffect(() => {
    function move(event: MouseEvent) {
      if (!drag.current || !stage.current || !naturalSize) return;
      event.preventDefault();
      const rect = stage.current.getBoundingClientRect();
      const baseScale = Math.max(rect.width / naturalSize.width, rect.height / naturalSize.height);
      const widthOverflow = naturalSize.width * baseScale * drag.current.zoom - rect.width;
      const heightOverflow = naturalSize.height * baseScale * drag.current.zoom - rect.height;
      setCrop({
        x: Math.abs(widthOverflow) < 0.5 ? drag.current.x : clamp(drag.current.x - (event.clientX - drag.current.clientX) / widthOverflow * 100),
        y: Math.abs(heightOverflow) < 0.5 ? drag.current.y : clamp(drag.current.y - (event.clientY - drag.current.clientY) / heightOverflow * 100),
        zoom: drag.current.zoom,
      });
    }
    function finish() { if (drag.current) { drag.current = null; setDragging(false); } }
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", finish);
    window.addEventListener("blur", finish);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", finish); window.removeEventListener("blur", finish); };
  }, [naturalSize]);

  const cropWindow = (() => {
    if (!sourceGeometry) return null;
    const targetRatio = landscape ? 16 / 9 : 2 / 3;
    const imageRatio = sourceGeometry.naturalWidth / sourceGeometry.naturalHeight;
    let width = imageRatio > targetRatio ? sourceGeometry.height * targetRatio : sourceGeometry.width;
    let height = imageRatio > targetRatio ? sourceGeometry.height : sourceGeometry.width / targetRatio;
    width /= crop.zoom;
    height /= crop.zoom;
    return {
      left: sourceGeometry.left + (sourceGeometry.width - width) * crop.x / 100,
      top: sourceGeometry.top + (sourceGeometry.height - height) * crop.y / 100,
      width,
      height,
    };
  })();

  const minimumZoom = (() => {
    if (!sourceGeometry) return 0.5;
    const targetRatio = landscape ? 16 / 9 : 2 / 3;
    const imageRatio = sourceGeometry.naturalWidth / sourceGeometry.naturalHeight;
    return Math.max(0.25, Math.min(1, imageRatio > targetRatio ? targetRatio / imageRatio : imageRatio / targetRatio));
  })();

  function moveSourceFrame(event: PointerEvent<HTMLElement>) {
    const current = sourceDrag.current;
    if (!current || current.pointerId !== event.pointerId || !sourceGeometry || !cropWindow) return;
    const horizontalTravel = sourceGeometry.width - cropWindow.width;
    const verticalTravel = sourceGeometry.height - cropWindow.height;
    setCrop((value) => ({
      ...value,
      x: Math.abs(horizontalTravel) < 0.5 ? current.x : clamp(current.x + (event.clientX - current.clientX) / horizontalTravel * 100),
      y: Math.abs(verticalTravel) < 0.5 ? current.y : clamp(current.y + (event.clientY - current.clientY) / verticalTravel * 100),
    }));
  }

  const sourceImageStyle = sourceGeometry ? {
    left: sourceGeometry.left,
    top: sourceGeometry.top,
    width: sourceGeometry.width,
    height: sourceGeometry.height,
  } as CSSProperties : undefined;

  const resultImageStyle = (() => {
    if (!sourceGeometry || !resultSize?.width || !resultSize.height) return undefined;
    const baseScale = Math.max(
      resultSize.width / sourceGeometry.naturalWidth,
      resultSize.height / sourceGeometry.naturalHeight,
    );
    const width = sourceGeometry.naturalWidth * baseScale * crop.zoom;
    const height = sourceGeometry.naturalHeight * baseScale * crop.zoom;
    return {
      left: -(width - resultSize.width) * crop.x / 100,
      top: -(height - resultSize.height) * crop.y / 100,
      width,
      height,
    } as CSSProperties;
  })();

  function captureOriginalImage(event: SyntheticEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.src) return;
    setImageSource(target.currentSrc || target.src);
    setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
  }

  return <Modal className="ui-cover-crop-dialog" labelledBy="ui-cover-crop-title" onClose={close}>
    <div className="ui-cover-crop-header"><div><h2 id="ui-cover-crop-title">Ajustar portada</h2><p>{title}. Arrastra la imagen hasta dejarla encuadrada como prefieras.</p></div><button aria-label="Cerrar" className="ui-cover-crop-close" onClick={close} type="button"><X size={18} /></button></div>
    <div aria-hidden="true" className="ui-cover-crop-loader" onLoadCapture={captureOriginalImage}>{preview({ x: 50, y: 50, zoom: 1 })}</div>
    <div className="ui-cover-crop-previews">
      <div className="ui-cover-crop-preview-block">
        <span>Imagen completa</span>
        <div className="ui-cover-crop-source" ref={source}>
          {imageSource && <img alt={`Imagen completa de ${title}`} src={imageSource} style={sourceImageStyle} />}
          {cropWindow && <i aria-hidden="true" className="ui-cover-crop-window" onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); sourceDrag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: crop.x, y: crop.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={moveSourceFrame} onPointerUp={(event) => { if (sourceDrag.current?.pointerId === event.pointerId) sourceDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { sourceDrag.current = null; }} style={cropWindow} />}
          <small>Arrastra el recuadro para elegir el encuadre</small>
        </div>
      </div>
      <div className="ui-cover-crop-preview-block">
        <span>Resultado final</span>
        <div className={`ui-cover-crop-stage ${landscape ? "landscape" : "portrait"}${dragging ? " dragging" : ""}`} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); drag.current = { clientX: event.clientX, clientY: event.clientY, ...crop }; setDragging(true); }} ref={stage}>
          {imageSource && <img alt={`Resultado final de ${title}`} src={imageSource} style={resultImageStyle} />}
          <small><Move size={15} /> Arrastra para afinar</small>
        </div>
      </div>
    </div>
    <div className="ui-cover-crop-controls">
      <label><span>Horizontal <strong>{Math.round(crop.x)}%</strong></span><input aria-label="Posición horizontal" max={100} min={0} onChange={(event) => setCrop((current) => ({ ...current, x: Number(event.target.value) }))} type="range" value={crop.x} /></label>
      <label><span>Vertical <strong>{Math.round(crop.y)}%</strong></span><input aria-label="Posición vertical" max={100} min={0} onChange={(event) => setCrop((current) => ({ ...current, y: Number(event.target.value) }))} type="range" value={crop.y} /></label>
      <label className="zoom"><span>Zoom <strong>{crop.zoom.toFixed(2)}×</strong></span><input aria-label="Zoom de portada" max={3} min={minimumZoom} onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))} step={0.01} type="range" value={crop.zoom} /><small>El mínimo se adapta a esta portada y permite mostrar la imagen completa.</small></label>
    </div>
    <div className="ui-cover-crop-footer"><button className="secondary-button" onClick={() => setCrop({ x: 50, y: 50, zoom: 1 })} type="button"><RotateCcw size={15} /> Restablecer</button><button className="primary-button" disabled={busy} onClick={() => void save(crop).then((ok) => ok && close())} type="button">Guardar encuadre</button></div>
  </Modal>;
}
