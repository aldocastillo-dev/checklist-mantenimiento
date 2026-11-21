# Prueba de humo de la prueba de concepto · ReporteMtto

Lista corta que se corre **antes de entregar**, en la dirección publicada (https://checklist-mantenimiento-src.vercel.app), en una **ventana de incógnito**, idealmente desde un teléfono y con datos inventados. Está ordenada por riesgo: primero lo que, si falla, deja al supervisor sin poder entregar su checklist. Se corre entera cada vez que se cambia algo, no solo lo corregido.

| # | ¿Qué se prueba? | Situación inicial y acción | Resultado esperado (se ve en pantalla) | Estado | Evidencia |
|---|---|---|---|---|---|
| 1 | Abre sin iniciar sesión | Abrir la dirección definitiva en una ventana de incógnito. | Aparece «Nuevo checklist» sin pedir cuenta ni contraseña. | Por correr después del merge a `main` | — |
| 2 | Flujo principal completo | Con **Señal: Con señal** y **Envío: Normal**, completar las pantallas 1 y 2, firmar y tocar «Guardar y enviar». | «Checklist enviado» con su folio y las horas hombre. En Supabase (**Table Editor → checklists**) aparece la fila nueva. | Pasa · 20-11-2026 | [folio 1](img/poc/01-exitoso-folio1.png) · [fila 1](img/poc/02-supabase-fila1.png) |
| 3 | Error del servidor | **Envío: Con N° de OT inválido (PoC)** y enviar. Luego volver a **Envío: Normal** y enviar de nuevo. | Mensaje en rojo «El servidor no guardó el checklist: El N° de OT tiene 9 dígitos…». No aparece fila nueva. No se borra lo escrito. Al corregir, se guarda. | Pasa · 20-11-2026 | [mensaje](img/poc/04-servidor-rechaza-ot.png) · [sigue 1 fila](img/poc/05-supabase-sigue-1-fila.png) · [folio 2](img/poc/06-corregido-folio2.png) · [2 filas](img/poc/07-supabase-2-filas.png) |
| 4 | Sin señal (interrupción) | **Señal: Sin señal** y enviar. | «Pendiente de envío · Se enviará al recuperar señal». No aparece fila nueva. | Pasa · 20-11-2026 | [pendiente](img/poc/08-sin-senal-pendiente.png) |
| 5 | El pendiente no se pierde | Después de la fila 4, cerrar la pestaña y volver a abrir la dirección en la misma ventana. | Con señal se envía solo («Volvió la señal: se envió 1 checklist pendiente») y aparece la fila en Supabase. | Pasa · 20-11-2026 | [3 filas](img/poc/09-supabase-3-filas-reenvio.png) |
| 6 | Corte real de conexión | En el teléfono, completar el checklist, activar el **modo avión** y tocar «Guardar y enviar». Luego quitar el modo avión. | «Pendiente de envío» con «No pudimos conectar con el servidor». Al volver la conexión se envía solo y aparece la fila. | Por correr (opcional, en teléfono) | — |
| 7 | Campo vacío | En la pantalla 2, dejar «Detalle realizado» con solo espacios y tocar «Siguiente». | Aviso junto al campo y no avanza. | Pasa · 20-11-2026 | [aviso](img/poc/10-detalle-vacio.png) |
| 8 | Texto larguísimo | Pegar un texto muy largo en «Detalle realizado» y enviar. | El campo no acepta más de 2.000 caracteres y el servidor lo guarda. | Pasa · 20-11-2026 | [texto](img/poc/11-texto-largo.png) |
| 9 | Enviar dos veces | Tocar «Guardar y enviar» dos veces seguidas, rápido. | Un solo «Checklist enviado» y una sola fila nueva en Supabase. | Pasa · 20-11-2026 | [folio 4](img/poc/12-doble-clic-folio4.png) · [4 filas](img/poc/13-supabase-4-filas.png) |
| 10 | Dos pestañas con el mismo pendiente (repetición) | Con dos pestañas abiertas, enviar un checklist **Sin señal** en una, cerrarla y volver a abrir la dirección, y volver a **Con señal** en la otra. | Una sola fila nueva en Supabase, aunque las dos pestañas lo envíen. | Falla · 20-11-2026 (se guardó dos veces). Corregido; por volver a correr | — |
| 11 | El control de señal dice la verdad al recargar | Elegir **Sin señal**, recargar la página y enviar un checklist. | Si el control muestra «Sin señal», queda «Pendiente de envío» y no se envía. | Falla · 21-11-2026 (mostraba «Sin señal» y lo enviaba). Corregido; por volver a correr | — |
| — | Formulario (capa 1) | Escribir un N° de OT de 5 dígitos en la pantalla 1. | El formulario avisa junto al campo antes de enviar. | Pasa · 20-11-2026 | [aviso](img/poc/03-formulario-rechaza-ot.png) |
| — | Persona equivocada | Ver lo que registró otra persona. | No aplica a esta prueba de concepto: no hay inicio de sesión (queda para el Avance 8). La base está cerrada al navegador: solo el servidor puede leerla. | Fuera de alcance | — |

La fila 10 la encontramos al grabar el video: el mismo checklist quedó dos veces en la tabla. Se corrigió con un código único por checklist (`id_envio`): la base no acepta dos filas con el mismo código y el servidor devuelve el folio que ya existía.

Las filas 2 a 9 se corrieron el 20 de noviembre de 2026 en la vista previa de la rama `dev` publicada en Vercel, con la base real en Supabase. Las capturas de la tabla muestran la fecha y la hora en la barra de Windows.

**Antes de esta prueba**, el 20 de noviembre corrimos en el computador una prueba automática con un servicio que simula Supabase: 32 revisiones, todas pasaron (datos inválidos enviados directo al servidor, el caso exitoso, el error, el servicio caído, el pendiente guardado y recuperado al reabrir, y el doble clic). La prueba de esta tabla es la que vale, porque se hace en la dirección publicada y con la base real.

**Cómo se anota:** en «Estado» se escribe **Pasa** o **Falla**, con la fecha. Si algo falla, se anota qué se vio y se corrige antes de entregar.
