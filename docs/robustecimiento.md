# Robustecimiento funcional · ReporteMtto

Avance 8, Parte A. El objeto de la acción de la PoC es el **checklist de entrega de trabajos**. Este documento cubre lo que se hizo para que esa acción resista el uso real: las operaciones completas sobre el checklist, las reglas de validación, los estados de la pantalla y las pruebas de robustez. Los permisos (quién puede hacer cada operación) están en [permisos.md](permisos.md).

## Operaciones sobre el checklist

| Operación | Qué hace | Quién | Dónde |
|---|---|---|---|
| **Crear** | El supervisor completa las 3 pantallas, firma y toca «Guardar y enviar». Queda en estado **Enviado**, con su folio. | Supervisor o capataz | Pantallas 1 a 4 · `POST /api/checklists` |
| **Consultar** | Lista con el estado de cada checklist y filtros por estado, turno y equipo. El supervisor ve **«Mis checklists»**; el programador y el planificador ven la **«Bandeja»** con todos. Cada uno se abre en su detalle (`#/ver/N`). | Todos los roles, según su alcance | `#/lista`, `#/ver/N` · `GET /api/checklists` |
| **Actualizar** | Es un cambio de estado: el programador lo marca **Recibido** y completa el N° de OT si faltaba. Después puede corregir el N° de OT. | Programador | Detalle · `PATCH /api/checklists?id=N` con `recibir` o `editar_ot` |
| **Dar de baja** | **Borrado lógico**: el checklist queda **Anulado**, con el motivo, quién y cuándo. La fila no se borra nunca: la base lo impide incluso al administrador. | El supervisor (solo los suyos, mientras no estén recibidos) y el programador | Detalle · `PATCH /api/checklists?id=N` con `anular` |

**Flujo de estados:** `Enviado → Recibido`, y desde cualquiera de los dos `→ Anulado`. Un anulado no vuelve atrás. «Pendiente de envío» existe solo en el teléfono, mientras no hay señal: todavía no llega a la base.

## Reglas de validación

Cada regla se revisa en **tres capas**:
1. **El formulario** avisa mientras la persona escribe (`src/app.js`).
2. **El servidor** la vuelve a revisar sobre todo lo que llega, aunque venga por fuera de la pantalla (`src/api/_validar.js`).
3. **La base de datos** la declara como restricción (`supabase/schema.sql`).

Un dato que no cumple no se guarda.

| Campo | ¿Obligatorio? | Tipo | Largo o rango | Mensaje exacto | Capas |
|---|---|---|---|---|---|
| Área | Sí | texto o lista | 1 a 80 caracteres | «Elige el área del trabajo.» | Formulario · servidor · base |
| Equipo | Sí | texto o lista | 1 a 80 caracteres | «Elige el equipo de la lista, o «Otro (escribir)» si no aparece.» | Formulario · servidor · base |
| Equipo de la actividad | Sí | texto | 1 a 120 caracteres | «Escribe el equipo de la actividad. Puede ser un sub equipo, por ejemplo «Polea de cola».» | Formulario · servidor · base |
| Fecha del turno | Sí | fecha | fecha válida AAAA-MM-DD | «La fecha del turno no es válida. Usa el formato AAAA-MM-DD, por ejemplo 2026-11-20.» | Formulario (selector de fecha) · servidor · base |
| Turno | Sí | lista cerrada | «día» o «noche» | «El turno debe ser «día» o «noche».» | Formulario (lista) · servidor · base |
| Hora inicio | Sí | hora | HH:MM | «Toca «Ahora» o escribe la hora de inicio, por ejemplo 20:15.» | Formulario · servidor · base |
| Hora término | Sí | hora | HH:MM, distinta del inicio | «La hora de término no puede ser igual a la de inicio. Corrígela.» | Formulario · servidor · base |
| N° OT SAP | No | texto numérico | exactamente 9 dígitos | «El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo o déjalo vacío.» | Formulario · servidor · base |
| Detalle realizado | Sí | texto | 1 a 2.000 caracteres (sin contar espacios sueltos) | «Escribe lo que se hizo en la actividad, o pega tu reporte.» | Formulario (`maxlength`) · servidor · base |
| Observaciones | No | texto | hasta 2.000 caracteres | «Las observaciones pueden tener hasta 2000 caracteres.» | Formulario (`maxlength`) · servidor · base |
| N° trabajadores | Sí | entero | 1 a 50 (el formulario permite hasta 20) | «El N° de trabajadores es un número entero entre 1 y 50.» | Formulario (botones − y +) · servidor · base |
| Tiempo traslado | No (0 por defecto) | entero | 0 a 600 minutos | «Escribe los minutos como número, por ejemplo 70. Si no hubo, deja 0.» | Formulario · servidor · base |
| Tiempo espera bloqueo | No (0 por defecto) | entero | 0 a 600 minutos | «Escribe los minutos como número, por ejemplo 35. Si no hubo, deja 0.» | Formulario · servidor · base |
| Firma | Sí | dibujo | al menos un trazo | «Falta tu firma. Dibújala con el dedo dentro del recuadro.» | Formulario (no se envía todavía: ver limitaciones) |
| Motivo de anulación | Sí, al anular | texto | 5 a 300 caracteres | «Escribe el motivo de la anulación (al menos 5 caracteres), por ejemplo «Lo envié dos veces».» | Formulario · servidor · base |
| Correo (inicio de sesión) | Sí | correo | con @ y dominio, hasta 120 | «El correo no es válido. Revisa que tenga @ y un dominio, por ejemplo nombre@empresa.cl.» | Formulario · servidor |
| Contraseña | Sí | texto | — | «Escribe tu contraseña.» | Formulario · servidor (la revisa Supabase) |

