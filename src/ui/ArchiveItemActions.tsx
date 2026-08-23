import { RotateCcw, Trash2 } from "lucide-react";
import "./ui.css";

export default function ArchiveItemActions({
  busy = false,
  restore,
  remove,
  itemLabel,
}: {
  busy?: boolean;
  restore: () => void;
  remove: () => void;
  itemLabel: string;
}) {
  return <div className="ui-archive-item-actions">
    <button aria-label={`Restaurar ${itemLabel}`} disabled={busy} onClick={(event) => { event.stopPropagation(); restore(); }} title="Restaurar" type="button"><RotateCcw size={17} /></button>
    <button aria-label={`Eliminar definitivamente ${itemLabel}`} className="danger" disabled={busy} onClick={(event) => { event.stopPropagation(); remove(); }} title="Eliminar definitivamente" type="button"><Trash2 size={17} /></button>
  </div>;
}
