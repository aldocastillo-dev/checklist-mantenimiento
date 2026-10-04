# Bitácora de uso de IA

Herramienta utilizada: Claude (Anthropic).

## Encargo 1: Estructurar el Avance 1 (propuesta de valor, alcance y usuarios)
- **Objetivo:** Ordenar nuestro problema de reportabilidad de mantenimiento en el formato que pide el Avance 1.
- **Instrucción entregada:** Subimos el enunciado y un borrador de 2 planas con desafío, lienzo, alcance y usuarios en dónde describimos el problema que conocemos de terreno: checklist a mano, entregado con uno o dos días de atraso, que retrasa las HH en SAP y el cierre de OT.
- **Respuesta obtenida:** Revisión del borrador de 2 planas con desafío, lienzo, alcance y usuarios. La IA agregó una sexta sección porque el enunciado decía "seis secciones" y enumeraba cinco.
- **Qué se aceptó y qué se corrigió:** El problema, los usuarios y la evidencia fueron aporte nuestro. Corregimos el borrador con un dato propio: el personal reporta con más detalle técnico por WhatsApp que en papel. Eso cambió el desafío (dos consecuencias) y el lienzo (4 filas). Eliminamos la sexta sección porque no estaba dentro de los requerimientos del trabajo.
- **Cómo se verificó:** Contrastamos el documento con los criterios del enunciado: desafío planteado como problema y no como solución, usuarios con rol concreto, y alcance con la columna "qué no".

## Encargo 2: Borrador del caso de uso, la maqueta y el roadmap (Avance 2)
- **Objetivo:** Obtener un primer borrador coherente de las tres piezas del Avance 2.
- **Instrucción entregada:** Subimos el enunciado del Avance 2 y pedimos revisar el borrador de casos e uso, maqueta y roadmap para armar las piezas de forma coherente con el Avance 1.
- **Respuesta obtenida:** Revisión y modificación de caso de uso, maqueta de 5 pantallas y 9 tarjetas de roadmap. El borrador precargaba área, equipo y N° de OT desde el sistema.
- **Qué se aceptó y qué se corrigió:** Nosotros detectamos que la precarga obligaba a traer datos de SAP, contradiciendo el alcance del Avance 1 y obligando a operar dos sistemas. Pedimos eliminarla: el N° de OT quedó opcional y corregible por el programador. Se ajustaron caso de uso, maqueta y alcance en conjunto.
- **Cómo se verificó:** Revisamos que cada pantalla correspondiera a un paso del caso de uso y que nada contradijera el Avance 1.

## Encargo 3: Revisión del roadmap en Notion
- **Objetivo:** Que la IA revisara el tablero de roadmap que armamos nosotros en Notion.
- **Instrucción entregada:** Armamos el tablero (Ahora / Próximo / Después) a partir del Avance 2 y enviamos la captura para revisión.
- **Respuesta obtenida:** La IA señaló numeración inconsistente en las tarjetas y que el tablero conservaba el nombre por defecto.
- **Qué se aceptó y qué se corrigió:** Aceptamos ambas observaciones. Además, por criterio propio, movimos el dictado por voz de "Ahora" a "Después", porque es una mejora y no la base de la solución. Mantuvimos separado el tablero de tareas del curso.
- **Cómo se verificó:** Comprobamos que las tarjetas describieran resultados para el usuario y no tareas del equipo, y que el orden reflejara la prioridad real de construcción.

## Encargo 4: Revisión del documento completo del Avance 2
- **Objetivo:** Que la IA revisara el documento que completamos nosotros antes de entregarlo.
- **Instrucción entregada:** Subimos el Word con los cambios que aplicamos (roadmap, captura, ajustes de alcance).
- **Respuesta obtenida:** La IA detectó tres problemas: faltaba un integrante en la lista, se había borrado el párrafo que explica por qué no hay integración con SAP, y se mezclaban "supervisor" y "capataz".
- **Qué se aceptó y qué se corrigió:** Corregimos los tres puntos: verificamos la lista de integrantes, restituimos el párrafo que explica por qué no hay integración con SAP, y unificamos "supervisor" como usuario principal.
- **Cómo se verificó:** Releímos el documento completo y lo exportamos a PDF con el nombre pedido.

## Encargo 5: Avance 3 (repositorio y estructura de datos)
- **Objetivo:** Saber qué faltaba para el Avance 3 y proponer la estructura de datos.
- **Instrucción entregada:** Subimos las instrucciones del Avance 3 y los Avances 1 y 2, y pedimos un checklist de lo pendiente y un boceto de las tablas.
- **Respuesta obtenida:** Lista de requisitos del repositorio, guía paso a paso y una propuesta de 5 tablas (USUARIO, CHECKLIST, DETALLE_TECNICO, FOTO, FIRMA) con diagrama y ejemplos.
- **Qué se aceptó y qué se corrigió:** Aceptamos la separación en tablas, con el detalle técnico aparte para no guardar varios datos en una celda. Corregimos tres cosas: las horas hombre de los ejemplos usaban fórmulas distintas y dejamos una sola; en FIRMA reemplazamos el nombre repetido por una clave externa a USUARIO; y cambiamos `fecha_turno` a tipo fecha para que calzara con los ejemplos. También agregamos la tabla de relaciones y cardinalidad.
- **Cómo se verificó:** Revisamos que cada tabla saliera de un sustantivo del caso de uso, que las claves externas apuntaran a registros existentes, que los ejemplos calzaran con los tipos y que ningún campo obligatorio quedara vacío.
