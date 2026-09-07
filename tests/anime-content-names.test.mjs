// node --experimental-vm-modules --test tests/anime-content-names.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/media/presentation.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = new SourceTextModule(output);
await module.link((specifier) => {
  assert.equal(specifier, "../ui/score");
  return new SyntheticModule(["formatScore", "scoreColor", "scoreTone"], function () {
    for (const name of ["formatScore", "scoreColor", "scoreTone"]) this.setExport(name, () => {});
  });
});
await module.evaluate();
const concise = module.namespace.conciseContentName;

for (const [name, title, alternate, expected] of [
  ["Temporada 2 — Horimiya: The Missing Pieces", "Horimiya", null, "Temporada 2 — The Missing Pieces"],
  ["Temporada 2 — Solo Leveling: Arise from the Shadow", "Solo Leveling", null, "Temporada 2 — Arise from the Shadow"],
  ["Temporada 2 --- HORIMIYA : The Missing Pieces", "Horimiya", null, "Temporada 2 — The Missing Pieces"],
  ["Temporada 2 – Ore dake Level Up na Ken: Arise", "Solo Leveling", "Ore dake Level Up na Ken", "Temporada 2 — Arise"],
  ["Temporada 2 — Re:Zero: Frozen", "Re:Zero", null, "Temporada 2 — Frozen"],
  ["Temporada 2 — Horimiya：The Missing Pieces", "Horimiya", null, "Temporada 2 — The Missing Pieces"],
  ["Temporada 1 --- Anime", "Anime", null, "Temporada 1"],
  ["Temporada 2 - Los diarios de la boticaria", "The Apothecary Diaries", "Los diarios de la boticaria", "Temporada 2"],
  ["No Game No Life: Zero", "No Game No Life", null, "No Game No Life: Zero"],
  ["Película — No Game No Life: Zero", "No Game No Life", null, "No Game No Life: Zero"],
  ["Hori-san to Miyamura-kun", "Horimiya", null, "Hori-san to Miyamura-kun"],
  ["Temporada 2 — Otro anime: Subtítulo", "Anime", null, "Temporada 2 — Otro anime: Subtítulo"],
  ["Temporada 2 — Anime: ", "Anime", null, "Temporada 2 — Anime:"],
  ["Temporada 4 Parte 1 - To the Top", "Haikyuu!!", null, "Temporada 4 Parte 1 - To the Top"],
  ["OVA 3 - Los jóvenes y el torneo de primavera", "Haikyuu!!", null, "OVA 3 - Los jóvenes y el torneo de primavera"],
]) {
  test(name, () => assert.equal(concise(name, title, alternate), expected));
}
