# Spec — Planificador de comidas, compra y productos

- Estado: Aprobada por Nube
- Última actualización: 2026-08-02

## Objetivo

Permitir al propietario de NubeOS planificar sus comidas de una semana a partir de sus productos habituales, organizar la compra necesaria y anticipar qué productos pueden sobrar. El módulo debe reducir el trabajo de repetir la planificación, facilitar compras semanales —o una futura división en dos compras— y mostrar tanto los macronutrientes diarios como una estimación del gasto.

Al mostrar la cantidad que sobrará de una compra, el usuario puede decidir si le conviene reutilizar ese producto en otra comida de la semana. Los datos se introducen manualmente, se usan sin conexión y están pensados para una sola persona.

## Vocabulario del módulo

- **Producto:** alimento o artículo de supermercado reutilizable que se usa como ingrediente. Puede ser un alimento a granel, como un pimiento, o un producto concreto, como una bolsa de relleno de fajitas de Mercadona o tortillas de trigo de ocho unidades. Tiene macros por 100 g y puede tener datos de compra.
- **Categoría:** clasificación manual de un producto para facilitar su consulta y filtrado. Las categorías iniciales son verdura, fruta, yogures, carne, pescado y otro.
- **Formato de compra:** forma opcional en la que se adquiere un producto: a granel, por unidad, paquete, bolsa o bandeja. Describe su contenido y, si se conoce, su precio estimado. Por ejemplo: una bolsa de 400 g o un paquete de ocho tortillas.
- **Comida:** receta o preparación reutilizable, como “fajitas”. Está compuesta por uno o más productos y cantidades predeterminadas.
- **Ingrediente:** uso de un producto dentro de una comida o instancia planificada, junto con su cantidad en gramos. No es un producto independiente.
- **Plan semanal:** conjunto de comidas planificadas para los siete días, de lunes a domingo, de una semana concreta.
- **Franja:** momento del día en el que se planifica una o más comidas: desayuno, comida, merienda, cena y extra.
- **Instancia planificada:** una comida añadida a una franja y día concretos. Puede cambiar ingredientes y cantidades sin modificar la comida base.
- **Modificación de instancia:** diferencia entre una instancia planificada y su comida base, como añadir, eliminar o modificar un ingrediente. Debe distinguirse visualmente de una instancia sin cambios.
- **Lista de compra:** productos y cantidades que exige el plan semanal, convertidos al formato de compra disponible y acompañados de una estimación de sobrante y gasto cuando los datos lo permitan.
- **Sobrante teórico:** parte de un formato de compra, junto con cualquier cantidad indicada como “ya tengo”, que no se consume según el plan de esa semana. No equivale todavía a inventario real ni se descuenta automáticamente de compras futuras.

## Alcance de la primera versión funcional

La primera versión debe cubrir el flujo esencial: crear productos, formar comidas, planificarlas en una semana y consultar macros, lista de compra, sobrantes teóricos y coste estimado. El orden de implementación se decidirá posteriormente en `tasks.md`; esta spec no obliga a construirlo todo de una vez.

La lista inicial se genera para la semana visible. Dividirla por dos días concretos de compra se evaluará después de validar el uso semanal.

## Funcionalidades

### Gestión de productos

El usuario puede:

- Crear un producto manualmente.
- Consultar sus productos y filtrarlos por categoría.
- Editar los datos de un producto existente.
- Archivar un producto o retirarlo de las comidas que lo usan, con una confirmación explícita que indique las comidas afectadas.

Cada producto debe tener, como mínimo:

- Un nombre.
- Una categoría.
- Valores nutricionales por 100 g: proteínas, carbohidratos, grasas y kcal.

Un producto puede tener, como máximo, un formato de compra opcional. Si lo tiene, el usuario puede indicar manualmente:

- Dónde se compra o su marca, si le resulta útil.
- El nombre del formato, como “bolsa”, “paquete”, “bandeja” o “a granel”.
- El contenido del formato en gramos, unidades o ambos cuando se conozcan.
- El peso aproximado de una unidad si se compra por unidad y se planifica por gramos; por ejemplo, un pimiento de unos 80 g.
- El precio estimado de ese formato o unidad de compra.

Ejemplos válidos:

- Un pimiento a granel: macros por 100 g, una unidad de unos 80 g y precio estimado por unidad.
- Una bolsa de relleno de fajitas: macros por 100 g, bolsa de 400 g y precio estimado por bolsa.
- Tortillas de trigo: macros por 100 g, paquete de ocho unidades y, si se conoce, peso total o peso aproximado por unidad, además del precio estimado del paquete.

Los productos no tienen formatos alternativos ni relaciones automáticas en esta etapa. Por ejemplo, “patata a granel” y “malla de patatas de 1 kg” son productos distintos; la aplicación no sustituye uno por otro de forma automática en la lista de compra.

### Gestión de comidas

El usuario puede:

- Crear una comida con nombre y uno o más ingredientes.
- Añadir, editar o retirar ingredientes de una comida.
- Indicar para cada ingrediente la cantidad predeterminada en gramos.
- Consultar los macros calculados de la comida a partir de sus ingredientes.
- Editar o archivar una comida.

