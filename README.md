# Reporte digital del checklist de entrega de trabajos de mantenimiento

## Qué es la solución
App móvil y web para que el supervisor de turno registre en terreno el checklist de entrega de trabajos, con su detalle realizado, firma en pantalla y envío automático al programador en el formato oficial.

**Principales características:**
* **Registro en terreno:** Smartphone con los mismos recuadros del checklist oficial (área, equipo, detalle realizado, horas y participantes), con listas de opciones y el texto pegable desde las notas del teléfono; los repuestos y lo detectado se anotan en observaciones.
* **Modo sin conexión (Offline):** Funciona en interior mina, almacena localmente y sincroniza de forma automática al recuperar señal.
* **Generación de documentos:** Crea automáticamente el PDF en formato oficial con firmas en pantalla listo para imprimir o adjuntar.
* **Bandeja web:** Permite al programador consultar, filtrar y descargar los checklists del turno.

---

## Para quién es
Supervisores de turno de mantenimiento mecánico (usuarios principales) y programadores de mantenimiento (reciben y revisan los checklist).

**Detalle de involucrados:**
| Rol | Relación con la solución |
|---|---|
| **Supervisores de turno (Mecánico):** | Registran en el punto de trabajo y gestionan las firmas de entrega y recepción.|
| **Programadores de mantenimiento:** | Reciben los documentos, verifican HH y N° OT SAP para realizar la carga correspondiente.|
| **Ingenieros de confiabilidad y Administración:** | Se benefician de contar con la información a tiempo y sin pérdida de detalle técnico.|
| **Supervisores Codelco (Mandante):** | Validan el formato digital y firman la recepción de los trabajos.|

---

## Cómo se instala y se ejecuta
Hay un prototipo navegable en `src/` (enlace en `docs/prototipo.md`). Una acción del flujo, **«Guardar y enviar» el checklist**, ya funciona de verdad con servidor y base de datos: es la prueba de concepto del Avance 7.

### Prueba de concepto (Avance 7)
**Qué hace:** el supervisor completa el checklist de una actividad y toca «Guardar y enviar». El servidor valida los datos, los guarda en una base de datos y responde con un **folio**. Si un dato no cumple, no se guarda y se muestra el motivo. Detalle de las piezas y del camino delgado: [docs/arquitectura.md](docs/arquitectura.md).

**Dirección pública:** https://checklist-mantenimiento-src.vercel.app · **Video del flujo (caso exitoso y caso de error):** [ver en Google Drive](https://drive.google.com/file/d/1fCneYLfVQAqYovRSSEhnulLa-g8c7d4w/view?usp=sharing)

