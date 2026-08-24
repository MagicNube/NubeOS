import { History, LayoutDashboard } from "lucide-react";
import type { CSSProperties } from "react";
import "./ui.css";

export type TrackerDetailView = "summary" | "history";

export function TrackerDetailTabs({ value, onChange }: { value: TrackerDetailView; onChange: (value: TrackerDetailView) => void }) {
  return <nav aria-label="Vistas del detalle" className="ui-tracker-detail-tabs">
    <button className={value === "summary" ? "active" : ""} onClick={() => onChange("summary")} type="button"><LayoutDashboard size={16} /> Resumen</button>
    <button className={value === "history" ? "active" : ""} onClick={() => onChange("history")} type="button"><History size={16} /> Historial</button>
  </nav>;
}

export function TrackerMetricGrid({ metrics }: { metrics: { label: string; value: string | number; color?: string }[] }) {
  return <div className="ui-tracker-metrics">
    {metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong style={metric.color ? ({ color: metric.color } satisfies CSSProperties) : undefined}>{metric.value}</strong></div>)}
  </div>;
}
