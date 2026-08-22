# Tareas — Hábitos y rutinas

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-08-22

## Cómo usar este documento

El flujo habitual exige aprobación y ejecución individual. Excepcionalmente, Nube autorizó el 2026-08-14 redactar e implementar el conjunto hasta obtener un módulo completo que pueda revisar al día siguiente. Esta excepción no modifica los principios para módulos posteriores.

## T-001 — Modelar actividades y frecuencias

- Estado: Implementada y aprobada
- Alcance: crear identificadores, nombre, tipo, categoría, icono, estado, frecuencias y validaciones Rust.
- Criterios: solo se admiten valores cerrados; objetivos y días respetan límites; días no se duplican.
- Verificación: pruebas unitarias del dominio y `cargo test`.

**Resultado:** los tipos Rust validan identificador, nombre, tipo, categoría, icono y las cuatro frecuencias mediante conjuntos cerrados.

## T-002 — Modelar calendario, omisiones y pausas

- Estado: Implementada y aprobada
- Dependencias: T-001
- Alcance: evaluar aplicabilidad diaria, semanas de lunes a domingo, meses naturales, objetivos efectivos y pausas.
- Criterios: días estrictos, objetivos flexibles, omisiones y periodos neutrales siguen la spec.
- Verificación: pruebas con fecha fija, límites semanales, mensuales y cambio de año.

**Resultado:** el evaluador usa lunes como inicio de semana, meses naturales, días estrictos, objetivos flexibles, omisiones y pausas históricas.

## T-003 — Crear migración y repositorio SQLite

- Estado: Implementada y aprobada
- Dependencias: T-001
- Alcance: añadir tablas, restricciones, índices y repositorio del módulo.
- Criterios: datos sobreviven reapertura; migración no altera otros módulos; operaciones compuestas son transaccionales.
- Verificación: SQLite temporal, migración completa y `cargo test`.

**Resultado:** la migración 0010 crea cinco tablas propias con restricciones, índices y cascadas acotadas; la reapertura SQLite está probada.

## T-004 — Implementar catálogo y revisiones de frecuencia

- Estado: Implementada y aprobada
- Dependencias: T-003
- Alcance: crear, listar, editar, buscar, filtrar y guardar revisiones fechadas.
- Criterios: metadatos cambian sin perder historial; una frecuencia nueva no reinterpreta periodos finalizados.
- Verificación: pruebas de repositorio con dos revisiones y consultas históricas.

**Resultado:** crear y editar conserva revisiones fechadas; una prueba confirma que cada fecha resuelve la configuración que le corresponde.

## T-005 — Implementar registros históricos

- Estado: Implementada y aprobada
- Dependencias: T-002, T-003
- Alcance: completar, omitir y desmarcar una fecha válida.
- Criterios: existe una sola fila por día; estados se sustituyen; el futuro se rechaza en la frontera Rust.
- Verificación: pruebas de dominio, repositorio y comando.

**Resultado:** completar, omitir y desmarcar usan una única fila por actividad y fecha; Rust rechaza fechas futuras o no aplicables.

## T-006 — Implementar pausa, archivo y borrado

- Estado: Implementada y aprobada
- Dependencias: T-003
- Alcance: pausa indefinida, reanudación, archivo, restauración y borrado definitivo archivado.
- Criterios: pausas no penalizan; archivo conserva; borrado activo se rechaza.
- Verificación: pruebas SQLite de intervalos y cascada.

**Resultado:** pausa y archivo abren intervalos neutrales; restaurar respeta una pausa previa y el borrado definitivo exige Archivo.

## T-007 — Calcular vistas y estadísticas

- Estado: Implementada y aprobada
- Dependencias: T-002, T-004, T-005
- Alcance: producir Hoy, Mañana, Semana, Mes, progreso, porcentajes y rachas desde Rust.
- Criterios: React no replica reglas; comparativas se normalizan y respetan muestra mínima.
- Verificación: pruebas de escenarios diarios, semanales y mensuales.

**Resultado:** Rust entrega celdas, objetivos nominales y efectivos, porcentajes, rachas, última realización y próxima fecha sin cálculos de negocio en React.

