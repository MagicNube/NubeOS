# ADR-003: Organización por módulos verticales

- Estado: Aprobada por Nube
- Fecha: 2026-08-02
- Decisores: Nube

## Contexto

NubeOS crecerá mediante módulos funcionales: comidas, hábitos, finanzas, documentos, proyectos, lectura y series. La arquitectura aprobada exige que cada módulo sea dueño de sus casos de uso y datos internos, y que no se modifique otro módulo sin una tarea explícita.

Necesitamos una organización de código que haga visibles esos límites tanto en React como en Rust. La estructura debe ayudar a navegar el proyecto y a mantener cambios pequeños, sin crear crates, capas o carpetas vacías antes de necesitarlas.

## Alternativas

1. **Organización horizontal por tipo técnico.**
   - Ejemplo: todos los componentes juntos, todos los hooks juntos, todos los modelos juntos y todos los repositorios juntos.
   - Ventajas: familiar para proyectos pequeños y sencilla al principio.
   - Inconvenientes: el código de un módulo queda repartido; es más fácil introducir dependencias cruzadas y difícil revisar un cambio vertical.

2. **Organización vertical por módulo, con una zona compartida mínima.**
   - Ejemplo conceptual: cada módulo agrupa su interfaz React y su dominio Rust; las piezas verdaderamente genéricas viven en una zona compartida explícita.
   - Ventajas: refleja el lenguaje del producto, limita dependencias y facilita desarrollar y revisar un módulo completo.
   - Inconvenientes: hay que decidir con cuidado cuándo una pieza es realmente compartida para no crear duplicación ni un contenedor genérico sin dueño.

3. **Un crate Rust y paquete TypeScript por módulo desde el inicio.**
   - Ventajas: aislamiento fuerte y fronteras impuestas por las herramientas.
   - Inconvenientes: añade configuración, tiempos de compilación y complejidad de espacios de trabajo antes de que el tamaño del proyecto lo justifique.

## Decisión propuesta

Adoptar una **organización vertical por módulo** en React y Rust, manteniendo un único proyecto Rust y un único proyecto React mientras el tamaño del código lo permita.

Cada módulo tendrá un espacio identificable para su interfaz, contratos de interfaz, casos de uso y datos de dominio. Las piezas compartidas solo se extraerán cuando sean genéricas, estables y tengan más de un consumidor real. La organización exacta de subcarpetas podrá evolucionar mediante tareas pequeñas; el límite de módulo no.

Los adaptadores Tauri y la infraestructura de SQLite estarán fuera del dominio de cada módulo, pero se mantendrán próximos y trazables al módulo al que sirven. Una migración o un comando deberá indicar claramente qué módulo posee el cambio.

## Consecuencias

### Positivas

- El código de un caso de uso se encuentra cerca de su módulo de producto.
- Las revisiones y las tareas pueden acotarse a un área concreta.
- Las dependencias cruzadas se vuelven más visibles y requieren un contrato explícito.
- No se introduce la complejidad de múltiples paquetes o crates prematuramente.

### Negativas y compromisos

- Habrá decisiones puntuales sobre qué código pertenece a un módulo y qué puede ser compartido.
- Puede existir duplicación pequeña al principio; se extraerá solo cuando haya evidencia de una abstracción común.
- La estructura inicial debe revisarse cuando el número de módulos o la complejidad de compilación justifiquen una separación física mayor.

## Seguimiento

- Aprobar o rechazar esta ADR antes de reorganizar el prototipo existente.
- Definir la primera estructura concreta al diseñar el módulo de comidas.
- Proponer una ADR de sustitución si un espacio de trabajo con múltiples crates o paquetes se vuelve necesario.
