# Prueba de humo de la prueba de concepto · ReporteMtto

Lista corta que se corre **antes de entregar**, en la dirección publicada (https://checklist-mantenimiento-src.vercel.app), en una **ventana de incógnito**, idealmente desde un teléfono y con datos inventados. Está ordenada por riesgo: primero lo que, si falla, deja al supervisor sin poder entregar su checklist. Se corre entera cada vez que se cambia algo, no solo lo corregido.

| # | ¿Qué se prueba? | Situación inicial y acción | Resultado esperado (se ve en pantalla) | Estado |
|---|---|---|---|---|
| 1 | Abre sin iniciar sesión | Abrir la dirección en una ventana de incógnito. | Aparece «Nuevo checklist» sin pedir cuenta ni contraseña. | Por correr |
| 2 | Flujo principal completo | Con **Señal: Con señal** y **Envío: Normal**, completar las pantallas 1 y 2, firmar y tocar «Guardar y enviar». | «Checklist enviado» con su folio y las horas hombre. En Supabase (**Table Editor → checklists**) aparece la fila nueva. | Por correr |
| 3 | Error del servidor | **Envío: Con N° de OT inválido (PoC)** y enviar. | Mensaje en rojo «El servidor no guardó el checklist: El N° de OT tiene 9 dígitos…». No aparece fila nueva. El botón sigue disponible y no se borra lo escrito. | Por correr |
| 4 | Sin señal (interrupción) | **Señal: Sin señal** y enviar. | «Pendiente de envío · Se enviará al recuperar señal». No aparece fila nueva. | Por correr |
| 5 | El pendiente no se pierde | Después de la fila 4, cerrar la pestaña y volver a abrir la dirección en la misma ventana. | Arriba aparece «Tienes 1 checklist sin enviar». Con señal se envía solo o con «Enviar ahora», y aparece la fila en Supabase. | Por correr |
| 6 | Corte real de conexión | En el teléfono, completar el checklist, activar el **modo avión** y tocar «Guardar y enviar». Luego quitar el modo avión. | «Pendiente de envío» con «No pudimos conectar con el servidor». Al volver la conexión se envía solo y aparece la fila. | Por correr |
| 7 | Campo vacío | En la pantalla 2, dejar «Detalle de lo realizado» con solo espacios y tocar «Siguiente». | Aviso junto al campo y no avanza. | Por correr |
| 8 | Texto larguísimo | Pegar un texto muy largo en «Detalle de lo realizado». | El campo no acepta más de 2.000 caracteres; el resto no se escribe. | Por correr |
| 9 | Enviar dos veces | Tocar «Guardar y enviar» dos veces seguidas, rápido. | Un solo «Checklist enviado» y una sola fila nueva en Supabase. | Por correr |
| — | Persona equivocada | Ver lo que registró otra persona. | No aplica a esta prueba de concepto: no hay inicio de sesión (queda para el Avance 8). La base está cerrada al navegador: solo el servidor puede leerla. | Fuera de alcance |

**Antes de esta prueba**, el 20 de noviembre corrimos en el computador una prueba automática con un servicio que simula Supabase: 32 revisiones, todas pasaron (datos inválidos enviados directo al servidor, el caso exitoso, el error, el servicio caído, el pendiente guardado y recuperado al reabrir, y el doble clic). La prueba de esta tabla es la que vale, porque se hace en la dirección publicada y con la base real.

**Cómo se anota:** en «Estado» se escribe **Pasa** o **Falla**, con la fecha. Si algo falla, se anota qué se vio y se corrige antes de entregar.
