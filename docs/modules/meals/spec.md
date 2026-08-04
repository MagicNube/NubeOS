# Spec — Planificador de comidas, compra y productos

- Estado: Aprobada por Nube
- Última actualización: 2026-08-03

## Objetivo

Permitir al propietario de NubeOS planificar sus comidas de una semana a partir de sus productos habituales, organizar la compra necesaria y anticipar productos sobrantes. El módulo reduce el trabajo de repetir la planificación, muestra macros diarios y estima el gasto semanal.

Los datos se introducen manualmente, se usan sin conexión y están pensados para una sola persona.

## Vocabulario del módulo

- **Producto:** artículo reutilizable que se usa como ingrediente. Puede ser a granel, como patata, o concreto, como tortillas de trigo de Mercadona. Tiene macros por 100 g, supermercado opcional y una presentación de compra.
- **Presentación de compra:** forma de comprar un producto: paquete, bolsa o bandeja, o a granel por peso. Describe cuánto se compra y su precio estimado.
- **Comida:** receta reutilizable compuesta por productos y cantidades predeterminadas.
- **Momento del día:** una o más franjas (opcionales) en las que una comida suele encajar: desayuno, comida, merienda, cena o extra. Sirven para ordenar resultados, nunca para impedir planificarla en otra franja.
- **Ingrediente:** uso de un producto en una comida o instancia planificada, junto con una cantidad en gramos o unidades. No es un producto independiente.
- **Instancia planificada:** copia de una comida añadida a un día y franja concretos. Puede modificarse sin alterar la receta base.
- **Sobrante teórico:** cantidad disponible o adquirida para una semana que no se consume según ese plan. No equivale a inventario.

## Alcance de la primera versión funcional

La primera versión cubre crear productos, crear comidas, planificarlas en una semana y consultar macros, lista de compra, sobrantes teóricos y coste estimado. La lista se genera inicialmente para la semana visible, no por días de compra.

## Funcionalidades

### Gestión de productos y presentaciones

El usuario puede crear, consultar, buscar por texto, filtrar por categoría, editar y archivar productos. También puede consultar las comidas que usan un producto o retirarlo de sus recetas afectadas tras verlas y confirmarlo. Desde Archivo puede eliminar definitivamente un producto archivado que no tenga referencias en recetas o instancias planificadas.

Cada producto tiene como mínimo nombre, categoría y proteínas, carbohidratos, grasas y kcal por 100 g. El nombre incluye la marca cuando haga falta diferenciarlo; no existe un campo de marca separado. Puede tener un supermercado opcional elegido entre Mercadona, Lidl, Consum, FamilyCash y Otro. Un producto genérico como patata a granel puede dejarlo vacío.

Las kcal y los pesos en gramos se introducen y muestran como enteros, sin controles de flechas. Proteínas, carbohidratos y grasas admiten decimales y se muestran con un decimal como máximo. Los campos vacíos muestran un ejemplo en lugar de precargar el valor cero. El precio se escribe y muestra en euros, por ejemplo `2,99 €`, sin exponer céntimos en la interfaz.

Cada producto nuevo tiene una presentación de compra. El formulario pide solo los datos del tipo elegido:

- **Paquete, bolsa o bandeja:** peso total en gramos, precio estimado por paquete en euros y número de unidades (opcional). El nombre que aparece en compra es siempre el nombre del producto; no se pide una etiqueta independiente.
- **A granel por peso:** precio estimado por kg (opcional).

El número de unidades de un paquete es opcional. Cuando se conoce junto con el peso total, la aplicación obtiene los gramos por unidad y permite utilizar unidades al crear recetas. Si no se conoce, el producto se usa en gramos.

Ejemplos:

- Patata a granel: macros por 100 g y precio opcional por kg.
- Relleno de fajitas: bolsa de 400 g y precio por bolsa.
- Tortillas de trigo de Mercadona: paquete de 320 g, ocho unidades y precio por paquete. Una tortilla equivale aproximadamente a 40 g.

Los productos no tienen formatos alternativos, relaciones ni sustituciones automáticas en esta etapa.

Los productos antiguos sin presentación o con presentación "a granel por unidad" se conservan para no perder datos. Se muestran como datos heredados y no se pueden crear de nuevo; al editarlos, el usuario deberá escoger paquete, bolsa o bandeja, o a granel por peso.

Los productos activos aparecen directamente al abrir Productos. Los archivados no compiten con el catálogo: se consultan desde una acción secundaria de archivo.

### Gestión de comidas

El usuario puede crear una comida con uno o más ingredientes, añadirlos, editarlos, retirarlos, buscarla por texto o por productos contenidos y consultar sus macros. Puede asignarle cero, uno o varios momentos del día.

