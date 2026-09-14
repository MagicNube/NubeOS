import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/dashboard/DashboardWorkspace.tsx", import.meta.url), "utf8");
const dashboardCss = readFileSync(new URL("../src/dashboard/dashboard.css", import.meta.url), "utf8");
const documents = readFileSync(new URL("../src/documents/DocumentsWorkspace.tsx", import.meta.url), "utf8");
const modal = readFileSync(new URL("../src/ui/Modal.tsx", import.meta.url), "utf8");
const reading = readFileSync(new URL("../src/reading/ReadingWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const meals = readFileSync(new URL("../src/meals/MealsWorkspace.tsx", import.meta.url), "utf8");
const mealsCss = readFileSync(new URL("../src/meals/meals.css", import.meta.url), "utf8");
const mediaCss = readFileSync(new URL("../src/media/media.css", import.meta.url), "utf8");
const readingCss = readFileSync(new URL("../src/reading/reading.css", import.meta.url), "utf8");
const gamesCss = readFileSync(new URL("../src/games/games.css", import.meta.url), "utf8");
const mediaDetail = readFileSync(new URL("../src/media/MediaDetail.tsx", import.meta.url), "utf8");
const products = readFileSync(new URL("../src/meals/products/ProductsPage.tsx", import.meta.url), "utf8");

test("la navegación conserva nombres accesibles cuando oculta sus textos", () => {
  assert.match(app, /aria-label=\{label\}/);
  assert.match(styles, /\.sidebar nav, \.sidebar-navigation-group, \.nav-item \{ width: 42px; \}/);
});

test("la aplicación dedica el espacio de la antigua ruta al contenido", () => {
  assert.doesNotMatch(app, /Ruta actual|app-context-bar|app-breadcrumbs/);
  assert.match(styles, /\.workspace-pane[^}]+grid-template-rows: minmax\(0, 1fr\)/);
});

test("Finanzas y Proyectos se presentan como módulos futuros sin funciones prometidas", () => {
  assert.doesNotMatch(app, /Registra cuentas, movimientos/);
  assert.doesNotMatch(app, /Define objetivos y mantén visibles/);
  assert.match(app, /Este módulo todavía no se ha diseñado/);
});

test("los avisos y cierres auditados exponen semántica accesible", () => {
  assert.match(dashboard, /role="status"/);
  assert.match(documents, /aria-label="Cerrar aviso"/);
  assert.match(documents, /aria-label="Cerrar error"/);
  assert.match(documents, /event\.key === " "/);
  assert.match(reading, /aria-label="Cerrar formulario de lectura"/);
});

test("los modales compartidos aíslan el fondo y contienen el desplazamiento", () => {
  assert.match(modal, /createPortal/);
  assert.match(modal, /makeBackgroundInert/);
  assert.match(readFileSync(new URL("../src/ui/ui.css", import.meta.url), "utf8"), /overscroll-behavior: contain/);
});

test("Inicio no conserva tamaños inferiores a 12 px ni los colores que fallaban", () => {
  assert.doesNotMatch(dashboardCss, /font-size: (?:9|10|11)px/);
  assert.doesNotMatch(dashboardCss, /#77717a|#817a84|#827b85/);
  assert.match(dashboardCss, /max-width: 1320px/);
});

test("la interfaz no vuelve a usar confirmaciones nativas del navegador", () => {
  const offenders = sourceFiles(sourceRoot).filter((path) => readFileSync(path, "utf8").includes("window.confirm"));
  assert.deepEqual(offenders, []);
});

test("el planificador compacto permite añadir comidas o productos", () => {
  assert.match(meals, /createPlannedProduct/);
  assert.match(meals, /aria-pressed=\{pickerMode === "meals"\}/);
  assert.match(meals, /aria-pressed=\{pickerMode === "products"\}/);
  assert.match(meals, /Indica cuánto quieres añadir a esta franja/);
  assert.match(mealsCss, /height: min\(560px, calc\(100vh - 96px\)\)/);
});

test("Cantidad conserva entrada numérica sin controles de incremento", () => {
  assert.match(
    mealsCss,
    /\.picker-product-quantity input\[type="number"\][\s\S]*?appearance: textfield/,
  );
  assert.match(
    mealsCss,
    /::-webkit-inner-spin-button[\s\S]*?::-webkit-outer-spin-button[\s\S]*?appearance: none/,
  );
});

test("el formulario deriva paquetes y admite peso unitario aproximado a granel", () => {
  assert.match(products, /Cada unidad pesa aproximadamente/);
  assert.match(products, /Peso aproximado por unidad \(g\) \(opcional\)/);
  assert.match(products, /bulkApproximateGramsPerUnit/);
});

test("Anime reutiliza la jerarquía neutra del resto de Media", () => {
  assert.match(mediaCss, /\.anime-workspace \.library-card \{ display: flex; flex-direction: column; \}/);
  assert.doesNotMatch(mediaCss, /\.anime-workspace \.library-card \{[^}]*border:/);
  assert.doesNotMatch(mediaCss, /--anime-detail-card-border|--anime-detail-card-surface|--anime-detail-card-divider/);
  assert.match(mediaDetail, /className="anime-detail-overview"[\s\S]*?<TrackerMetricGrid metrics=/);
  assert.doesNotMatch(mediaDetail, /media-overview-strip/);
  assert.doesNotMatch(mediaCss, /--anime-detail-outline|--anime-detail-divider/);
  assert.doesNotMatch(mediaCss, /\.anime-media-detail \.media-content-row \{[^}]*border-color:/);
  assert.doesNotMatch(mediaCss, /\.anime-media-detail \.anime-content-run \{[^}]*border-color:/);
  assert.doesNotMatch(mediaCss, /\.anime-media-detail \.media-anime-history-list(?: article)? \{[^}]*border/);
  assert.doesNotMatch(mediaCss, /\.anime-media-detail \.media-anime-movie-history-list article \{[^}]*border-color:/);
  assert.match(mediaCss, /\.media-content-row \{[^}]*border: 1px solid var\(--ui-color-card-border\)[^}]*box-shadow: var\(--ui-card-shadow\)/);
  assert.match(mediaCss, /\.anime-content-run \{[^}]*border: 1px solid var\(--ui-color-card-border\)/);
  assert.match(mediaCss, /\.media-anime-history-list article \{[^}]*border: 1px solid var\(--ui-color-card-border\)/);
  assert.match(mediaCss, /\.media-anime-movie-history-list article \{[^}]*border: 1px solid var\(--ui-color-card-border\)/);
  assert.match(mediaCss, /\.media-content-row\.dragging \{[^}]*border-color: #8b5cf6/);
  assert.match(mediaCss, /\.media-content-row\.drop-target \{[^}]*border-color: #8b5cf6/);
  assert.match(mediaDetail, /aria-label="Archivar título"/);
});

test("las tarjetas de historial de Media conservan contornos estructurales visibles", () => {
  assert.match(styles, /--ui-color-card-border: #4a454d/);
  assert.match(styles, /--ui-color-card-border-hover: #655d69/);
  assert.match(readingCss, /\.reading-run-list article,\.reading-history-list article \{[^}]*var\(--ui-color-card-border\)[^}]*var\(--ui-card-shadow\)/);
  assert.match(gamesCss, /\.game-run-list article \{[^}]*var\(--ui-color-card-border\)[^}]*var\(--ui-card-shadow\)/);
  assert.match(gamesCss, /\.game-history-list article \{[^}]*var\(--ui-color-card-border\)[^}]*var\(--ui-card-shadow\)/);
  assert.match(mediaCss, /\.media-global-history-row \{[^}]*var\(--ui-color-card-border\)[^}]*border-radius: 9px[^}]*var\(--ui-card-shadow\)/);
  assert.match(mediaCss, /\.simple-movie-history article \{[^}]*var\(--ui-color-card-border\)[^}]*var\(--ui-card-shadow\)/);
  assert.match(mediaCss, /\.simple-movie-history-list article \{[^}]*var\(--ui-color-card-border\)[^}]*var\(--ui-card-shadow\)/);
  assert.match(mediaCss, /\.media-global-history \{[^}]*display: grid[^}]*gap: 8px/);
});
