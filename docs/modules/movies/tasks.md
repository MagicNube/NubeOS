# Tareas — Películas

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-06
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## T-P01 — Separar Películas de Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: entrada lateral propia y clasificación de películas convencionales.

## T-P02 — Implementar seguimiento binario

- Estado: Implementada y aprobada por Nube.
- Alcance: marcar vista o pendiente con fecha, estado e historial coherentes.

## T-P03 — Crear Biblioteca y detalle simples

- Estado: Implementada y aprobada por Nube.
- Alcance: tarjetas, filtros, formulario, detalle y Archivo.

## T-P04 — Verificar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Verificación: migraciones, pruebas Rust, Clippy, build y uso manual.

**Resultado:** clasificación Anime/Películas y progreso binario verificados en Rust; build TypeScript/Vite correcta.

## T-P05 — Migrar visionados a recorridos audiovisuales

- Estado: Implementada y aprobada por Nube.
- Alcance: usar `MovieViewing`, migrar la fecha existente y derivar el estado binario de uno o más visionados.
- Verificación: películas pendientes, vistas una vez y con fechas existentes.

## T-P06 — Implementar múltiples visionados

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-P05
- Alcance: marcar vista, volver a ver, corregir fecha y retirar un visionado.
- Verificación: estado coherente con cero, uno y varios visionados.

## T-P07 — Añadir Historial y contador

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-P06
- Alcance: API, vista Historial, filtros y acciones rápidas en detalle.
- Verificación: build y recorrido con dos visionados.

## T-P08 — Revisar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-P05 a T-P07
- Verificación: pruebas Rust, Clippy, formato, build y uso manual.

## T-P09 — Unificar tarjetas, detalle y controles

- Estado: Implementada y aprobada por Nube.
- Alcance: portadas horizontales completas, filtros de Historial normalizados, favorito con estrella y detalle dividido en Resumen e Historial con métricas compartidas.
- Verificación: build y prueba manual con película pendiente, un visionado y varios revisionados.

## T-P10 — Añadir estadísticas filtrables y geometría común

- Estado: Implementada y aprobada por Nube.
- Alcance: tarjeta horizontal común con Series y Videojuegos, más filtros estadísticos por año y puntuación mínima calculados en Rust.
- Verificación: build, pruebas Rust y prueba manual con varios años.

## T-P11 — Completar favorito y encuadre de portada

- Estado: Implementada y aprobada por Nube.
- Alcance: favorito rápido desde Biblioteca y recolocación persistente de la portada horizontal.
- Verificación: alternar favorito sin abrir la película y recuperar el encuadre tras reiniciar.

**Resultado:** la estrella rápida está disponible en Biblioteca y detalle sin anidar botones; el mismo editor de encuadre horizontal persiste las coordenadas en `media_titles`. Build TypeScript/Vite, 112 pruebas Rust y Clippy estricto correctos.

## T-P12 — Normalizar filtros y encuadre

- Estado: Implementada y aprobada por Nube.
- Alcance: aplicar a Estadísticas los selectores oscuros comunes y robustecer el ajuste persistente de portada mediante arrastre y controles de eje.
- Verificación: probar años y umbrales de puntuación, foco por teclado, opciones en tema oscuro y encuadre horizontal persistido.

**Resultado:** los dos filtros usan borde, fondo, tipografía, foco, flecha y opciones del tema oscuro; el editor compartido mantiene el arrastre fuera del marco y permite corregir ambos ejes mediante controles explícitos. Build TypeScript/Vite y `git diff --check` correctos; comprobación visual en Tauri pendiente.

## T-P13 — Consolidar historial y sustitución de portadas

- Estado: Implementada y aprobada por Nube.
- Alcance: estructurar el alta de visionados con fecha etiquetada y acción principal; reemplazar portadas directamente, retirarlas con papelera y refrescar Biblioteca y detalle sin reiniciar.
- Verificación: registrar primer visionado y revisionados, sustituir y quitar portadas, y ejecutar el build TypeScript/Vite.

## T-P14 — Homogeneizar formulario, tarjetas e historial

- Estado: Implementada y aprobada por Nube.
- Alcance: usar ejemplos y favorito consistentes, mostrar estado fuera de la portada y último visionado en la tarjeta, persistir la ordenación y presentar el historial con la cabecera común de trackers.
- Restricciones: un revisionado no puede ser anterior al primer visionado existente.
- Verificación: registrar visionados válidos e inválidos, revisar tarjetas, favoritos y ordenación tras reiniciar.

