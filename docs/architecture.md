# Arquitectura de NubeOS

- Estado: Aprobada por Nube
- Última actualización: 2026-08-22

## Propósito

Este documento describe los límites arquitectónicos acordados y enlaza las decisiones que los concretan. No sustituye a las ADRs.

NubeOS es una aplicación de escritorio construida con Tauri, React y Rust. Su arquitectura debe permitir desarrollar módulos personales de forma independiente, proteger los datos locales y mantener la lógica de negocio fuera de la interfaz.

## Vista de alto nivel

```text
Usuario
  ↓
Interfaz React
  ↓ solicitudes y resultados
Comandos Tauri
  ↓
Dominio Rust
  ↓
Persistencia local
```

La dirección válida de dependencias es descendente. Cada capa puede depender de contratos de la capa inferior, pero el dominio no conoce React, componentes ni detalles visuales.

## Capas y responsabilidades

| Capa | Responsabilidad | No es responsable de |
| --- | --- | --- |
| Interfaz | Mostrar datos, recoger interacción y mantener estado visual temporal | Reglas de negocio, cálculos de dominio o acceso directo a datos |
| Comandos Tauri | Adaptar solicitudes de la interfaz a casos de uso del dominio y traducir resultados o errores | Contener lógica de negocio compleja |
| Dominio Rust | Modelar entidades, aplicar invariantes, ejecutar cálculos y definir casos de uso | Conocer Tauri, React, SQL o la presentación |
| Persistencia local | Guardar y recuperar datos a través de contratos definidos por el dominio | Decidir reglas de negocio |

## Flujo de un caso de uso

Un flujo normal sigue estas etapas:

1. El usuario realiza una acción en React.
2. La interfaz construye una solicitud válida para un comando Tauri.
3. El comando delega el caso de uso al dominio Rust.
4. El dominio valida reglas e invariantes y lee o guarda mediante el mecanismo de persistencia aprobado.
5. El resultado o un error de dominio vuelve al comando.
6. React actualiza la presentación con ese resultado.

La interfaz puede validar para mejorar la experiencia, pero la validación que protege la integridad de los datos se repite en el dominio.

## Módulos

Cada módulo es dueño de sus casos de uso y de los datos que define. Un módulo no accede a los datos internos de otro módulo; cualquier relación futura debe expresarse mediante un contrato explícito y documentarse en ambos diseños.

La organización vertical por módulo en Rust y TypeScript está aprobada mediante la ADR-003. Su objetivo es hacer visibles los límites de módulo sin introducir capas ceremoniales.

## Estado del prototipo inicial

El código de interfaz creado antes de establecer este proceso se consideró un prototipo de exploración. Sus flujos fueron sustituidos incrementalmente por verticales documentados y ya no define el estado actual de la aplicación.

Las piezas conservadas —como el cascarón Tauri, la navegación o algunos recursos visuales— pasaron por las tareas y revisiones de sus módulos correspondientes. Este punto queda cerrado.

## Decisiones aprobadas

La base actual se apoya en las siguientes decisiones:

1. [ADR-001: SQLite local con migraciones](decisions/adr-001-local-first-sqlite.md).
2. [ADR-002: comandos Tauri como frontera entre React y Rust](decisions/adr-002-tauri-commands-as-application-boundary.md).
3. [ADR-003: organización vertical por módulos](decisions/adr-003-feature-first-module-organization.md).
4. [ADR-004: pruebas por capas](decisions/adr-004-layered-testing-strategy.md).
5. [ADR-005: aplazar copias de seguridad y sincronización](decisions/adr-005-export-and-recovery-strategy.md).

## Restricciones arquitectónicas

- La aplicación debe poder realizar el trabajo cotidiano sin un servicio remoto obligatorio.
- La persistencia y las operaciones sensibles no se implementan en React.
- Las dependencias nuevas requieren revisión según `docs/principles.md`.
- Un cambio que altere estos límites necesita una ADR aprobada.
