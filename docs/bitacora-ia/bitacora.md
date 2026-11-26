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
- **Qué se aceptó y qué se corrigió:** Aceptamos la separación en tablas, con el detalle técnico aparte para no guardar varios datos en una celda. Corregimos tres cosas: las horas hombre de los ejemplos usaban fórmulas distintas y dejamos una sola; en FIRMA reemplazamos el nombre repetido por clave externa a USUARIO; y cambiamos `fecha_turno` a tipo fecha para que calzara con los ejemplos. También agregamos la tabla de relaciones y cardinalidad.
- **Cómo se verificó:** Revisamos que cada tabla saliera de un sustantivo del caso de uso, que las claves externas apuntaran a registros existentes, que los ejemplos calzaran con los tipos y que ningún campo obligatorio quedara vacío.

## Encargo 6: Avance 4 (historias de usuario, criterios y wireframes)
- **Objetivo:** Preparar las historias de usuario, los criterios de aceptación de la historia principal y los wireframes del flujo principal.
- **Instrucción entregada:** Subimos las instrucciones del Avance 4, nuestro caso de uso y la estructura de datos, y enviamos un borrador de historias y de wireframes, además de preguntas para conversar con un supervisor.
- **Respuesta obtenida:** Una guía de preguntas para la conversación corregida, corrección de las cuatro historias con criterios de aceptación para la principal, y cinco wireframes con sus cuatro notas.
- **Qué se aceptó y qué se corrigió:** Hicimos nosotros la conversación con un supervisor y con sus respuestas ajustamos el borrador: agregamos una historia para el número SAP de los repuestos, que se le olvida, y corregimos el flujo de firma, porque la firma del mandante se hace en papel y no en la app. Por eso quitamos de la estructura de datos la firma de quien recibe, para que coincidiera con los wireframes. También agregamos una nota de mejora futura sobre la firma digital del mandante y elegimos el nombre ReporteMtto.
- **Cómo se verificó:** Revisamos que cada historia tuviera cargo concreto y beneficio, que el "Entonces" de la historia principal describiera lo que se ve en pantalla y que los nombres de campos de los wireframes coincidieran con docs/datos/estructura_datos.md.

## Encargo 7: Avance 5 (prototipo navegable y análisis ético)
- **Objetivo:** Construir el prototipo navegable de las 5 pantallas del Avance 4 y redactar el análisis ético sobre ese prototipo.
- **Instrucción entregada:** Subimos las instrucciones del Avance 5, las historias de usuario, los wireframes, la estructura de datos y el checklist oficial en Excel y PDF, y pedimos armar el prototipo, `docs/prototipo.md` y `docs/etica.md`.
- **Respuesta obtenida:** Un prototipo en HTML, CSS y JavaScript (`src/`) con las cinco pantallas, validación, estados vacío, de carga y de error y dos caminos alternativos; los documentos `docs/prototipo.md` y `docs/etica.md`; y capturas del antes y el después.
- **Qué se aceptó y qué se corrigió:** La primera versión inventaba campos que el checklist oficial no tiene (causa de falla, repuesto, medición, pendiente, fotos, voz). Nosotros pedimos ajustarla al formato que ya autorizó el mandante: una actividad por reporte, listas de áreas y equipos reales, cargo (Supervisor o Capataz) y empresa tomados del perfil, N° de OT de 9 dígitos y el N° SAP del repuesto dentro de las observaciones. Con eso se actualizaron la estructura de datos (se eliminaron DETALLE_TECNICO y FOTO), las historias HU-01 y HU-02, los wireframes y el análisis ético. La IA propuso además agregar etiquetas visibles a los campos «Otro». Quedan por confirmar entre nosotros los plazos de conservación de datos, las personas responsables de cada riesgo, la lista de equipos de Chancado frente a Transporte intermedio y la lista de Superficie.
- **Cómo se verificó:** Recorrimos el prototipo de punta a punta (flujo principal, sin señal, campo vacío, cancelar, bandeja vacía y con error); comparamos cada recuadro con el checklist oficial; comprobamos con los ejemplos reales que las horas hombre dan 12,5 y 6,0; medimos contraste (mínimo 5,3:1) y tamaño de los elementos (mínimo 48 px); y revisamos que cada campo de la ficha de datos existiera en `docs/datos/estructura_datos.md` y en el formulario.

