# Roadmap de NubeOS

- Estado: Aprobado por Nube
- Última actualización: 2026-08-22

## Propósito

Este roadmap ordena el trabajo por hitos de producto y aprendizaje. No sustituye a las specs, diseños, ADRs ni tareas: cada hito solo avanza mediante cambios pequeños aprobados.

No contiene fechas. La prioridad es cerrar y revisar cada módulo antes de concentrar el trabajo en el siguiente.

## Estado actual

- La visión, arquitectura, principios y ADRs base están aprobados.
- Comidas y compras está implementado y cerrado tras varias rondas de uso real.
- Documentos está implementado, revisado y cerrado.
- Hábitos y rutinas está implementado, revisado y cerrado.
- Los datos continúan siendo locales, sin copias ni sincronización durante esta etapa.

## Hito 0 — Fundaciones documentadas

**Objetivo:** dejar claros el propósito, los límites técnicos y la forma de trabajar antes de escribir código de producción.

- [x] Aprobar visión.
- [x] Aprobar arquitectura y principios.
- [x] Aprobar ADRs de arquitectura base.
- [x] Definir la estrategia inicial: datos locales sin copias ni sincronización durante el MVP.

**Salida:** documentación base aprobada y una forma de trabajo repetible.

## Hito 1 — Definir el módulo de comidas

**Objetivo:** convertir la idea del planificador semanal de comidas y compras en un alcance verificable.

- [x] Redactar y aprobar `docs/modules/meals/spec.md`.
- [x] Redactar y aprobar `docs/modules/meals/design.md`.
- [x] Crear y aprobar tareas pequeñas en `docs/modules/meals/tasks.md`.
- [x] Confirmar que el diseño no necesitó una ADR adicional: concretó las decisiones base ya aprobadas.

**Salida:** el primer incremento de comidas está definido, acotado y listo para implementar.

## Hito 2 — Primer flujo vertical de comidas

**Objetivo:** implementar de forma incremental el primer caso de uso útil, respetando las ADRs aprobadas.

El orden exacto se decidirá en `tasks.md`, pero previsiblemente incluirá:

1. Base mínima de Rust/Tauri y SQLite necesaria para el módulo.
2. Modelo y persistencia de alimentos y comidas.
3. Casos de uso y comandos Tauri pequeños.
4. Interfaz React del flujo definido.
5. Pruebas de dominio, persistencia y verificaciones manuales de interfaz según corresponda.

**Salida:** un flujo de comidas usable, con datos persistentes locales y reglas de negocio en Rust.

## Hito 3 — Planificación semanal y lista de compra

**Objetivo:** extender el módulo solo después de validar el primer flujo vertical.

El alcance concreto se determinará mediante una nueva actualización de spec, diseño y tareas. Podría incluir la planificación por franjas diarias, el cálculo de cantidades de compra y los resúmenes nutricionales, siempre que se haya especificado y aprobado.

**Salida:** planificador semanal y lista de compra coherentes con los datos de alimentos y comidas.

## Hito 4 — Consolidación del módulo de comidas

**Objetivo:** revisar el uso real antes de abrir un segundo módulo.

- [x] Revisar la experiencia, los errores y la deuda técnica observada mediante iteraciones de uso real.
- [x] Sustituir el prototipo previo, conservando solo el cascarón y recursos que superaron la revisión del módulo.
- [x] Revisar la ADR-005 con datos reales y mantener aceptado el riesgo local durante esta etapa.
- [x] Confirmar que exportación, copias y sincronización continúan aplazadas y no justifican todavía una ADR nueva.

**Salida:** módulo de comidas consolidado y cerrado; recuperación y sincronización permanecen como trabajo futuro explícito.

## Hito 5 — Documentos personales

**Objetivo:** conservar, encontrar y utilizar PDFs privados desde NubeOS.

- [x] Aprobar spec, design y ADRs específicas.
- [x] Implementar metadatos, carpeta administrada y ciclo de vida seguro.
- [x] Añadir búsqueda, filtros, favoritos y caducidades.
- [x] Previsualizar, abrir, copiar y guardar PDFs.
- [x] Revisar y cerrar el módulo.

**Salida:** archivo personal local de PDFs completo y validado.

## Hito 6 — Hábitos y rutinas

**Objetivo:** sustituir las tablas manuales de Notion por un seguimiento local flexible y de baja fricción.

- [x] Revisar y aprobar `spec.md` y `design.md`.
- [x] Revisar la descomposición y resultados de `tasks.md`.
- [x] Implementar el primer vertical técnico autorizado como excepción.
- [x] Probar frecuencias, correcciones históricas, pausa, Archivo y arrastre con datos reales.
- [x] Refinar la experiencia y cerrar el módulo.

**Salida:** seguimiento diario, semanal y mensual con historial y métricas calculadas en Rust.

## Hito 7 — Anime, Series y Películas

**Objetivo:** sustituir las bases relacionales de Notion por tres trackers audiovisuales separados en la navegación, con Anime como área principal compleja y Series y Películas como áreas sencillas.

- [ ] Revisar `docs/modules/anime/`, `series/` y `movies/` tras el refactor autorizado.
- [x] Aprobar ADR-008 sobre módulos audiovisuales y núcleo compartido.
- [x] Implementar como lote autorizado una primera versión técnica completa.
- [x] Separar Anime, Series y Películas como tres entradas de la barra lateral.
- [ ] Probar las tres bibliotecas, portadas, progreso e historial con datos reales.
- [ ] Refinar la experiencia y cerrar el módulo.

**Salida provisional:** Anime conserva contenidos y progreso detallado; Series usa posición simple; Películas usa seguimiento binario. Las tres áreas comparten infraestructura sin mezclar sus bibliotecas.

## Preparación de la versión instalable

**Objetivo:** cerrar los detalles de distribución cuando NubeOS tenga una build estable.

- [ ] Añadir inicio automático opcional al iniciar sesión en Windows mediante una tarea y ADR específica.
- [ ] Decidir si el inicio automático se activa por defecto o desde Preferencias.

**Salida:** instalador de Windows con las opciones de inicio revisadas, sin afectar al flujo de desarrollo.

## Módulos posteriores

Los siguientes módulos siguen siendo candidatos, sin orden comprometido. Cada uno comenzará de nuevo por spec, diseño y tareas:

- Finanzas personales.
- Proyectos.
- Lectura.

## Fuera del roadmap inicial

- Sincronización entre dispositivos, servidor central y cuentas remotas.
- Copias de seguridad o restauración dentro de la aplicación.
- Aplicación móvil, colaboración y funciones sociales.

Estas líneas se reconsiderarán únicamente mediante una propuesta y ADR cuando surja una necesidad real.
