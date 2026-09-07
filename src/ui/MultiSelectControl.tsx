import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./ui.css";

type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
  title?: string;
};

export default function MultiSelectControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const summary = value.length === 0
    ? label
    : value.length <= 2
      ? options.filter((option) => value.includes(option.value)).map((option) => option.label).join(", ")
      : `${value.length} estados`;

  return <div className="ui-multi-select" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} ref={root}>
    <button aria-expanded={open} aria-haspopup="listbox" className="ui-multi-select-trigger" onClick={() => setOpen((current) => !current)} type="button">
      <span>{summary}</span><ChevronDown aria-hidden="true" size={15} />
    </button>
    {open && <div aria-label="Estados" aria-multiselectable="true" className="ui-multi-select-menu" role="listbox">
      {options.map((option) => {
        const selected = value.includes(option.value);
        return <button aria-selected={selected} key={option.value} onClick={() => onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])} role="option" title={option.title} type="button">
          <span aria-hidden="true" className="ui-multi-select-check">{selected && <Check size={14} strokeWidth={2.5} />}</span>
          <span>{option.label}</span>
        </button>;
      })}
    </div>}
  </div>;
}
