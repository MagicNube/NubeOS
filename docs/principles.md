# Principios de NubeOS

- Estado: Aprobada por Nube
- Última actualización: 2026-08-14

Estos principios guían las decisiones cotidianas del proyecto. Una excepción debe ser explícita, acotada y justificada; si afecta a la arquitectura, requiere una ADR.

## Diseño antes de código

- Ninguna funcionalidad se implementa sin una spec, un diseño y una tarea aprobados.
- La spec describe comportamiento y límites; el diseño describe responsabilidades y flujos; las tareas describen cambios pequeños y verificables.
- No se introduce una solución técnica para resolver un requisito que aún no está claro.
- Las decisiones con impacto transversal, alternativas razonables o coste de cambio alto se registran como ADR antes de implementarse.

## Alcance y modularidad

- Cada tarea tiene un alcance explícito, criterios de aceptación y una forma de verificación.
- Un cambio debe ser pequeño, cohesivo y fácil de revisar; el número de líneas es una señal, no un límite rígido.
- Un módulo no modifica otro módulo salvo que la tarea lo indique expresamente.
- Se prefiere completar un flujo vertical útil antes de abrir varios módulos a medias.
- No se añaden funcionalidades, abstracciones o dependencias por anticipación.

## Límites de arquitectura

- El dominio Rust contiene reglas de negocio, invariantes, cálculos y persistencia.
- React presenta el estado del producto y gestiona únicamente estado efímero de interfaz: navegación, filtros, modales o borradores aún no confirmados.
- Los comandos Tauri son adaptadores pequeños: validan la entrada de frontera, delegan en el dominio y devuelven resultados o errores comprensibles.
- La interfaz no accede directamente a la base de datos ni reproduce reglas de negocio.
- El dominio no depende de React ni de detalles de presentación.

## Privacidad y datos

- La privacidad es un requisito de producto, no una mejora posterior.
- Los datos personales no se envían fuera del dispositivo sin una decisión explícita y visible para el usuario.
- Los datos deben poder exportarse y recuperarse sin depender de la interfaz concreta.
- Los secretos, datos locales y artefactos de compilación nunca se incluyen en el repositorio público.

## Código y dependencias

- Se prefiere código sencillo, explícito e idiomático frente a patrones innecesarios.
- Los nombres expresan intención y los tipos representan el dominio cuando aportan claridad.
- Se evita `unsafe` en Rust; cualquier excepción se documenta y justifica.
- Antes de añadir una dependencia se evalúan su necesidad, mantenimiento, tamaño, superficie de seguridad y alternativa estándar.
- No se hacen refactors amplios fuera del objetivo de una tarea aprobada.

## Coherencia de interfaz

- Los patrones transversales ya consolidados se reutilizan desde `src/ui/`; un módulo no crea otra variante de modal, selector o aviso temporal sin una necesidad documentada.
- Los modales bloquean y atenúan el contenido de fondo, contienen el foco, permiten cierre coherente y restauran el foco al elemento que los abrió.
- Los selectores nativos comparten chevrón, margen derecho, tema oscuro y estado de foco. Los desplegables personalizados conservan la misma geometría visual.
- La zona compartida contiene únicamente presentación y accesibilidad. Los textos, borradores, validaciones y decisiones de negocio siguen perteneciendo al módulo correspondiente.

## Calidad y verificación

- Una tarea no se considera terminada solo porque la interfaz parezca funcionar.
- Las reglas de dominio se verifican con pruebas donde aporten confianza; los flujos de interfaz se verifican en proporción a su riesgo.
- Antes de cerrar una tarea se ejecutan las comprobaciones disponibles y se informa de cualquier verificación que no haya sido posible ejecutar.
- La revisión busca duplicación, complejidad innecesaria, errores potenciales, problemas de rendimiento, nombres poco claros y desviaciones de arquitectura.

## Aprendizaje deliberado

- Rust y Tauri se introducen de forma gradual: qué son, por qué se usan y qué responsabilidad tienen.
- Al incorporar una técnica nueva, se añade una nota breve a `docs/learning/rust.md` o `docs/learning/tauri.md`.
- La explicación debe ser suficiente para que el propietario pueda revisar y modificar el cambio con autonomía creciente.
