import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";

type SmartDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

function displayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function parseDate(value: string) {
  const trimmed = value.trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else {
    const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(trimmed);
    if (!local) return null;
    day = Number(local[1]); month = Number(local[2]); year = Number(local[3]);
    if (local[3].length === 2) year += 2000;
  }
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function SmartDateInput({ value, onChange, min, max, required, ...props }: SmartDateInputProps) {
  const [display, setDisplay] = useState(() => displayDate(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDisplay(displayDate(value)), [value]);

  function commit(raw: string) {
    const parsed = parseDate(raw);
    const message = !raw.trim()
      ? required ? "Introduce una fecha." : ""
      : !parsed ? "Usa una fecha válida con formato dd/mm/aaaa." 
      : min && parsed < String(min) ? `La fecha mínima es ${displayDate(String(min))}.`
      : max && parsed > String(max) ? `La fecha máxima es ${displayDate(String(max))}.`
      : "";
    inputRef.current?.setCustomValidity(message);
    if (!raw.trim()) onChange("");
    else if (!message && parsed) {
      setDisplay(displayDate(parsed));
      onChange(parsed);
    }
  }

  return <input
    {...props}
    ref={inputRef}
    inputMode="numeric"
    maxLength={10}
    onBlur={() => commit(display)}
    onChange={(event) => {
      const next = event.target.value;
      setDisplay(next);
      inputRef.current?.setCustomValidity("");
      const parsed = parseDate(next);
      if (parsed) commit(next);
      else onChange("");
    }}
    placeholder="dd/mm/aaaa"
    required={required}
    type="text"
    value={display}
  />;
}
