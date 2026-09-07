# Spec — Inicio

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-04
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## Objetivo

Ofrecer una entrada útil a NubeOS que resuma lo que requiere atención hoy y permita abrir rápidamente el módulo responsable, sin convertirse en una segunda implementación de sus reglas.

## Funcionalidades

- Mostrar progreso de hábitos aplicables al día actual y permitir completar o desmarcar una actividad.
- Mostrar las comidas planificadas para hoy y su resumen de kilocalorías y proteínas.
- Mostrar productos y coste estimado pendientes en la compra de la semana actual.
- Reunir Anime, libros, videojuegos y Series que estén en curso.
- Mostrar documentos caducados o que caduquen durante los próximos treinta días.
- Resumir discretamente en la cabecera los hábitos activos, el contenido en curso, las recetas y los documentos guardados.
- Abrir el módulo correspondiente desde cada bloque.
- Permitir actualizar el resumen manualmente.
- Mantener visibles los bloques disponibles si una consulta independiente falla.

## Reglas

- La fecha diaria y la semana se calculan con la zona `Europe/Madrid`; la semana comienza el lunes.
- Inicio solo compone contratos de lectura públicos de otros módulos. No accede directamente a sus tablas ni redefine sus reglas.
- Completar un hábito utiliza el caso de uso público del módulo Hábitos.
- Omitidos no cuentan en el objetivo efectivo mostrado en Inicio.
- Los documentos caducados y próximos a caducar no se duplican.
- Los datos del Dashboard no constituyen una fuente de verdad adicional.

## Fuera de alcance

- Configuración manual de widgets.
- Finanzas y Proyectos antes de implementar esos módulos.
- Gráficas históricas o estadísticas avanzadas.
- Notificaciones del sistema.
- Caché persistente propia del Dashboard.

## Criterios de aceptación

- [x] NubeOS abre en Inicio.
- [x] Cada bloque usa datos reales persistidos por su módulo.
- [x] Las acciones de navegación abren el módulo adecuado.
- [x] Un hábito puede completarse y desmarcarse desde Inicio.
- [x] Un fallo parcial no oculta el resto del Dashboard.
- [x] La cabecera aprovecha el espacio disponible con fecha, saludo y métricas reales de actividad.
- [ ] La composición, jerarquía y densidad se revisan visualmente con datos reales.
