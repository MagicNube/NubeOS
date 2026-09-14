# TODO de NubeOS

- Estado: Lista operativa activa
- Última actualización: 2026-09-07

## Propósito

Este fichero reúne los frentes pendientes que conviene recordar, aunque no formen parte del trabajo de la conversación actual.

No sustituye al roadmap, las specs, los diseños ni las tareas de cada módulo. Si un pendiente cambia requisitos, arquitectura o lógica de negocio, debe trasladarse al flujo documental correspondiente antes de implementarse.

## Cómo mantenerlo

- Cada pendiente usa un identificador estable `TODO-###`.
- Se añade contexto únicamente cuando ayuda a reproducir o revisar el problema.
- Un elemento completado se elimina de esta lista; Git conserva su historial.
- Los módulos futuros pueden aparecer como recordatorio general, pero su alcance se define exclusivamente mediante spec, diseño y tareas.
- Nube puede añadir, reformular o retirar cualquier elemento durante las revisiones de uso.

## Pendientes

### Revisiones abiertas

- [ ] **TODO-010 — Diseñar un Wrapped global MEDIA.** Resumir Anime, Lectura, Videojuegos, Películas y Series sin mezclar sus escalas; queda fuera de la versión 1.0 por decisión de Nube.
- [ ] **TODO-011 — Completar la validación de la candidata 0.1.0 instalada.** La copia preventiva, la instalación, la conservación por hash de los archivos administrados, el icono incrustado y el registro de inicio ya están verificados. Falta comprobar visualmente el icono en la barra de tareas, reiniciar Windows para confirmar el arranque automático y validar la migración 0037 y los recorridos Anime con los datos personales.

### Módulos pendientes

- [ ] **TODO-004 — Desarrollar Finanzas.** Empezar por brainstorming y continuar mediante spec, diseño y tareas aprobadas.
- [ ] **TODO-005 — Desarrollar Proyectos.** Empezar por brainstorming y continuar mediante spec, diseño y tareas aprobadas.

### Revisión de alcance

- [ ] **TODO-006 — Revisar si falta algún módulo.** Auditar las necesidades reales ya cubiertas por NubeOS antes de diseñar Finanzas, Proyectos u otra área funcional.
