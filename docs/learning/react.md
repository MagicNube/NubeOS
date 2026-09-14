# Aprendizajes de React e interfaz

## Capas modales y fondo inerte

- Un diálogo debe renderizarse directamente bajo `body`; así puede marcar como inertes todos sus hermanos sin ocultarse a sí mismo del árbol de accesibilidad.
- Las capas anidadas solo restauran los elementos que ellas mismas hicieron inertes. Esto permite abrir una confirmación sobre un formulario y volver al formulario sin reactivar la aplicación del fondo.
- La misma capa debe bloquear el desplazamiento del documento, contener Tab y devolver el foco al control que la abrió.

## Confirmaciones asíncronas

- Una función compartida que devuelve `Promise<boolean>` permite sustituir `window.confirm` sin mover reglas de negocio a React ni duplicar la mecánica de foco.
- El título, la consecuencia y la etiqueta del botón se proporcionan en cada llamada; la acción destructiva comienza con foco en Cancelar.
- Los textos concretos —por ejemplo, «Eliminar visionado» o «Descartar cambios»— son más claros que una pregunta genérica y hacen comprobable cada flujo.

## Navegación compacta

- Ocultar visualmente el texto de un botón no basta: debe conservar un nombre accesible explícito.
- En una cuadrícula estrecha, fijar solo el ancho de `nav` no limita necesariamente el tamaño intrínseco de sus hijos. Los grupos y botones también necesitan un ancho y `min-width` acotados para evitar que el icono quede recortado.

## Selectores compactos con varios tipos de resultado

- Cuando una búsqueda permite elegir entidades distintas, un selector segmentado explícito mantiene clara la intención y permite adaptar etiqueta, resultados y confirmación sin mezclar tarjetas incompatibles.
- Un diálogo alto se vuelve manejable al separar cabecera, cuerpo desplazable y pie estable. La búsqueda y el cierre permanecen accesibles, mientras la cantidad del producto seleccionado no salta al recorrer resultados.
- Los valores derivados, como gramos por unidad de un paquete, se presentan junto a sus campos fuente y fuera del conjunto de controles editables. Así informan sin sugerir que existe un tercer dato que guardar.
- Cuando un campo numérico debe sentirse como escritura directa, los controles nativos de incremento pueden ocultarse con CSS acotado al componente. Mantener `type="number"`, `inputMode="decimal"` y la validación de dominio conserva semántica y teclado adecuado sin reconstruir el control.

## Bordes estructurales en superficies oscuras

- Que un borde exista en CSS no garantiza que se perciba: en tarjetas oscuras debe contrastarse contra el fondo de la propia tarjeta y contra el lienzo que la rodea.
- Los refuerzos de `hover` y `focus-within` deben excluir estados más importantes como arrastre y destino de arrastre, para no ocultar su señal morada específica por una regla de mayor especificidad.
- Cuando el mismo defecto alcanza resumen, tarjetas y listas anidadas, conviene definir roles locales de superficie, borde, separador y texto secundario. Corregir cada color aislado deja la jerarquía inconsistente y hace más probable que la regresión reaparezca.
- Antes de crear roles visuales locales para un módulo de una misma familia, hay que comprobar si ya existe un componente compartido que expresa esa jerarquía. Reutilizarlo evita que un arreglo aislado convierta reposo, `hover` y separadores en un segundo sistema visual.
- Un mismo color de borde no produce la misma percepción en tarjetas de escalas distintas. En superficies grandes y casi iguales al lienzo, hay que validar el contorno sobre una captura real y aumentar su contraste sin confundirlo con el color de interacción.

## Correcciones de General del 2026-09-09

- T-I16: una fecha memorizada al montar no representa hoy durante toda la sesión. Revisar el día al recuperar foco, refrescar y actuar; descartar respuestas obsoletas y no aplicar una acción a una fila del día anterior.
- Los errores de escritura necesitan captura propia: Promise.allSettled solo protege las consultas que contiene.
- Atrás debe reconocer dialog y alertdialog y seleccionar la capa no inerte superior. Los listeners de las confirmaciones inferiores ignoran el teclado mientras estén inertes.
- T-031: ocultar el contenedor de acciones impide destacar un estado persistente. Ocultar cada botón permite que Reanudar siga visible sin insertar otra celda ni desplazar la frecuencia.
- La fixture tests/general-review.html usa reloj y APIs ficticias para ejecutar comportamientos reales de los componentes; sus aserciones de opacidad esperan la transición antes de comparar.