## T-008 — Exponer comandos Tauri

- Estado: Implementada y aprobada
- Dependencias: T-004 a T-007
- Alcance: DTO y comandos pequeños del design, registrados en la aplicación.
- Criterios: contratos `camelCase`, errores comprensibles y ninguna escritura futura.
- Verificación: `cargo test` y `cargo clippy`.

**Resultado:** once comandos pequeños cubren catálogo, registros, ciclo de vida, orden, vistas y estadísticas con contratos `camelCase`.

## T-009 — Crear interfaz de seguimiento

- Estado: Implementada y aprobada
- Dependencias: T-008
- Alcance: vistas Hoy, Mañana, Semana y Mes con navegación y actualización reactiva.
- Criterios: completar requiere un clic; omitir es secundaria; mañana es solo lectura; semanas anteriores son editables.
- Verificación: `pnpm build` y recorrido manual.

**Resultado:** Hoy, Mañana, Semana y Mes se cargan de forma diferida, refrescan sin sustituir la vista por un cargador y cambian de día con `Europe/Madrid`.

## T-010 — Crear catálogo y formulario

- Estado: Implementada y aprobada
- Dependencias: T-008
- Alcance: catálogo, búsqueda, filtros, modal, iconos, arrastre, pausa y Archivo.
- Criterios: todos los campos de frecuencia son comprensibles; filtros no bloquean; formularios usan UI compartida.
- Verificación: `pnpm build` y recorrido manual de cada frecuencia.

**Resultado:** el catálogo incluye búsqueda, filtros, modal compartido, iconos, pausa, Archivo y arrastre por puntero compatible con WebView2.

## T-011 — Crear estadísticas

- Estado: Implementada y aprobada
- Dependencias: T-007, T-008
- Alcance: resumen global y tarjetas por actividad con rachas, porcentaje, progreso y última realización.
- Criterios: datos insuficientes no generan comparativas engañosas; hábitos y rutinas priorizan información distinta.
- Verificación: contraste con casos Rust conocidos y recorrido manual.

**Resultado:** la vista compara porcentajes con muestra mínima y muestra rachas, realizaciones, progreso y última fecha por actividad.

## T-012 — Revisar y entregar el módulo

- Estado: Revisión completada y aprobada
- Dependencias: T-001 a T-011
- Alcance: revisar duplicación, capas, accesibilidad, consultas, errores y correspondencia entre spec, design y código.
- Criterios: no queda lógica de negocio en React ni acceso cruzado a otros módulos; documentación refleja el resultado real.
- Verificación: `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets -- -D warnings`, `pnpm build`, `git diff --check` y recorrido manual de Nube.

**Resultado:** esta primera revisión quedó superada con 70 pruebas Rust. La segunda iteración continúa en T-013 a T-019 y eleva la batería total a 75 pruebas.

## T-013 — Añadir fecha de inicio y evolución de la frecuencia mensual

- Estado: Implementada y aprobada
- Dependencias: T-001, T-003, T-004
- Alcance: añadir `starts_on`, varios días orientativos mensuales y una migración compatible con datos existentes.
- Criterios: una actividad futura no genera obligaciones; los días mensuales son únicos, válidos y no superan el objetivo; el día anterior se conserva al migrar.
- Verificación: pruebas unitarias y SQLite temporal abriendo un esquema actualizado.

**Resultado:** `starts_on`, la tabla de días mensuales y la clave de icono extensible se migran sin perder los valores del esquema anterior. La fecha queda bloqueada después del primer registro.

## T-014 — Incorporar ventanas estadísticas

- Estado: Implementada y aprobada
- Dependencias: T-007, T-008, T-013
- Alcance: calcular estadísticas para semana, mes, año, historial e intervalo personalizado desde Rust.
- Criterios: ningún intervalo empieza antes de la actividad ni termina en el futuro; los comparadores usan únicamente la muestra solicitada.
- Verificación: pruebas de límites de fechas, rachas y porcentajes.

