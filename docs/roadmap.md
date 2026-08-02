# Roadmap de NubeOS

- Estado: Aprobado por Nube
- Última actualización: 2026-08-02

## Propósito

Este roadmap ordena el trabajo por hitos de producto y aprendizaje. No sustituye a las specs, diseños, ADRs ni tareas: cada hito solo avanza mediante cambios pequeños aprobados.

No contiene fechas. La prioridad es terminar un flujo vertical útil del módulo de comidas antes de iniciar otro módulo.

## Estado actual

- La visión, arquitectura y principios están aprobados.
- Están aprobadas las ADRs de persistencia local, comandos Tauri, organización por módulos, pruebas y aplazamiento de copias/sincronización.
- Existe un prototipo de interfaz del planificador de comidas creado antes del proceso actual. Sirve como referencia de producto, pero no forma parte aún de la implementación de producción.
- Todavía no existe un modelo de dominio, persistencia SQLite, comandos Tauri de producción ni una spec aprobada para comidas.

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
- [ ] Proponer una ADR solo si el diseño descubre una decisión arquitectónica nueva o de alto coste de cambio.

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

- [ ] Revisar experiencia, errores y deuda técnica observada.
- [ ] Decidir si el prototipo previo aporta alguna interfaz recuperable.
- [ ] Revisar la decisión de recuperación de datos cuando existan datos reales.
- [ ] Evaluar si el modelo de datos ya justifica exportación/importación mediante una ADR nueva.

**Salida:** decisión informada sobre qué mejorar en comidas y qué módulo abordar después.

## Módulos posteriores

Los siguientes módulos siguen siendo candidatos, sin orden comprometido. Cada uno comenzará de nuevo por spec, diseño y tareas:

- Hábitos y rutinas.
- Finanzas personales.
- Documentos.
- Proyectos.
- Lectura.
- Series.

## Fuera del roadmap inicial

- Sincronización entre dispositivos, servidor central y cuentas remotas.
- Copias de seguridad o restauración dentro de la aplicación.
- Aplicación móvil, colaboración y funciones sociales.

Estas líneas se reconsiderarán únicamente mediante una propuesta y ADR cuando surja una necesidad real.
