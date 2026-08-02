# Principios de NubeOS

## Diseño y alcance

- El código sigue a una especificación aprobada.
- Los cambios son pequeños, cohesivos y revisables.
- Cada módulo es independiente y no se modifica fuera de una tarea explícita.
- Evitar dependencias si una solución simple e idiomática basta.

## Arquitectura

- La lógica de negocio, invariantes y persistencia viven en Rust.
- React se ocupa de presentación y estado de interfaz temporal.
- Los comandos Tauri son pequeños y orientados a un caso de uso.
- No usar `unsafe` en Rust sin una justificación documentada.

## Calidad

- Las tareas incluyen criterios de aceptación y una estrategia de verificación.
- Los nombres expresan intención y se prefiere código sencillo a abstracciones prematuras.
- Al terminar una tarea se revisan duplicación, complejidad, errores potenciales y rendimiento.

## Aprendizaje

- Introducir conceptos de Rust y Tauri de forma explicada y gradual.
- Añadir una nota resumida a `docs/learning/` cuando se incorpore una técnica relevante.
