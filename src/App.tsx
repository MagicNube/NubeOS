import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Film,
  FolderKanban,
  LayoutDashboard,
  ShoppingBasket,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MealPlanner from "./MealPlanner";

type ModuleId = "inicio" | "comidas" | "finanzas" | "documentos" | "proyectos" | "habitos" | "lectura" | "series";

type NavigationItem = { id: ModuleId; label: string; icon: LucideIcon };

const navigation: NavigationItem[] = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "comidas", label: "Comidas y compras", icon: ShoppingBasket },
  { id: "finanzas", label: "Finanzas", icon: WalletCards },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "proyectos", label: "Proyectos", icon: FolderKanban },
  { id: "habitos", label: "Hábitos", icon: CheckCircle2 },
  { id: "lectura", label: "Lectura", icon: BookOpen },
  { id: "series", label: "Series", icon: Film },
];

const moduleCopy: Record<ModuleId, { eyebrow: string; title: string; description: string }> = {
  inicio: { eyebrow: "TU ESPACIO", title: "Todo en su sitio.", description: "Una vista tranquila de tus módulos personales." },
  comidas: { eyebrow: "PLANIFICACIÓN", title: "Comidas y compras", description: "Organiza la semana, revisa tus macros y compra solo lo que necesitas." },
  finanzas: { eyebrow: "PATRIMONIO PERSONAL", title: "Finanzas", description: "Registra cuentas, movimientos y presupuesto mensual." },
  documentos: { eyebrow: "ARCHIVO PERSONAL", title: "Documentos", description: "Guarda y encuentra tus documentos importantes." },
  proyectos: { eyebrow: "TRABAJO PROFUNDO", title: "Proyectos", description: "Define objetivos y mantén visibles los próximos pasos." },
  habitos: { eyebrow: "CONSTANCIA", title: "Hábitos", description: "Crea pequeñas rutinas y observa cómo se acumulan." },
  lectura: { eyebrow: "BIBLIOTECA", title: "Lectura", description: "Conserva tu lista de lectura y tus notas." },
  series: { eyebrow: "PARA VER", title: "Series", description: "Lleva tu lista pendiente y no pierdas el hilo." },
};

function Placeholder({ activeModule }: { activeModule: Exclude<ModuleId, "inicio" | "comidas"> }) {
  const Icon = navigation.find((item) => item.id === activeModule)!.icon;
  return (
    <section className="placeholder-card">
      <div className="placeholder-icon"><Icon size={25} /></div>
      <h2>Este módulo está preparado.</h2>
      <p>Su estructura llegará después. De momento, el planificador de comidas ya está listo para usar.</p>
    </section>
  );
}

function Dashboard({ openMeals }: { openMeals: () => void }) {
  return (
    <section className="dashboard-card">
      <p className="section-kicker">PRIMER MÓDULO</p>
      <h2>Planifica una semana con intención.</h2>
      <p>Tu planificador de comidas ya tiene una semana de ejemplo, macros diarios y una compra consolidada.</p>
      <button className="primary-button" onClick={openMeals} type="button">Abrir planificador <ChevronRight size={17} /></button>
    </section>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("comidas");
  const [collapsed, setCollapsed] = useState(false);
  const content = moduleCopy[activeModule];

  return (
    <main className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">N</div><span>NubeOS</span></div>
        <nav aria-label="Módulos principales">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button className={activeModule === id ? "nav-item active" : "nav-item"} key={id} onClick={() => setActiveModule(id)} title={collapsed ? label : undefined} type="button">
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} type="button">
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Contraer</span></>}
          </button>
          <div className="privacy-note"><span />Datos locales</div>
        </div>
      </aside>
      <section className="content">
        <header className={activeModule === "comidas" ? "module-header meal-header" : "module-header"}>
          <div><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="subtitle">{content.description}</p></div>
          <div className="avatar" aria-label="Perfil de Jesús">J</div>
        </header>
        {activeModule === "inicio" && <Dashboard openMeals={() => setActiveModule("comidas")} />}
        {activeModule === "comidas" && <MealPlanner />}
        {activeModule !== "inicio" && activeModule !== "comidas" && <Placeholder activeModule={activeModule} />}
      </section>
    </main>
  );
}
