import { useLayoutEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import "./ui.css";

type SmartDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

type Parts = { day: string; month: string; year: string };

function splitDate(value: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { year: match[1], month: match[2], day: match[3] } : { day: "", month: "", year: "" };
}

function fullYear(year: string) {
  return year.length <= 2 ? String(2000 + Number(year)) : year.padStart(4, "0");
}

function isoDate(parts: Parts) {
  if (!parts.day || !parts.month || !parts.year) return "";
  const iso = `${fullYear(parts.year)}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

export default function SmartDateInput({ value, onChange, onBlur, onFocus, onKeyDown, className, style, id, name, min, max, required, disabled, readOnly, autoFocus, ...props }: SmartDateInputProps) {
  const [parts, setParts] = useState(() => splitDate(value));
  const lastEmittedValue = useRef(value);
  const dayRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const iso = isoDate(parts);
  const hasParts = Boolean(parts.day || parts.month || parts.year);
  const invalid = hasParts && (!iso || (min != null && iso < String(min)) || (max != null && iso > String(max)));
  const accessibleName = props["aria-label"];

  useLayoutEffect(() => {
    if (value !== lastEmittedValue.current) setParts(splitDate(value));
    lastEmittedValue.current = value;
  }, [value]);

  useLayoutEffect(() => {
    dayRef.current?.setCustomValidity(invalid ? "Introduce una fecha válida dentro del intervalo permitido." : "");
  }, [invalid]);

  function update(next: Parts) {
    setParts(next);
    const nextValue = isoDate(next);
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  }

  function normalize(part: keyof Parts) {
    if (!parts[part]) return;
    const text = part === "year" ? fullYear(parts.year) : parts[part].padStart(2, "0");
    if (text !== parts[part]) update({ ...parts, [part]: text });
  }

  return <span className={`ui-smart-date-control ${className ?? ""}`.trim()} style={style} data-disabled={disabled || undefined}>
    {(["day", "month", "year"] as const).map((part, index) => <span className="ui-date-segment" key={part}>
      {index > 0 && <span aria-hidden="true" className="ui-date-separator">/</span>}
      <input
        {...props}
        aria-label={`${part === "day" ? "Día" : part === "month" ? "Mes" : "Año"}${accessibleName ? `: ${accessibleName}` : ""}`}
        autoComplete="off"
        autoFocus={part === "day" && autoFocus}
        className={`ui-date-part ui-date-${part}`}
        disabled={disabled}
        id={part === "day" ? id : undefined}
        inputMode="numeric"
        maxLength={part === "year" ? 4 : 2}
        onBlur={(event) => { normalize(part); onBlur?.(event); }}
        onChange={(event) => update({ ...parts, [part]: event.currentTarget.value.replace(/\D/g, "").slice(0, part === "year" ? 4 : 2) })}
        onFocus={(event) => { event.currentTarget.select(); onFocus?.(event); }}
        onKeyDown={(event) => { if (event.key === "Enter") normalize(part); onKeyDown?.(event); }}
        placeholder={part === "day" ? "dd" : part === "month" ? "mm" : "aaaa"}
        readOnly={readOnly}
        ref={part === "day" ? dayRef : undefined}
        required={required || hasParts}
        type="text"
        value={parts[part]}
      />
    </span>)}
    <input aria-hidden="true" className="ui-date-native-picker" disabled={disabled || readOnly} max={max} min={min} name={name} onChange={(event) => update(splitDate(event.currentTarget.value))} ref={pickerRef} tabIndex={-1} type="date" value={iso} />
    <button aria-label={`Abrir calendario${accessibleName ? `: ${accessibleName}` : ""}`} className="ui-date-picker-button" disabled={disabled || readOnly} onClick={() => pickerRef.current?.showPicker()} title="Abrir calendario" type="button"><CalendarDays size={16} /></button>
  </span>;
}
