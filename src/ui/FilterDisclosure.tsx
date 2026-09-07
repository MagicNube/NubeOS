import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import "./ui.css";

export type CollectionPanel = "filters" | "sort" | null;

export default function FilterDisclosure({
  controlsId,
  count,
  sortActive,
  open,
  change,
}: {
  controlsId: string;
  count: number;
  sortActive: boolean;
  open: CollectionPanel;
  change: (panel: CollectionPanel) => void;
}) {
  return (
    <div aria-label="Filtrar y ordenar" className="ui-collection-tools" role="group">
      <button
        aria-controls={controlsId}
        aria-expanded={open === "filters"}
        aria-label={count > 0 ? `Filtros, ${count} activos` : "Filtros"}
        className={`ui-collection-tool ui-filter-tool${open === "filters" ? " open" : ""}${count > 0 ? " active" : ""}`}
        onClick={() => change(open === "filters" ? null : "filters")}
        title="Filtros"
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" size={17} />
        {count > 0 && <strong aria-hidden="true">{count}</strong>}
      </button>
      <button
        aria-controls={controlsId}
        aria-expanded={open === "sort"}
        aria-label={sortActive ? "Ordenar, orden personalizado activo" : "Ordenar"}
        className={`ui-collection-tool ui-sort-tool${open === "sort" ? " open" : ""}${sortActive ? " active" : ""}`}
        onClick={() => change(open === "sort" ? null : "sort")}
        title="Ordenar"
        type="button"
      >
        <ArrowUpDown aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