**Resultado:** Rust resuelve semana, mes, año, historial e intervalos personalizados, recorta el futuro y excluye el tiempo anterior al inicio de cada actividad.

## T-015 — Refinar formulario e iconos

- Estado: Implementada y aprobada
- Dependencias: T-010, T-013
- Alcance: fecha de inicio, selección de días semanales como excepción, editor de días mensuales e iconos adicionales.
- Criterios: el formulario sigue siendo modal, no permite combinaciones inválidas y no introduce lógica de dominio exclusiva en React.
- Verificación: `pnpm build` y recorrido manual de cada frecuencia.

**Resultado:** el modal admite fecha inicial, excepciones semanales, varios hitos mensuales e iconos de mochila, planificación, tijeras, lavadora y cama.

## T-016 — Separar hábitos y tareas en el seguimiento diario

- Estado: Implementada y aprobada
- Dependencias: T-009
- Alcance: dos columnas adaptables en Hoy y Mañana y metadatos sin repetir el tipo dentro de su propia columna.
- Criterios: una columna vacía tiene un estado claro y la vista se convierte en una sola columna en anchuras reducidas.
- Verificación: comprobación visual en escritorio y ventana estrecha.

**Resultado:** Hoy y Mañana separan hábitos y tareas recurrentes en dos paneles y vuelven a una columna mediante CSS adaptable.

## T-017 — Sustituir la omisión y el indicador habitual

- Estado: Implementada y aprobada
- Dependencias: T-009
- Alcance: conservar el checkbox binario, reemplazar la raya por `CircleMinus`/`Omitido` y usar una estrella accesible solo para días orientativos.
- Criterios: completar, omitir y volver a pendiente siguen siendo acciones inequívocas y accesibles.
- Verificación: recorrido manual de Hoy y Semana más `pnpm build`.

**Resultado:** el checkbox conserva su comportamiento binario; `CircleMinus` gestiona la omisión y adopta un estado visual diferenciado. Los días orientativos usan una estrella únicamente cuando aporta información.

## T-018 — Unificar filtros y añadir periodos estadísticos

- Estado: Implementada y aprobada
- Dependencias: T-010, T-011, T-014
- Alcance: corregir geometría de filtros del catálogo y añadir selector de periodo con fechas personalizadas.
- Criterios: controles alineados con `SelectControl`, respuestas obsoletas descartadas y refresco sin parpadeo.
- Verificación: recorrido manual y compilación TypeScript.

**Resultado:** los selectores del catálogo comparten padding y geometría; Estadísticas ofrece los cinco periodos y conserva el resultado anterior durante la recarga.

## T-019 — Revisar la segunda iteración

- Estado: Revisión completada y aprobada
- Dependencias: T-013 a T-018
- Alcance: revisar migración, reglas, duplicación, accesibilidad, diseño adaptable y correspondencia documental.
- Criterios: datos existentes sobreviven, Rust conserva la lógica de negocio y no quedan cambios ajenos al módulo.
- Verificación: `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets -- -D warnings`, `pnpm build` y `git diff --check`.

**Resultado:** las 75 pruebas Rust, Clippy estricto, el build TypeScript/Vite y `git diff --check` terminan correctamente. Falta el recorrido visual y funcional de Nube en Tauri.

## T-020 — Refinar edición y contadores diarios

- Estado: Implementada y aprobada
- Dependencias: T-004, T-009, T-016
- Alcance: mostrar el progreso independiente de hábitos y tareas, alinear las acciones diarias y permitir editar desde Hoy y Mañana.
- Criterios: cada columna indica completadas y total; editar reutiliza el modal existente; los cambios de frecuencia generan una revisión efectiva desde el día de edición y no reinterpretan periodos anteriores.
- Verificación: prueba de revisión histórica en Rust, compilación TypeScript y recorrido visual.

**Resultado:** las dos columnas muestran su propio progreso, las acciones ocupan posiciones estables y el editor es accesible desde cada actividad. El repositorio mantiene las frecuencias anteriores mediante revisiones fechadas.

## T-021 — Ampliar iconos y pulir la omisión

