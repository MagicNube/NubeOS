# Tareas — Planificador de comidas, compra y productos

- Estado: Refinamiento de comidas implementado; comprobación visual pendiente
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

- Estado: Completada
- Dependencias: T-002
- Alcance: crear el dominio Rust de comidas e ingredientes, con cantidades en gramos o unidades y cálculo de macros.
- Criterios de aceptación: una comida requiere al menos un ingrediente y suma correctamente los macros normalizados.
- Verificación: pruebas unitarias de macros, unidades y validación.

**Resultado:** se añaden `Meal`, `MealIngredient`, `MealId` y `MacroTotals` al dominio Rust. Una comida no puede estar vacía y sus macros normalizan primero gramos o unidades con el producto correspondiente. Las pruebas cubren rechazo de recetas vacías y macros por unidades.

## T-007 — Persistir comidas y gestionar archivado

- Estado: Completada
- Dependencias: T-003, T-006
- Alcance: añadir migración y repositorio de comidas e ingredientes; implementar archivado, restauración y consulta de recetas afectadas por un producto.
- Criterios de aceptación: archivar no borra datos; retirar un producto modifica únicamente recetas base tras confirmar el impacto.
- Verificación: pruebas SQLite de operaciones atómicas y casos de archivado.

**Resultado:** la migración `0002` incorpora recetas, ingredientes, instancias planificadas y cobertura semanal. Los repositorios persisten recetas con transacciones, archivan sin borrar sus ingredientes, consultan las recetas afectadas y rechazan retirar un producto si una receta quedaría vacía.

## T-008 — Exponer e interfaz de comidas

- Estado: Completada
- Dependencias: T-007
- Alcance: crear comandos Tauri y una interfaz React para listar, crear, editar, archivar y restaurar comidas.
- Criterios de aceptación: al añadir un ingrediente, gramos es la opción inicial y unidades solo está disponible con conversión válida.
- Verificación: pruebas de contratos y comprobación manual del flujo completo producto → comida.

**Resultado:** se exponen comandos para crear, listar, editar, archivar, restaurar y consultar afectadas. La pestaña de comidas permite crear recetas desde productos activos; gramos es la unidad inicial y la opción de unidades depende del peso unitario del producto. El catálogo permite revisar las recetas afectadas y confirmar la retirada.

## T-009 — Modelar y persistir instancias planificadas

- Estado: Completada
- Dependencias: T-006, T-007
- Alcance: crear el dominio, migración y repositorio de instancias semanales e ingredientes planificados; copiar la composición de una receta al planificarla.
- Criterios de aceptación: una instancia modificada no cambia la comida base; editar una receta posterior no reescribe la instancia.
- Verificación: pruebas de copia, modificación, orden de franja y fechas semanales.

**Resultado:** `WeekStart` valida lunes en formato ISO, `PlannedInstance` copia ingredientes de una receta y la persistencia guarda franja, posición y origen. Editar ingredientes marca la instancia como modificada sin alterar la receta base; una prueba verifica esta independencia.

## T-010 — Exponer planificación semanal y macros

- Estado: Completada
- Dependencias: T-009
- Alcance: crear comandos para consultar una semana, crear, editar, retirar y reordenar instancias, y obtener macros diarios/semanales.
- Criterios de aceptación: las semanas se identifican de lunes a domingo y los totales usan ingredientes planificados normalizados.
- Verificación: pruebas de dominio y contratos de comandos.

**Resultado:** los comandos consultan la semana, crean instancias desde una receta, editan ingredientes, retiran, reordenan y devuelven macros diarios y semanales calculados por Rust.

## T-011 — Crear interfaz del calendario semanal

- Estado: Completada
- Dependencias: T-010
- Alcance: implementar calendario, navegación entre semanas, cinco franjas, añadido de comidas e indicación de instancias modificadas.
- Criterios de aceptación: se abre la semana actual, se puede navegar y volver a ella; varias comidas pueden ordenarse en una franja.
- Verificación: comprobación manual y pruebas React de navegación y edición de instancia.

