import { History, LayoutDashboard } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import ScoreTile from "./ScoreTile";
import "./ui.css";

export type TrackerDetailView = "summary" | "history";

export function TrackerDetailTabs({
  value,
  onChange,
  summaryLabel = "Resumen",
  historyLabel = "Historial",
  summaryIcon,
}: {
  value: TrackerDetailView;
  onChange: (value: TrackerDetailView) => void;
  summaryLabel?: string;
  historyLabel?: string;
  summaryIcon?: ReactNode;
}) {
  return <nav aria-label="Vistas del detalle" className="ui-tracker-detail-tabs">
    <button className={value === "summary" ? "active" : ""} onClick={() => onChange("summary")} type="button">{summaryIcon ?? <LayoutDashboard size={16} />} {summaryLabel}</button>
    <button className={value === "history" ? "active" : ""} onClick={() => onChange("history")} type="button"><History size={16} /> {historyLabel}</button>
  </nav>;
}

export function TrackerMetricGrid({ metrics }: { metrics: { label: string; value: string | number; color?: string; score?: number | null }[] }) {
  return <div className="ui-tracker-metrics">
    {metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><div className="ui-tracker-metric-value">{metric.score !== undefined ? <ScoreTile score={metric.score} /> : <strong className={metric.color ? "ui-score-tile" : undefined} style={metric.color ? ({ backgroundColor: metric.color, borderColor: metric.color, color: "#fff" } satisfies CSSProperties) : undefined}>{metric.value}</strong>}</div></div>)}
  </div>;
}
