import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  supermarketFilterLabels,
  supermarkets,
  type SupermarketFilterValue,
} from "./products/api";

const options: SupermarketFilterValue[] = ["any", ...supermarkets];

export default function SupermarketMultiFilter({
  selected,
  onChange,
}: {
  selected: SupermarketFilterValue[];
  onChange: (selected: SupermarketFilterValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? "Todos los supermercados"
      : selected.length === 1
        ? supermarketFilterLabels[selected[0]]
        : `${selected.length} supermercados`;

  function toggle(value: SupermarketFilterValue) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <div
      className="supermarket-filter"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        aria-expanded={open}
        className="supermarket-filter-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      {open && (
        <div className="supermarket-filter-menu">
          <button
            aria-pressed={selected.length === 0}
            className={selected.length === 0 ? "active" : ""}
            onClick={() => onChange([])}
            type="button"
          >
            <span>Todos los supermercados</span>
            {selected.length === 0 && <Check aria-hidden="true" size={14} />}
          </button>
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                aria-pressed={active}
                className={active ? "active" : ""}
                key={option}
                onClick={() => toggle(option)}
                type="button"
              >
                <span>{supermarketFilterLabels[option]}</span>
                {active && <Check aria-hidden="true" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