## Encargo 8: Avance 6 (diseño de prueba de usuarios)
- **Objetivo:** Diseñar la prueba de usuarios del flujo principal: hipótesis, tareas con umbral, perfiles, pauta de la sesión y plan para registrar lo observado.
- **Instrucción entregada:** Subimos las instrucciones del Avance 6 y pedimos un plan de trabajo y borradores de `docs/prueba-usuarios.md` y `docs/pauta-validacion.md`, a partir de nuestras historias de usuario y del prototipo.
- **Respuesta obtenida:** Hipótesis, tres tareas con ficha y umbral, tabla de perfiles, una pauta de 18 minutos con consentimiento, contexto y SUS, y un plan con roles, planilla y regla de decisión.
- **Qué se aceptó y qué se corrigió:** Aceptamos la estructura y las tres tareas. Corregimos los tiempos con nuestra experiencia de trabajo (hacer el documento a mano toma entre 5 y 20 minutos) y definimos a quién invitar con contactos reales del rubro, sin incluir a quien diseñó el prototipo. Con solo 2 programadores o planificadores, cambiamos el umbral de T3 a «las 2 personas». Como una sola persona podría facilitar la sesión, el registro se hace después, viendo la grabación. También acortamos el consentimiento y la pauta, porque la app busca simplicidad. Queda por confirmar el plazo de conservación de las grabaciones.
- **Cómo se verificó:** Revisamos que los escenarios no nombraran botones ni pantallas y que ninguna pregunta sugiriera la respuesta ni pidiera una opinión sobre el futuro (la excepción son dos afirmaciones del SUS, que es un instrumento estándar). Comprobamos que las etapas sumaran menos de 20 minutos, que los umbrales tuvieran número antes de observar y que no hubiera datos personales en el repositorio.

## Encargo 9: Avance 7 (prueba de concepto del camino delgado)
**Encargo al agente (contexto, intención, restricciones y verificación):**
- **Contexto:** ReporteMtto es un prototipo web de HTML, CSS y JavaScript sin librerías (`src/`), publicado en Vercel con la carpeta raíz `src`. Las cinco pantallas funcionan simuladas y la estructura de datos está en `docs/datos/estructura_datos.md`. Hay un repositorio en GitHub con las ramas `dev` y `main`, y el despliegue sale de `main`.
- **Intención:** que una sola acción, «Guardar y enviar» el checklist de una actividad, funcione de punta a punta: entrada en pantalla, validación en el servidor, un registro guardado en una base de datos (Supabase) y un folio como respuesta, con el caso de éxito y al menos un caso de error.
- **Restricciones:** sin librerías nuevas ni pantallas nuevas; las claves solo en variables de entorno (`.env.example` sin valores, `.env` fuera del repositorio); la validación debe estar en el servidor aunque el formulario ya valide; datos de ejemplo inventados; lo demás del prototipo queda simulado; código que el equipo pueda explicar.
- **Verificación:** enviar datos inválidos directo al servidor, sin pasar por el formulario, y comprobar que no se guardan; revisar que no haya claves en el código; probar el caso de éxito, el error y el servicio caído desde la pantalla; y seguir el README desde cero.

**Registro:**
- **Objetivo:** Construir la prueba de concepto de la acción «entregar el checklist» y su documentación (`docs/arquitectura.md`, README, `.env.example`).
- **Instrucción entregada:** El encargo de arriba, junto con las instrucciones del Avance 7 y el código del prototipo.
- **Respuesta obtenida:** Una función en el servidor (`src/api/checklists.js`) con su validación (`_validar.js`) y su acceso a la base (`_db.js`), el esquema de la tabla (`supabase/schema.sql`), el cambio en el botón «Guardar y enviar» para que llame al servidor, un servidor local para probar (`scripts/server-local.js`) y los documentos.
- **Qué se aceptó y qué se corrigió:** Aceptamos que el servidor valide por su cuenta, que calcule él mismo la duración y las horas hombre en vez de confiar en el teléfono, que ignore cualquier campo que no esté en su lista y que no use librerías: la base se llama con `fetch`, sin `supabase-js`. La base queda cerrada al navegador (sin políticas de acceso) y solo entra el servidor con su clave. Corregimos tres cosas: (1) la primera versión de la validación aceptaba minutos de traslado y de espera negativos; lo detectó la prueba que enviaba datos inválidos directo al servidor y se agregó la regla; (2) el agente agregó un control «Envío» en la franja de controles del prototipo, que nadie había pedido: lo dejamos porque es la única forma de mostrar el error del servidor desde la pantalla, ya que el formulario no deja pasar un N° de OT inválido, y lo declaramos en el README; (3) el checklist pendiente por falla del servidor vive solo en la memoria de la pestaña, y esa limitación quedó escrita en `docs/arquitectura.md` en lugar de prometer un guardado que no existe.
- **Cómo se verificó:** Probamos el servidor con 10 datos inválidos (N° de OT corto, detalle vacío, hora imposible, trabajadores en 0, turno y cargo inexistentes, fecha imposible, inicio igual al término, minutos negativos y cuerpo vacío): todos dan error 400 y no se guarda ninguna fila. Un campo extra y un estado enviado a la fuerza se ignoran. Con la base caída el servidor responde 503 sin mostrar detalles internos. Desde la pantalla recorrimos el caso exitoso con su folio (las horas hombre dan 12,5 como en la hoja), el error del servidor y su corrección, el servicio caído con su reenvío y el envío sin señal. Estas pruebas se hicieron en el computador con un servicio que simula la API de Supabase. Revisamos con una búsqueda que no hubiera claves en el código ni en `.env.example`.


