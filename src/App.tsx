import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
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
  Minus,
  ShoppingBasket,
  Sparkles,
  Square,
  Tv,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import nubeOsLogo from "./assets/nubeos-logo.svg";
import MealsWorkspace from "./meals/MealsWorkspace";
import DashboardWorkspace, { type DashboardDestination } from "./dashboard/DashboardWorkspace";
import { AppViewProvider } from "./ui/AppViewContext";
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

function runWindowAction(
  actionName: string,
  action: (window: ReturnType<typeof getCurrentWindow>) => Promise<void>,
) {
  try {
    void action(getCurrentWindow()).catch((error) => {
      console.error(`No se pudo ${actionName} la ventana.`, error);
    });
  } catch (error) {
    // La previsualización web no dispone de una ventana nativa.
    console.error(`No se pudo ${actionName} la ventana.`, error);
  }
}

function handleTitlebarMouseDown(event: ReactMouseEvent<HTMLElement>) {
  if (event.button !== 0 || event.target !== event.currentTarget) return;
  if (event.detail === 2) {
    runWindowAction("maximizar o restaurar", (window) => window.toggleMaximize());
    return;
  }
  runWindowAction("mover", (window) => window.startDragging());
}

const moduleTitles: Record<ModuleId, string> = Object.fromEntries(navigation.map(({ id, label }) => [id, label])) as Record<ModuleId, string>;

function Placeholder({
  activeModule,
}: {
  activeModule: Exclude<
    ModuleId,
    "inicio" | "comidas" | "documentos" | "habitos" | "anime" | "series" | "peliculas" | "lectura" | "videojuegos"
  >;
}) {
  const module = navigation.find((item) => item.id === activeModule)!;
  const Icon = module.icon;
  return (
    <section className="placeholder-card">
      <div className="placeholder-icon">
        <Icon size={25} />
      </div>
      <h2>{module.label} llegará más adelante</h2>
      <p>Este módulo todavía no se ha diseñado. Su alcance se definirá antes de empezar a desarrollarlo.</p>
    </section>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("inicio");
  const [, setActiveView] = useState<string | null>(null);
  const activeModuleRef = useRef<ModuleId>("inicio");
  const navigationDepth = useRef(0);
  const [collapsed, setCollapsed] = useState(false);
  const title = moduleTitles[activeModule];
  const isEntertainmentModule = entertainmentNavigation.some((item) => item.id === activeModule);

  const navigateTo = useCallback((destination: ModuleId) => {
    if (activeModuleRef.current === destination) return;
    activeModuleRef.current = destination;
    setActiveView(null);
    setActiveModule((current) => {
      navigationDepth.current += 1;
      window.history.pushState({ nubeosModule: destination, nubeosDepth: navigationDepth.current }, "");
      return destination;
    });
  }, []);

  useEffect(() => {
    window.history.replaceState({ nubeosModule: activeModule, nubeosDepth: 0 }, "");
    const onPopState = (event: PopStateEvent) => {
      const destination = event.state?.nubeosModule;
      const nextModule = navigation.some((item) => item.id === destination) ? destination as ModuleId : "inicio";
      navigationDepth.current = typeof event.state?.nubeosDepth === "number" ? event.state.nubeosDepth : 0;
      activeModuleRef.current = nextModule;
      setActiveView(null);
      setActiveModule(nextModule);
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 3) return;
      event.preventDefault();
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]'));
      const dialog = dialogs.reverse().find((element) => !element.closest("[inert]"));
      if (dialog) {
        dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }
      if (navigationDepth.current > 0) window.history.back();
    };
    const preventNativeMouseNavigation = (event: MouseEvent) => {
      if (event.button === 3) event.preventDefault();
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("mousedown", preventNativeMouseNavigation);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("auxclick", preventNativeMouseNavigation);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("mousedown", preventNativeMouseNavigation);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("auxclick", preventNativeMouseNavigation);
    };
  }, []);

  return (
    <div className="app-frame">
      <header className="app-titlebar" onMouseDown={handleTitlebarMouseDown}>
        <div className="app-window-controls">
          <button aria-label="Minimizar ventana" className="app-window-control" onClick={() => runWindowAction("minimizar", (window) => window.minimize())} title="Minimizar" type="button">
            <Minus aria-hidden="true" size={15} strokeWidth={1.8} />
          </button>
          <button aria-label="Maximizar o restaurar ventana" className="app-window-control" onClick={() => runWindowAction("maximizar o restaurar", (window) => window.toggleMaximize())} title="Maximizar o restaurar" type="button">
            <Square aria-hidden="true" size={12} strokeWidth={1.8} />
          </button>
          <button aria-label="Cerrar ventana" className="app-window-control app-window-close" onClick={() => runWindowAction("cerrar", (window) => window.close())} title="Cerrar" type="button">
            <X aria-hidden="true" size={15} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <div className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <img aria-hidden="true" className="brand-mark" src={nubeOsLogo} />
            <span>NubeOS</span>
          </div>
        </div>
        <nav aria-label="Módulos principales">
          <div className="sidebar-navigation-group">
          <span className="sidebar-navigation-label">General</span>
          {mainNavigation.map(({ id, label, icon: Icon }) => (
            <button
              className={activeModule === id ? "nav-item active" : "nav-item"}
              aria-label={label}
              aria-current={activeModule === id ? "page" : undefined}
              key={id}
              onClick={() => navigateTo(id)}
              title={collapsed ? label : undefined}
              type="button"
            >
              <i aria-hidden="true" className="nav-item-icon"><Icon size={18} strokeWidth={1.8} /></i>
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
          </div>
          <div className="sidebar-navigation-group entertainment-group">
            <span className="sidebar-navigation-label">Entretenimiento</span>
            {entertainmentNavigation.map(({ id, label, icon: Icon }) => (
              <button aria-label={label} aria-current={activeModule === id ? "page" : undefined} className={activeModule === id ? "nav-item active" : "nav-item"} key={id} onClick={() => navigateTo(id)} title={collapsed ? label : undefined} type="button">
                <i aria-hidden="true" className="nav-item-icon"><Icon size={18} strokeWidth={1.8} /></i>
                <span className="nav-item-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          className="collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Contraer"}
          type="button"
        >
          {collapsed ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
        </button>
      </aside>
      <AppViewProvider value={setActiveView}>
      <section className="workspace-pane">
        <main className="content" id="main-content" tabIndex={-1}>
        {activeModule !== "inicio" && !isEntertainmentModule && (
          <header
            className={
              activeModule === "comidas"
                ? "module-header meal-header"
                : "module-header"
            }
          >
            <div>
              <h1>{title}</h1>
            </div>
          </header>
        )}
        {activeModule === "inicio" && <DashboardWorkspace open={(destination: DashboardDestination) => navigateTo(destination)} />}
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
        </main>
      </section>
      </AppViewProvider>
      </div>
    </div>
  );
}
