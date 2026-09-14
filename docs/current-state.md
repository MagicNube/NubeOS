# Estado actual de NubeOS

- Estado: referencia operativa vigente
- Última actualización: 2026-09-09

Este documento es el punto de entrada para entender la aplicación tal como existe hoy. Resume el producto, conecta la documentación detallada con el código y distingue lo implementado de lo pendiente. No sustituye las specs, los diseños, las tareas ni las ADR.

## Qué es NubeOS

NubeOS es una aplicación de escritorio personal y local para reunir organización diaria y seguimiento privado. No requiere una cuenta ni un servidor. React presenta la interfaz, Rust contiene las reglas y SQLite conserva los datos en el equipo.

La aplicación prioriza privacidad, corrección de datos, formularios de baja fricción y una interfaz oscura, sobria y coherente. Los datos personales y los artefactos de compilación no forman parte del repositorio.

## Cómo orientarse

Para comprender el conjunto antes de modificarlo, leer en este orden:

1. `vision.md`: propósito, usuario y límites.
2. Este documento: estado real, mapa funcional y operación.
3. `architecture.md` y `principles.md`: fronteras técnicas y reglas transversales.
4. `modules/<modulo>/spec.md`, `design.md` y `tasks.md`: comportamiento, diseño y trazabilidad de un área concreta.
5. `decisions/`: decisiones arquitectónicas aprobadas.
6. `roadmap.md`, `todo.md` y `releases/`: futuro, pendientes y estado de las builds instalables.

`review-2026-09-03.md` es el acta histórica del cierre documental de la primera versión, no el índice vigente de tareas.

## Mapa funcional

| Área visible | Estado | Responsabilidad principal |
| --- | --- | --- |
| Inicio | Implementada y cerrada | Resumen diario de hábitos, comidas, entretenimiento y documentos sin persistencia propia. |
| Comidas y compras | Implementada y cerrada, con refinamientos posteriores | Productos, comidas, productos directos, plan semanal y lista de compra derivada. |
| Documentos | Implementada y cerrada | Archivo local de PDF, metadatos, favoritos, etiquetas y caducidades. |
| Hábitos | Implementada y cerrada | Hábitos y tareas recurrentes, frecuencias, registros diarios, historial y estadísticas. |
| Anime | Implementada y cerrada, con refinamientos posteriores | Biblioteca de franquicias y películas anime, contenidos ordenados, episodios, recorridos, revisionados, historial y estadísticas. |
| Lectura | Implementada y cerrada, con refinamientos posteriores | Biblioteca de libros, periodos de lectura y relectura, historial y estadísticas. |
| Videojuegos | Implementada y cerrada, con refinamientos posteriores | Biblioteca de juegos, partidas y rejugadas, historial y estadísticas. |
| Películas | Implementada y cerrada, con refinamientos posteriores | Biblioteca independiente de películas, visionados repetibles, historial y estadísticas. |
| Series | Implementada y cerrada, con refinamientos posteriores | Biblioteca independiente de series y periodos de visionado, historial y estadísticas. |
| Estadísticas MEDIA | Implementada y cerrada, con refinamientos posteriores | Resumen, rankings, exploración, evolución y calendario compartidos por los cinco trackers. |
| Finanzas | No diseñada | Marcador de navegación y documentación inicial; requiere brainstorming, spec, diseño y tareas. |
| Proyectos | No diseñado | Marcador de navegación y documentación inicial; requiere brainstorming, spec, diseño y tareas. |

«Cerrada» describe el alcance aprobado, no impide mejoras posteriores. Cada refinamiento nuevo debe quedar acotado en la tarea del módulo correspondiente.

## Navegación y convenciones actuales

- La barra lateral separa destinos generales y entretenimiento, puede contraerse y conserva la posición de los iconos durante una transición suave.
- El contenido comienza inmediatamente bajo la barra de título: el módulo se identifica en su cabecera y la vista activa en sus pestañas, sin una fila global de ruta.
- Anime usa `Biblioteca`, `En curso`, `Historial` y `Estadísticas`. Lectura y Videojuegos añaden sus vistas activas `Leyendo` y `Jugando`. Películas y Series mantienen una navegación más corta acorde a su dominio.
- Las colecciones comparten búsqueda, favorito, filtros progresivos y ordenación separada. El orden alfabético es neutro; otros órdenes pueden guardarse como preferencia.
- Los detalles de trackers simples separan `Resumen` e `Historial`. Anime conserva una jerarquía propia porque una obra contiene temporadas, películas, OVA o especiales.
- Ningún historial cambia silenciosamente el estado de una obra: cuando existe una inferencia, la interfaz propone cambiarlo o mantenerlo.
- Portadas, GIF, puntuaciones, fechas segmentadas, avisos, modales y estadísticas reutilizan componentes y reglas transversales descritos en `principles.md`.