Una comida archivada deja de aparecer al buscar o añadir comidas nuevas, pero sus instancias ya planificadas se conservan visibles en el calendario. El usuario puede restaurarla si quiere volver a usarla.

Una comida puede reutilizarse tantas veces como se quiera. Por ejemplo, “fajitas” puede contener pimiento, cebolla y relleno de pollo con sus cantidades predeterminadas.

### Planificación semanal

El usuario puede:

- Ver una semana de siete días, de lunes a domingo, en formato de calendario.
- Planificar una o más comidas en cada una de las cinco franjas de cada día: desayuno, comida, merienda, cena y extra.
- Añadir una comida desde la colección existente a una franja.
- Antes de confirmar una comida en el plan, abrir una opción para ajustar sus ingredientes y cantidades.
- En una instancia planificada, añadir un producto, retirar un ingrediente o modificar sus gramos.
- Quitar una instancia planificada sin borrar la comida base.
- Distinguir una instancia modificada de una que conserva la receta base. La forma visual concreta se decidirá en el diseño.
- Reordenar las comidas de una misma franja; se intentará mediante arrastrar y soltar, sin que sea un requisito del primer incremento técnico.
- Navegar a semanas anteriores y posteriores.
- Volver rápidamente a la semana actual.

Al abrir el planificador se muestra la semana actual según la fecha local del equipo. Una modificación de una instancia afecta solo a esa instancia: no modifica la comida base ni otras instancias de la misma comida.

### Resumen nutricional

Para cada día planificado, el usuario puede consultar el total previsto de proteínas, carbohidratos, grasas y kcal.

Los totales se calculan a partir de las cantidades efectivas de las instancias planificadas, incluidas sus modificaciones. Una semana o un día sin comidas muestra totales de cero, no un error.

### Lista de compra semanal, ajustes, progreso, sobrantes y coste

El usuario puede consultar una lista de compra generada a partir de todas las instancias planificadas en la semana visible.

La lista debe:

- Agrupar las necesidades de un mismo producto aunque procedan de comidas, días o franjas diferentes.
- Considerar las cantidades ajustadas en cada instancia planificada, no solo las cantidades predeterminadas de las comidas.
- Mostrar la cantidad total necesaria en gramos cuando sea posible.
- Convertir la necesidad al formato de compra del producto y redondear siempre hacia arriba para cubrir lo planificado.
- Mostrar cuántos formatos deben comprarse, el coste estimado de esa compra y el coste estimado total de la lista cuando se hayan introducido precios.
- Mostrar el sobrante teórico resultante de comprar formatos completos. Por ejemplo, si se necesitan 600 g de un producto vendido en bolsas de 400 g, la lista muestra dos bolsas y un sobrante teórico de 200 g o media bolsa.
- Mostrar claramente los productos para los que no se pueda calcular un formato, precio o sobrante, sin ocultar la cantidad necesaria.

Cada entrada de la lista de compra se puede ajustar manualmente para reflejar la situación de esa semana:

- El usuario puede indicar una cantidad de producto que ya tiene en casa. Esa cantidad reduce lo pendiente de comprar, pero no cambia la necesidad total del plan.
- El usuario puede registrar una compra completa con una única acción, que cubre toda la cantidad pendiente de esa entrada.
- El usuario puede registrar una compra parcial indicando cuánto ha comprado. La entrada muestra entonces la cantidad restante pendiente.
- La forma concreta de presentar estas acciones se decidirá en el diseño. El flujo de compra completa no debe obligar a realizar dos acciones consecutivas; la compra parcial será una alternativa explícita, no un paso obligatorio.

El sobrante teórico tiene en cuenta la cantidad indicada como “ya tengo” y los formatos completos adquiridos, pero sigue siendo solo una ayuda de planificación. No se traslada automáticamente a la semana siguiente.

La lista representa lo planificado y el progreso de compra de esa semana. No mantiene inventario, no descuenta sobrantes de semanas anteriores y no infiere cuánto producto queda realmente en casa.

## Reglas de negocio

- Los nombres de producto y comida son obligatorios.
- Los macros de producto se introducen siempre por 100 g.
- Las cantidades en gramos deben ser mayores que cero cuando el ingrediente se use en una comida o planificación.
- Los macros, el contenido de un formato y los precios estimados no pueden ser negativos.
- Una comida debe tener al menos un ingrediente para poder guardarse como comida utilizable en el plan.
- Una instancia planificada pertenece a una semana, un día, una franja y una comida base. Sus ingredientes pueden diferir de la comida base.
- Un mismo producto puede aparecer en varias comidas; una misma comida puede planificarse varias veces, incluso en el mismo día.
- La edición de los macros o datos de un producto actualiza los cálculos de las comidas y planes existentes; no se conservan valores históricos en esta etapa.
- Un producto puede archivarse o retirarse de las comidas que lo usan. Antes de retirar un producto de recetas, el usuario debe ver las comidas afectadas y confirmar la acción.
- Un producto archivado deja de estar disponible para usos nuevos, pero se conserva para no romper las comidas ni los planes existentes.
- Retirar un producto de recetas actualiza esas comidas, pero no elimina ni altera de forma silenciosa las instancias ya planificadas.
- Una comida no se elimina durante esta etapa: se archiva para preservar las instancias ya planificadas.
- La cantidad ya disponible, la cantidad comprada y la cantidad pendiente son datos manuales de una entrada de compra semanal; no son inventario global.
- El sobrante teórico se calcula a partir de la cantidad disponible y adquirida para esa semana menos la cantidad planificada; no confirma que el producto se conserve, consuma o esté disponible después.

