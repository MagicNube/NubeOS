import { useId } from "react";
import SmartDateInput from "../ui/SmartDateInput";
import { formatDate, todayMadrid } from "./presentation";

export default function ContentWatchDate({ value, onChange, releasedOn, disabled }: {
  value: string;
  onChange: (date: string) => void;
  releasedOn: string | null;
  disabled?: boolean;
}) {
  const hintId = useId();
  const beforeRelease = Boolean(value && releasedOn && value < releasedOn);
  return <label>Fecha del visionado
    <SmartDateInput aria-label="Fecha del visionado" aria-describedby={hintId}
      disabled={disabled} min={releasedOn ?? undefined} max={todayMadrid()}
      onChange={onChange} required value={value} />
    <small className="media-form-hint" id={hintId}>
      {releasedOn ? `Estreno: ${formatDate(releasedOn)}` : "Estreno: desconocido"}
    </small>
    {beforeRelease && <small className="media-watch-date-error" role="alert">La fecha del visionado es anterior al estreno.</small>}
  </label>;
}
