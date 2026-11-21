-- Tabla de la PoC de ReporteMtto. Pegar y ejecutar en Supabase: SQL Editor -> New query -> Run.
-- Es la tabla CHECKLIST de docs/datos/estructura_datos.md, sin las tablas USUARIO y FIRMA (fuera de la PoC).

create table if not exists public.checklists (
  id_checklist       bigint generated always as identity primary key,
  area               text    not null check (char_length(area) between 1 and 80),
  equipo             text    not null check (char_length(equipo) between 1 and 80),
  equipo_actividad   text    not null check (char_length(equipo_actividad) between 1 and 120),
  fecha_turno        date    not null,
  turno              text    not null check (turno in ('día', 'noche')),
  hora_inicio        time    not null,
  hora_termino       time    not null,
  n_ot               text    check (n_ot ~ '^[0-9]{9}$'),
  detalle_realizado  text    not null check (char_length(btrim(detalle_realizado)) between 1 and 2000),
  observaciones      text    check (char_length(observaciones) <= 2000),
  n_trabajadores     integer not null check (n_trabajadores between 1 and 50),
  min_traslado       integer not null default 0 check (min_traslado between 0 and 600),
  min_espera_bloqueo integer not null default 0 check (min_espera_bloqueo between 0 and 600),
  duracion_min       integer not null check (duracion_min between 0 and 1439),
  horas_hombre       numeric(6,1) not null check (horas_hombre >= 0),
  cargo              text    not null check (cargo in ('Supervisor', 'Capataz')),
  estado             text    not null default 'enviado' check (estado in ('pendiente', 'enviado')),
  creado_en          timestamptz not null default now(),
  id_envio           text    unique check (id_envio ~ '^[A-Za-z0-9-]{8,64}$')
);

-- Para una base creada antes de agregar id_envio (no hace nada si la columna ya existe):
alter table public.checklists add column if not exists id_envio text unique check (id_envio ~ '^[A-Za-z0-9-]{8,64}$');

-- Nadie puede leer ni escribir desde el navegador: sin políticas, solo entra el servidor con su clave secreta.
alter table public.checklists enable row level security;

-- Permisos: solo el servidor (clave service_role) puede usar la tabla.
-- anon y authenticated quedan sin acceso (además de RLS sin políticas).
grant usage on schema public to service_role;
grant all on table public.checklists to service_role;
grant usage, select on all sequences in schema public to service_role;
