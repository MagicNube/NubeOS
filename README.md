# NubeOS

Aplicación de escritorio privada para organizar vida personal: comidas, finanzas, documentos, proyectos, hábitos, lectura y series.

## Ejecutar en desarrollo

Necesitas instalar previamente [Node.js LTS](https://nodejs.org/) y el toolchain de [Rust](https://www.rust-lang.org/tools/install). En Windows, Tauri también requiere las **Microsoft C++ Build Tools** y **WebView2** (normalmente ya viene instalado).

```powershell
pnpm install
pnpm tauri dev
```

Si no tienes pnpm: `corepack enable` y después `corepack prepare pnpm@latest --activate`.

## Estructura

- `src/`: interfaz React y estilos.
- `src-tauri/`: contenedor nativo Rust y configuración de la ventana.
- `src/App.tsx`: módulos, navegación y pantallas iniciales.

## Comandos

```powershell
pnpm dev       # abre solo la interfaz en el navegador
pnpm tauri dev # abre la aplicación de escritorio
pnpm build     # comprueba TypeScript y construye el frontend
pnpm tauri build # crea un instalable nativo
```
