# Permisos · ReporteMtto

Avance 8, Parte B: quién entra al sistema, qué puede hacer cada rol con el checklist y dónde se guardan las claves. Las reglas de los datos están en [robustecimiento.md](robustecimiento.md).

## Matriz de roles y permisos

| Rol (arquetipo) | Crear | Consultar | Actualizar (recibir y N° de OT) | Dar de baja (anular) |
|---|---|---|---|---|
| **Supervisor o capataz** (quien registra) | **Solo los propios** · entrega los trabajos de su turno y el checklist queda a su nombre | **Solo los propios** · ve el estado de lo que envió; lo de otros supervisores no le corresponde | **Ninguno** · recibir y completar la OT es tarea del programador | **Solo los propios, mientras estén enviados** · corrige su propio error antes de que el programador lo tome; después, se lo pide a él |
| **Programador** (quien resuelve) | **Ninguno** · no ejecuta trabajos en terreno | **Todos** · necesita la bandeja completa para cargar las horas en SAP | **Todos** · recibe el checklist y completa o corrige el N° de OT | **Todos, con motivo** · anula duplicados o checklists ingresados por error, y queda registrado quién y por qué |
| **Planificador** (quien supervisa) | **Ninguno** | **Todos** · revisa el avance de los trabajos | **Ninguno** · solo consulta | **Ninguno** |
| **Administrador** (quien administra) | Fuera de la app | Fuera de la app | Fuera de la app | **Nadie borra** · crea las cuentas y asigna los roles desde Supabase. Ni él puede borrar un checklist: la base lo impide |

En la aplicación hay **dos cuentas de prueba**, con datos ficticios: un supervisor y un programador. El planificador está definido en la base y en las políticas, pero sin cuenta de prueba. Las credenciales se envían por correo a la profesora y **no están en el repositorio**.

## Denegación por defecto

Cada acción pasa por tres revisiones. Si cualquiera dice que no, no ocurre.

1. **La pantalla.** Sin sesión, cualquier dirección interna lleva a «Iniciar sesión». Cada rol ve solo sus pantallas y sus botones. **Ocultar un botón no es el permiso**: es solo para orientar.
2. **El servidor** (`src/api/_usuario.js` y `src/api/checklists.js`).
   - En cada petición confirma con Supabase que el token es válido y lee el rol del usuario en la tabla `perfiles`.
   - Sin token: 401. Sin rol asignado: 403.
   - Antes de cada acción revisa el rol y si el checklist es de la persona. Por ejemplo: «Tu rol (Supervisor) no permite recibir checklists» (403). Un checklist ajeno responde 404, igual que uno que no existe.
3. **La base de datos (RLS).** El servidor entra a la base **con el token de la persona**, no con la clave secreta. Así las políticas de abajo deciden qué filas puede ver y cambiar. Aunque alguien se salte el servidor y llame directo a Supabase, la base no lo deja.
   - Además, quien no inició sesión (`anon`) no tiene ningún permiso sobre las tablas.
   - Un usuario con sesión solo puede tocar las columnas permitidas: no puede escribir su autor, las horas hombre, ni quién recibió o anuló.

**Claves**
- El servidor usa dos variables de entorno, guardadas en Vercel: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Esta última es la clave **pública**: sola no da acceso a nada, porque las tablas solo responden a usuarios con sesión y según su rol.
- La clave **secreta** (la que se salta las reglas) **ya no la usa la aplicación**. Se borró de Vercel y queda solo para el administrador en el panel de Supabase.
- `.env.example` tiene solo los nombres y `.gitignore` excluye `.env`.
- Las contraseñas las revisa Supabase. El servidor no las guarda ni las registra.

## Políticas de acceso (RLS)

Están en `supabase/schema.sql`, activadas en las dos tablas de la acción: `checklists` y `perfiles`.

