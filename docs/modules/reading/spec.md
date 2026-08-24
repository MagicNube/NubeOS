# Spec — Lectura

- Estado: Ampliación de relecturas implementada; comprobación manual pendiente
- Última actualización: 2026-08-23

## Objetivo

Mantener una biblioteca personal de libros pendientes, en lectura y terminados, con el contexto mínimo necesario para decidir qué leer y recordar la experiencia.

## Funcionalidades

- Vistas `Biblioteca`, `Leyendo` y `Estadísticas`, con Biblioteca como vista inicial.
- Crear, consultar y editar libros mediante formularios modales.
- Guardar título, autor, uno o varios géneros de una lista cerrada, estado, puntuación, opinión y portada local. Las fechas pertenecen a cada periodo de lectura.
- Registrar cada lectura o relectura como un periodo independiente con fecha inicial y final.
- Iniciar una relectura sin sobrescribir las fechas de lecturas anteriores.
- Consultar, corregir y eliminar periodos desde una vista Historial.
- Estados: Pendiente, Leyendo, En pausa, Terminado y Abandonado.
- Buscar por título o autor y filtrar por estado y género. El filtro de favoritos solo aparece en Biblioteca.
- Marcar un libro como favorito con una estrella vacía o rellena.
- Ordenar la Biblioteca por actualización, título, autor o puntuación.
- Mostrar cada libro con una portada vertical de altura uniforme y distribuir a su lado estado, identidad, géneros, fechas y puntuación.
- Mostrar puntuaciones de 0 a 10, con un decimal y la escala cromática SeriesGraph usada por los módulos audiovisuales.
- Archivar, restaurar y eliminar definitivamente con confirmación.
- Restaurar y eliminar definitivamente desde Archivo mediante dos acciones iconográficas comunes al resto de módulos.
- Resumir totales por estado, media de puntuación y géneros más frecuentes.
- Dividir el detalle en `Resumen` e `Historial`: el resumen muestra puntuación, lecturas y estado; el historial concentra lecturas, relecturas y acciones.

## Reglas

- Título y autor son obligatorios y se normalizan antes de guardar.
- Un libro puede tener varios géneros sin duplicados.
- La puntuación es opcional; cuando existe debe estar entre 0 y 10 y tener como máximo un decimal.
- La fecha final no puede ser anterior a la fecha inicial.
- Terminar un libro no inventa fechas. Las fechas continúan siendo datos explícitos del usuario.
- Solo puede existir una lectura sin fecha final por libro.
- Iniciar una lectura establece el estado Leyendo; finalizarla establece Terminado.
- Pausar o abandonar conserva el periodo abierto.
- La puntuación y la opinión pertenecen al libro y no se duplican por relectura.
- Archivar no elimina ni modifica la información del libro.
- El borrado definitivo solo está disponible desde Archivo.
- El filtro Favoritos es una estrella compacta: vacía cuando está inactivo y rellena cuando está activo.
- Los géneros disponibles inicialmente son Fantasía, Ciencia ficción, Romance, Misterio y suspense, Terror, Aventura, Novela histórica, Desarrollo personal, Psicología y Otro.
- La portada es opcional, se copia al almacenamiento privado de NubeOS y admite JPEG, PNG o WebP de hasta 8 MB.
- La portada también puede pegarse desde el portapapeles; NubeOS la normaliza a JPEG antes de guardarla.

## Referencia de Notion

Los CSV aportados se usan únicamente para validar el modelo. Contienen 27 libros y los campos Título, Autor/a, Estado, Inicio, Fin, Género, Valoración, Portada y Prioridad.

- Prioridad no forma parte de NubeOS.
- No se importan libros, portadas, URLs ni valoraciones.
- `Sin empezar`, `En progreso`, `Pausa temporal` y `Acabado` se corresponden conceptualmente con los estados definidos por NubeOS. Los registros antiguos de `Investigar`, si existieran, se migran a Pendiente.

## Fuera de alcance

- Importar automáticamente los CSV de Notion.
- Prioridad, objetivos de páginas, sesiones de lectura o progreso por página.
- Archivos EPUB/PDF, citas, notas por capítulo o préstamos.
- APIs externas, ISBN, recomendaciones o sincronización.
- Seguimiento por páginas, sesiones diarias o tiempo de lectura.

## Criterios de aceptación

- [x] La aplicación parte con una biblioteca vacía y no contiene datos de los CSV.
- [x] Se puede crear y recuperar un libro con todos los campos aprobados.
- [x] Las validaciones de título, autor, puntuación y fechas se aplican en Rust.
- [ ] Búsqueda, estado, género, favorito y ordenación pueden combinarse.
- [ ] En lectura contiene únicamente libros con estado Leyendo o En pausa.
- [x] Biblioteca es la vista inicial y Leyendo no muestra el filtro Favoritos.
- [x] El formulario ofrece géneros predefinidos sin texto libre.
- [x] Una portada seleccionada se copia al espacio privado y puede sustituirse o eliminarse.
- [x] La puntuación usa valor numérico y colores SeriesGraph, no estrellas acumulativas.
- [x] Archivo permite restaurar y exige confirmación antes del borrado definitivo.
- [x] Las estadísticas se calculan desde los datos persistidos.
- [x] Se puede iniciar y finalizar una relectura sin modificar periodos anteriores.
- [ ] El historial permite corregir y retirar periodos de lectura.
- [ ] Los campos de inicio y fin visibles representan la lectura actual o la última lectura, no un dato sobrescrito manualmente.