**Resultado:** el calendario real abre la semana actual, navega en ambos sentidos y vuelve a hoy. Tiene cinco franjas, permite varias comidas por celda, añadir desde recetas, editar la copia, retirar, reordenar y distinguir una instancia modificada. Requiere comprobación visual manual en la ventana Tauri.

## T-012 — Calcular y persistir cobertura de compra semanal

- Estado: Completada
- Dependencias: T-009
- Alcance: implementar agregación de necesidades, compra por paquete o a granel, coste, sobrante teórico y ajustes semanales de disponibilidad o compra.
- Criterios de aceptación: se agrupan correctamente cantidades en gramos y unidades; la compra completa cubre el pendiente en una operación y la parcial conserva el resto.
- Verificación: pruebas unitarias de redondeo, coste, sobrantes y cobertura.

**Resultado:** Rust agrupa ingredientes planificados por producto, normaliza unidades y calcula pendiente, recomendación, coste y sobrante. Paquetes y unidades se redondean hacia arriba; la cobertura semanal conserva cantidad disponible y compras parciales sin crear inventario global.

## T-013 — Exponer e interfaz de lista de compra

- Estado: Completada
- Dependencias: T-012
- Alcance: crear comandos y vista de lista de compra con cantidades, coste, sobrante, “ya tengo”, compra parcial y compra completa.
- Criterios de aceptación: la interfaz muestra los cálculos de Rust y no mantiene lógica de agregación propia.
- Verificación: pruebas de contratos y comprobación manual de los flujos de compra.

**Resultado:** la pestaña de compra presenta la proyección calculada por Rust y permite indicar “ya tengo”, registrar una compra parcial o completar el pendiente de una vez. Los controles admiten unidades cuando el producto tiene conversión válida. Requiere comprobación visual manual en la ventana Tauri.

## T-014 — Revisión del primer flujo vertical

- Estado: Completada
- Dependencias: T-005, T-008, T-011, T-013
- Alcance: revisar calidad, casos límite, deuda técnica, aprendizaje Rust/Tauri y discrepancias entre spec, diseño e implementación.
- Criterios de aceptación: comprobaciones disponibles ejecutadas, problemas documentados y decisiones de siguiente incremento propuestas.
- Verificación: revisión de código y uso manual del flujo completo.

**Resultado de revisión:** las reglas de negocio, agregaciones y persistencia permanecen en Rust; React mantiene estado visual y usa comandos Tauri mediante DTOs. `cargo test` cubre dominio, migración, repositorios, copia de instancias, cobertura y cálculos (19 pruebas); `pnpm build` valida TypeScript y la compilación de producción. Pendiente: recorrer manualmente en la ventana Tauri el flujo producto → comida → calendario → compra y revisar el comportamiento visual en tamaños pequeños.

## Segundo incremento — Refinamiento de uso diario

Estas tareas aplican la spec y el diseño aprobados el 2026-08-03. Nube aprobó excepcionalmente ejecutar este segundo incremento completo en un único lote; el flujo habitual posterior vuelve a ser una tarea cada vez.

## T-015 — Adaptar el modelo y contratos de productos

- Estado: Completada
- Dependencias: T-004
- Alcance: adaptar dominio, migración SQLite, repositorio y DTOs para supermercado controlado, precios de entrada en euros, eliminación de marca y etiqueta de paquete del contrato, y compatibilidad de datos existentes `bulk_by_unit`.
- Criterios de aceptación: se crean y editan productos nuevos solo como paquete, a granel por peso o sin presentación; el precio acepta coma o punto y se persiste con precisión; los productos y presentaciones antiguos no se pierden.
- Verificación: pruebas Rust de conversión de euros, validación de supermercado, migración de datos existentes y lectura del formato heredado.

## T-016 — Refinar navegación y catálogo de productos

- Estado: Completada
- Dependencias: T-015
- Alcance: ordenar las pestañas del módulo como Planificador, Compra, Productos y Comidas; conservar filtros y búsquedas durante la sesión; crear catálogo de productos con buscador, filtro visible oscuro, formulario simplificado y menú de acciones secundarias.
- Criterios de aceptación: Productos abre directamente el catálogo activo; Archivo no aparece como pestaña principal; el filtro muestra el valor activo y no se pierde al visitar otra pestaña; lápiz y menú `…` separan edición y acciones infrecuentes.
- Verificación: comprobación manual de navegación, filtros, búsqueda, formulario de precio y menú de acciones.

