# Architecture Decision Records

Una ADR registra una decisión de arquitectura importante y aprobada. No reemplaza una tarea ni una especificación de módulo.

## Cuándo crear una ADR

- Una decisión afecta a varios módulos o tiene coste de cambio alto.
- Existen alternativas razonables.
- La decisión condiciona seguridad, persistencia, sincronización, organización o dependencias.

## Convención

`adr-###-slug-corto.md`, por ejemplo: `adr-001-local-first-y-sqlite.md`.

No se modifica una ADR aprobada para cambiar su decisión: se crea una ADR nueva que la sustituya o aclare.
