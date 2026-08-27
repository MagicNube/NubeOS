import { lazy, Suspense, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  FolderKanban,
  Gamepad2,
  LayoutDashboard,
  ShoppingBasket,
  Sparkles,
  Tv,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MealsWorkspace from "./meals/MealsWorkspace";
import DashboardWorkspace, { type DashboardDestination } from "./dashboard/DashboardWorkspace";
const DocumentsWorkspace = lazy(() => import("./documents/DocumentsWorkspace"));
const HabitsWorkspace = lazy(() => import("./habits/HabitsWorkspace"));
const AnimeWorkspace = lazy(() => import("./media/AnimeWorkspace"));
const SeriesWorkspace = lazy(() => import("./series/SeriesWorkspace"));
const MoviesWorkspace = lazy(() => import("./movies/MoviesWorkspace"));
const ReadingWorkspace = lazy(() => import("./reading/ReadingWorkspace"));
const GamesWorkspace = lazy(() => import("./games/GamesWorkspace"));

type ModuleId =
  | "inicio"
  | "comidas"
  | "finanzas"
  | "documentos"
  | "proyectos"
  | "habitos"
  | "lectura"
  | "anime"
  | "series"
  | "peliculas"
  | "videojuegos";

type NavigationItem = { id: ModuleId; label: string; icon: LucideIcon };

const mainNavigation: NavigationItem[] = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "comidas", label: "Comidas y compras", icon: ShoppingBasket },
  { id: "finanzas", label: "Finanzas", icon: WalletCards },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "proyectos", label: "Proyectos", icon: FolderKanban },
  { id: "habitos", label: "Hábitos", icon: CheckCircle2 },
];

const entertainmentNavigation: NavigationItem[] = [
  { id: "anime", label: "Anime", icon: Sparkles },
  { id: "lectura", label: "Lectura", icon: BookOpen },
  { id: "videojuegos", label: "Videojuegos", icon: Gamepad2 },
  { id: "peliculas", label: "Películas", icon: Clapperboard },
  { id: "series", label: "Series", icon: Tv },
];

const navigation = [...mainNavigation, ...entertainmentNavigation];

const moduleCopy: Record<
  ModuleId,
  { eyebrow: string; title: string; description: string }
> = {
  inicio: {
    eyebrow: "TU ESPACIO",
    title: "Todo, en un mismo lugar.",
    description: "Todo lo importante, de un vistazo.",
  },
  comidas: {
    eyebrow: "PLANIFICACIÓN",
    title: "Comidas y compras",
    description:
      "Crea tu catálogo de productos para construir comidas y planificar la compra.",
  },
  finanzas: {
    eyebrow: "PATRIMONIO PERSONAL",
    title: "Finanzas",
    description: "Registra cuentas, movimientos y presupuesto mensual.",
  },
  documentos: {
    eyebrow: "ARCHIVO PERSONAL",
    title: "Documentos",
    description: "Guarda y encuentra tus documentos importantes.",
  },
  proyectos: {
    eyebrow: "TRABAJO PROFUNDO",
    title: "Proyectos",
    description: "Define objetivos y mantén visibles los próximos pasos.",
  },
  habitos: {
    eyebrow: "CONSTANCIA",
    title: "Hábitos",
    description: "Crea pequeñas rutinas y observa cómo se acumulan.",
  },
  lectura: {
    eyebrow: "BIBLIOTECA",
    title: "Lectura",
    description: "Conserva tu lista de lectura y tus notas.",
  },
  anime: {
    eyebrow: "ANIME",
    title: "Anime",
    description: "Temporadas, películas, OVA y especiales en su orden recomendado.",
  },
  series: {
    eyebrow: "PARA VER",
    title: "Series",
    description: "Recuerda qué estás viendo y por qué temporada y episodio vas.",
  },
  peliculas: {
    eyebrow: "CINE",
    title: "Películas",
    description: "Conserva tus pendientes, visionados, puntuaciones y opiniones.",
  },
  videojuegos: {
    eyebrow: "VIDEOJUEGOS",
    title: "Videojuegos",
    description: "Guarda tus partidas, rejugadas, puntuaciones y opiniones.",
  },
};