## T-017 — Persistir momentos recomendados y consultas de comidas

- Estado: Completada
- Dependencias: T-007
- Alcance: añadir migración, dominio, repositorio y comandos para cero o más momentos recomendados por comida, búsqueda textual de comidas y filtro por producto contenido.
- Criterios de aceptación: los momentos se conservan al crear y editar; una búsqueda y un filtro por producto devuelven solo comidas activas coincidentes; ningún momento restringe la planificación posterior.
- Verificación: pruebas SQLite y de comandos para persistencia, filtrado y ausencia de restricciones de franja.

## T-018 — Refinar catálogo, búsqueda y archivo de comidas

- Estado: Completada
- Dependencias: T-017
- Alcance: implementar buscador de comidas, filtro por producto, acceso secundario al archivo y tarjetas con ingredientes y tabla de macros legible.
- Criterios de aceptación: se puede localizar una receta por nombre o ingrediente; Archivo no compite con el listado activo; las tarjetas presentan ingredientes y macros con legibilidad consistente con Productos.
- Verificación: comprobación manual de búsquedas, filtro combinado, archivo y tamaños de texto.

## T-019 — Refinar el formulario de comidas e ingredientes

- Estado: Completada
- Dependencias: T-017
- Alcance: añadir selector múltiple de momentos recomendados y un selector de producto inicialmente vacío y buscable; simplificar la unidad de ingrediente según haya o no gramos por unidad.
- Criterios de aceptación: una nueva fila de ingrediente no selecciona automáticamente un producto; solo muestra selector de unidad cuando procede; se pueden seleccionar varios momentos o ninguno.
- Verificación: comprobación manual de producto sin conversión, paquete con unidades y selección múltiple de momentos.

## T-020 — Implementar movimiento planificado en Rust

- Estado: Completada
- Dependencias: T-009, T-010
- Alcance: crear el caso de uso, repositorio y comando `move_planned_instance` para cambiar día, franja y posición de una instancia, reordenando ambos destinos en una transacción.
- Criterios de aceptación: mover dentro de una franja o a otra conserva ingredientes, origen de receta y marca de modificación; no quedan posiciones duplicadas ni huecos lógicos.
- Verificación: pruebas Rust de movimiento hacia delante, hacia atrás, entre franjas y entre días.

## T-021 — Refinar el calendario semanal

- Estado: Completada
- Dependencias: T-017, T-020
- Alcance: sustituir flechas por arrastrar y soltar, añadir buscador y orden por momento recomendado al selector de comidas, mostrar macros diarios y destacar el día actual en `Europe/Madrid`.
- Criterios de aceptación: se puede arrastrar una instancia a cualquier posición y franja válida; el selector prioriza coincidencias de momento; cada día muestra sus propios totales y la semana no muestra un resumen global de macros.
- Verificación: comprobación manual de arrastre, búsqueda, prioridad, navegación semanal y cambio visual de día actual.

## T-022 — Simplificar disponibilidad y cálculo de compra

- Estado: Completada
- Dependencias: T-012
- Alcance: sustituir cobertura de compras parciales y completas por una única disponibilidad semanal en gramos; migrar sin pérdida el progreso existente y adaptar los comandos y cálculos Rust.
- Criterios de aceptación: el valor previo disponible y comprado se conserva como disponibilidad total; editar «Tienes» recalcula pendiente, recomendación, coste y sobrante; no se exponen operaciones de compra parcial o completa.
- Verificación: pruebas de migración, disponibilidad cero, paquetes redondeados, a granel por peso y recalculo tras editar el plan.

## T-023 — Refinar la lista de compra

- Estado: Completada
- Dependencias: T-016, T-022
- Alcance: rediseñar la lista de compra con categorías en español, recomendación destacada, campo «Tienes» y eliminación de controles e iconos que no aportan al flujo.
- Criterios de aceptación: cada entrada deja clara necesidad, disponible, pendiente y recomendación; editar «Tienes» actualiza la proyección; no aparecen términos de categoría en inglés ni acciones de compra parcial/completa.
- Verificación: comprobación manual de producto por paquete, a granel y sin presentación.

