# Tareas — Planificador de comidas, compra y productos

- Estado: Aprobada por Nube
- Última actualización: 2026-08-03

## Cómo usar este documento

Las tareas se realizan de una en una y requieren aprobación antes de implementar. Cada tarea debe mantener un alcance pequeño y verificable. Las posteriores no empiezan hasta que sus dependencias estén completadas y revisadas.

## T-001 — Decidir acceso a SQLite y migraciones

- Estado: Completada
- Dependencias: ninguna
- Alcance: evaluar las alternativas adecuadas para SQLite en Rust y elegir una biblioteca y estrategia de migraciones para NubeOS.
- Criterios de aceptación: decisión documentada, dependencias justificadas y confirmación de si requiere ADR adicional.
- Verificación: revisión de la decisión por Nube; no se modifica código de producción.

**Resultado:** se adopta `rusqlite` con la feature `bundled` para acceder a SQLite local y compilarla junto a NubeOS. Las migraciones usarán `rusqlite_migration` y archivos SQL versionados bajo `src-tauri/migrations/`, registrados desde Rust. No requiere ADR adicional porque concreta la ADR-001 sin cambiar los límites arquitectónicos aprobados.

**Decisión sobre el prototipo:** se conserva el cascarón Tauri, la navegación, iconos y estilos actuales. `src/MealPlanner.tsx` sigue siendo un prototipo de referencia y no se migrará internamente: sus datos de ejemplo, `localStorage` y cálculos React serán sustituidos gradualmente por verticales nuevos del módulo de comidas.

## T-002 — Crear el núcleo de dominio de productos y cantidades

- Estado: Completada
- Dependencias: T-001
- Alcance: crear los tipos Rust del módulo para producto, presentación de compra y cantidades en gramos o unidades; implementar normalización a gramos y validaciones esenciales.
- Criterios de aceptación: un producto permite convertir unidades solo si conoce gramos por unidad; los valores inválidos se rechazan.
- Verificación: pruebas unitarias Rust para conversiones y validaciones.

**Resultado:** se añade el módulo Rust `meals::product` con tipos para producto, categoría, estado, macros por 100 g, presentación de compra y cantidad de ingrediente. `Grams` y los constructores rechazan valores no válidos; las cantidades por unidades se normalizan solo cuando la presentación conoce gramos por unidad. Las pruebas cubren conversión desde un paquete, rechazo de unidades sin conversión y validación de valores.

## T-003 — Crear la primera migración y repositorio de productos

- Estado: Completada
- Dependencias: T-001, T-002
- Alcance: crear la migración SQLite de productos y presentación, y un repositorio Rust para crear, leer, editar, archivar y restaurar productos.
- Criterios de aceptación: productos activos y archivados persisten entre aperturas; tienda, marca y presentación opcionales se conservan.
- Verificación: pruebas de integración con SQLite temporal, incluida la migración.

**Resultado:** se añaden `rusqlite` con SQLite incluida en la compilación y `rusqlite_migration`, la migración `0001_create_meals_products.sql` y el repositorio `meals::repository`. El repositorio crea, consulta, lista, edita, archiva y restaura productos junto con su presentación en transacciones. Las pruebas verifican la migración, la persistencia tras reabrir un archivo SQLite y los cambios de estado.

## T-004 — Exponer productos mediante comandos Tauri

- Estado: Completada
- Dependencias: T-002, T-003
- Alcance: implementar DTOs y comandos pequeños para listar, crear, editar, archivar y restaurar productos.
- Criterios de aceptación: React puede solicitar las operaciones sin acceso directo a SQLite; los errores de validación son serializables y comprensibles.
- Verificación: pruebas de comandos o de sus adaptadores; nota breve en `docs/learning/tauri.md` sobre el primer comando.

**Resultado:** se añaden los comandos `list_products`, `create_product`, `update_product`, `archive_product` y `restore_product`, registrados en la aplicación Tauri. Los DTOs usan `camelCase`; Rust genera los identificadores UUID y valida la entrada antes de delegar en el repositorio. La conexión SQLite se abre y migra al arrancar en el directorio de datos de la aplicación, protegida por un `Mutex`. Las pruebas de adaptador cubren el ciclo de vida del producto y un error de validación serializable.

## T-005 — Crear la interfaz mínima de productos

- Estado: Completada
- Dependencias: T-004
- Alcance: implementar catálogo, filtros por categoría y formulario de producto con presentación condicional por tipo de compra.
- Criterios de aceptación: el usuario crea y edita productos por gramos, paquetes, venta a granel por peso o por unidad; el formulario solo muestra campos pertinentes.
- Verificación: comprobación manual y pruebas de interfaz para el formulario si aportan cobertura útil.