## Mapa del código

| Ruta | Contenido |
| --- | --- |
| `src/App.tsx` y `src/styles.css` | Cascarón de escritorio, barra de título, navegación global y estilos base. |
| `src/ui/` | Componentes compartidos: modales, fechas, filtros, ordenación, puntuaciones, estadísticas y contexto de vistas. |
| `src/media/` | Interfaz compartida de Anime, Películas y Series; Anime conserva componentes especializados. |
| `src/reading/` y `src/games/` | Interfaces de Lectura y Videojuegos. |
| `src/dashboard/`, `src/meals/`, `src/documents/`, `src/habits/` | Interfaces del resto de módulos implementados. |
| `src-tauri/src/<modulo>/` | Dominio, servicios, repositorios y comandos Rust de cada área. |
| `src-tauri/src/media/` | Núcleo audiovisual compartido por Anime, Películas y Series según ADR-008. |
| `src-tauri/src/lib.rs` | Composición de Tauri, estados, comandos, ventana principal e inicio automático de producción. |
| `src-tauri/migrations/` | Esquema SQLite evolutivo; el código registra las migraciones `0001` a `0039`; la instalación descrita más abajo sigue en `0038`. |

La interfaz nunca accede directamente a SQLite. Sus funciones `api.ts` invocan comandos pequeños de Tauri; Rust valida las reglas y los repositorios persisten los cambios.

## Persistencia y datos privados

- El identificador de la aplicación es `com.jesus.nubeos`.
- Tauri resuelve el directorio de datos de la aplicación. Dentro se guardan `nubeos.sqlite3` y las carpetas administradas de documentos y portadas.
- En la instalación actual de Windows, esos datos viven bajo `%APPDATA%\com.jesus.nubeos` y son independientes del ejecutable y del instalador.
- Las migraciones se aplican al abrir la base. Una build correcta no demuestra por sí sola que una migración se haya probado con los datos personales instalados.
- No existe aún copia automática, restauración, exportación completa ni sincronización. Antes de una actualización sensible del esquema se realiza una copia preventiva manual.

## Desarrollo, build e instalación

Desde la raiz del repositorio:

```powershell
npm install
npm run tauri dev
```

`npm run build` verifica TypeScript y genera el frontend. La candidata instalable de Windows se crea con:

```powershell
npm run tauri build -- --bundles nsis
```

El instalador queda en `src-tauri/target/release/bundle/nsis/NubeOS_0.1.0_x64-setup.exe`. Compilar no actualiza la aplicación instalada: es necesario cerrar NubeOS y ejecutar el instalador.

La instalación actual usa `C:\Users\jesus\Applications\NubeOS\nubeos.exe`. Desde el 2026-09-11, el plugin oficial de autostart registra esa ruta en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. La tarea programada `NubeOS` queda deshabilitada para evitar dos aperturas. El acceso antiguo `NubeOS.lnk.disabled` no interviene. La hipótesis previa de neutralización externa no se ha confirmado en esta revisión; las lecturas dentro del sandbox no reflejaban toda la configuración real. La comprobación definitiva tras reiniciar Windows sigue pendiente.

## Estado de la candidata actual

La candidata anterior se generó e instaló el 2026-09-09. Incluye la migración `0038`, productos directos en el planificador, el selector compacto, la identidad plana y la barra de título propia. En esa fecha se configuró una tarea programada de Windows; véase la reparación del 2026-09-11 al final de este documento.

Antes de instalarla se copiaron la base, los 209 archivos de datos administrados y el ejecutable anterior en `%APPDATA%\com.jesus.nubeos\backups\2026-09-09-before-rebuild`. La base copiada coincide por SHA-256; la instalación abre, responde y carga los datos reales con SQLite en versión 38, integridad correcta y ninguna clave foránea inválida.

Pendientes de validación manual de esa candidata:

