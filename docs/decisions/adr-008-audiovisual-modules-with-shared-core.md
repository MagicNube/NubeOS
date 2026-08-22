# ADR-008: Tres módulos audiovisuales con núcleo compartido

- Estado: Aprobada por Nube
- Fecha: 2026-08-16
- Decisores: Nube

## Contexto

La primera versión agrupó Anime, Series y Películas en una única Biblioteca. El uso previsto es distinto: Anime necesita temporadas, películas vinculadas, OVA, especiales, orden y progreso agregado; Series solo necesita un seguimiento sencillo de estado y posición; Películas necesita una marca de visionado, fecha, puntuación y opinión. Mezclarlas en una vista introduce ruido y resta protagonismo a Anime.

Las tres áreas comparten conceptos estables —título, portada, estado, puntuación, opinión, favorito, archivo e historial— y guardarlas como implementaciones totalmente duplicadas aumentaría el coste de mantenimiento.

## Alternativas

1. **Un único módulo y una Biblioteca conjunta con filtros.** Reutiliza todo el código, pero no proporciona la separación mental ni la navegación solicitadas.
2. **Tres módulos y tres implementaciones completamente independientes.** Maximiza el aislamiento, pero duplica dominio, persistencia, comandos, portadas y correcciones.
3. **Tres módulos de producto con un núcleo audiovisual compartido.** Presenta Anime, Series y Películas como entradas independientes y comparte únicamente contratos e infraestructura estables.

## Decisión

Adoptar la alternativa 3.

La barra lateral presenta tres módulos independientes: Anime, Series y Películas. No existe una Biblioteca combinada ni una opción Todos. El código audiovisual común vive en `media`; cada workspace selecciona su área mediante un contrato explícito validado también en Rust.

- Anime contiene franquicias con contenidos y películas anime independientes.
- Series convencionales usan seguimiento simple y no permiten crear contenidos jerárquicos.
- Películas convencionales usan seguimiento binario con fecha.

SQLite conserva las tablas audiovisuales compartidas. La clasificación `is_anime` distingue una película anime independiente de una película convencional sin duplicar la entidad título. Los contenidos pertenecen exclusivamente a franquicias Anime.

## Consecuencias

### Positivas

- Cada entrada lateral tiene una experiencia enfocada.
- Anime conserva toda su potencia sin complicar Series ni Películas.
- Portadas, archivo, puntuaciones y errores se corrigen una sola vez.
- Los datos existentes se migran y no se recrean ni eliminan.

### Negativas y compromisos

- Los tres módulos dependen de un núcleo interno explícito y no son paquetes aislados.
- La clasificación audiovisual debe validarse en Rust para impedir que un título aparezca en el área equivocada.
- Un cambio del núcleo común debe revisar sus tres consumidores.

## Seguimiento

- Probar que Anime nunca muestra Series o Películas convencionales.
- Probar que una película anime independiente aparece solo en Anime.
- Revisar si Series necesita más progreso que temporada y episodio opcionales antes de ampliar su modelo.
