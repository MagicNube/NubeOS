# Spec — Planificador de comidas, compra y productos

- Estado: Aprobada por Nube
- Última actualización: 2026-08-03

## Objetivo

Permitir al propietario de NubeOS planificar sus comidas de una semana a partir de sus productos habituales, organizar la compra necesaria y anticipar productos sobrantes. El módulo reduce el trabajo de repetir la planificación, muestra macros diarios y estima el gasto semanal.

Los datos se introducen manualmente, se usan sin conexión y están pensados para una sola persona.

## Vocabulario del módulo

- **Producto:** artículo reutilizable que se usa como ingrediente. Puede ser a granel, como patata, o concreto, como tortillas de trigo de Mercadona. Tiene macros por 100 g y datos de compra opcionales.
- **Presentación de compra:** forma opcional de comprar un producto: paquete, a granel por peso o a granel por unidad. Describe cuánto se compra y su precio estimado.
- **Comida:** receta reutilizable compuesta por productos y cantidades predeterminadas.
- **Ingrediente:** uso de un producto en una comida o instancia planificada, junto con una cantidad en gramos o unidades. No es un producto independiente.
- **Instancia planificada:** copia de una comida añadida a un día y franja concretos. Puede modificarse sin alterar la receta base.
- **Sobrante teórico:** cantidad disponible o adquirida para una semana que no se consume según ese plan. No equivale a inventario.

## Alcance de la primera versión funcional

La primera versión cubre crear productos, crear comidas, planificarlas en una semana y consultar macros, lista de compra, sobrantes teóricos y coste estimado. La lista se genera inicialmente para la semana visible, no por días de compra.

## Funcionalidades

### Gestión de productos y presentaciones

El usuario puede crear, consultar, filtrar por categoría, editar y archivar productos. También puede retirarlos de las recetas afectadas tras verlas y confirmarlo.

Cada producto tiene como mínimo nombre, categoría y proteínas, carbohidratos, grasas y kcal por 100 g. Puede tener tienda y marca opcionales para diferenciar y filtrar, por ejemplo, productos de Mercadona o Lidl. Un producto genérico como patata a granel puede dejar ambos campos vacíos.

Cada producto tiene como máximo una presentación de compra opcional. El formulario pide solo los datos del tipo elegido:

- **Paquete, bolsa o bandeja:** peso total en gramos, precio estimado por paquete y número de unidades opcional.
- **A granel por peso:** precio estimado por kg opcional.
- **A granel por unidad:** peso aproximado por unidad y precio estimado por unidad, ambos opcionales según los cálculos deseados.

El número de unidades de un paquete es opcional. Cuando se conoce junto con el peso total, la aplicación obtiene los gramos por unidad y permite utilizar unidades al crear recetas. Si no se conoce, el producto se usa en gramos.

Ejemplos:

- Patata a granel: macros por 100 g y precio opcional por kg.
- Pimiento: macros por 100 g, peso aproximado de 80 g por unidad y precio opcional por unidad.
- Relleno de fajitas: bolsa de 400 g y precio por bolsa.
- Tortillas de trigo de Mercadona: paquete de 320 g, ocho unidades y precio por paquete. Una tortilla equivale aproximadamente a 40 g.

Los productos no tienen formatos alternativos, relaciones ni sustituciones automáticas en esta etapa.

### Gestión de comidas

El usuario puede crear una comida con uno o más ingredientes, añadirlos, editarlos, retirarlos y consultar sus macros. Cada ingrediente se añade en gramos por defecto; si el producto tiene una conversión válida de unidad a gramos, el usuario puede seleccionar unidades.

Una comida puede archivarse y restaurarse. Una comida archivada no aparece en nuevas búsquedas, pero se mantiene visible donde ya estaba planificada.

### Planificación semanal

El usuario puede:

- Ver la semana actual de lunes a domingo y navegar a semanas anteriores o posteriores.
- Planificar una o más comidas en desayuno, comida, merienda, cena y extra.
- Añadir una comida desde la colección y ajustar sus ingredientes antes de confirmarla.
- En una instancia, añadir productos, retirar ingredientes o modificar cantidades en gramos o unidades cuando sea válido.
- Quitar instancias y reordenarlas dentro de una franja.
- Distinguir visualmente una instancia modificada de su receta base.

