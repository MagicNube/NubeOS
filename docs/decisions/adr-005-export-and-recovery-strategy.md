# ADR-005: Aplazar copias de seguridad y sincronización

- Estado: Aprobada por Nube
- Fecha: 2026-08-02
- Decisores: Nube

## Contexto

NubeOS guardará inicialmente los datos personales en una base de datos SQLite local. Existen dos necesidades distintas que podrían abordarse más adelante:

1. **Recuperación:** conservar o trasladar una copia de los datos tras un borrado, corrupción o cambio de equipo.
2. **Sincronización:** mantener los datos actualizados entre varios equipos.

El uso previsto en la primera etapa es en un único PC y el propietario considera asumible el riesgo de no disponer todavía de una copia creada por la aplicación. Antes de que existan módulos de uso real, añadir copias, importación o sincronización incrementaría el alcance y obligaría a estabilizar contratos de datos prematuramente.

## Alternativas

1. **No implementar copias ni sincronización en la primera etapa.**
   - Ventajas: mantiene el trabajo centrado en los módulos y sus modelos de dominio; no introduce infraestructura ni flujos de restauración prematuros.
   - Inconvenientes: un borrado, corrupción o pérdida del equipo puede implicar pérdida de datos; trasladar datos a otro PC no estará soportado por NubeOS.

2. **Copias locales automáticas de SQLite.**
   - Ventajas: protege de algunos fallos lógicos, como una corrupción o borrado accidental.
   - Inconvenientes: añade comportamiento, almacenamiento y restauración; una copia en el mismo disco no protege ante pérdida o fallo del PC.

3. **Exportación e importación manual desde el inicio.**
   - Ventajas: permite trasladar datos a otro equipo sin servidor.
   - Inconvenientes: exige definir formatos, versiones e importación antes de que los modelos de los módulos estén estabilizados.

4. **Sincronización con un servidor central desde el inicio.**
   - Ventajas: permitiría usar NubeOS en varios equipos con datos actualizados.
   - Inconvenientes: requiere infraestructura, autenticación, seguridad, resolución de conflictos, disponibilidad y costes; no responde a una necesidad actual prioritaria.

## Decisión propuesta

Durante la primera etapa, NubeOS usará SQLite local como única fuente de verdad y **no implementará copias de seguridad automáticas, exportación/importación ni sincronización entre dispositivos**.

Los datos permanecerán únicamente en el equipo local. Esta es una limitación conocida y aceptada para el MVP, no una garantía de recuperación. La aplicación no enviará datos a ningún servicio remoto.

La decisión se revisará cuando el módulo de comidas sea usable con datos reales o cuando aparezca una necesidad concreta de cambio de equipo. En ese momento se evaluará primero una solución de exportación e importación manual; una sincronización con servidor seguirá siendo una iniciativa independiente y de baja prioridad.

## Consecuencias

### Positivas

- El MVP se centra en aprender y construir los módulos principales.
- No se añaden dependencias, infraestructura remota ni una interfaz de recuperación anticipada.
- Se preserva el enfoque local-first y de privacidad por defecto.

### Negativas y compromisos

- No habrá una forma soportada por NubeOS de recuperar datos tras un fallo o pérdida del PC.
- No se podrá trasladar el estado de NubeOS a otro PC mediante la aplicación.
- El propietario asume temporalmente el riesgo de pérdida de datos y deberá decidir más adelante cuándo deja de ser aceptable.
- Los requisitos de exportación, copias, restauración y sincronización quedan fuera del alcance de las tareas actuales.

## Seguimiento

- Aprobar o rechazar esta ADR antes de implementar cualquier mecanismo de recuperación o sincronización.
- Revisar esta decisión cuando el planificador de comidas se use con datos reales.
- Proponer una ADR específica antes de implementar exportación/importación, copias de seguridad o sincronización.