## T-024 — Revisar el segundo incremento de comidas

- Estado: Completada con comprobación visual manual pendiente
- Dependencias: T-016, T-018, T-019, T-021, T-023
- Alcance: revisar coherencia entre documentación, migraciones, contratos, interfaz, accesibilidad básica y flujos de uso diario.
- Criterios de aceptación: verificaciones disponibles ejecutadas, deuda o discrepancias documentadas y aprendizaje Rust/Tauri actualizado cuando corresponda.
- Verificación: revisión de código, `cargo test`, `pnpm build` y recorrido manual producto → comida → planificador → compra.

## Resultado del segundo incremento

- T-015 y T-022: la migración `0003` conserva la cobertura previa como un único valor de disponibilidad semanal; los precios se reciben como euros con coma o punto y se persisten como céntimos. Las presentaciones heredadas a granel por unidad se pueden leer, pero no crear ni volver a guardar.
- T-016 a T-019: los catálogos activos abren directamente, Archivo es una acción secundaria, se conservan los filtros durante la sesión y se añaden búsquedas, filtro de comidas por producto y momentos recomendados.
- T-020 y T-021: Rust mueve y reindexa instancias de forma transaccional; React usa arrastrar y soltar, muestra macros diarios y resalta el día actual con la zona `Europe/Madrid`.
- T-023: Compra usa solo «Tienes» en gramos y muestra las categorías en español. Ya no ofrece compras parciales ni completar compra.
- T-024: `cargo test` ejecuta 21 pruebas y `pnpm build` compila correctamente. Falta comprobar visualmente el flujo en la ventana Tauri antes de dar la revisión de interfaz por cerrada.

## T-025 — Afinar controles, tarjetas y filtros del catálogo

- Estado: Completada
- Dependencias: T-018, T-019
- Alcance: estandarizar selectores y anotaciones, exigir una presentación vigente al guardar productos, normalizar tarjetas y añadir filtros visibles de comidas por producto y momento recomendado.
- Criterios de aceptación: no se crean productos sin presentación; los selectores comparten indicador y espaciado; las tarjetas de producto y comida mantienen una composición estable; se pueden combinar los filtros de comidas.
- Verificación: `pnpm build` y comprobación manual de formularios, filtros y tarjetas.

## T-026 — Corregir interacción y resúmenes del planificador

- Estado: Completada
- Dependencias: T-021
- Alcance: reforzar arrastrar y soltar con `dataTransfer`, reubicar los macros diarios bajo la fecha y mostrar macros en cada instancia.
- Criterios de aceptación: una instancia se puede soltar en otra posición, día o franja; los totales diarios no ocupan Extra; las tarjetas muestran kcal y macros compactos.
- Verificación: `pnpm build`, pruebas Rust existentes y recorrido manual de arrastre.

## T-027 — Hacer reactiva y comprobable la compra semanal

- Estado: Completada
- Dependencias: T-022, T-023
- Alcance: guardar disponibilidad reactiva en gramos o unidades válidas, persistir la casilla semanal de cada línea, mantener la unidad de recomendación y calcular costes totales y pendientes en Rust.
- Criterios de aceptación: la recomendación de un paquete usa paquetes incluso a cero; escribir y marcar una línea actualiza la proyección; el coste pendiente excluye líneas comprobadas sin modificar disponibilidad.
- Verificación: pruebas Rust de cálculo, migración y comandos; `pnpm build` y comprobación manual.

## Resultado del tercer incremento

- T-025: los productos nuevos y actualizados requieren paquete, bolsa o bandeja, o a granel por peso. Los formatos ausentes o a granel por unidad se conservan exclusivamente como datos heredados.
- T-026: el planificador envía el identificador arrastrado mediante `dataTransfer`, mueve los totales diarios a la cabecera y añade macros compactos a las tarjetas.
- T-027: la cobertura semanal añade un estado de comprobación por línea. Rust calcula el coste total y pendiente; React guarda «Tienes» tras una espera corta por pulsación y permite unidades cuando hay conversión.

## T-028 — Refinar archivo, calendario y catálogos

