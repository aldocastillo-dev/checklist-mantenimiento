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
**Dirección pública:** https://checklist-mantenimiento-src.vercel.app · Se entra con una cuenta. Las cuentas de prueba (un supervisor y un programador, con datos ficticios) se enviaron por correo a la profesora: no están en el repositorio.

**Qué hace hoy:**
- El **supervisor o capataz** inicia sesión, completa el checklist de una actividad, firma y lo envía. El servidor valida los datos, los guarda en Supabase y responde con un **folio**. En «Mis checklists» ve el estado de los suyos y puede anular uno propio mientras no esté recibido.
- El **programador** ve en su «Bandeja» todos los checklists, los marca como **recibidos**, completa o corrige el N° de OT y puede anular cualquiera con motivo.
- Nada se borra: la baja es lógica.
- Sin sesión no se ve nada, y cada rol solo puede hacer lo suyo: lo revisan el servidor y la base de datos.

Detalle: [robustecimiento](docs/robustecimiento.md) y [permisos](docs/permisos.md) (Avance 8), [arquitectura](docs/arquitectura.md) (Avance 7).

**Videos:** Avance 7, flujo con caso exitoso y de error: [ver en Google Drive](https://drive.google.com/file/d/1fCneYLfVQAqYovRSSEhnulLa-g8c7d4w/view?usp=sharing) · Avance 8, pruebas de rotura con dos cuentas: PENDIENTE: pegar aquí el enlace del video

**Qué necesita:** Node.js 20.6 o superior (probado con la versión 22) y una cuenta gratuita en [Supabase](https://supabase.com). No se instalan librerías: no hay `npm install`.

**Cómo levantarlo desde cero:**
1. Descargar el repositorio (o clonarlo) y abrir una terminal en su carpeta.
2. En Supabase, crear un proyecto nuevo. En **SQL Editor → New query**, pegar **todo** el contenido de `supabase/schema.sql` y tocar **Run**. Crea las tablas `checklists` y `perfiles`, las reglas y las políticas de acceso (RLS). Se puede ejecutar más de una vez.
3. Crear las cuentas: **Authentication → Users → Add user → Create new user**, con correo y contraseña, y marcar **Auto Confirm User**. Usar datos ficticios.
4. Darle un rol a cada cuenta. En **SQL Editor**, por cada cuenta, con su correo, nombre y rol (`supervisor`, `capataz`, `programador` o `planificador`):
   ```sql
   insert into public.perfiles (id, nombre, rol, empresa)
   select id, 'Juan Pérez', 'supervisor', 'Sigma S.A.' from auth.users where email = 'correo-de-la-cuenta@example.com';
   ```
   Una cuenta sin perfil no puede entrar: la app le dice que pida un rol al administrador.
5. En Supabase, abrir **Project Settings → API Keys** y copiar la **Project URL** (sin `/rest/v1/` al final) y la clave **pública** (**Publishable key**, empieza con `sb_publishable_`). La clave secreta no se usa.
6. Copiar `.env.example` como `.env` y completar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.
7. Ejecutar `node --env-file=.env scripts/server-local.js` y abrir http://localhost:3000.

**Variables de entorno** (solo los nombres; los valores van en `.env`, que está excluido por `.gitignore`): `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.

**Qué flujo demuestra:**
1. **Caso exitoso:** entrar como supervisor, completar las pantallas 1 y 2, firmar y tocar «Guardar y enviar». Aparece «Checklist enviado» con su folio, y la fila queda en la tabla `checklists` de Supabase (**Table Editor**).
2. **Caso de error del servidor:** en los controles negros de arriba, elegir **Envío: Con N° de OT inválido (PoC)** y enviar. El servidor responde con el error del N° de OT, no guarda nada y la pantalla conserva lo escrito.
3. **Recibir y anular:** entrar como programador, abrir un checklist de la «Bandeja» y tocar «Marcar como recibido». También puede anularlo con un motivo: queda anulado, pero no se borra.
4. **Sin señal:** con **Señal: Sin señal**, enviar un checklist. Queda guardado en el teléfono y se envía al volver la señal o al volver a entrar con la misma cuenta.
5. **Permisos:** las 4 pruebas de rotura (sin sesión, registro ajeno, acción no permitida y claves en el repositorio) están en [docs/permisos.md](docs/permisos.md).

También se puede probar el servidor sin pantalla (con el servidor local en marcha). Sin sesión responde `401`:
```
curl -i http://localhost:3000/api/checklists
```

**Publicar en Vercel:** importar el repositorio con **Root Directory** `src`, agregar las dos variables en **Settings → Environment Variables** y desplegar. Vercel sirve la carpeta `src/` y convierte `src/api/checklists.js` y `src/api/sesion.js` en las funciones `/api/checklists` y `/api/sesion`. La dirección debe quedar sin protección de despliegue (**Settings → Deployment Protection**).

**Limitaciones conocidas** (decididas, no olvidadas):
- La firma se dibuja, pero todavía no se guarda en la base.
- Los checklists sin señal se guardan en el navegador del teléfono (`localStorage`), separados por cuenta. Si se borran los datos del navegador antes de recuperar señal, se pierden. Una cola de envío completa (IndexedDB y reintentos programados) queda para más adelante.
- La aplicación necesita haberse abierto con señal al menos una vez; todavía no abre sin conexión desde cero.
- El documento del programador es una vista previa en pantalla, no un PDF.
- Las cuentas las crea el administrador en Supabase: la app no tiene registro ni recuperación de contraseña.

---

## En qué estado está
Aplicación web publicada con inicio de sesión por roles. El checklist se crea, se consulta, se recibe y se anula (baja lógica), con validación en tres capas y permisos revisados en el servidor y en la base de datos.
| Entregable | Estado |
|---|---|
| Avance 1: propuesta de valor, alcance y usuarios | Entregado (`docs/unidad1/`) |
| Avance 2: solución, caso de uso, maqueta y roadmap | Entregado (`docs/unidad1/`) |
| Avance 3: repositorio, README, bitácora de IA y estructura de datos | Entregado |
| Avance 4: historias de usuario y wireframes | Entregado (`docs/historias.md`, `docs/wireframes/`) |
| Avance 5: prototipo navegable y análisis ético | Entregado (`docs/prototipo.md`, `docs/etica.md`) |
| Avance 6: diseño de prueba de usuarios | Entregado (`docs/prueba-usuarios.md`, `docs/pauta-validacion.md`) |
| Avance 7: arquitectura y prueba de concepto | Entregado (`docs/arquitectura.md`, `src/api/`) |
| Avance 8: robustecimiento, seguridad y permisos | En revisión (`docs/robustecimiento.md`, `docs/permisos.md`) |
| Firma guardada, PDF oficial y cola de envío completa | Por iniciar |

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

## Robustecimiento y permisos
Operaciones, reglas de validación, estados de la pantalla y pruebas de robustez: [docs/robustecimiento.md](docs/robustecimiento.md). Matriz de roles, políticas RLS y pruebas de rotura: [docs/permisos.md](docs/permisos.md).