- reiniciar Windows y confirmar el arranque automático;
- continuar las revisiones de uso real que siguen abiertas en `todo.md` y en las tareas de cada módulo.

## Trabajo futuro reconocido

- Wrapped global de MEDIA.
- Diseño e implementación de Finanzas y Proyectos.
- Copias, restauración, exportación completa y sincronización, solo cuando se apruebe su alcance.
- Preferencia visible para activar o desactivar el inicio automático; hoy Windows permite deshabilitarlo desde sus aplicaciones de inicio, pero NubeOS no ofrece aún ese ajuste.

## Regla para otra conversación

Esta documentación permite comprender el producto, sus módulos, sus reglas, su arquitectura y el estado de distribución. Antes de cambiar código, otra conversación debe aún:

1. leer `AGENTS.md` y los documentos del módulo afectado;
2. revisar `git status` y conservar cambios ajenos;
3. inspeccionar el código concreto para firmas y detalles de implementación;
4. no abrir, copiar, borrar ni modificar datos personales salvo autorización explícita;
5. distinguir siempre entre código compilado, instalador generado e instalación realmente actualizada.

## Cambios posteriores a la candidata instalada — 2026-09-09
El código corrige los seis hallazgos de review-2026-09-09.md, añade Pausar todos en Actividades, estabiliza la frecuencia y la barra lateral y simplifica las cabeceras de General. La migración 0039 añade la revisión técnica de PDF para su recuperación tras interrupciones. Verificación: 157 pruebas Rust, 45 pruebas frontend, Clippy, build y recorrido aislado en navegador. Estos cambios se incorporaron al ejecutable instalado en la reparación del 2026-09-11 descrita a continuación.


## Reparación de inicio — 2026-09-11
La tarea de inicio devolvía 101: el ejecutable instalado antiguo fallaba con DatabaseTooFarAhead. Se compiló la fuente actual y se sustituyó únicamente nubeos.exe; no se rebajó ni restauró la base de datos. El binario anterior se conserva en C:\Users\jesus\Applications\NubeOS\backups\before-startup-fix-20260911-150617. El ejecutable instalado coincide por SHA-256 con el compilado (BFDD3D6E10174E7E78712089F527088831E899883A62E29381098E0828E01D61). La apertura desde la tarea existente dejó una ventana que responde; después se deshabilitó esa tarea redundante y se conservó el inicio Run creado por el plugin, habilitado en StartupApproved. Build de producción, 157 pruebas Rust y 45 pruebas frontend correctos. El instalador NSIS existente no se regeneró y no representa esta reparación. Falta únicamente verificar un inicio de sesión real.

**Inicio confirmado tras reinicio — 2026-09-11:** Nube confirma apertura correcta. Una instancia y una vía Run habilitada; tarea antigua deshabilitada. El acceso antiguo NubeOS.lnk.disabled se conserva fuera de Inicio en C:\Users\jesus\Applications\NubeOS\backups\startup-cleanup-20260911.

## Pendiente de instalar — 2026-09-13
T-I17 añade instancia única y título nativo NubeOS, sin texto en la cabecera React. Build generado y 202 pruebas correctas. No instalado: la copia abierta en AppData\Local\NubeOS no se cerró y auto-review rechazó terminarla. Al cerrar NubeOS, actualizar esa copia y Applications\NubeOS conservando los ejecutables anteriores, comprobar aperturas repetidas entre ambas rutas, restauración y título.

## Estado instalado vigente — 2026-09-13
T-I17 ya instalada; sustituye el apartado pendiente anterior. Ruta principal y autostart: C:\Users\jesus\AppData\Local\NubeOS\nubeos.exe, coincidente con los accesos del menú Inicio y barra de tareas. La copia Applications\NubeOS también contiene el mismo binario actualizado; solo una instancia permanece al abrir cualquiera de las dos. Ejecutables anteriores conservados en backups\single-instance-* dentro de cada instalación, fuera de Inicio. Instalador NSIS regenerado. Comprobadas cuatro aperturas adicionales, incluyendo restauración desde minimizada; título nativo NubeOS y cabecera propia sin texto añadido. Tarea antigua deshabilitada y carpeta Inicio limpia. SHA-256: 7BA268111ECFD4DB5C052727168A5DFD2593E3AA63376552D29526550A0DBB2C.