- Estado: Completada
- Dependencias: T-018, T-021, T-025, T-026
- Alcance: permitir borrado definitivo protegido desde Archivo; reparar el arrastre en cualquier dirección y posición; simplificar los resúmenes del calendario; mejorar filtros, términos, precisión numérica y jerarquía tipográfica del módulo.
- Criterios de aceptación: solo se elimina definitivamente un elemento archivado sin referencias; una instancia se puede soltar antes o después de otra tarjeta, en otra franja o día; el calendario no duplica kcal ni muestra controles inactivos; los catálogos permiten localizar productos y momentos con claridad.
- Verificación: pruebas Rust de las guardas de borrado y movimiento; `cargo test`, `pnpm build` y comprobación manual de archivo, arrastre y filtros.

## Resultado del cuarto incremento

- T-028: Archivo incorpora borrado definitivo con confirmación y validación de referencias. El calendario usa tarjetas con tabla de macros y puntos de inserción arriba o abajo; los filtros y etiquetas se normalizan alrededor de «momento del día» y «Lácteos».

## T-029 — Refinar el catálogo y detalle de comidas

- Estado: Completada
- Dependencias: T-018, T-025
- Alcance: hacer escalable el filtro de comidas por producto, unificar visualmente los controles del catálogo y sustituir la expansión de tarjetas por un detalle de receta.
- Criterios de aceptación: un filtro vacío no limita recetas y no ofrece sugerencias hasta tres caracteres; las tarjetas muestran como máximo tres ingredientes sin cambiar de altura; al pulsar una tarjeta o «Ver detalle» se abre un modal con todos los ingredientes, sus cantidades, sus macros y el total de la comida.
- Verificación: prueba de contrato del DTO de macros por ingrediente, `cargo test`, `pnpm build` y comprobación manual de filtros, detalle y acciones de tarjeta.

**Resultado:** el filtro de producto no muestra un listado completo: vacío equivale a no filtrar y, desde tres caracteres, ofrece como máximo ocho coincidencias. Las tarjetas de comidas tienen altura fija y solo muestran tres ingredientes; el detalle accesible desde la tarjeta presenta el resto junto con una tabla de macros por ingrediente y el total. El DTO recibe esos macros calculados por Rust, sin duplicar la regla en React.

## T-030 — Completar la interacción de búsquedas de comidas

- Estado: Completada
- Dependencias: T-019, T-029
- Alcance: cerrar los desplegables de producto al abandonar el control, reutilizar la búsqueda incremental en el selector de ingrediente de Comidas y ajustar la lectura de cantidades en el detalle.
- Criterios de aceptación: el mensaje de ayuda desaparece al perder el foco; un ingrediente no propone productos antes de tres caracteres; el detalle muestra cada cantidad junto al nombre entre paréntesis.
- Verificación: `pnpm build` y comprobación manual de foco, selección y detalle.

**Resultado:** los dos desplegables de producto se cierran cuando el foco abandona su contenedor y conservan la selección al pasar a una opción interna. El formulario de Comidas usa un selector incremental con el mismo límite de tres caracteres y ocho resultados. El detalle de receta presenta «Producto (250g)» o «Producto (3 uds)» antes de la tabla de macros.

## T-031 — Simplificar acciones de tarjetas activas

- Estado: Completada
- Dependencias: T-018
- Alcance: sustituir el menú de desbordamiento de una sola acción en comidas activas por un botón de archivado directo.
- Criterios de aceptación: una tarjeta activa muestra lápiz y archivo; una tarjeta archivada conserva el menú de restauración y borrado definitivo.
- Verificación: `pnpm build` y comprobación manual del catálogo y Archivo.

**Resultado:** las comidas activas muestran un icono de archivo junto al lápiz y archivan directamente al pulsarlo. El menú «…» solo queda en Archivo, donde reúne las dos acciones que siguen teniendo sentido: restaurar y eliminar definitivamente.

## T-032 — Alinear los controles del catálogo de productos