**Lo que la persona no elige.** El servidor no confía en estos datos, aunque lleguen en la petición:
- La **duración** y las **horas hombre** las calcula la base de datos con una regla automática (trigger). Si alguien manda otras, se ignoran.
- El **cargo** sale de la cuenta, no de lo que mande el teléfono.
- El **autor**, el **estado** al crear y **quién y cuándo** recibió o anuló también los pone la base.
- Cualquier campo que no está en la lista se ignora.

**¿A quién dejamos fuera con estas reglas?**
- El N° de OT es opcional, porque muchas veces el supervisor no lo tiene al terminar el turno: lo completa el programador.
- El área y el equipo aceptan «Otro (escribir)» para lo que no está en la lista.
- Quien no tiene señal puede llenar el checklist igual: queda guardado en el teléfono.

## Estados de la pantalla y manejo de errores

| Pantalla | Cargando | Vacío | Error | Éxito |
|---|---|---|---|---|
| Iniciar sesión | Botón «Entrando…» bloqueado (no se envía dos veces) | — | Junto a cada campo, o «El correo o la contraseña no coinciden…» | Entra a su pantalla según el rol |
| Firma y envío (P3) | Botón «Enviando…» bloqueado | — | Mensaje del servidor sobre la firma, **sin borrar nada** | Confirmación con folio y horas hombre |
| Mis checklists / Bandeja | «Cargando checklists…» | «Aún no has enviado checklists» con botón «Crear un checklist» (supervisor) · «Aún no hay checklists. Cuando un supervisor envíe uno, aparecerá aquí» (programador) · «Sin resultados» con «Quitar filtros» | Aviso con «Reintentar» | La lista con el estado de cada uno |
| Detalle | «Cargando checklist…» | «No encontrado: ese checklist no existe o no tienes acceso a él», con «Volver a la lista» | Aviso con «Reintentar» | La ficha, y los botones que corresponden al rol |
| Recibir / editar OT / anular | Botón «Guardando…» bloqueado | — | Junto al campo (OT, motivo) o arriba, **conservando lo escrito** | Aviso breve y la ficha con el nuevo estado |

**Cómo se escribe cada error.** Distinguimos si el problema es de la persona o del sistema:

| Origen | Código | Qué le decimos |
|---|---|---|
| La persona (dato) | 400 | Qué campo y cómo corregirlo. Ejemplo: «El N° de OT tiene 9 dígitos…». |
| La persona (sesión) | 401 | «Tu sesión expiró. Vuelve a iniciar sesión.» Si estaba enviando, el checklist queda guardado en el teléfono y se envía al volver a entrar. |
| La persona (rol) | 403 | «Tu rol (Programador) no permite crear checklists. Solo el supervisor o el capataz los crean.» |
| El registro | 404 | «Ese checklist no existe o no tienes acceso a él.» Es el mismo mensaje para los dos casos, para no revelar qué folios existen. |
| Otra persona lo cambió | 409 | «Otra persona cambió este checklist recién. Actualiza la lista y revisa su estado.» |
| El sistema | 503 o sin conexión | «No pudimos conectar con el sistema. No es un error tuyo: reintenta en un momento.» |