El filtro por producto de Comidas se usa como una búsqueda incremental: vacío no aplica ningún filtro y las sugerencias solo aparecen al escribir al menos tres caracteres. Así el control sigue siendo manejable aunque el catálogo tenga muchos productos.

Las tarjetas del catálogo muestran como máximo tres ingredientes y mantienen una altura común. Al pulsar una tarjeta, el usuario abre un detalle de la comida con todos sus ingredientes, las cantidades, los macros de cada ingrediente y los macros totales.

Cada ingrediente empieza sin producto elegido y permite buscarlo por nombre. El selector de producto del formulario aplica la misma búsqueda incremental: no muestra sugerencias hasta escribir tres caracteres. La cantidad se añade en gramos por defecto; si el producto tiene una conversión válida de unidad a gramos, el usuario puede seleccionar unidades. Si solo admite gramos, la unidad se presenta dentro de una caja visualmente consistente, pero no editable.

Una comida puede archivarse y restaurarse. Una comida archivada no aparece en nuevas búsquedas, pero se mantiene visible donde ya estaba planificada. Desde Archivo puede eliminarse definitivamente si no está referenciada por ninguna instancia planificada; así no se rompe el historial. El archivo se consulta desde una acción secundaria, no junto al listado de recetas activas.

### Planificación semanal

El usuario puede:

- Ver la semana actual de lunes a domingo y navegar a semanas anteriores o posteriores.
- Planificar una o más comidas en desayuno, comida, merienda, cena y extra.
- Añadir una comida desde una colección con buscador de texto, ordenada primero por el momento del día que coincide con la franja elegida y después por nombre.
- En una instancia, añadir productos, retirar ingredientes o modificar cantidades en gramos o unidades cuando sea válido.
- Quitar instancias y arrastrarlas para reordenarlas dentro de una franja o moverlas a otro día y franja.
- Distinguir visualmente una instancia modificada de su receta base.

La navegación semanal centra la etiqueta y el intervalo de fechas entre sus flechas. El calendario muestra en la cabecera solo el día y la fecha; cada tarjeta de comida muestra únicamente su nombre y permite arrastrarla entre posiciones, franjas y días. Tras la última franja aparece una fila de resumen diario con la tabla compacta de macros (incluidas las kcal). Al pulsar una tarjeta se abre el detalle de su instancia, con ingredientes, cantidades, macros por ingrediente y macros totales. No muestra un resumen semanal de macros. El botón para añadir solo aparece al situar el cursor o el foco sobre una celda. La columna del día actual se destaca y cambia al comenzar un nuevo día en la zona horaria `Europe/Madrid`.

Una modificación afecta solo a esa instancia; no altera la comida base ni las demás instancias.

### Macros, compra, sobrantes y coste

Los resúmenes diarios muestran proteínas, carbohidratos, grasas y kcal de las cantidades efectivamente planificadas. Los valores se presentan como enteros para una lectura rápida, sin redondear los cálculos internos antes de agregarlos.

La lista de compra semanal:

- Muestra la semana actualmente enfocada y permite navegar a semanas anteriores o posteriores sin abandonar Compra; el foco es el mismo que usa el planificador.
- Agrupa cada producto usado en varias comidas, días o franjas.
- Permite añadir una necesidad manual semanal eligiendo un producto activo del catálogo mediante buscador e indicando una cantidad válida en gramos o unidades.
- Suma esa necesidad manual a la misma entrada del producto cuando también procede de una comida; no crea líneas duplicadas.
- Normaliza las cantidades a gramos para macros, compra y coste; muestra también unidades cuando existe conversión válida.
- Recomienda paquetes completos o cantidades a granel según la presentación.
- Redondea paquetes hacia arriba cuando sea necesario para cubrir el plan.
- Redondea el coste estimado de cada entrada al céntimo más cercano; el coste total y pendiente suman esas líneas ya redondeadas.
- Muestra un coste pendiente de cero como `0,00 €`, nunca como un importe negativo nulo.
- Muestra coste estimado total y sobrante teórico cuando hay datos suficientes.
- No inventa conversiones, precios ni formatos ausentes.

Cada entrada semanal muestra de forma destacada la compra recomendada y su precio estimado. Junto al campo «Tienes» presenta necesidad, pendiente y sobrante teórico. Incluye un único campo manual «Tienes», expresado en gramos o en unidades cuando el paquete conoce gramos por unidad. El valor se normaliza y se guarda en gramos; al escribir, la recomendación se recalcula sin esperar a que el campo pierda el foco. La recomendación de un producto envasado siempre se expresa en paquetes, bolsas o bandejas, incluso cuando el pendiente es cero. Los campos numéricos del módulo se escriben directamente y no muestran controles nativos de incremento o decremento.

