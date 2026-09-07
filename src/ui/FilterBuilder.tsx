import { Check, ChevronDown, Pin, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CollectionPanel } from "./FilterDisclosure";
import "./ui.css";

export type FilterBuilderItem = {
  id: string;
  label: string;
  active: boolean;
  control: ReactNode;
  clear: () => void;
};

export default function FilterBuilder({
  id,
  filters,
  mode,
  sortControl,
  sortPreference,
}: {
  id: string;
  filters: FilterBuilderItem[];
  mode: Exclude<CollectionPanel, null>;
  sortControl: ReactNode;
  sortPreference?: {
    isDefault: boolean;
    isFallback: boolean;
    save: () => void;
  };
}) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(filters.filter((filter) => filter.active).map((filter) => filter.id)));
  const [adding, setAdding] = useState(false);
  const filterIdsKey = filters.map((filter) => filter.id).join("|");
  const activeIdsKey = filters.filter((filter) => filter.active).map((filter) => filter.id).join("|");

  useEffect(() => {
    setVisible((current) => {
      const availableIds = new Set(filterIdsKey.split("|").filter(Boolean));
      const next = new Set([...current].filter((filterId) => availableIds.has(filterId)));
      activeIdsKey.split("|").filter(Boolean).forEach((filterId) => next.add(filterId));
      return next.size === current.size && [...next].every((filterId) => current.has(filterId)) ? current : next;
    });
  }, [activeIdsKey, filterIdsKey]);

  useEffect(() => { setAdding(false); }, [mode]);

  const shown = filters.filter((filter) => visible.has(filter.id));
  const available = filters.filter((filter) => !visible.has(filter.id));

  function remove(filter: FilterBuilderItem) {
    filter.clear();
    setVisible((current) => {
      const next = new Set(current);
      next.delete(filter.id);
      return next;
    });
  }

  function reset() {
    shown.forEach((filter) => filter.clear());
    setVisible(new Set());
  }

  return (
    <section aria-label="Configurar filtros y ordenación" className="ui-filter-builder" id={id}>
      <div className="ui-filter-builder-heading">
        <strong>{mode === "filters" ? "Filtrar colección por" : "Ordenar colección por"}</strong>
        {mode === "filters" && shown.length > 0 && <button className="ui-filter-reset" onClick={reset} type="button"><RotateCcw aria-hidden="true" size={14} /> Limpiar</button>}
      </div>

      {mode === "filters" ? <>
        <div className="ui-filter-builder-rows">
          {shown.map((filter) => (
            <div className="ui-filter-builder-row" key={filter.id}>
              <span className="ui-filter-builder-label">{filter.label}</span>
              <div className="ui-filter-builder-control">{filter.control}</div>
              <button aria-label={`Quitar filtro ${filter.label}`} className="ui-filter-remove" onClick={() => remove(filter)} title="Quitar filtro" type="button"><X aria-hidden="true" size={15} /></button>
            </div>
          ))}
        </div>
        {available.length > 0 && <div className="ui-filter-add-wrap" onKeyDown={(event) => { if (event.key === "Escape") setAdding(false); }}>
          <button aria-controls={`${id}-available`} aria-expanded={adding} aria-haspopup="menu" className="ui-filter-add-button" onClick={() => setAdding((current) => !current)} type="button"><Plus aria-hidden="true" size={15} /> Añadir filtro <ChevronDown aria-hidden="true" size={14} /></button>
          {adding && <div className="ui-filter-add-menu" id={`${id}-available`} role="menu">
            {available.map((filter) => <button key={filter.id} onClick={() => { setVisible((current) => new Set(current).add(filter.id)); setAdding(false); }} role="menuitem" type="button">{filter.label}</button>)}
          </div>}
        </div>}
      </> : <div className="ui-filter-sort-layout">
        <div className="ui-filter-builder-control">{sortControl}</div>
        {sortPreference && (!sortPreference.isDefault || !sortPreference.isFallback) && (
          sortPreference.isDefault
            ? <span className="ui-sort-default-state"><Check aria-hidden="true" size={15} /> Predeterminado</span>
            : <button className="ui-sort-default-button" onClick={sortPreference.save} type="button"><Pin aria-hidden="true" size={15} /> Guardar como predeterminado</button>
        )}
      </div>}
    </section>
  );
}