## Encargo 10: Ajustes a la prueba de concepto según la retroalimentación (Avance 7)
**Encargo al agente:** revisar la prueba de concepto contra la retroalimentación de los avances 1, 2 y 5 y la clase 7.1, y corregir lo que faltaba sin agregar pantallas ni librerías. En los avances 1 y 2 la profesora nos advirtió que el modo sin conexión es lo más difícil técnicamente y que Supabase no guarda nada local por su cuenta.

**Registro:**
- **Objetivo:** que el checklist pendiente no se pierda si se cierra la aplicación, que se vea que hay checklists sin enviar y dejar escrita una prueba de humo corta.
- **Respuesta obtenida:** los pendientes se guardan en el navegador del teléfono (`localStorage`) y se reenvían al abrir la aplicación con señal, al volver la conexión o con un botón «Enviar ahora»; un aviso arriba de la pantalla 1 («Tienes 1 checklist sin enviar»); el largo máximo de los campos de texto también en el formulario; la sección «Limitaciones conocidas» del README y `docs/prueba-humo.md`.
- **Qué se aceptó y qué se corrigió:** aceptamos `localStorage` en vez de IndexedDB porque alcanza para probar la idea y es simple de explicar; la cola completa queda declarada como limitación. La primera versión no recuperaba los pendientes al reabrir, porque la clave de guardado se leía antes de definirse; lo detectó la prueba automática y se corrigió.
- **Cómo se verificó:** se repitió la prueba automática completa con el servicio que simula Supabase (32 revisiones, todas pasan), con pruebas nuevas para el pendiente guardado y recuperado al reabrir, el botón «Enviar ahora», el doble clic en «Guardar y enviar» y un texto de 3.000 caracteres enviado directo al servidor.
- **Error encontrado en la prueba real:** al grabar el video, con dos pestañas abiertas, un checklist enviado sin señal quedó **dos veces** en la tabla: las dos pestañas compartían el pendiente guardado en el navegador y cada una lo envió. Pedimos al agente que lo corrigiera en el servidor y no solo en la pantalla: cada checklist lleva ahora un código único (`id_envio`), la base no acepta dos filas con el mismo código (columna `unique`) y, si llega repetido, el servidor responde con el folio que ya existía. Además, las pestañas se avisan cuando cambian los pendientes. Verificamos que la prueba automática nueva (dos pestañas enviando el mismo pendiente, y el mismo `id_envio` enviado dos veces directo al servidor) **fallaba con el código anterior** y pasa con el corregido (36 revisiones en total).
- **Segundo error encontrado en la prueba real:** después de recargar, el control decía «Sin señal» pero el checklist se enviaba igual. El navegador recordaba lo elegido en el menú, mientras la aplicación partía siempre «con señal». Se corrigió para que, al abrir, la aplicación lea lo que muestran los controles (y se pidió al navegador no recordarlos). Lo verificamos simulando un navegador que recuerda «Sin señal»: con el código anterior se enviaba y con el corregido queda pendiente.
- **Prueba con Supabase real:** el 20 de noviembre de 2026, Aldo Castillo la corrió en la vista previa de `dev` en Vercel, con la base real. El caso exitoso dio el folio 1 y su fila apareció en la tabla `checklists`; el N° de OT inválido mostró el mensaje del servidor y la tabla siguió con 1 fila; un checklist enviado sin señal quedó pendiente, sobrevivió al cierre de la pestaña y se guardó solo al reabrir (fila 3); el doble clic guardó una sola fila. Capturas en `docs/img/poc/` y resultados en `docs/prueba-humo.md`.