- Estado: Implementada y aprobada
- Dependencias: T-015, T-017
- Alcance: centrar la acción de omitir y ampliar el selector con iconos de ropa, máquina de afeitar, sábanas, toallas y ducha.
- Criterios: el icono queda centrado en un botón de tamaño fijo; el selector presenta veinte opciones en dos filas; las nuevas claves sobreviven a SQLite sin migración adicional.
- Verificación: prueba de persistencia, compilación TypeScript y recorrido visual del modal.

**Resultado:** el botón secundario tiene centrado explícito y el selector organiza veinte iconos en dos filas de diez. `icon_key` admite las nuevas opciones sin modificar datos existentes.

## T-022 — Aclarar el periodo del progreso flexible

- Estado: Implementada y aprobada
- Dependencias: T-002, T-009
- Alcance: acompañar `X de Y` con el periodo natural al que pertenece.
- Criterios: los objetivos semanales muestran «esta semana» y los mensuales «este mes» sin duplicar reglas de cálculo en React.
- Verificación: compilación TypeScript y recorrido visual de ambos tipos de objetivo.

**Resultado:** el progreso diario distingue explícitamente objetivos de esta semana y de este mes; Rust continúa siendo la autoridad de sus límites.

## T-023 — Cerrar la navegación y los periodos iniciales

- Estado: Implementada y aprobada
- Dependencias: T-002, T-009, T-022
- Alcance: retirar Mañana, mantener Hoy y avisar al editar semanas anteriores.
- Criterios: Hoy conserva el check rápido; Semana permite correcciones históricas con contexto; el futuro continúa bloqueado.
- Verificación: build TypeScript, Clippy estricto y recorrido funcional de Nube.

**Resultado:** la navegación final queda en Hoy, Semana, Mes, Estadísticas y Actividades. Las semanas pasadas advierten del efecto de las correcciones.

## T-024 — Compactar el metadato diario

- Estado: Implementada y aprobada
- Dependencias: T-016, T-022, T-023
- Alcance: representar el progreso en una línea y retirar la última realización de Hoy.
- Criterios: hábitos y tareas mantienen la misma altura; el progreso ocupa una línea; la última realización continúa disponible en Estadísticas.
- Verificación: build TypeScript y comprobación visual con objetivos diarios, semanales y mensuales.

**Resultado:** Hoy muestra únicamente el dato necesario para actuar, sin terceras líneas ni diferencias de altura causadas por el tipo de actividad.

## T-025 — Fijar el inicio de actividades en lunes

- Estado: Implementada y aprobada
- Dependencias: T-002, T-013, T-024
- Alcance: eliminar la fecha del formulario y asignar desde Rust el lunes de la semana actual.
- Criterios: crear entre semana habilita toda la semana actual; actualizar no cambia la fecha; no existe estado de periodo parcial en dominio, DTO ni interfaz.
- Verificación: pruebas Rust, build TypeScript, Clippy estricto y `git diff --check`.

**Resultado:** las actividades nuevas empiezan siempre en lunes y los días previos se pueden omitir manualmente. Los datos históricos existentes no se reescriben.

## T-026 — Cerrar la coherencia visual de acciones y semana

- Estado: Implementada y aprobada
- Dependencias: T-017, T-021, T-025
- Alcance: mostrar editar y omitir solo al interactuar con una fila, aplicar el mismo patrón al catálogo, unificar el checkbox semanal de días habituales y no habituales, aumentar la legibilidad de la frecuencia y adoptar la escala tipográfica y el scrollbar compartidos.
- Criterios: las acciones se revelan mediante puntero o foco y permanecen disponibles sin `hover`; la estrella no modifica el checkbox; completar usa el mismo tick en cualquier día; la frecuencia se lee sin forzar la vista.
- Verificación: `pnpm build` y recorrido manual de Hoy, Semana y Actividades mediante ratón y teclado.

**Resultado:** las acciones secundarias dejan de competir con el contenido hasta interactuar con la fila. Semana usa una clase explícita para el checkbox, conserva la estrella como única señal de día orientativo y aumenta el texto de frecuencia. El módulo adopta además los tokens tipográficos y el scrollbar transversal.
