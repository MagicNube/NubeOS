# Arquitectura de NubeOS

- Estado: Aprobada por Nube
- Última actualización: 2026-08-02

## Propósito

Este documento describe los límites arquitectónicos ya acordados y las decisiones que aún deben aprobarse. No sustituye a las ADRs ni prescribe una estructura de carpetas antes de decidirla.

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

La organización concreta de los módulos en carpetas Rust y TypeScript está pendiente de ADR. El objetivo es que dicha organización haga visibles los límites de módulo, no introducir capas ceremoniales.

## Estado del prototipo existente

El código de interfaz creado antes de establecer este proceso se considera un prototipo de exploración. Puede servir como referencia de producto, pero no establece la arquitectura final ni autoriza a trasladar su lógica actual directamente a producción.

Cada parte que se conserve deberá pasar por la spec, diseño, tarea y revisión del módulo correspondiente.

## Decisiones pendientes

Estas cuestiones necesitan ADR antes de implementar la base de producción:

1. Estrategia de persistencia local y migraciones.
2. Forma de exponer casos de uso Rust a React mediante comandos Tauri.
3. Organización de módulos y contratos en Rust y TypeScript.
4. Estrategia de pruebas para dominio, persistencia y comandos.
5. Estrategia de exportación y recuperación de datos personales.

## Restricciones arquitectónicas

- La aplicación debe poder realizar el trabajo cotidiano sin un servicio remoto obligatorio.
- La persistencia y las operaciones sensibles no se implementan en React.
- Las dependencias nuevas requieren revisión según `docs/principles.md`.
- Un cambio que altere estos límites necesita una ADR aprobada.