**Resultado:** se añade una vista React de catálogo de productos conectada exclusivamente a los comandos Tauri existentes. Permite filtrar por categoría, crear y editar productos, elegir presentación por gramos, paquete, a granel por peso o a granel por unidad, y archivar o restaurar productos. Los campos de presentación se muestran únicamente para el tipo elegido. La comprobación estática y la compilación de producción se completan con `pnpm build`; queda por realizar la comprobación manual visual en la aplicación Tauri.

## T-006 — Modelar comidas e ingredientes

- Estado: Pendiente
- Dependencias: T-002
- Alcance: crear el dominio Rust de comidas e ingredientes, con cantidades en gramos o unidades y cálculo de macros.
- Criterios de aceptación: una comida requiere al menos un ingrediente y suma correctamente los macros normalizados.
- Verificación: pruebas unitarias de macros, unidades y validación.

## T-007 — Persistir comidas y gestionar archivado

- Estado: Pendiente
- Dependencias: T-003, T-006
- Alcance: añadir migración y repositorio de comidas e ingredientes; implementar archivado, restauración y consulta de recetas afectadas por un producto.
- Criterios de aceptación: archivar no borra datos; retirar un producto modifica únicamente recetas base tras confirmar el impacto.
- Verificación: pruebas SQLite de operaciones atómicas y casos de archivado.

## T-008 — Exponer e interfaz de comidas

- Estado: Pendiente
- Dependencias: T-007
- Alcance: crear comandos Tauri y una interfaz React para listar, crear, editar, archivar y restaurar comidas.
- Criterios de aceptación: al añadir un ingrediente, gramos es la opción inicial y unidades solo está disponible con conversión válida.
- Verificación: pruebas de contratos y comprobación manual del flujo completo producto → comida.

## T-009 — Modelar y persistir instancias planificadas

- Estado: Pendiente
- Dependencias: T-006, T-007
- Alcance: crear el dominio, migración y repositorio de instancias semanales e ingredientes planificados; copiar la composición de una receta al planificarla.
- Criterios de aceptación: una instancia modificada no cambia la comida base; editar una receta posterior no reescribe la instancia.
- Verificación: pruebas de copia, modificación, orden de franja y fechas semanales.

## T-010 — Exponer planificación semanal y macros

- Estado: Pendiente
- Dependencias: T-009
- Alcance: crear comandos para consultar una semana, crear, editar, retirar y reordenar instancias, y obtener macros diarios/semanales.
- Criterios de aceptación: las semanas se identifican de lunes a domingo y los totales usan ingredientes planificados normalizados.
- Verificación: pruebas de dominio y contratos de comandos.

## T-011 — Crear interfaz del calendario semanal

- Estado: Pendiente
- Dependencias: T-010
- Alcance: implementar calendario, navegación entre semanas, cinco franjas, añadido de comidas e indicación de instancias modificadas.
- Criterios de aceptación: se abre la semana actual, se puede navegar y volver a ella; varias comidas pueden ordenarse en una franja.
- Verificación: comprobación manual y pruebas React de navegación y edición de instancia.

## T-012 — Calcular y persistir cobertura de compra semanal

- Estado: Pendiente
- Dependencias: T-009
- Alcance: implementar agregación de necesidades, compra por paquete o a granel, coste, sobrante teórico y ajustes semanales de disponibilidad o compra.
- Criterios de aceptación: se agrupan correctamente cantidades en gramos y unidades; la compra completa cubre el pendiente en una operación y la parcial conserva el resto.
- Verificación: pruebas unitarias de redondeo, coste, sobrantes y cobertura.

## T-013 — Exponer e interfaz de lista de compra

- Estado: Pendiente
- Dependencias: T-012
- Alcance: crear comandos y vista de lista de compra con cantidades, coste, sobrante, “ya tengo”, compra parcial y compra completa.
- Criterios de aceptación: la interfaz muestra los cálculos de Rust y no mantiene lógica de agregación propia.
- Verificación: pruebas de contratos y comprobación manual de los flujos de compra.

## T-014 — Revisión del primer flujo vertical

- Estado: Pendiente
- Dependencias: T-005, T-008, T-011, T-013
- Alcance: revisar calidad, casos límite, deuda técnica, aprendizaje Rust/Tauri y discrepancias entre spec, diseño e implementación.
- Criterios de aceptación: comprobaciones disponibles ejecutadas, problemas documentados y decisiones de siguiente incremento propuestas.
- Verificación: revisión de código y uso manual del flujo completo.
