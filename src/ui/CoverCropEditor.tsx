import { useEffect, useRef, useState, type ReactNode } from "react";
import { Move, RotateCcw, X } from "lucide-react";
import Modal from "./Modal";

export type CoverCrop = { x: number; y: number; zoom: number };

const clamp = (value: number) => Math.max(0, Math.min(100, value));

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
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const drag = useRef<({ clientX: number; clientY: number } & CoverCrop) | null>(null);

  useEffect(() => {
    function move(event: MouseEvent) {
      if (!drag.current || !stage.current) return;
      event.preventDefault();
      const rect = stage.current.getBoundingClientRect();
      setCrop({
        x: clamp(drag.current.x - ((event.clientX - drag.current.clientX) / rect.width) * 100),
        y: clamp(drag.current.y - ((event.clientY - drag.current.clientY) / rect.height) * 100),
        zoom: drag.current.zoom,
      });
    }
    function finish() { if (drag.current) { drag.current = null; setDragging(false); } }
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", finish);
    window.addEventListener("blur", finish);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", finish); window.removeEventListener("blur", finish); };
  }, []);

  return <Modal className="ui-cover-crop-dialog" labelledBy="ui-cover-crop-title" onClose={close}>
    <div className="ui-cover-crop-header"><div><h2 id="ui-cover-crop-title">Ajustar portada</h2><p>{title}. Arrastra la imagen hasta dejarla encuadrada como prefieras.</p></div><button aria-label="Cerrar" className="ui-cover-crop-close" onClick={close} type="button"><X size={18} /></button></div>
    <div className={`ui-cover-crop-stage ${landscape ? "landscape" : "portrait"}${dragging ? " dragging" : ""}`} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); drag.current = { clientX: event.clientX, clientY: event.clientY, ...crop }; setDragging(true); }} ref={stage}>
      {preview(crop)}
      <span><Move size={15} /> Vista final (arrastra para mover)</span>
    </div>
    <div className="ui-cover-crop-controls">
      <label><span>Horizontal <strong>{Math.round(crop.x)}%</strong></span><input aria-label="Posición horizontal" max={100} min={0} onChange={(event) => setCrop((current) => ({ ...current, x: Number(event.target.value) }))} type="range" value={crop.x} /></label>
      <label><span>Vertical <strong>{Math.round(crop.y)}%</strong></span><input aria-label="Posición vertical" max={100} min={0} onChange={(event) => setCrop((current) => ({ ...current, y: Number(event.target.value) }))} type="range" value={crop.y} /></label>
      <label className="zoom"><span>Zoom <strong>{crop.zoom.toFixed(2)}×</strong></span><input aria-label="Zoom de portada" max={2} min={1} onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))} step={0.05} type="range" value={crop.zoom} /><small>Amplía la imagen para crear margen y recolocarla.</small></label>
    </div>
    <div className="ui-cover-crop-footer"><button className="secondary-button" onClick={() => setCrop({ x: 50, y: 50, zoom: 1 })} type="button"><RotateCcw size={15} /> Restablecer</button><button className="primary-button" disabled={busy} onClick={() => void save(crop).then((ok) => ok && close())} type="button">Guardar encuadre</button></div>
  </Modal>;
}