Ningún error borra lo que la persona ya escribió.

## Pruebas de robustez

Las cinco de la clase 6.1, más casos de las seis familias de la clase 7.1. Las corrimos el **25 de noviembre de 2026** con una prueba automática en el navegador. La prueba usó una copia fiel de Supabase: PostgreSQL y PostgREST reales, con el mismo `schema.sql` y las mismas políticas. Después las repetimos en la dirección publicada (ver «Prueba en la dirección publicada»).

| Intento | Resultado |
|---|---|
| **1. Enviar un campo obligatorio vacío** (detalle con solo espacios; login sin correo) | El formulario avisa junto al campo y no avanza. Si se manda igual por fuera de la pantalla, el servidor responde 400 y no guarda nada. **Pasa.** |
| **2. Presionar dos veces seguidas el botón de envío** (al enviar, al recibir y al iniciar sesión) | El botón se bloquea («Enviando…») y cada checklist lleva un código único (`id_envio`) que la base no acepta repetido: queda **una sola fila**. **Pasa.** |
| **3. Ingresar un texto de longitud excesiva** (3.000 caracteres en el detalle) | El campo no acepta más de 2.000. Enviado directo al servidor: 400 «El detalle puede tener hasta 2000 caracteres». La base tiene el mismo límite. **Pasa.** |
| **4. Interrumpir la conexión durante el envío** (Señal: Sin señal; Supabase caído) | Queda «Pendiente de envío» y se guarda en el teléfono, separado por cuenta. Se envía al volver la señal o al volver a entrar. Con Supabase caído, la lista muestra «No es un error tuyo» con «Reintentar». **Pasa.** |
| **5. Acceder a la dirección de un registro inexistente** (`#/ver/99999` y `#/ver/abc`) | «No encontrado: ese checklist no existe o no tienes acceso a él», con «Volver a la lista». No queda en blanco. **Pasa.** |
| Formato inesperado: símbolos o código (`<script>`) en el detalle | Se guarda como texto y se muestra como texto: la pantalla escapa todo lo que muestra. **Pasa.** |
| Formato inesperado: N° de OT de 3 dígitos, alterado al enviar (control «Envío: Con N° de OT inválido») | El servidor lo rechaza, no guarda y la pantalla conserva la firma y lo escrito. **Pasa.** |
| Extremo del rango: motivo de anulación de 3 caracteres | Aviso junto al campo; el servidor y la base también lo rechazan. **Pasa.** |
| Interrupción: la sesión vence mientras se llena el checklist | Al enviar, el checklist queda guardado y la app pide volver a entrar; al entrar se envía. Si solo venció el token, se renueva solo. **Pasa.** |
| Repetición: dos personas cambian el mismo checklist | El cambio exige que el estado no haya cambiado; si cambió, responde 409 y no pisa lo del otro. **Pasa.** |
| Persona equivocada | Ver las 4 pruebas de rotura en [permisos.md](permisos.md). |

**Fallos que encontramos y corregimos:**
- **Supabase caído se confundía con una sesión vencida.** Si el servicio de autenticación no respondía, el servidor contestaba «Tu sesión expiró», y la app echaba a la persona aunque no fuera su culpa. Ahora responde 503, «No es un error tuyo», y la sesión se mantiene. Lo encontró la prueba automática, y la volvimos a correr completa después de corregirlo.
- **Los pendientes de una cuenta se podían enviar con otra.** Antes había una sola lista de pendientes por navegador. Ahora se guarda una por cuenta, y la prueba confirma que el pendiente del supervisor no se envía cuando entra el programador.

**Pendiente (declarado):**
- La firma se dibuja, pero todavía no se guarda en la base.
- La cola de envío sin señal usa el almacenamiento del navegador (`localStorage`). Si se borran los datos del navegador antes de recuperar señal, el pendiente se pierde.

## Prueba en la dirección publicada

| Intento | Resultado | Fecha |
|---|---|---|
| Los 5 intentos de arriba, en https://checklist-mantenimiento-src.vercel.app con las cuentas de prueba | PENDIENTE: anotar «Pasa» o «Falla» | PENDIENTE |