Si una entrada incluye una cantidad añadida manualmente, muestra la indicación «Añadido manualmente — no forma parte del plan de comidas». El usuario puede retirar esa aportación manual sin alterar recetas, instancias planificadas ni la parte de la necesidad que proceda del plan.

Cada entrada tiene además una casilla de verificación semanal. Solo registra visualmente que esa línea de compra está completada; no altera la disponibilidad declarada ni crea un inventario. El coste pendiente estimado excluye las líneas marcadas y se actualiza de inmediato; el coste total planificado permanece visible como referencia.

## Reglas de negocio

- Nombres de producto y comida obligatorios; macros, precios y contenidos no negativos.
- Una comida debe tener al menos un ingrediente para poder planificarse.
- Las cantidades de ingredientes son mayores que cero y se expresan en gramos o unidades.
- Las unidades solo se permiten si el producto conoce gramos por unidad, derivados de una presentación o introducidos como peso aproximado.
- La edición de macros, peso unitario o presentación de un producto actualiza los cálculos de comidas y planes existentes.
- Archivar preserva productos, comidas y planes existentes. Retirar un producto de recetas modifica solo recetas base, tras confirmación, nunca instancias ya planificadas.
- La lista de compra representa lo planificado, las necesidades manuales y el progreso de esa semana; no representa consumo real ni inventario.
- Los momentos del día de una comida no restringen dónde puede planificarse.

## Casos límite

- Sin productos no se puede crear una comida; sin comidas se muestra un estado vacío al planificar.
- Una semana vacía muestra macros cero y lista vacía.
- Un paquete sin número de unidades se usa únicamente en gramos y sigue pudiendo recomendarse para la compra.
- Una fracción de paquete redondea la compra hacia arriba y muestra el sobrante teórico.
- Una compra a granel puede producir fracciones de céntimo durante el cálculo; cada línea se redondea al céntimo más cercano antes de mostrarla y agregarla.
- Un producto heredado sin presentación sigue apareciendo con su necesidad en gramos, sin conversión, coste ni sobrante inventados hasta que se edite.
- Cambiar «Tienes» modifica solo la disponibilidad de esa semana y producto.
- Añadir o retirar una necesidad manual modifica solo la lista de la semana enfocada. Para añadirla, el producto debe existir y estar activo en el catálogo.

## Restricciones

- Los datos son privados, locales y funcionan sin conexión.
- Rust contiene validaciones, cálculos, persistencia y agregación. React solo presenta datos y mantiene estado efímero de interfaz.
- No hay copias de seguridad, restauración, exportación ni sincronización durante esta etapa.

## Fuera de alcance

- Importar productos, macros o precios desde internet; escáneres y OCR.
- Inventario, caducidades, perecibilidad, uso automático de sobrantes y optimización por días de compra.
- Formatos alternativos o sustituciones automáticas entre productos.
- Nuevas presentaciones a granel por unidad. El soporte heredado solo evita perder datos previos.
- IA, recomendaciones, perfiles múltiples, colaboración y aplicación móvil.

## Criterios de aceptación

- [ ] Se puede crear un producto con macros por 100 g y supermercado opcional de la lista prevista.
- [ ] Todo producto nuevo se configura como paquete, bolsa o bandeja, o a granel por peso, con precio mostrado en euros.
- [ ] Un paquete con peso total y unidades permite añadir un ingrediente por unidades y calcular sus macros.
- [ ] Se puede buscar y filtrar productos y comidas; el filtro de producto de comidas permite buscar por texto y una comida puede tener momentos del día opcionales.
- [ ] Se pueden crear comidas y planificar una o más instancias en las cinco franjas semanales, incluyendo al arrastrarlas arriba o abajo y entre días o franjas.
- [ ] Desde Archivo se puede eliminar definitivamente una comida o producto archivado sin referencias; el sistema rechaza borrar datos con historial relacionado.
- [ ] Una instancia modificada no cambia la receta base y se identifica como modificada.
- [ ] Los macros reflejan cantidades en gramos o unidades normalizadas.
- [ ] La lista agrega productos, calcula paquetes o compra a granel, sobrantes y costes cuando existen datos suficientes.
- [ ] Se puede indicar «Tienes» en gramos o unidades válidas sin crear inventario global; la recomendación y el coste pendiente se recalculan al escribir.
- [ ] Se puede añadir y retirar una necesidad manual semanal desde productos activos del catálogo; se agrega a la línea existente e identifica visualmente que no procede del plan.
- [ ] Una semana sin comidas no produce errores.
