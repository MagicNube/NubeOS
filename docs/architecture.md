# Arquitectura de NubeOS

## Estado

Este documento describe la arquitectura aprobada. Las decisiones aún no aprobadas deben proponerse como ADR, no asumirse aquí.

## Capas

<!-- Completar tras aprobar las ADR fundamentales. -->

| Capa | Responsabilidad | Tecnología |
| --- | --- | --- |
| Interfaz | Presentación y estado efímero | React + TypeScript |
| Adaptación | Comandos pequeños hacia el dominio | Tauri |
| Dominio | Reglas de negocio e invariantes | Rust |
| Persistencia | Datos locales y migraciones | Pendiente de ADR |

## Reglas de dependencia

- React no accede directamente a la persistencia.
- Los comandos Tauri no contienen lógica de negocio compleja.
- El dominio Rust no depende de React ni de Tauri.
- Cada módulo expone contratos explícitos y evita conocer la interfaz de otro módulo.

## Decisiones pendientes

- Estrategia de persistencia local.
- Comunicación React ↔ Rust.
- Organización de módulos Rust y TypeScript.
- Estrategia de pruebas.
