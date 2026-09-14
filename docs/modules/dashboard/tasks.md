# Tareas — Inicio

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-07
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

- Estado: Implementada y aprobada por Nube.
- Alcance: conservar la transición de anchura tanto al contraer como al expandir la barra lateral y sustituir la marca con degradado por la opción A plana, con fondo morado sólido y N blanca.
- Restricciones: los textos desaparecen progresivamente sin alterar la posición vertical de los destinos; `prefers-reduced-motion` continúa desactivando la transición.
- Verificación: alternar repetidamente ambos estados de la barra, revisar el icono a tamaños pequeños y generar el bundle NSIS de producción.

**Resultado:** Nube confirmó el 2026-09-07 que la contracción y la expansión se perciben suaves. La opción A plana queda como identidad elegida.

## T-I13 — Reparar el inicio automático en Windows

- Estado: Implementada; mecanismo local corregido el 2026-09-09, comprobación tras reinicio pendiente de Nube.
- Alcance: registrar la ruta real del ejecutable instalado en el inicio del usuario cada vez que se abre una build de producción.
- Restricciones: no registrar ejecutables de desarrollo, no mostrar una consola auxiliar y no impedir la apertura de NubeOS si Windows rechaza la actualización.
- Verificación: instalar y abrir la build, comprobar `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` y reiniciar Windows.

**Resultado:** la candidata del 2026-09-07 quedó instalada en `C:\Users\jesus\Applications\NubeOS\nubeos.exe`. El valor `NubeOS` del registro y el acceso directo del menú Inicio apuntan a ese ejecutable; la instalación obsoleta de `%LOCALAPPDATA%\NubeOS` se apartó dentro de la copia preventiva. El icono incrustado del ejecutable instalado coincide con la identidad morada actual. Solo queda validar el arranque después de un inicio de sesión real.

**Corrección operativa del 2026-09-09:** el valor `Run` desaparecía después de crearlo, tanto desde NubeOS como manualmente, y la carpeta Inicio también neutralizaba el destino del acceso directo. Se registró la tarea local `NubeOS` al iniciar sesión de `NUBE-PC\jesus`, con token interactivo, privilegios normales, política de instancia única y destino en la instalación vigente. El acceso defectuoso volvió a quedar deshabilitado; falta comprobar la tarea en el siguiente inicio de sesión real.

## T-I14 — Resolver la auditoría transversal de interfaz

- Estado: Implementada el 2026-09-08.
- Alcance: conservar nombres accesibles al contraer la navegación, hacer inerte el fondo de los modales, anunciar avisos dinámicos, corregir contraste, escala tipográfica, solapamientos, ruta de Inicio y textos de los módulos futuros. Unificar también las confirmaciones visuales mediante el componente compartido sin cambiar reglas de negocio.
- Restricciones: Finanzas y Proyectos continúan aplazados, sin funciones ni promesas de alcance; no se modifican dominio, persistencia ni contratos Tauri.
- Verificación: build TypeScript/Vite, pruebas de interfaz, árbol de accesibilidad, teclado, 200 % de zoom y contraste medido en ejecución.

**Resultado:** la navegación compacta conserva iconos y nombres accesibles desde 320 px; Inicio refluye sin solapamientos ni desplazamiento horizontal, sus textos auditados alcanzan contraste AA y 12 px como mínimo; los avisos se anuncian, la ruta identifica Inicio y Finanzas/Proyectos se presentan sin prometer un alcance todavía no diseñado. Los modales compartidos se renderizan sobre `body`, aíslan el fondo y contienen el foco y el desplazamiento.

## T-I15 — Retirar la barra de rutas y recuperar su espacio

- Estado: Implementada el 2026-09-08.
- Alcance: retirar la fila global `NubeOS › módulo › vista` y dedicar toda la altura recuperada al contenido de cada módulo.
- Restricciones: no cambiar navegación, historial atrás/adelante, barra lateral ni cabeceras propias de los módulos.
- Verificación: build, navegación entre módulos, botón lateral del ratón y revisión visual en tamaños ancho y estrecho.

**Resultado:** se retiró la fila global de ruta y el área de trabajo pasó a dedicar toda su altura al módulo activo. La navegación lateral, el historial interno y las cabeceras de cada módulo conservan sus responsabilidades; el build y las pruebas de interfaz verifican que no queda espacio reservado para la fila eliminada.