## Casos límite

- No existen productos: se muestra un estado vacío y no se puede crear una comida con ingredientes inexistentes.
- No existen comidas: se muestra un estado vacío al intentar planificar.
- Una semana no tiene instancias: los resúmenes nutricionales son cero y la lista de compra está vacía.
- La misma comida se añade varias veces: cada instancia cuenta de forma independiente en macros, compra, coste y sobrante.
- Una instancia añade o elimina ingredientes respecto a la comida base: sus macros y compra usan únicamente sus ingredientes efectivos y se muestra como modificada.
- Un producto no tiene formato de compra: sigue apareciendo con la cantidad necesaria, pero no se inventan paquetes, sobrantes ni precio.
- Un formato tiene unidades pero no se conoce su peso: puede mostrarse en unidades cuando el plan también lo permita; si no es posible convertir gramos a unidades, se informa de que falta ese dato.
- Se necesita una fracción de un formato: se redondea la compra hacia arriba y se muestra el sobrante teórico.
- El usuario ya tiene una parte de un producto: se muestra la necesidad total, la cantidad disponible y la cantidad pendiente de comprar sin alterar la receta ni el plan.
- El usuario compra una parte de la cantidad pendiente: se conserva el progreso y se muestra la nueva cantidad restante.
- Se navega a una semana anterior o futura sin plan: debe poder verse y editarse como una semana vacía.
- Se archiva una comida: deja de aparecer para nuevas planificaciones, pero sigue apareciendo en los calendarios donde ya estaba planificada.
- Se archiva un producto: no puede añadirse de nuevo, pero las recetas y planes existentes siguen siendo consultables.
- Se retira un producto de recetas: se muestran las comidas afectadas y se requiere confirmación antes de modificarlas.

## Restricciones

- Los datos son privados y permanecen en el equipo local durante el MVP.
- El módulo funciona sin conexión y no consulta bases nutricionales, supermercados ni precios externos.
- React presenta datos y recoge interacción; las reglas de cantidades, macros, coste y agregación de compra pertenecen al dominio Rust.
- La información del módulo persiste entre reinicios mediante la estrategia local aprobada.
- No se implementan copias de seguridad, restauración, exportación ni sincronización en esta etapa.

## Fuera de alcance

- Escáner de códigos de barras, OCR o importación automática de productos.
- Base de datos nutricional, precios o autocompletado desde internet.
- Recomendaciones de recetas, planes automáticos o funciones basadas en IA.
- Inventario de despensa, control de existencias o caducidades.
- Usar automáticamente un sobrante de una semana anterior para descontarlo de una lista futura.
- Formatos alternativos, relaciones o sustituciones automáticas entre productos.
- División u optimización de la compra por días de la semana.
- Cálculo automático basado en perecibilidad, duración o caducidad estimada de productos.
- Seguimiento de lo que realmente se ha comido.
- Objetivos nutricionales, alertas, dietas o consejos de salud.
- Recetas compartidas, perfiles múltiples, colaboración o sincronización entre dispositivos.
- Aplicación móvil.

## Criterios de aceptación

- [ ] El usuario puede crear un producto con nombre, categoría y macros válidos por 100 g.
- [ ] El usuario puede guardar opcionalmente un formato de compra con contenido y precio estimado.
- [ ] El usuario puede crear una comida con varios productos y cantidades predeterminadas en gramos.
- [ ] El usuario puede planificar una o más comidas en cada una de las cinco franjas de un día de una semana concreta.
- [ ] Al abrir el planificador, se muestra la semana actual de lunes a domingo y el usuario puede navegar a otras semanas y volver a ella.
- [ ] El usuario puede modificar ingredientes o gramos de una instancia sin cambiar la comida base, y reconoce que esa instancia está modificada.
- [ ] El resumen diario refleja los macros de las cantidades efectivamente planificadas.
- [ ] La lista de compra agrega correctamente un producto usado en varias instancias de la semana.
- [ ] Si se necesitan 600 g de un producto vendido en bolsas de 400 g, la lista indica dos bolsas y un sobrante teórico de 200 g.
- [ ] El usuario puede indicar que ya tiene una cantidad de producto y la lista reduce lo pendiente sin alterar la necesidad del plan.
- [ ] El usuario puede registrar una compra completa en una única acción o registrar una cantidad parcial, y la lista muestra lo que queda pendiente.
- [ ] La lista muestra el coste estimado de los productos con precio y el total de los importes disponibles.
- [ ] Una semana sin comidas no produce errores y muestra resúmenes y compra vacíos.
- [ ] El módulo no requiere conexión ni envía datos fuera del equipo.
