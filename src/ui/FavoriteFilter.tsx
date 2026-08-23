import { Star } from "lucide-react";
import "./ui.css";

export default function FavoriteFilter({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  const label = active ? "Mostrar todos" : "Mostrar solo favoritos";
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`ui-favorite-filter${active ? " active" : ""}`}
      onClick={() => onChange(!active)}
      title={label}
      type="button"
    >
      <Star aria-hidden="true" fill={active ? "currentColor" : "none"} size={18} />
    </button>
  );
}
