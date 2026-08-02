# ADR-004: Estrategia de pruebas por capas

- Estado: Aprobada por Nube
- Fecha: 2026-08-02
- Decisores: Nube

## Contexto

NubeOS manejará información personal y cálculos que deben mantenerse correctos al evolucionar los módulos. Los principios del proyecto exigen que una tarea se verifique y que las reglas de dominio no dependan de que una pantalla parezca funcionar.

No todos los tipos de prueba tienen el mismo coste ni aportan la misma confianza. Necesitamos una estrategia que proteja reglas y persistencia sin convertir cada avance pequeño en una batería de pruebas de interfaz frágil o lenta.

## Alternativas

1. **Verificación manual únicamente.**
   - Ventajas: inicio rápido y sin herramientas adicionales.
   - Inconvenientes: los cálculos y casos límite se rompen fácilmente al cambiar código; no deja una red de seguridad repetible.

2. **Pruebas end-to-end para la mayor parte del comportamiento.**
   - Ventajas: simulan el uso completo de la aplicación.
   - Inconvenientes: son más lentas, difíciles de mantener y poco precisas para localizar fallos de reglas de dominio.

3. **Pruebas por capas, priorizando el dominio Rust.**
   - Ventajas: rápidas y precisas para invariantes; permite comprobar persistencia y frontera Tauri con pruebas específicas; reserva la interfaz para comportamientos visibles de valor.
   - Inconvenientes: requiere elegir conscientemente el nivel de prueba de cada tarea y mantener datos de prueba aislados.

## Decisión propuesta

Adoptar una **estrategia de pruebas por capas**:

1. Las reglas, cálculos e invariantes se prueban principalmente con pruebas unitarias en Rust.
2. La persistencia se prueba con bases SQLite temporales o aisladas, incluyendo migraciones relevantes.
3. Los comandos Tauri se verifican como adaptadores: entrada, delegación al caso de uso y traducción de errores.
4. React se prueba en los flujos que aporten comportamiento visible o riesgo real; detalles puramente visuales se verifican manualmente durante esta primera etapa.
5. Las pruebas end-to-end completas se incorporarán solo cuando un flujo transversal crítico o una regresión repetida justifique su coste.

Cada `tasks.md` indicará la verificación esperada. Una prueba no es obligatoria por línea de código, sino por riesgo de cambio y valor de la regla que protege.

## Consecuencias

### Positivas

- La mayor parte de la lógica queda protegida sin depender de una interfaz concreta.
- Los fallos se localizan mejor: dominio, persistencia, frontera o presentación.
- La estrategia escala sin obligar a automatizar todas las decisiones visuales desde el primer módulo.
- Las tareas explican de antemano cómo se demostrará que funcionan.

### Negativas y compromisos

- Hay que diseñar el dominio de forma testeable y evitar lógica importante dentro de comandos o componentes.
- Las bases temporales y migraciones de prueba requieren disciplina adicional.
- Algunos comportamientos de interfaz seguirán necesitando una comprobación manual documentada.
- Será necesario elegir herramientas concretas de testing en Rust y TypeScript en tareas posteriores.

## Seguimiento

- Aprobar o rechazar esta ADR antes de implementar la primera lógica de dominio.
- En la primera tarea Rust, documentar en `docs/learning/rust.md` cómo se escribe y ejecuta una prueba unitaria.
- Revisar la necesidad de pruebas end-to-end tras completar el primer flujo vertical de comidas.
