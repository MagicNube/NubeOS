# ADR-002: Comandos Tauri como frontera entre React y Rust

- Estado: Aprobada por Nube
- Fecha: 2026-08-02
- Decisores: Nube

## Contexto

La interfaz React necesita ejecutar casos de uso que viven en Rust: crear datos, consultar información, modificar planes y recibir errores de dominio. Necesitamos una frontera simple, segura y consistente que no permita a React acceder directamente a SQLite ni contenga lógica de negocio en los adaptadores.

La solución debe encajar con una aplicación de escritorio local, mantener explícitos los contratos entre TypeScript y Rust y no introducir infraestructura de red que el producto no necesita.

## Alternativas

1. **Comandos Tauri para solicitudes y respuestas.**
   - Ventajas: mecanismo nativo de Tauri, comunicación directa dentro de la aplicación, sin servidor local ni protocolo HTTP y compatible con comandos pequeños por caso de uso.
   - Inconvenientes: los contratos serializados deben mantenerse coherentes entre Rust y TypeScript; hay que diseñar errores de frontera claros.

2. **Eventos Tauri como mecanismo principal.**
   - Ventajas: útil para notificaciones unidireccionales y actualizaciones asíncronas.
   - Inconvenientes: es menos claro para operaciones de solicitud-respuesta, complica el manejo de errores y oculta el contrato de cada caso de uso.

3. **Servidor HTTP local.**
   - Ventajas: interfaz familiar y potencial reutilización por otros clientes en el futuro.
   - Inconvenientes: abre un puerto local, requiere ciclo de vida, autenticación y superficie de seguridad adicional sin resolver una necesidad actual.

4. **Acceso desde React a plugins o almacenamiento.**
   - Ventajas: rápido para un prototipo pequeño.
   - Inconvenientes: rompe los límites aprobados, duplica lógica y hace a React dueño de datos de producto.

## Decisión propuesta

Usar **comandos Tauri para operaciones de solicitud-respuesta entre React y Rust**.

Cada comando representa una operación pequeña orientada a un caso de uso. Recibe una entrada serializable, delega inmediatamente en código Rust que no depende de Tauri y devuelve una salida serializable o un error comprensible para la interfaz.

Los eventos Tauri no serán la vía principal para crear, consultar o actualizar datos. Podrán evaluarse más adelante para notificaciones unidireccionales que no necesiten una respuesta inmediata.

No se añadirá generación automática de tipos ni una dependencia adicional para compartir contratos hasta que el número de comandos justifique ese coste. Mientras tanto, cada diseño de módulo documentará sus entradas, salidas y errores.

## Consecuencias

### Positivas

- La comunicación entre interfaz y dominio queda visible y pequeña.
- No se introduce un servidor HTTP ni una API de red innecesaria.
- React mantiene el papel de cliente de casos de uso, no de dueño de la persistencia.
- Los contratos pueden probarse y evolucionar por módulo.

### Negativas y compromisos

- Rust y TypeScript mantendrán representaciones serializables compatibles de las entradas y salidas.
- Es necesario decidir de forma consistente cómo se traducen los errores de dominio a mensajes o estados de interfaz.
- Exponer un comando es una superficie de seguridad: solo se registrarán los necesarios y se validará siempre la entrada en Rust.
- Una operación compleja no debe convertirse en un comando grande; se divide por caso de uso o se rediseña el flujo.

## Seguimiento

- Aprobar o rechazar esta ADR antes de implementar comandos de producción.
- En el primer comando, documentar en `docs/learning/tauri.md` qué es un comando Tauri y cuál es su límite de responsabilidad.
- Revisar la necesidad de compartir tipos solo cuando existan suficientes contratos repetidos para justificarlo.