## Encargo 11: Avance 8 (robustecimiento, seguridad y permisos)
**Encargo al agente (contexto, intención, restricciones y verificación):**
- **Contexto:** la PoC del Avance 7 crea el checklist con validación en el servidor y guarda en Supabase, pero sin usuarios. El servidor entraba a la base con la clave secreta, que se salta todas las reglas. Le entregamos como especificación las dos tablas que escribimos primero: las **reglas de validación** campo por campo (hoy en `docs/robustecimiento.md`) y la **matriz de permisos** (supervisor: crea y ve solo los suyos y anula los suyos mientras no estén recibidos; programador: ve todos, recibe, corrige la OT y anula con motivo; planificador: solo consulta; administrador: fuera de la app, y nadie borra).
- **Intención:** completar las operaciones sobre el checklist (consultar, recibir y anular con baja lógica), con inicio de sesión por roles y denegación por defecto en la pantalla, el servidor y la base (RLS).
- **Restricciones:** solo el objeto de la PoC (tablas `checklists` y `perfiles`); sin librerías nuevas; la clave secreta fuera de la aplicación; la regla en el formulario **y** en el servidor **y** en la base; ocultar un botón no cuenta como permiso; nunca borrar físicamente; cuentas de prueba ficticias y fuera del repositorio.
- **Verificación:** probar las políticas entrando como cada rol en un PostgreSQL real; pedir lo prohibido por fuera de la pantalla (consola del navegador y llamada directa a Supabase); correr los 5 intentos de rotura de la clase 6.1 y las 4 pruebas de la clase 6.2 con dos cuentas.

**Registro:**
- **Objetivo:** que la acción del checklist resista el uso real y que cada rol pueda hacer solo lo que le corresponde.
- **Instrucción entregada:** el encargo de arriba, con las dos tablas, las instrucciones del Avance 8 y el código del Avance 7.
- **Respuesta obtenida:**
  - `supabase/schema.sql` con estados, perfiles, reglas automáticas (trigger) y políticas RLS.
  - Las funciones `src/api/sesion.js`, `src/api/_usuario.js` y `src/api/_supa.js`.
  - `src/api/checklists.js` con consultar, recibir, editar OT y anular.
  - En la pantalla: inicio de sesión, «Mis checklists», la «Bandeja» y el detalle con sus cuatro estados.
  - Los documentos `docs/robustecimiento.md` y `docs/permisos.md`.
- **Qué se aceptó y qué se corrigió:**
  - **La clave secreta en el servidor (venía del Avance 7).** Con ella las políticas RLS no restringían nada, porque esa clave se las salta. Pedimos que el servidor entre a la base con el **token de cada persona** y la clave pública. La clave secreta salió de la aplicación y de Vercel (ADR 4 en `docs/arquitectura.md`).
  - **Horas hombre falsificables.** El cálculo estaba solo en el servidor, así que un supervisor podía llamar directo a Supabase con su token e inventar las horas. Ahora las calcula la base con una regla automática. Además, el usuario solo puede escribir las columnas permitidas: no su autor, ni las horas, ni quién recibió.
  - **Supabase caído se leía como sesión vencida.** La prueba automática encontró que, si la autenticación no respondía, el servidor contestaba «Tu sesión expiró» y la app echaba a la persona. Lo corregimos a 503, «No es un error tuyo».
  - **Pendientes compartidos entre cuentas.** Había una sola lista de pendientes por navegador, así que el checklist sin enviar de un supervisor se podía mandar con la sesión del programador. Ahora hay una lista por cuenta.
  - **Aceptamos** el 404 igual para «no existe» y para «no es tuyo» (así no se revela qué folios existen), y el 409 cuando dos personas cambian el mismo checklist a la vez.
- **Cómo se verificó:**
  - Ejecutamos `schema.sql` dos veces seguidas sobre una copia de la base del Avance 7 con datos, y no falló ni borró nada.
  - Probamos 34 casos de las políticas entrando como cada rol en PostgreSQL real. Todos pasan.
  - Corrimos una prueba automática en el navegador con dos cuentas, contra PostgreSQL y PostgREST reales (el mismo motor que usa Supabase). Pasan 41 revisiones: sin sesión, registro ajeno, acción prohibida desde la consola y directo a la base, doble clic, sin señal, sesión vencida y servicio caído.
  - Buscamos claves en el historial del repositorio y no encontramos ninguna.
- **Prueba en la dirección publicada:** PENDIENTE: anotar la fecha, quién la hizo y qué se vio con las dos cuentas.
