import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/ui/MediaStatisticsDashboard.tsx", import.meta.url), "utf8")
  + "\nexport { groupGenres, groupYears, monthlyActivity, StatsTable };";
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const mod = new SourceTextModule(output);
await mod.link((name) => {
  const exports = name === "react/jsx-runtime" ? ["jsx", "jsxs", "Fragment"] : name === "react" ? ["useEffect", "useMemo", "useState"] : name === "lucide-react" ? ["BarChart3", "CalendarDays", "ChartNoAxesColumnIncreasing", "Compass", "ListFilter", "Trophy"] : name.endsWith(".css") ? [] : ["default"];
  return new SyntheticModule(exports, function () { for (const key of exports) this.setExport(key, (type, props) => ({ type, props })); });
});
await mod.evaluate();
const { groupGenres, groupYears, monthlyActivity, StatsTable } = mod.namespace;
const book = { id: "one", name: "Uno", genres: ["Fantasía", "Clásicos"], score: 8, finishedOn: "2026-09-01" };
test("una obra multigénero se cuenta una vez en cada grupo", () => {
  const rows = groupGenres([book], new Map([["one", 3]]));
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.count === 1 && row.sessions === 3 && row.average === 8));
});
test("actividad anual suma episodios, no bloques", () => {
  const rows = groupYears([book], [{ itemId: "one", activityOn: "2026-09-01", units: 25 }], "finish");
  assert.equal(rows[0].sessions, 25);
});
test("actividad mensual suma bloques y unidades individuales", () => {
  const values = monthlyActivity([{ activityOn: "2026-09-01", units: 25 }, { activityOn: "2026-09-02" }], "2026", "finish");
  assert.equal(values[8], 26);
  assert.equal(values[0], 0);
});
test("tabla muestra episodios y media al final", () => {
  const tree = StatsTable({ title: "Por género", rows: [], unitLabel: "Episodios" });
  const header = tree.props.children[1];
  assert.deepEqual(header.props.children.map((child) => child.props.children), ["Grupo", "Obras", "Episodios", "Media"]);
});
