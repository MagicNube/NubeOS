# ADR-006: PDFs administrados en el sistema de archivos

- Estado: Aprobada por Nube
- Fecha: 2026-08-10
- Decisores: Nube

## Contexto

El módulo Documentos debe conservar PDFs aunque el archivo original se mueva o se elimine. Cada documento combina metadatos estructurados —nombre, categoría, etiquetas, fechas y estado— con un archivo binario que puede tener un tamaño considerable.

La ADR-001 establece SQLite como fuente de verdad local para datos estructurados, pero no decide cómo almacenar archivos personales. También debemos coordinar operaciones que afectan simultáneamente a SQLite y al sistema de archivos, aunque ambos no comparten una transacción atómica.

Una importación, sustitución o eliminación interrumpida no debe dejar un documento visible sin PDF ni provocar la eliminación automática del único ejemplar recuperable. React tampoco debe conocer o construir rutas privadas.

## Alternativas

1. **Guardar los PDFs como BLOB dentro de SQLite.**
   - Ventajas: metadatos y archivo pueden confirmarse en una única transacción; una relación no puede apuntar a un archivo externo ausente; un solo fichero contiene todos los datos locales.
   - Inconvenientes: la base crece con cada PDF; leer o sustituir binarios grandes aumenta el trabajo de SQLite; la previsualización y apertura externa siempre requieren extraer bytes; una futura copia de seguridad no puede tratar metadatos y archivos con estrategias distintas.

2. **Guardar metadatos en SQLite y PDFs administrados en una carpeta privada.**
   - Ventajas: SQLite conserva consultas y relaciones; los PDFs siguen siendo archivos normales que Rust puede abrir, copiar o entregar; no se duplican binarios dentro de la base; cada capa usa el almacenamiento adecuado a sus datos.
   - Inconvenientes: SQLite y el sistema de archivos no ofrecen una transacción conjunta; una interrupción puede dejar temporales, archivos en retirada o finales sin referencia; una futura copia de seguridad debe incluir ambos recursos.

3. **Guardar únicamente la ruta del PDF original.**
   - Ventajas: no duplica espacio y simplifica la importación.
   - Inconvenientes: mover, renombrar o borrar el original rompe el documento; contradice la spec aprobada y convierte ubicaciones externas en parte permanente del estado de NubeOS.

4. **Carpeta administrada sin staging ni reconciliación.**
   - Ventajas: implementación inicial más corta; SQLite guarda la ruta relativa y Rust copia directamente al destino final.
   - Inconvenientes: los fallos entre copiar, actualizar metadatos y borrar pueden dejar estados incoherentes; reemplazar o eliminar con seguridad dependería de que nunca se interrumpa el proceso.

## Decisión propuesta

Guardar **los metadatos en SQLite y cada PDF como archivo administrado dentro de una carpeta privada propiedad del módulo Documentos**.

La estructura conceptual será:

```text
<app-data>/
├─ nubeos.sqlite3
└─ documents/
   ├─ files/
   ├─ staging/
   └─ recovery/
```

Cada PDF final se denomina `<document-id>.pdf`. El nombre no contiene información personal y se obtiene exclusivamente a partir de un identificador validado por Rust. SQLite guarda el nombre interno, no una ruta absoluta.

Rust es el único responsable de construir rutas, validar y copiar PDFs, reemplazarlos, eliminarlos y reconciliar interrupciones. React solicita casos de uso mediante comandos Tauri y conserva únicamente tokens temporales opacos durante una selección; nunca recibe rutas administradas.

Las operaciones usan estas reglas:

- Una selección válida se copia primero a `staging` y queda asociada a un token de un solo uso.
- Importar confirma metadatos y mueve el temporal al destino final con compensación ante errores.
- Reemplazar aparta temporalmente el PDF anterior y solo lo elimina después de confirmar el nuevo estado.
- Eliminar definitivamente aparta primero el PDF y restaura su ubicación si la transacción de metadatos falla.
- Los temporales abandonados se limpian de forma acotada al iniciar.
- Un archivo final sin referencia no se destruye automáticamente; se mueve a `recovery` para evitar una pérdida irreversible.
- Ninguna reconciliación opera fuera de la raíz privada de Documentos.

Las compensaciones reducen estados incoherentes durante errores normales. La reconciliación cubre interrupciones del proceso entre pasos, porque no es posible conseguir atomicidad real entre SQLite y NTFS.

Esta decisión no introduce cifrado, sincronización ni copia de seguridad. Aclara la ADR-001 para archivos binarios y mantiene las limitaciones aceptadas en la ADR-005.

## Consecuencias

### Positivas

- El documento continúa disponible aunque desaparezca el PDF original.
- SQLite no crece con el contenido completo de cada archivo.
- Rust puede abrir, copiar y servir el PDF sin extraer previamente un BLOB.
- Las rutas privadas permanecen fuera de los contratos de React.
- Importación, reemplazo y eliminación tienen estrategias explícitas de compensación.
- Una interrupción no autoriza a borrar automáticamente un archivo potencialmente recuperable.

### Negativas y compromisos

- El estado persistente de Documentos está formado por SQLite y una carpeta; copiar solo la base de datos no conserva el módulo completo.
- El módulo necesita código y pruebas específicos para coordinar dos mecanismos de persistencia.
- Pueden existir temporales o archivos en recuperación después de un cierre inesperado.
- La carpeta no está cifrada y puede ser leída por procesos o usuarios con acceso suficiente al equipo.
- Mover manualmente, editar o borrar archivos dentro de la carpeta privada puede romper documentos; esa carpeta no es una interfaz pública para el usuario.
- Una futura estrategia de copia y restauración deberá tratar base de datos y PDFs como una unidad consistente, lo que requerirá revisar la ADR-005.

## Seguimiento

- Probar importación, reemplazo y eliminación con fallos simulados en cada frontera entre SQLite y archivos.
- Verificar que nombres internos y tokens no admiten rutas absolutas, separadores ni recorridos con `..`.
- Verificar que la reconciliación nunca borra automáticamente finales sin referencia ni sale de la raíz de Documentos.
- Documentar en `docs/learning/rust.md` el uso de `Path`, `PathBuf`, renombrados y compensaciones cuando se implemente el almacén.
- Proponer una nueva ADR antes de añadir cifrado, copia de seguridad, restauración o sincronización de esta carpeta.