## T-P15 — Normalizar el historial con los trackers simples

- Estado: Implementada y aprobada por Nube.
- Alcance: sustituir la edición flotante por una cabecera con contador, acciones Registrar visionado/Ver hoy, filas compactas y un formulario modal de fecha.
- Verificación: añadir un visionado de hoy, registrar una fecha anterior válida y editar o eliminar una fila existente.

## T-P16 — Unificar también el historial general

- Estado: Implementada y aprobada por Nube.
- Alcance: presentar el historial general con las mismas filas, icono morado, tipografía, acciones iconográficas y estados hover que Lectura y Videojuegos, reutilizando el formulario modal del detalle.
- Verificación: filtrar visionados, editar su fecha mediante el formulario y eliminar una entrada sin mostrar campos permanentes.

## T-P17 — Separar historial y estado manual

- Estado: Implementada y aprobada por Nube.
- Alcance: avisar si crear, editar o eliminar un visionado sugiere otro estado y permitir mantener el estado elegido sin descartar la fecha.
- Restricciones: cambiar manualmente el estado nunca crea un visionado con la fecha actual; `Ver hoy` es secundaria y `Registrar visionado` es principal.
- Verificación: registrar una película antigua como Pendiente, aceptar o mantener su estado, editar y eliminar el último visionado y comprobar que el historial permanece coherente.

**Resultado:** visionados y estado pueden evolucionar juntos por decisión explícita, pero ninguno altera silenciosamente al otro.

## T-P18 — Completar acciones y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: convertir Editar en acción iconográfica, retirar la estrella duplicada de la identidad y añadir Top 5/10/15/25, distribución por estado y actividad registrada.
- Verificación: abrir una película favorita y otra normal, editar ambas y cambiar el tamaño del ranking con filtros activos.

**Resultado:** Favorito se comunica mediante su botón activo y Estadísticas ofrece tanto agregados como una clasificación personal configurable.

## T-P19 — Normalizar fechas y filtros Media

- Estado: Implementada y aprobada por Nube.
- Alcance: aceptar años de dos cifras en visionados y adoptar la barra común de búsqueda, filtros, ordenación y favoritos.
- Restricciones: no modificar los visionados existentes ni la semántica binaria de Pendiente/Vista.
- Verificación: introducir `26` y `19`, combinar todos los filtros y revisar el texto completo de la ordenación en escritorio y anchura intermedia.

**Resultado:** las fechas de visionado aceptan años abreviados y la biblioteca comparte controles adaptables y legibles con los otros cuatro trackers.

## T-P20 — Adoptar la navegación contextual compartida

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: identificar Películas en la ruta fija, mostrar un único título por vista, mover acciones a la barra contextual y colocar las pestañas bajo el título.
- Verificación: comprobación TypeScript y revisión de whitespace correctas; sin build instalable en esta tarea.

## T-P21 — Simplificar identidad, ruta y filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: ruta dinámica por vista, cabecera reducida a Películas y filtros secundarios plegables con contador.
- Verificación: TypeScript correcto y estructura visual compartida revisada; sin build instalable.

## T-P22 — Limpiar cabecera y contador de filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: usar un título plano, colocar Archivo y Añadir película junto a las vistas y excluir la ordenación del contador de filtros.
- Verificación: TypeScript correcto y comprobación visual de la cabecera compartida; sin build instalable.

## T-P23 — Ampliar filtros de Biblioteca

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: añadir género, puntuación, año y número de visionados mediante un constructor progresivo con ordenación separada; usar título alfabético como valor neutro, señalar en morado cualquier alternativa, aplicar los filtros sin recargar la colección y ocultar las acciones del historial hasta `hover` o foco.

## T-P24 — Permitir varios estados y ordenar con estabilidad

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: convertir Estado en una condición multiselección, colocar Título primero y resolver alfabéticamente los empates de puntuación y fechas.
- Verificación: combinar varios estados y revisar órdenes con valores repetidos. Build TypeScript/Vite correcta; sin build instalable.

## T-P25 — Guardar una ordenación predeterminada explícita

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: separar el orden temporal del predeterminado, mantener Título A–Z como inicio neutro y ofrecer Guardar como predeterminado dentro del panel de ordenación compartido.
- Verificación: elegir, guardar y sustituir una preferencia; TypeScript/Vite correcto.