**Qué necesita:** Node.js 20.6 o superior (probado con la versión 22) y una cuenta gratuita en [Supabase](https://supabase.com). No se instalan librerías: no hay `npm install`.

**Cómo levantarlo desde cero:**
1. Descargar el repositorio (o clonarlo) y abrir una terminal en su carpeta.
2. En Supabase, crear un proyecto nuevo. En **SQL Editor → New query**, pegar el contenido de `supabase/schema.sql` y tocar **Run**. Crea la tabla `checklists`.
3. En Supabase, abrir **Project Settings → API Keys** y copiar dos datos: la **Project URL** (sin `/rest/v1/` al final) y la clave secreta (**Secret key**, empieza con `sb_secret_`; en proyectos antiguos se llama **service_role**). Es secreta: no se comparte ni se sube al repositorio.
4. Copiar `.env.example` como `.env` y completar los valores:
   - `SUPABASE_URL`: la Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: la clave secreta.
5. Ejecutar `node --env-file=.env scripts/server-local.js` y abrir http://localhost:3000.

**Variables de entorno** (solo los nombres, los valores van en `.env`, que está excluido por `.gitignore`): `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

**Qué flujo demuestra** (se recorre en la pantalla, con los datos de ejemplo de `docs/prueba-usuarios.md`):
1. **Caso exitoso:** completar las pantallas 1 y 2, firmar y tocar «Guardar y enviar». Aparece «Checklist enviado» con su folio, y la fila queda en la tabla `checklists` de Supabase (**Table Editor**).
2. **Caso de error del servidor:** en los controles negros de arriba, elegir **Envío: Con N° de OT inválido (PoC)**, completar el flujo y tocar «Guardar y enviar». El servidor responde con el error del N° de OT y no guarda nada. Se vuelve a **Envío: Normal** y el mismo envío se guarda.
3. **Servicio caído:** poner un valor equivocado en `SUPABASE_URL`, reiniciar el servidor y enviar. Aparece «Pendiente de envío» con el aviso de conexión. Al corregir el valor y reiniciar, **Señal: Sin señal** y luego **Con señal** reenvía el pendiente.
4. **El pendiente no se pierde:** con **Señal: Sin señal**, enviar un checklist y cerrar la pestaña. Al volver a abrir la dirección aparece arriba «Tienes 1 checklist sin enviar». Con señal se envía solo al abrir, o con el botón «Enviar ahora».

También se puede probar el servidor sin pantalla (con el servidor local en marcha):
```
curl -i -X POST http://localhost:3000/api/checklists -H "Content-Type: application/json" -d '{"area":"Chancado","n_ot":"123"}'
```
Responde `400` con los errores de cada campo.

**Prueba de humo antes de entregar:** la lista corta de lo que se revisa en la dirección publicada, en una ventana de incógnito, está en [docs/prueba-humo.md](docs/prueba-humo.md).

**Limitaciones conocidas de la prueba de concepto** (decididas, no olvidadas):
- Los checklists pendientes se guardan en el navegador del teléfono (`localStorage`). Si la persona borra los datos del navegador o usa una ventana privada que se cierra, se pierden. Una cola de envío completa (IndexedDB y reintentos programados) queda para más adelante.
- La aplicación necesita haberse abierto con señal al menos una vez; todavía no abre sin conexión desde cero.
- Si el servidor rechaza un pendiente al reenviarlo (por ejemplo, un dato inválido), queda en la lista con el motivo y no se avisa todavía al programador.
- La firma se dibuja, pero no se envía ni se guarda.
- No hay inicio de sesión: el nombre, el cargo y la empresa vienen de un perfil de ejemplo.
- La bandeja del programador, la edición del N° de OT y el documento descargable siguen con datos de ejemplo.

**Publicar en Vercel:** importar el repositorio con **Root Directory** `src`, agregar las dos variables en **Settings → Environment Variables** y desplegar. Vercel sirve la carpeta `src/` y convierte `src/api/checklists.js` en la función `/api/checklists`.

---

## En qué estado está
Prototipo navegable, diseño de la prueba de usuarios y una prueba de concepto con servidor y base de datos para una acción del flujo. Pendiente de evaluar la viabilidad del modo sin conexión con sincronización.
| Entregable | Estado |
|---|---|
| Avance 1: propuesta de valor, alcance y usuarios | Entregado (`docs/unidad1/`) |
| Avance 2: solución, caso de uso, maqueta y roadmap | Entregado (`docs/unidad1/`) |
| Avance 3: repositorio, README, bitácora de IA y estructura de datos | Entregado |
| Avance 4: historias de usuario y wireframes | Entregado (`docs/historias.md`, `docs/wireframes/`) |
| Avance 5: prototipo navegable y análisis ético | Entregado (`docs/prototipo.md`, `docs/etica.md`) |
| Avance 6: diseño de prueba de usuarios | Entregado (`docs/prueba-usuarios.md`, `docs/pauta-validacion.md`) |
| Avance 7: arquitectura y prueba de concepto | En revisión (`docs/arquitectura.md`, `src/api/`) |
| Base de datos en Supabase, app móvil y bandeja web | Por iniciar (el prototipo simula esta parte) |

### Contexto y problemática detectada
* **Retraso en la entrega:** Por horario, la entrega debe hacerse a las 20:00 (turno día) y 08:00 (turno noche). Cuando el turno de noche no alcanza, la información se recibe 24 horas después debido a la transcripción manual y los traslados en mina.
* **Pérdida de detalle:** En papel se omite información técnica que sí se comparte por WhatsApp (mediciones, repuestos, condición del equipo).
* **Impacto:** Provoca retrasos en la notificación de HH, firmas de Codelco y cierre técnico en SAP.

### Alcance del proyecto

| Qué SÍ resolverá la solución | Qué NO resolverá la solución |
| :--- | :--- |
| Registro móvil del checklist (datos de turno, OT SAP, HH, observaciones y firmas). | **No se integra directo con SAP:** El programador sigue haciendo la carga manual de HH y OTs. |
| Campos guiados para capturar detalle técnico en terreno. | **No reemplaza la firma presencial:** No automatiza el flujo de aprobación presencial de Codelco. |
| Funcionamiento offline con sincronización automática. | **No planifica ni programa:** No crea órdenes de trabajo ni asigna recursos. |
| Generación de PDF en formato oficial y bandeja de consulta web. | **No cubre otras especialidades:** En esta etapa no abarca eléctrica ni instrumentación. |

---

## Quiénes la desarrollan
Equipo 1: Aldo Castillo, Felipe Narbona, Sebastián Narbona, Bastian Garay.

## Historias y wireframes
Historias de usuario: docs/historias.md. Wireframes: docs/wireframes/

## Prototipo y análisis ético
Prototipo navegable: [docs/prototipo.md](docs/prototipo.md) (incluye el enlace, el mapa de navegación y el registro de decisiones). Análisis ético: [docs/etica.md](docs/etica.md).

## Prueba de usuarios
Diseño de la prueba: [docs/prueba-usuarios.md](docs/prueba-usuarios.md). Pauta que se lee en cada sesión: [docs/pauta-validacion.md](docs/pauta-validacion.md).

## Arquitectura
Diagrama de componentes, tabla de piezas y camino delgado de la prueba de concepto: [docs/arquitectura.md](docs/arquitectura.md).
