export function scoreColor(score: number | null) {
  if (!isValidScore(score)) return "#8d8790";
  if (score < 5) return "#ef4444";
  if (score < 6) return "#fb7185";
  if (score < 7) return "#f59e0b";
  if (score < 8) return "#f9d442";
  if (score < 9) return "#22c777";
  if (score < 9.5) return "#16824f";
  return "#19a7e8";
}

export function scoreTone(score: number | null) {
  if (!isValidScore(score)) return "unrated";
  if (score < 5) return "garbage";
  if (score < 6) return "bad";
  if (score < 7) return "regular";
  if (score < 8) return "good";
  if (score < 9) return "great";
  if (score < 9.5) return "awesome";
  return "cinema";
}

export function isValidScore(score: number | null): score is number {
  return score !== null && Number.isFinite(score) && score >= 0 && score <= 10;
}

export function formatScore(score: number | null) {
  return score === null
    ? "—"
    : score.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