```sql
-- Rol del usuario que hace la petición. "security definer" para poder leerlo dentro de las políticas.
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

------------------------------------------------------------------------------------------------
-- 4. Permisos: denegar por defecto
------------------------------------------------------------------------------------------------
alter table public.checklists enable row level security;
alter table public.perfiles  enable row level security;

-- Se quita todo y se da solo lo necesario. Quien no inició sesión (anon) no tiene nada.
revoke all on table public.checklists from anon, authenticated;
revoke all on table public.perfiles  from anon, authenticated;
revoke all on function public.mi_rol() from public, anon;
grant usage on schema public to authenticated;
grant execute on function public.mi_rol() to authenticated;

grant select on public.checklists to authenticated;
-- Al crear, la persona no elige su autor, su estado ni las horas: los pone la base.
grant insert (area, equipo, equipo_actividad, fecha_turno, turno, hora_inicio, hora_termino, n_ot,
              detalle_realizado, observaciones, n_trabajadores, min_traslado, min_espera_bloqueo, cargo, id_envio)
  on public.checklists to authenticated;
-- Al actualizar, solo se puede tocar el estado, el N° de OT y el motivo de anulación.
grant update (estado, n_ot, motivo_anulacion) on public.checklists to authenticated;
grant select on public.perfiles to authenticated;

-- Políticas de checklists (RLS)
drop policy if exists checklists_ver on public.checklists;
create policy checklists_ver on public.checklists for select to authenticated
  using (creado_por = auth.uid() or public.mi_rol() in ('programador', 'planificador'));

drop policy if exists checklists_crear on public.checklists;
create policy checklists_crear on public.checklists for insert to authenticated
  with check (public.mi_rol() in ('supervisor', 'capataz') and creado_por = auth.uid() and estado = 'enviado');

drop policy if exists checklists_programador_actualiza on public.checklists;
create policy checklists_programador_actualiza on public.checklists for update to authenticated
  using (public.mi_rol() = 'programador' and estado in ('enviado', 'recibido'))
  with check (public.mi_rol() = 'programador' and estado in ('enviado', 'recibido', 'anulado'));

drop policy if exists checklists_supervisor_anula on public.checklists;
create policy checklists_supervisor_anula on public.checklists for update to authenticated
  using (public.mi_rol() in ('supervisor', 'capataz') and creado_por = auth.uid() and estado = 'enviado')
  with check (creado_por = auth.uid() and estado = 'anulado');

-- Sin política de borrado: nadie puede borrar.

-- Políticas de perfiles (RLS): cada uno ve el suyo; programador y planificador ven los nombres de todos.
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.mi_rol() in ('programador', 'planificador'));
-- Sin políticas de alta ni cambio: los perfiles los crea el administrador desde Supabase.
```

Reglas que la base aplica sola (`supabase/schema.sql`, sección 3):
- Calcula la duración y las horas hombre.
- Anota quién y cuándo recibió o anuló.
- Solo deja al programador cambiar el N° de OT.
- Impide borrar checklists: la baja es lógica.

**Cómo verificamos que las políticas restringen de verdad.** Ejecutamos el mismo `schema.sql` en un PostgreSQL real y probamos 34 casos, entrando como cada rol. Ejemplos:
- Un usuario sin sesión no lee nada.
- El supervisor no ve el checklist del capataz cambiando el número.
- El supervisor no puede inventar horas hombre ni crear a nombre de otro.
- Un anulado no se puede reactivar.
- Ni siquiera el administrador puede borrar.

Los 34 pasaron.

## Pruebas de rotura

Cada prueba se hizo con las dos cuentas de prueba: supervisor (Juan Pérez) y programador (Ana Rojas).

| Prueba | Resultado | Minuto del video |
|---|---|---|
| **1. Acceder a una dirección interna sin haber iniciado sesión** (abrir `…/#/lista` en una ventana de incógnito; pedir `/api/checklists` sin token) | La pantalla lleva a «Iniciar sesión». La API responde 401 «Inicia sesión para continuar». La base, sin token, responde «permission denied». **Pasa.** | PENDIENTE |
| **2. Solicitar el registro de otro usuario modificando el identificador en la dirección** (el supervisor abre `#/ver/1`, un checklist que no es suyo) | «No encontrado: ese checklist no existe o no tienes acceso a él». La API responde 404 y la base no devuelve la fila. **Pasa.** | PENDIENTE |
| **3. Ejecutar una acción no permitida para el rol sin utilizar la interfaz** (el supervisor manda «recibir» desde la consola del navegador; el programador manda «crear»; el supervisor llama directo a Supabase con su token para anular un checklist ajeno) | El servidor responde 403 «Tu rol (Supervisor) no permite recibir checklists» y 403 «Tu rol (Programador) no permite crear checklists». Directo a Supabase, RLS devuelve una lista vacía y la fila no cambia. **Pasa.** | PENDIENTE |
| **4. Revisar el repositorio, incluido su historial, en busca de credenciales expuestas** (búsqueda de claves `sb_secret_`, JWT `eyJhbGci`, contraseñas y archivos `.env` en todos los commits) | No hay claves ni contraseñas en el código, en `.env.example` ni en el historial. `.env` está en `.gitignore`. **Pasa.** | PENDIENTE |

Las pruebas 1 a 3 las corrimos primero en una prueba automática con dos cuentas (25-11-2026, todas pasan), y luego en la dirección publicada para el video.

**Video de las pruebas (2 a 3 minutos):** PENDIENTE: pegar aquí el enlace del video.
