# Guía de colaboración de NubeOS

Este proyecto se desarrolla de forma deliberada y documentada. El código es el resultado del diseño, no el punto de partida.

## Antes de cualquier implementación

1. Leer `docs/vision.md`, `docs/architecture.md` y `docs/principles.md`.
2. Leer la documentación del módulo afectado: `spec.md`, `design.md` y `tasks.md`.
3. Leer las ADR relevantes de `docs/decisions/`.
4. Implementar solamente una tarea aprobada y acotada de `tasks.md`.

Si falta una especificación, una decisión o una tarea concreta, detenerse y pedir dirección. No introducir decisiones arquitectónicas nuevas sin proponer primero una ADR y recibir aprobación.

## Límites de responsabilidad

- Rust contiene la lógica de negocio, validaciones de dominio y persistencia.
- React contiene presentación y estado efímero de interfaz.
- Los comandos Tauri son adaptadores pequeños entre React y la lógica Rust.
- No modificar módulos fuera del alcance de una tarea aprobada.
- Tras cada tarea: ejecutar verificaciones proporcionales, hacer una revisión breve y documentar aprendizaje relevante en `docs/learning/`.
