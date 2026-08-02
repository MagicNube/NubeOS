# ADR-001: Persistencia local con SQLite como fuente de verdad

- Estado: Aprobada por Nube
- Fecha: 2026-08-02
- Decisores: Nube

## Contexto

NubeOS necesita conservar datos personales estructurados —por ejemplo, alimentos, comidas, planes semanales, hábitos y movimientos financieros— sin depender de un servicio remoto. Cada módulo posee sus propios datos y relaciones internas. Esos datos deben sobrevivir a reinicios y permitir consultas y actualizaciones consistentes dentro del módulo, sin que un módulo acceda directamente a los datos internos de otro.

La arquitectura aprobada establece que la persistencia se controla desde Rust y que React no es la fuente de verdad de los datos del producto. También exige que los datos cotidianos puedan utilizarse sin conexión.

## Alternativas

1. **SQLite embebida y gestionada desde Rust.**
   - Ventajas: base de datos local madura, transacciones, relaciones, consultas expresivas, esquema versionable mediante migraciones y un único archivo portable para copia de seguridad.
   - Inconvenientes: requiere aprender acceso a datos y migraciones en Rust; hay que definir con cuidado la evolución del esquema y la ubicación segura del archivo.

2. **Archivos JSON por módulo.**
   - Ventajas: inicio muy sencillo y datos directamente legibles.
   - Inconvenientes: relaciones, consultas, actualizaciones atómicas y migraciones se vuelven responsabilidad propia; aumenta el riesgo de inconsistencias cuando aparezcan finanzas y planificación.

3. **Almacenamiento del WebView, como `localStorage` o IndexedDB.**
   - Ventajas: fácil de usar desde React para un prototipo.
   - Inconvenientes: contradice la frontera de arquitectura acordada, dificulta que Rust sea dueño del dominio y no es una base común adecuada para los módulos.

4. **Base de datos remota desde el inicio.**
   - Ventajas: facilitaría sincronización futura entre dispositivos.
   - Inconvenientes: contradice el enfoque local-first, exige autenticación e infraestructura y añade complejidad antes de que exista una necesidad real de sincronización.

## Decisión propuesta

Adoptar **SQLite embebida como fuente de verdad local**, con acceso desde Rust. La aplicación mantendrá una única base de datos en el directorio de datos de la aplicación y aplicará migraciones versionadas para evolucionar el esquema.

React solicitará casos de uso a través de comandos Tauri; no leerá ni escribirá SQLite directamente. La sincronización remota queda fuera de esta decisión y no se implementará en la primera etapa.

Esta decisión solo establece el almacenamiento principal. La biblioteca concreta de Rust, el mecanismo exacto de migraciones, los repositorios y el formato de exportación se decidirán en tareas o ADRs posteriores si su impacto lo justifica.

## Consecuencias

### Positivas

- Cada módulo puede persistir sus propios datos y relaciones internas en una misma base local fiable, sin acceder a los datos internos de otro módulo.
- Las operaciones que modifican varios datos pueden realizarse de manera consistente.
- El esquema y sus migraciones quedan versionados junto al código.
- Una copia de seguridad del archivo de base de datos resulta sencilla de plantear.
- La futura sincronización puede construirse sobre una fuente de verdad local clara.

### Negativas y compromisos

- Se incorpora una dependencia de acceso a SQLite y una curva de aprendizaje en Rust.
- Cada cambio de esquema requiere una migración revisada y pruebas de actualización.
- SQLite no cifra automáticamente el archivo: cifrado, bloqueo de acceso y copias de seguridad son preocupaciones separadas que deberán evaluarse antes de guardar datos sensibles como finanzas.
- La aplicación debe definir dónde guarda la base de datos y cómo se exporta o restaura sin exponer datos en el repositorio.

## Seguimiento

- Aprobar o rechazar esta ADR antes de crear persistencia de producción.
- Definir en una tarea posterior el primer vertical de persistencia para el módulo de comidas.
- Proponer una ADR adicional si la estrategia de exportación, cifrado o sincronización altera este modelo.
