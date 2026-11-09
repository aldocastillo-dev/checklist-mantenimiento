# Diseño de prueba de usuarios · ReporteMtto

Este documento diseña la prueba que se hará más adelante con personas ajenas al equipo. Todavía no se ejecuta ni hay resultados. La pauta que se lee en cada sesión está en [`pauta-validacion.md`](pauta-validacion.md).

## 1. Objetivo, hipótesis y alcance

**Pregunta:** ¿se entiende y se logra el flujo principal de ReporteMtto: registrar, firmar y entregar el checklist de una actividad, y luego recibirlo, corregir su N° de OT y descargarlo?

**Hipótesis:** Creemos que un supervisor o capataz de turno puede entregar el checklist de una actividad sin ayuda y en menos de 5 minutos, y que un programador o planificador puede corregir el N° de OT y descargar el documento sin ayuda en menos de 4 minutos. Hacerlo a mano toma hoy entre 5 y 20 minutos, según lo que haya que redactar. Lo sabremos cuando observemos que al menos 4 de 5 supervisores o capataces, y las 2 personas del perfil programador, completan sus tareas en esos tiempos. Si 2 o más supervisores o capataces necesitan ayuda en una tarea, o si una de las 2 personas programadoras no la completa, la hipótesis se rechaza para esa tarea.

**Fuera del alcance:** el prototipo no permite comprobar si el sistema funciona técnicamente. El envío, el guardado sin señal y la descarga son simulados. Tampoco se prueba el uso en terreno (interior mina, guantes, poca luz), la firma del mandante, que sigue en papel, ni el catálogo completo de equipos.

## 2. Tareas, métricas y umbral

| Tarea | HU | Escenario | Objetivo | Éxito observable | No revelar | Umbral |
|---|---|---|---|---|---|---|
| **T1** Entregar el trabajo (supervisor o capataz) | HU-01, HU-03 | «Son las 22:40 y terminó de cambiar tres polines de carga en una correa, con tres personas. Tiene los datos de su trabajo en esta tarjeta. Deje entregado el trabajo de esta actividad, firmado por usted, para que el programador lo reciba antes de que termine su turno.» | Que el programador reciba el trabajo firmado | La persona llega a la confirmación de envío con los datos de la tarjeta y su firma, sin ayuda | Nombres de botones, número de pantallas, cómo se firma, que existe un botón «Ahora» | 4 de 5 sin ayuda en menos de 5 min (si participan 3, los 3) |
| **T2** Entregar sin señal (supervisor o capataz) | HU-01 (alternativo) | «Está en un sector donde el teléfono no tiene señal y termina otro trabajo, que está anotado en esta tarjeta. Entréguelo y dígame si el programador ya lo recibió.» | Saber si su entrega ya llegó | Entrega el trabajo y dice correctamente que todavía no llegó y que se enviará después | Que existe un estado «pendiente» y cómo se simula la falta de señal | 4 de 5 lo identifican correctamente en menos de 3 min (si participan 3, los 3) |
| **T3** Recibir y descargar (programador o planificador) | HU-04 | «Le llegó la entrega de un trabajo, pero no trae el número de la orden de trabajo. Es el 111254881. Complételo y deje el documento listo para llevárselo al mandante.» | Tener el documento con su N° de OT | Corrige el N° de OT y obtiene el documento, sin ayuda | Dónde está la bandeja, cómo se edita la OT, el formato del número | Las 2 personas, sin ayuda y en menos de 4 min; si una falla, la tarea no se logra |

**Tarjetas de datos** (con datos inventados, para que nadie use datos reales):
- T1: Área Transporte intermedio · Equipo Correa Intermedia L1 · Equipo de la actividad Polea de cola · Inicio 20:15 · Término 22:40 · N° OT 111254880 · Detalle «Se cambian 3 polines de carga y se revisa la alineación» · 3 trabajadores · Traslado 20 min · Espera de bloqueo 0 min.
- T2: Área Transporte principal · Equipo Alimentador Norte · Equipo de la actividad Buzón de carga · Inicio 09:00 · Término 11:30 · sin N° OT · Detalle «Se reemplaza el faldón lateral del buzón» · 2 trabajadores · Traslado 30 min · Espera de bloqueo 0 min.
- T3: la bandeja de ejemplo del prototipo incluye una entrega sin N° de OT; el facilitador la deja lista antes de la sesión.

