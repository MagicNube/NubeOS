# Principios de NubeOS

- Estado: Aprobada por Nube
- Última actualización: 2026-09-08

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

- La aplicación dedica el espacio vertical principal al contenido: el módulo se identifica en su cabecera y la vista activa en sus pestañas, sin una segunda fila global de ruta.
- Los patrones transversales ya consolidados se reutilizan desde `src/ui/`; un módulo no crea otra variante de modal, selector o aviso temporal sin una necesidad documentada.
- Los modales bloquean y atenúan el contenido de fondo, contienen el foco, permiten cierre coherente y restauran el foco al elemento que los abrió.
- Los selectores nativos comparten chevrón, margen derecho, tema oscuro y estados morados de `hover` y foco. Los desplegables personalizados conservan la misma geometría y respuesta visual.
- Los campos de búsqueda y filtrado usan los controles compartidos y una tipografía base de `14 px`. Un módulo no reduce su tamaño de texto ni altera su altura de forma independiente.
- La escala tipográfica común distingue título de módulo, título de sección, título de tarjeta, texto de control y texto secundario mediante tokens globales. Los módulos no redefinen esos niveles sin una necesidad documentada.
- En escritorio con puntero, editar, omitir y otras acciones secundarias de una tarjeta aparecen al pasar el cursor o al entrar con foco. En dispositivos sin `hover` permanecen visibles; los estados persistentes, como un favorito activo, no se ocultan.
- Los botones iconográficos no destructivos de Anime, Lectura, Videojuegos, Películas y Series comparten borde, fondo y texto morados en `hover` y `focus-visible`; las acciones destructivas conservan su aviso rojo.
- Todas las áreas desplazables reutilizan un scrollbar oscuro con acento morado y contraste suficiente; ningún módulo depende del estilo claro predeterminado del sistema.
- Los formularios modales avisan antes de cerrar mediante botón, fondo o tecla Escape cuando contienen cambios sin guardar.
- En una cabecera de colección, la acción secundaria `Archivo` se coloca inmediatamente antes de la acción principal de creación. En los módulos de entretenimiento ambas aparecen a la derecha de las pestañas de vista.
- Los antetítulos de colección e historial usan el mismo tamaño tipográfico compartido en todos los módulos de entretenimiento.
- Los módulos de entretenimiento muestran su título una sola vez, sin una etiqueta superior redundante. Cuando disponen de navegación, el orden es `Biblioteca`, actividad en curso cuando proceda, `Historial` y `Estadísticas`.
- Cada pantalla de Media contiene un único `h1` con el nombre del módulo. La vista activa se comunica en las pestañas secundarias situadas inmediatamente debajo.
- La navegación activa se comunica visualmente y mediante `aria-current`; el foco de teclado siempre es visible, existe un salto directo al contenido y las animaciones respetan la preferencia de movimiento reducido.
- El botón lateral Atrás del ratón respeta la navegación de NubeOS: primero cierra el diálogo o detalle activo y, fuera de él, recupera el módulo visitado anteriormente sin abandonar la aplicación.
- Los filtros booleanos de favoritos usan el control compacto compartido con estrella vacía o rellena; no usan corazones, casillas ni texto largo.
- Cada vista conserva sus propios filtros. Una vista con alcance implícito, como `Leyendo` o `Jugando`, muestra ese alcance en el selector y nunca aparenta estar enseñando `Todos los estados`; `Leyendo` contiene exclusivamente libros con ese estado.
- Todos los formularios de entretenimiento incluyen el mismo selector de favorito con estrella y utilizan ejemplos propios de su módulo; nunca reutilizan referencias de anime para libros, videojuegos, series o películas.
- Los formularios principales de entretenimiento organizan sus campos mediante las secciones `Identificación`, `Seguimiento`, `Opinión` y `Portada`; cada módulo conserva únicamente los campos que necesita.
- En las tarjetas de entretenimiento, el estado se presenta fuera de la imagen y la ordenación seleccionada se conserva entre sesiones; las fechas de inicio y finalización pueden ordenarse en ambos sentidos.
- Las fechas resumidas de los trackers reutilizan la jerarquía de Lectura: etiqueta breve en mayúsculas y valor legible debajo; cuando existen inicio y fin se muestran en dos columnas equivalentes.
- Los cinco trackers de entretenimiento reutilizan `--ui-card-title-font-size` para el título de sus tarjetas. Anime, Lectura y Videojuegos comparten además la misma escala tipográfica y un contenedor de puntuación de `58 × 48 px`; la ausencia de nota se representa siempre mediante `—`.
- Todas las puntuaciones mostradas reutilizan la celda SeriesGraph compartida: texto blanco centrado, fondo determinado por el tramo de nota y estado vacío discontinuo. Formularios y controles de edición pueden conservar geometría propia, pero no inventan otra escala cromática.
- Las etiquetas de género de Anime y Lectura reutilizan `--ui-tag-font-size` a `11 px`, padding `4 × 8 px`, borde y radio comunes. El espacio disponible puede limitar cuántas se muestran, pero no reducir su legibilidad.
- Los títulos alternativos se conservan para búsqueda y detalle, pero no se muestran en las tarjetas de colección.
- Los estados equivalentes conservan el mismo color en todos los trackers: completado en verde, actividad en morado, pausa en azul y abandono en rojo; las etiquetas generales no pueden sobrescribir sus colores.
- Los trackers simples separan el detalle en `Resumen` e `Historial`. El resumen mantiene el orden puntuación, número de registros y estado; el historial concentra recorridos repetibles y sus acciones. Anime puede conservar una composición propia por su jerarquía de contenidos.
- Los historiales de recorridos comparten cabecera compacta, número de registros y acciones a la derecha; lectura y videojuegos exigen fecha inicial y mantienen la fecha final opcional.
- En Lectura y Videojuegos, cerrar un periodo y terminar la obra son datos distintos: una fecha final puede representar un abandono temporal y debe poder marcarse como `Sin terminar`.
- La gestión de portadas utiliza siempre una acción iconográfica de papelera para retirarlas. Elegir o pegar otra imagen sustituye la anterior sin pasos intermedios y actualiza inmediatamente todas sus vistas abiertas.
- Ajustar una portada permanece oculto hasta pasar el cursor por la imagen o alcanzar su botón mediante teclado; nunca recibe automáticamente el foco inicial de un modal.
- El editor de encuadre muestra simultáneamente la imagen completa y el resultado final. El usuario puede elegir el punto focal sobre la imagen completa y afinar posición y zoom comprobando qué zona quedará realmente visible.
- Las imágenes GIF se identifican mientras están detenidas y ocultan esa indicación durante la reproducción al pasar el cursor.
- Las bibliotecas no descargan de entrada cada GIF completo: usan una miniatura estática persistente, cargan la animación al interactuar y limitan la caché de animaciones recientes.
- Las barras de Media dejan visibles búsqueda, favorito y selector primario cuando existe. Filtrar y ordenar tienen accesos iconográficos independientes; el contador incluye únicamente restricciones que reducen resultados, no la ordenación ni el alcance implícito de la vista. El orden neutro común es título alfabético y cualquier alternativa activa el icono morado de ordenación.
- La barra lateral agrupa los destinos mediante etiquetas secundarias limpias, sin mayúsculas ni espaciado ornamental. Al contraerla conserva el espacio vertical de esas etiquetas para que los iconos no cambien de posición; el control de contracción queda al final del pie cuando está expandida y se centra cuando está plegada, manteniendo nombre accesible y tooltip breve. La superficie es plana, sin degradados, y reserva el morado para el icono y el destino activo.
- La ventana de escritorio utiliza una barra de título propia y neutra, con la misma superficie básica que el resto de la aplicación, sin degradado, logo ni nombre repetidos. Debe conservar arrastre, doble clic para maximizar, redimensionado y controles accesibles de minimizar, maximizar o restaurar y cerrar.
- Las vistas históricas conservan en memoria los resultados ya consultados durante la sesión del módulo. Volver a una vista con los mismos filtros no repite consultas; una mutación o un cambio de filtro invalida el resultado correspondiente.
- El foco de un buscador se dibuja alrededor del control completo; el campo interior no presenta un segundo borde u outline.
- Las fechas editables de Media comparten una caja con segmentos día/mes/año y botón de calendario nativo. Tab y Shift+Tab recorren los segmentos; la selección usa morado y blanco. Los años de dos cifras se completan al siglo XXI al abandonar el segmento o confirmar, sin temporizadores que interrumpan la escritura. La salida sigue siendo ISO y Rust conserva la validación definitiva.
- Los vocabularios reutilizables, como autores o géneros, recuperan valores existentes o presentan una selección visual; no obligan a reescribir datos repetidos ni a separar opciones mediante comas.
- Una inferencia de estado nunca modifica silenciosamente una entidad: la interfaz propone el cambio y permite conservar el estado actual sin descartar el nuevo registro histórico.
- Las inferencias de estado usan el diálogo compartido de NubeOS con las acciones explícitas `Mantener` y `Cambiar`; no dependen de confirmaciones nativas del WebView.
- En Archivo, restaurar y eliminar definitivamente usan el componente compartido de dos botones iconográficos: flecha circular y papelera. Las acciones aparecen con hover o foco, y permanecen disponibles mediante teclado y en dispositivos sin hover.
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

## Filtros progresivos en colecciones

Las bibliotecas de Media muestran búsqueda, favoritos y dos accesos independientes para filtrar y ordenar. Las condiciones se añaden de forma progresiva mediante un constructor compartido; Estado admite varias selecciones simultáneas y las presenta como opciones marcables, no como una etiqueta de estado de la obra. La ordenación usa su propio panel, con una etiqueta plana y un único selector delimitado, y no cuenta como filtro activo. Título alfabético es el valor predeterminado y no marca el acceso; elegir otra opción colorea el icono de ordenar. Los empates se resuelven alfabéticamente y Anime puede ordenar también por porcentaje visto. Cada condición debe poder retirarse de manera independiente y todos los controles deben conservar etiqueta accesible y navegación por teclado.

### Refinamiento de General — 2026-09-09
Las cabeceras principales de General muestran únicamente el nombre del módulo, sin antetítulos ornamentales ni frases introductorias. Los datos operativos se conservan. Hover no desplaza horizontalmente los destinos de la barra lateral. En Actividades, Reanudar permanece visible en morado cuando la actividad está pausada, sin alterar la posición de su frecuencia.
