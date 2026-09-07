# Diseño — Inicio

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-04
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## Decisión de integración

Inicio es una proyección de presentación. React solicita en paralelo los contratos de consulta ya publicados por Hábitos, Documentos, Comidas, Anime, Lectura, Videojuegos y Series. No consulta SQLite, no importa repositorios Rust y no persiste una copia del resumen.

Esta composición no crea dependencia entre los dominios: cada módulo sigue calculando y validando sus propios resultados. Una futura regla transversal que combine datos de varios módulos deberá trasladarse a un caso de uso Rust y, si cambia límites arquitectónicos, a una ADR.

## Flujo

1. `DashboardWorkspace` calcula hoy y el lunes de la semana en `Europe/Madrid`.
2. Ejecuta las consultas independientes mediante `Promise.allSettled`.
3. Cada resultado correcto actualiza su bloque; los fallos se resumen sin descartar los demás datos.
4. Las tarjetas navegan mediante el estado de módulo propiedad de `App`.
5. El check rápido de hábitos delega en `set_habit_log` y vuelve a consultar el resumen.

## Interfaz

- Cabecera a dos columnas: identidad de Inicio a la izquierda y saludo, fecha, métricas reales y actualización manual a la derecha.
- Cuadrícula responsive de cinco bloques.
- Hábitos y comidas reciben más superficie por ser información diaria.
- Compra, contenido en curso y documentos forman una segunda línea de atención.
- Los estados vacíos son calmados y no sustituyen la estructura de la página.
- La interacción usa botones reales, foco visible y nombres accesibles.

## Dependencias

No se añaden dependencias. Se reutilizan React, Lucide y los clientes Tauri existentes.