- Estado: Completada
- Dependencias: T-016, T-025
- Alcance: situar el filtro de categorías junto al buscador de Productos, siguiendo la composición ya usada en Comidas.
- Criterios de aceptación: buscador y filtro comparten la barra izquierda; Archivo y Añadir producto permanecen como acciones de la derecha; el filtro conserva su estado y opciones.
- Verificación: `pnpm build` y comprobación manual en pantalla ancha y estrecha.

**Resultado:** el buscador y el filtro de categorías de Productos forman un grupo de controles en la barra superior, alineado con el patrón de Comidas. El filtro no cambia su estado ni su menú; en pantallas pequeñas el grupo se adapta sin mezclarlo con Archivo o Añadir producto.

## T-033 — Añadir necesidades manuales a la compra semanal

- Estado: Completada
- Dependencias: T-012, T-027
- Alcance: persistir una necesidad manual por semana y producto, sumarla a la proyección calculada y ofrecer desde Compra un diálogo de búsqueda de producto activo con cantidad en gramos o unidades válidas.
- Criterios de aceptación: una aportación manual se agrega a la línea ya calculada para el producto, queda marcada como ajena al plan de comidas y se puede retirar sin cambiar recetas, instancias ni la necesidad planificada. La recomendación, el coste y el progreso semanal se recalculan con la suma.
- Verificación: pruebas Rust de acumulación, aislamiento por semana y proyección; `cargo test`, `pnpm build` y comprobación manual de añadir, retirar y editar «Tienes».

**Resultado:** la migración `0005` añade una necesidad manual por producto y semana. Los comandos Rust validan productos activos y cantidades en gramos o unidades, normalizan a gramos y agregan la cantidad a la entrada calculada. Compra ofrece un diálogo de búsqueda incremental, una recomendación y precio destacados bajo cada producto y una marca visible para toda entrada con aportación manual; retirarla deja intactos recetas, planificación y la parte planificada de la necesidad.

## T-034 — Afinar tipografía y detalle de los catálogos

- Estado: Completada
- Dependencias: T-029, T-032
- Alcance: igualar la tipografía visible de los controles de Productos a Comidas, mejorar la lectura de la información secundaria de tarjetas de comidas y simplificar el acceso al detalle.
- Criterios de aceptación: buscador y filtro de categoría de Productos usan el tamaño de fuente de los controles de Comidas; la cantidad de ingredientes y el momento del día se leen cómodamente; no aparece un botón redundante de «Ver detalle» y el clic en la tarjeta conserva el acceso al detalle.
- Verificación: `pnpm build` y comprobación manual de ambas vistas de catálogo.

**Resultado:** Productos adopta la escala tipográfica de controles de Comidas. Las tarjetas de comida aumentan la información secundaria y mantienen el detalle al hacer clic, sin una acción duplicada dentro de la tarjeta.

## T-035 — Pulir búsqueda incremental y cantidad manual de compra

- Estado: Completada
- Dependencias: T-030, T-033
- Alcance: retirar mensajes transitorios que ocultan el contenido bajo los buscadores incrementales y ajustar el control de cantidad del diálogo de compra manual.
- Criterios de aceptación: los selectores no muestran «Escribe al menos 3 caracteres»; la unidad fija de gramos es una caja legible; ningún campo numérico del módulo muestra flechas nativas de incremento o decremento.
- Verificación: `pnpm build` y comprobación manual de buscadores, cantidad manual y formularios numéricos.

**Resultado:** los buscadores permanecen silenciosos hasta que hay al menos tres caracteres y conservan el mensaje de ausencia de coincidencias. La compra manual muestra una unidad fija estable y todos los campos numéricos de Comidas y compras omiten los controles nativos.

## T-036 — Simplificar información y detalle del calendario

- Estado: Completada
- Dependencias: T-021, T-026
- Alcance: centrar la navegación semanal, mover los macros diarios a una fila final y convertir las tarjetas planificadas en elementos de título arrastrables con detalle accesible al pulsar.
- Criterios de aceptación: la cabecera no contiene macros; cada día tiene un único resumen inferior; una tarjeta se puede mover entre posiciones, franjas y días y, al pulsarla, muestra ingredientes, macros por ingrediente y total sin entrar directamente en edición.
- Verificación: `pnpm build`, pruebas Rust de movimiento existentes y comprobación manual de navegación, detalle, retirada, edición y arrastre.