Una modificación afecta solo a esa instancia; no altera la comida base ni las demás instancias.

### Macros, compra, sobrantes y coste

Los resúmenes diarios muestran proteínas, carbohidratos, grasas y kcal de las cantidades efectivamente planificadas.

La lista de compra semanal:

- Agrupa cada producto usado en varias comidas, días o franjas.
- Normaliza las cantidades a gramos para macros, compra y coste; muestra también unidades cuando existe conversión válida.
- Recomienda paquetes completos, cantidades a granel o unidades según la presentación.
- Redondea paquetes y unidades hacia arriba cuando sea necesario para cubrir el plan.
- Muestra coste estimado y sobrante teórico cuando hay datos suficientes.
- No inventa conversiones, precios ni formatos ausentes.

Cada entrada semanal admite ajustes manuales: cantidad ya disponible, compra completa con una sola acción o compra parcial. La entrada muestra necesidad total, cobertura y pendiente. Estos ajustes no constituyen inventario ni pasan automáticamente a otra semana.

## Reglas de negocio

- Nombres de producto y comida obligatorios; macros, precios y contenidos no negativos.
- Una comida debe tener al menos un ingrediente para poder planificarse.
- Las cantidades de ingredientes son mayores que cero y se expresan en gramos o unidades.
- Las unidades solo se permiten si el producto conoce gramos por unidad, derivados de una presentación o introducidos como peso aproximado.
- La edición de macros, peso unitario o presentación de un producto actualiza los cálculos de comidas y planes existentes.
- Archivar preserva productos, comidas y planes existentes. Retirar un producto de recetas modifica solo recetas base, tras confirmación, nunca instancias ya planificadas.
- La lista de compra representa lo planificado y el progreso de esa semana; no representa consumo real ni inventario.

## Casos límite

- Sin productos no se puede crear una comida; sin comidas se muestra un estado vacío al planificar.
- Una semana vacía muestra macros cero y lista vacía.
- Un paquete con unidades pero sin peso total puede mostrarse en la compra, pero no permite crear ingredientes en unidades ni calcular sus macros a partir de ellas.
- Una fracción de paquete o unidad redondea la compra hacia arriba y muestra el sobrante teórico.
- Un producto sin presentación sigue apareciendo con su necesidad en gramos, sin conversión, coste ni sobrante inventados.
- Una compra parcial conserva el progreso de esa semana y muestra lo pendiente.

## Restricciones

- Los datos son privados, locales y funcionan sin conexión.
- Rust contiene validaciones, cálculos, persistencia y agregación. React solo presenta datos y mantiene estado efímero de interfaz.
- No hay copias de seguridad, restauración, exportación ni sincronización durante esta etapa.

## Fuera de alcance

- Importar productos, macros o precios desde internet; escáneres y OCR.
- Inventario, caducidades, perecibilidad, uso automático de sobrantes y optimización por días de compra.
- Formatos alternativos o sustituciones automáticas entre productos.
- IA, recomendaciones, perfiles múltiples, colaboración y aplicación móvil.

## Criterios de aceptación

- [ ] Se puede crear un producto con macros por 100 g, tienda y marca opcionales.
- [ ] Se puede configurar una presentación de paquete, a granel por peso o a granel por unidad.
- [ ] Un paquete con peso total y unidades permite añadir un ingrediente por unidades y calcular sus macros.
- [ ] Se pueden crear comidas y planificar una o más instancias en las cinco franjas semanales.
- [ ] Una instancia modificada no cambia la receta base y se identifica como modificada.
- [ ] Los macros reflejan cantidades en gramos o unidades normalizadas.
- [ ] La lista agrega productos, calcula paquetes o compra a granel, sobrantes y costes cuando existen datos suficientes.
- [ ] Se puede indicar cantidad ya disponible y registrar compra completa o parcial sin crear inventario global.
- [ ] Una semana sin comidas no produce errores.