function Placeholder({
  activeModule,
}: {
  activeModule: Exclude<
    ModuleId,
    "inicio" | "comidas" | "documentos" | "habitos" | "anime" | "series" | "peliculas" | "lectura" | "videojuegos"
  >;
}) {
  const Icon = navigation.find((item) => item.id === activeModule)!.icon;
  return (
    <section className="placeholder-card">
      <div className="placeholder-icon">
        <Icon size={25} />
      </div>
      <h2>Este módulo está preparado.</h2>
      <p>
        Su estructura llegará después. De momento, el planificador de comidas ya
        está listo para usar.
      </p>
    </section>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("inicio");
  const [collapsed, setCollapsed] = useState(false);
  const content = moduleCopy[activeModule];
  const isEntertainmentModule = entertainmentNavigation.some((item) => item.id === activeModule);

  return (
    <main className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <span>NubeOS</span>
        </div>
        <nav aria-label="Módulos principales">
          <div className="sidebar-navigation-group">
          {mainNavigation.map(({ id, label, icon: Icon }) => (
            <button
              className={activeModule === id ? "nav-item active" : "nav-item"}
              key={id}
              onClick={() => setActiveModule(id)}
              title={collapsed ? label : undefined}
              type="button"
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
          </div>
          <div className="sidebar-navigation-group entertainment-group">
            <span className="sidebar-navigation-label">Entretenimiento</span>
            {entertainmentNavigation.map(({ id, label, icon: Icon }) => (
              <button className={activeModule === id ? "nav-item active" : "nav-item"} key={id} onClick={() => setActiveModule(id)} title={collapsed ? label : undefined} type="button">
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            type="button"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Contraer</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <section className="content">
        {activeModule !== "inicio" && (
          <header
            className={
              activeModule === "comidas"
                ? "module-header meal-header"
                : "module-header"
            }
          >
            <div>
              {!isEntertainmentModule && <p className="eyebrow">{content.eyebrow}</p>}
              <h1>{content.title}</h1>
              <p className="subtitle">{content.description}</p>
            </div>
          </header>
        )}
        {activeModule === "inicio" && <DashboardWorkspace open={(destination: DashboardDestination) => setActiveModule(destination)} />}
        {activeModule === "comidas" && <MealsWorkspace />}
        {activeModule === "documentos" && (
          <Suspense
            fallback={
              <section className="placeholder-card">
                <p>Cargando Documentos…</p>
              </section>
            }
          >
            <DocumentsWorkspace />
          </Suspense>
        )}
        {activeModule === "habitos" && (
          <Suspense
            fallback={
              <section className="placeholder-card">
                <p>Cargando Hábitos…</p>
              </section>
            }
          >
            <HabitsWorkspace />
          </Suspense>
        )}
        {activeModule === "anime" && (
          <Suspense
            fallback={
              <section className="placeholder-card">
                <p>Cargando Anime…</p>
              </section>
            }
          >
            <AnimeWorkspace />
          </Suspense>
        )}
        {activeModule === "series" && (
          <Suspense fallback={<section className="placeholder-card"><p>Cargando Series…</p></section>}>
            <SeriesWorkspace />
          </Suspense>
        )}
        {activeModule === "peliculas" && (
          <Suspense fallback={<section className="placeholder-card"><p>Cargando Películas…</p></section>}>
            <MoviesWorkspace />
          </Suspense>
        )}
        {activeModule === "lectura" && (
          <Suspense fallback={<section className="placeholder-card"><p>Cargando Lectura…</p></section>}>
            <ReadingWorkspace />
          </Suspense>
        )}
        {activeModule === "videojuegos" && (
          <Suspense fallback={<section className="placeholder-card"><p>Cargando Videojuegos…</p></section>}>
            <GamesWorkspace />
          </Suspense>
        )}
        {activeModule !== "inicio" &&
          activeModule !== "comidas" &&
          activeModule !== "documentos" &&
          activeModule !== "habitos" &&
          activeModule !== "anime" &&
          activeModule !== "series" &&
          activeModule !== "peliculas" &&
          activeModule !== "lectura" &&
          activeModule !== "videojuegos" && (
            <Placeholder activeModule={activeModule} />
          )}
      </section>
    </main>
  );
}