**Resultado:** la navegación semanal centra su intervalo entre las flechas. La cabecera diaria queda reducida a día y fecha; las tarjetas muestran solo el título y conservan su comportamiento de arrastre. Una fila final presenta los macros de cada día y el clic abre un detalle de instancia con ingredientes, macros individuales, total y acciones explícitas para editar o retirar del plan.

## T-037 — Implementar arrastre fiable en el calendario

- Estado: Completada
- Dependencias: T-020, T-021, T-036
- Alcance: sustituir el arrastre HTML nativo, no fiable en el WebView de Tauri, por una interacción basada en eventos de puntero y centrar las etiquetas de las franjas horarias.
- Criterios de aceptación: arrastrar una tarjeta y soltarla sobre otra posición, franja o día llama al caso de uso de movimiento correcto; un clic sin desplazamiento abre el detalle; durante el arrastre, una copia visual de la tarjeta sigue el cursor y el origen queda atenuado; las etiquetas de Desayuno, Comida, Merienda, Cena y Extra se centran en su celda.
- Verificación: `pnpm build`, pruebas Rust existentes de movimiento y comprobación manual de arrastrar entre días, franjas y posiciones.

**Resultado:** las tarjetas desactivan el mecanismo HTML nativo y la interfaz sigue los eventos de puntero del ratón. Al soltar, identifica la celda y la tarjeta bajo el cursor, calcula la posición final y delega el movimiento en el comando Rust existente. Un umbral corto conserva el clic normal para abrir el detalle; durante el arrastre el origen se atenúa y una copia visual de la tarjeta sigue el cursor. Las etiquetas laterales se centran horizontalmente.

## T-038 — Consolidar la calidad del módulo de comidas

- Estado: Completada
- Dependencias: T-037
- Alcance: retirar el arrastre HTML obsoleto, evitar que respuestas asíncronas antiguas sustituyan la semana o filtro actuales, exigir semanas ISO canónicas, consolidar estilos acumulados y aplicar una regla explícita de redondeo de costes.
- Criterios de aceptación: solo existe un mecanismo de arrastre basado en puntero; una respuesta anterior no modifica una vista tras cambiar su consulta; `WeekStart` rechaza fechas no canónicas; cada precio de línea y sus totales usan céntimos enteros; CSS y JSX del calendario no conservan reglas ni handlers obsoletos; `cargo fmt --check` y Clippy no informan incidencias.
- Verificación: `pnpm build`, `cargo test`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` y comprobación manual de navegación rápida, arrastre y coste a granel.

**Resultado:** el calendario conserva exclusivamente el arrastre por eventos de puntero; se retiraron atributos, handlers y estilos residuales del mecanismo HTML. Las cargas de Productos, Comidas, Planificador y Compra descartan respuestas que ya no son la petición vigente. Las semanas aceptan únicamente el formato ISO canónico, y el coste se calcula como céntimos enteros: cada línea a granel se redondea primero y los totales agregan esas líneas. Rust y los estilos quedaron formateados; Clippy y la comprobación de formato no producen incidencias.

## T-039 — Navegar y jerarquizar la compra semanal

- Estado: Completada
- Dependencias: T-038
- Alcance: normalizar la presentación de importes nulos, permitir navegar entre semanas desde Compra y reorganizar su cabecera para priorizar el coste antes de la acción de añadido.
- Criterios de aceptación: al completar todas las líneas el coste pendiente se muestra exactamente como `0,00 €`; Compra muestra la semana enfocada, permite ir a la anterior, siguiente o actual y conserva el mismo foco que Planificador; el resumen de coste queda junto al título mientras «Añadir producto» se mantiene a la derecha.
- Verificación: `pnpm build` y comprobación manual de semanas vacía, actual, pasada y futura, y de todos los productos marcados.

**Resultado:** Compra reutiliza la semana enfocada del módulo y ofrece los controles de anterior, siguiente y «Hoy» sin duplicar estado. Su resumen de coste queda junto al intervalo de fechas, antes de la acción «Añadir producto». La presentación monetaria protege el límite de interfaz: cualquier cero, incluido un posible cero negativo heredado, se muestra como `0,00 €`.
