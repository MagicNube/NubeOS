# Tareas — Inicio

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-04
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## T-I01 — Componer consultas de módulos

- Estado: Implementada y aprobada por Nube.
- Alcance: consultar hábitos, documentos, semana de comidas, compra y trackers en curso sin persistencia propia.
- Verificación: carga parcial mediante resultados independientes y build TypeScript.

## T-I02 — Construir Dashboard responsive

- Estado: Implementada y aprobada por Nube.
- Alcance: cinco bloques, estados vacíos, fecha, refresco y navegación directa.
- Verificación: revisar distintas densidades de datos y anchos de ventana.

## T-I03 — Añadir acción rápida de hábitos

- Estado: Implementada y aprobada por Nube.
- Alcance: completar o desmarcar el registro del día mediante el caso de uso existente.
- Verificación: alternar un hábito, abrir Hábitos y comprobar el mismo estado.

## T-I04 — Revisar Inicio con datos reales

- Estado: Implementada y aprobada por Nube.
- Alcance: ajustar jerarquía, contenido máximo y comportamiento de los bloques tras uso real.

## T-I05 — Aprovechar la cabecera con contexto y actividad

- Estado: Implementada y aprobada por Nube.
- Alcance: saludo horario, fecha completa y contadores reales de hábitos, contenido en curso, recetas y documentos.

## T-I06 — Integrar el botón Atrás del ratón

- Estado: Implementada y aprobada por Nube.
- Alcance: cerrar primero cualquier diálogo o detalle activo y conservar un historial interno de los módulos visitados para el botón lateral Atrás.
- Restricciones: no abandonar el documento principal del WebView ni interferir con los botones primario y secundario del ratón.
- Verificación: abrir y cerrar detalles, recorrer varios módulos y retroceder sucesivamente hasta Inicio.

## T-I07 — Simplificar y estabilizar la navegación lateral

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: presentar General y Entretenimiento con una jerarquía secundaria limpia, reducir Contraer a un control iconográfico accesible y conservar la posición vertical de todos los destinos al plegar la barra.
- Restricciones: las categorías continúan siendo rótulos no interactivos; el estado contraído no puede provocar saltos verticales ni ocultar el nombre accesible del control.
- Verificación: alternar varias veces entre barra expandida y contraída, además de comprobar la disposición estrecha y la navegación por teclado.

**Resultado:** el control vive como pestaña compacta en el borde superior derecho. Los textos de destino se ocultan mediante una clase específica; la navegación contraída recibe su anchura real de 42 px para que los SVG no queden centrados fuera del recorte y conserva las mismas posiciones verticales que la vista expandida.

## T-I08 — Aplicar la identidad visual de NubeOS

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: convertir la propuesta Prisma elegida en un recurso vectorial común, mostrarlo en la identidad de la barra lateral y generar desde él todos los iconos requeridos por los bundles de escritorio y móvil.
- Restricciones: conservar una silueta reconocible en tamaños pequeños, sin introducir una dependencia gráfica ni alterar la navegación.
- Verificación: inspección del icono exportado y build NSIS de producción.

**Resultado:** la N blanca sobre el prisma morado sustituye la marca provisional de texto y Tauri genera ICO, ICNS, PNG, Appx, Android e iOS desde la misma fuente SVG.

## T-I09 — Contener el acento de la barra lateral

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: limitar el degradado morado al bloque de marca y situar Contraer completamente dentro de la cabecera, dejando la navegación sobre una superficie sobria.
- Restricciones: no desplazar ni ocultar los iconos al plegar la barra; mantener foco, tooltip y nombre accesible.
- Verificación: alternar ambos estados en escritorio y anchura estrecha. Build TypeScript/Vite correcta; sin build instalable.

## T-I10 — Dejar la barra lateral completamente plana

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: retirar degradados y contenedores ornamentales de la marca y la selección, conservar únicamente logo y nombre, y devolver Contraer a una segunda fila centrada y estable.
- Restricciones: mantener visibles los iconos y su posición al plegar la barra; conservar el marco nativo de Windows y sus controles.
- Verificación: comparar barra expandida, contraída y anchura estrecha; TypeScript/Vite correcto.

## T-I11 — Limpiar el marco de escritorio y fijar la contracción al pie

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: sustituir el marco nativo visible por una barra de título propia, plana y neutra; retirar su icono duplicado y llevar el control de contracción al extremo del pie de la navegación expandida.
- Restricciones: conservar redimensionado, arrastre, doble clic para maximizar y controles accesibles de minimizar, maximizar o restaurar y cerrar; no alterar la posición de los destinos al plegar la barra lateral.
- Verificación: probar los controles y el arrastre en Windows, alternar la barra lateral expandida y contraída y ejecutar el build TypeScript/Vite.

**Corrección posterior:** la capability de ventana se declara explícitamente en la configuración y el arrastre se inicia solo desde la superficie vacía de la barra. Los errores nativos ya no se silencian; el tooltip lateral se reduce a `Contraer` o `Expandir`.

## T-I12 — Igualar la animación lateral y simplificar el logotipo

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: conservar la transición de anchura tanto al contraer como al expandir la barra lateral y sustituir la marca con degradado por la opción A plana, con fondo morado sólido y N blanca.
- Restricciones: los textos desaparecen progresivamente sin alterar la posición vertical de los destinos; `prefers-reduced-motion` continúa desactivando la transición.
- Verificación: alternar repetidamente ambos estados de la barra, revisar el icono a tamaños pequeños y generar el bundle NSIS de producción.