**Métricas** (iguales para cada tarea):
- **Eficacia:** completa sin ayuda (sí o no).
- **Eficiencia:** tiempo en minutos, ayudas pedidas y desvíos (veces que entra a una pantalla que no corresponde).
- **Satisfacción:** cuestionario SUS al final de la sesión. Umbral: promedio de 68 o más (la referencia habitual del instrumento).

Todos los umbrales quedan fijados aquí, antes de observar, y no se cambian después de ver los resultados.

## 3. Perfiles y reclutamiento

| Perfil | Usuario o stakeholder | N.º | Cómo se contacta | Por qué |
|---|---|---|---|---|
| Supervisor de turno de mantenimiento mecánico | Usuario (T1 y T2) | 5 invitados; se espera que participen al menos 3 | Invitación directa por mensaje a personas del rubro que conoce el equipo, fuera del curso | Es quien hoy transcribe el checklist al final del turno y firma la entrega |
| Capataz o supervisor con poca señal o poco uso de apps | Usuario (T1 y T2), dentro de los 5 anteriores | 2 | Igual que el anterior; a cada persona invitada se le pide que recomiende a un colega con esas condiciones | **Es quien queda excluido** en el mapa de impacto del Avance 5 (B1): trabaja en sectores sin señal o no tiene el hábito de usar apps |
| Programador o planificador de mantenimiento | Usuario (T3) | 2 | Invitación directa a personas de la misma función, ajenas al equipo | Reciben el checklist, verifican el N° de OT y descargan el documento. El planificador cumple la misma función en este flujo |
| Administrador de contrato, supervisor del mandante e ingeniero de confiabilidad | Stakeholder | 1 a 3 | Mensaje formal; si la organización lo exige, con el certificado de respaldo que emite el profesor | Autorizan el uso, validan el formato del documento o usan los datos. Se les consulta por restricciones y condiciones de adopción, y no hacen tareas |

**Limitaciones:** son pocas personas, y varias son conocidas del equipo, lo que puede hacerlas más amables con el prototipo. Por eso la pauta usa tareas y preguntas sobre hechos pasados, y no preguntas de opinión. Si no se obtiene permiso en la organización, se invita a personas del mismo cargo en otra planta o empresa. Ningún integrante del equipo participa como usuario. Este documento no incluye nombres, teléfonos ni correos de participantes.

## 5. Plan de levantamiento de feedback

**Sesiones:** 7 de prueba (5 supervisores o capataces, 2 programadores o planificadores) y entre 1 y 3 entrevistas cortas a stakeholders, de 5 a 10 minutos. **Duración por sesión:** máximo 18 minutos (14 para el programador).

**Roles:** son tres, y los asigna el equipo según quién esté disponible. Puede haber una persona distinta para cada uno o una sola para los tres.
- **Facilita:** es la única persona que habla con el participante. Lee la pauta tal cual y no ayuda.
- **Registra:** llena la planilla. Si hay otra persona disponible, lo hace durante la sesión. Si quien facilita está sola, registra **después, viendo la grabación**, con el minuto exacto de cada observación.
- **Resguarda la evidencia:** al terminar, sube la grabación a su carpeta y verifica que no queden datos personales en el repositorio.

**Cómo se graba:** pantalla y voz del celular, sin rostro. La grabación es el registro principal de la sesión, porque permite que otra persona verifique cada tarea. Si alguien no acepta ser grabado, la persona que facilita anota lo esencial apenas termina la sesión, y esa sesión se marca en la planilla como registrada de memoria. Las grabaciones se guardan en la carpeta del curso en Drive, con acceso restringido y **fuera del repositorio**, hasta el cierre del curso.

**Planilla de registro** (una fila por observación):

| Participante | Tarea | Minuto | Observado | Interpretado | Severidad |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

El participante se identifica solo con un código (P1, P2, …). La severidad es una de tres: bloquea, entorpece o estético.

**Regla de decisión:**
- **Bloquea** (no completa sin ayuda): se corrige antes de construir.
- **Entorpece** (completa con dudas o errores): se prioriza según cuántas personas lo vivieron.
- **Estético** (completa y solo le incomoda): se registra y espera.
