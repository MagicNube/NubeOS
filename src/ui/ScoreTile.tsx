import { formatScore, scoreColor } from "./score";
import "./ui.css";

export default function ScoreTile({ score, className = "" }: { score: number | null; className?: string }) {
  return <strong className={`ui-score-tile${score === null ? " unrated" : ""}${className ? ` ${className}` : ""}`} style={score === null ? undefined : { backgroundColor: scoreColor(score), borderColor: scoreColor(score) }}>{formatScore(score)}</strong>;
}