## T-I16 — Corregir Inicio y simplificar General

- Estado: Implementada por petición directa de Nube el 2026-09-09; comprobaciones técnicas superadas.
- Alcance: R-03 a R-06; cambio de día, errores de hábitos, nombres del plan, cierre de alertdialog con Atrás; quitar desplazamiento lateral en hover y dejar únicamente el título en las cabeceras de General.
- Módulos afectados: cascarón compartido, Inicio y cabeceras de Comidas, Hábitos, Documentos, Finanzas y Proyectos; sin nuevas funciones de los módulos aplazados.
- Verificación: reloj controlado, errores de comandos, nombres de productos y recetas archivadas, diálogos y comprobación visual de hover y cabeceras; build y pruebas frontend.


**Resultado T-I16:** implementada. Se verificó en navegador un cambio de domingo a lunes, bloqueo de escritura obsoleta, error visible y reintento, nombres de productos y recetas archivadas, alertdialog y dos confirmaciones superpuestas. Cabeceras de General simplificadas; la selección lateral conserva exactamente sus coordenadas al interactuar. Pasan 45 pruebas frontend y build TypeScript/Vite. Fixture repetible: tests/general-review.html.


- Limpieza T-I16: retirados también los antetítulos redundantes de las colecciones de Documentos, Productos, Comidas y Actividades; se conservan títulos, contadores y las advertencias útiles de formularios.

**Reapertura T-I13 — 2026-09-11, petición directa de Nube:** diagnosticar el cierre al iniciar sesión y actualizar la instalación compatible. La tarea se ejecuta pero devuelve 101; el ejecutable instalado falla con DatabaseTooFarAhead. Alcance: sustituir únicamente el ejecutable obsoleto, conservar una copia del binario y verificar el arranque desde la tarea existente, sin rebajar el esquema ni restaurar datos antiguos.

**Resultado 2026-09-11:** ejecutable instalado actualizado y abierto correctamente desde la tarea, con ventana que responde. Inicio unificado en Run del plugin oficial, con StartupApproved habilitado; tarea redundante deshabilitada. Copia del binario anterior conservada; sin restaurar ni rebajar datos. Build y 202 pruebas correctos. Reinicio real pendiente.

**Verificación tras reinicio — 2026-09-11:** Nube confirma que inicia correctamente. Comprobada una sola instancia del ejecutable instalado, una entrada Run habilitada y la tarea antigua deshabilitada. El acceso NubeOS.lnk.disabled conservaba fechas del 3/6 de septiembre; se apartó de Inicio a Applications\NubeOS\backups\startup-cleanup-20260911, sin modificar el inicio de otras aplicaciones.

## T-I17 — Instancia única y nombre en Windows
- Estado: aprobada por petición directa de Nube el 2026-09-13.
- Alcance: impedir una segunda instancia y mostrar/restaurar/enfocar la existente; título nativo NubeOS para la vista previa, sin texto en la barra propia.
- Verificación: build, aperturas repetidas, ventana minimizada y título nativo; actualizar instalación conservando el binario anterior.

**Resultado T-I17 — 2026-09-13:** código implementado y build de producción generado; 157 pruebas Rust y 45 frontend correctas. Integración mediante plugin oficial v2.4.4 registrado primero; título nativo NubeOS sin modificar la cabecera React. Instalación y prueba de aperturas repetidas pendientes: la instancia en AppData\Local\NubeOS no respondió al cierre normal ni al botón de cierre; auto-review rechazó terminar el proceso por posible pérdida de cambios. Ninguna de las dos instalaciones fue sustituida.

**T-I17 completada — 2026-09-13:** tras el cierre confirmado por Nube, se retiró el proceso antiguo sin ventana y se reconstruyeron el ejecutable y el instalador NSIS. Ambas copias instaladas fueron actualizadas con respaldo de sus binarios anteriores. Inicio Run y accesos del menú Inicio/barra de tareas apuntan a AppData\Local\NubeOS; tarea antigua deshabilitada y carpeta Inicio sin accesos residuales. Tres aperturas adicionales desde ambas rutas terminaron con código 0 conservando el PID original. Verificada otra apertura con la ventana minimizada: se restaura sin activación manual. Windows expone el título NubeOS; el encabezado React conserva únicamente los controles. SHA-256 instalado: 7BA268111ECFD4DB5C052727168A5DFD2593E3AA63376552D29526550A0DBB2C.
