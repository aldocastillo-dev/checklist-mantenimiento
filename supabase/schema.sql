-- Base de datos de ReporteMtto (Avance 8). Pegar TODO y ejecutar en Supabase: SQL Editor -> New query -> Run.
-- Se puede ejecutar más de una vez: crea lo que falta y actualiza las reglas sin borrar datos.
-- Es la tabla CHECKLIST de docs/datos/estructura_datos.md, más los perfiles con el rol de cada usuario.

------------------------------------------------------------------------------------------------
-- 1. Tabla de checklists
------------------------------------------------------------------------------------------------
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
  duracion_min       integer not null default 0 check (duracion_min between 0 and 1439),
  horas_hombre       numeric(6,1) not null default 0 check (horas_hombre >= 0),
  cargo              text    not null check (cargo in ('Supervisor', 'Capataz')),
  estado             text    not null default 'enviado',
  creado_en          timestamptz not null default now(),
  id_envio           text    unique check (id_envio ~ '^[A-Za-z0-9-]{8,64}$')
);

-- Columnas que se agregaron después (no hace nada si ya existen).
alter table public.checklists add column if not exists id_envio text unique check (id_envio ~ '^[A-Za-z0-9-]{8,64}$');
alter table public.checklists add column if not exists creado_por uuid references auth.users (id) default auth.uid();
alter table public.checklists add column if not exists recibido_en timestamptz;
alter table public.checklists add column if not exists recibido_por uuid references auth.users (id);
alter table public.checklists add column if not exists anulado_en timestamptz;
alter table public.checklists add column if not exists anulado_por uuid references auth.users (id);
alter table public.checklists add column if not exists motivo_anulacion text;

-- Estados del checklist (lista cerrada) y coherencia de la baja lógica.
alter table public.checklists drop constraint if exists checklists_estado_check;
alter table public.checklists add constraint checklists_estado_check
  check (estado in ('pendiente', 'enviado', 'recibido', 'anulado'));
alter table public.checklists drop constraint if exists checklists_motivo_check;
alter table public.checklists add constraint checklists_motivo_check
  check (motivo_anulacion is null or char_length(btrim(motivo_anulacion)) between 5 and 300);
alter table public.checklists drop constraint if exists checklists_anulado_check;
alter table public.checklists add constraint checklists_anulado_check
  check (estado <> 'anulado' or (motivo_anulacion is not null and anulado_en is not null));

------------------------------------------------------------------------------------------------
-- 2. Perfiles: el rol de cada usuario (lo asigna el administrador, nunca el propio usuario)
------------------------------------------------------------------------------------------------
create table if not exists public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null check (char_length(nombre) between 1 and 80),
  rol     text not null check (rol in ('supervisor', 'capataz', 'programador', 'planificador')),
  empresa text not null default '' check (char_length(empresa) <= 80)
);

-- Rol del usuario que hace la petición. "security definer" para poder leerlo dentro de las políticas.
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

------------------------------------------------------------------------------------------------
-- 3. Reglas que la base aplica sola en cada alta y cada cambio
------------------------------------------------------------------------------------------------
create or replace function public.checklists_reglas() returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- La base calcula la duración y las horas hombre: no confía en lo que llegue.
  new.duracion_min := ((extract(epoch from new.hora_termino)::int - extract(epoch from new.hora_inicio)::int) / 60 + 1440) % 1440;
  new.horas_hombre := round(((new.duracion_min + new.min_traslado + new.min_espera_bloqueo) * new.n_trabajadores)::numeric / 60, 1);

  if tg_op = 'UPDATE' then
    -- Solo el programador cambia el N° de OT (el administrador, desde Supabase, también puede).
    if new.n_ot is distinct from old.n_ot and auth.uid() is not null
       and coalesce(public.mi_rol(), '') <> 'programador' then
      raise exception 'Solo el programador puede cambiar el N° de OT' using errcode = '42501';
    end if;
    -- Quién y cuándo lo registra la base, no la persona.
    new.recibido_en := old.recibido_en;  new.recibido_por := old.recibido_por;
    new.anulado_en  := old.anulado_en;   new.anulado_por  := old.anulado_por;
    if new.estado = 'recibido' and old.estado <> 'recibido' then
      new.recibido_en := now(); new.recibido_por := auth.uid();
    end if;
    if new.estado = 'anulado' and old.estado <> 'anulado' then
      new.anulado_en := now(); new.anulado_por := auth.uid();
    end if;
    if new.estado <> 'anulado' then new.motivo_anulacion := old.motivo_anulacion; end if;
  end if;
  return new;
end $$;

drop trigger if exists checklists_reglas on public.checklists;
create trigger checklists_reglas before insert or update on public.checklists
  for each row execute function public.checklists_reglas();

-- No se borra nunca: la baja es lógica (estado «anulado»).
create or replace function public.checklists_sin_borrar() returns trigger
language plpgsql set search_path = ''
as $$ begin raise exception 'Los checklists no se borran: se anulan' using errcode = '42501'; end $$;
drop trigger if exists checklists_sin_borrar on public.checklists;
create trigger checklists_sin_borrar before delete on public.checklists
  for each row execute function public.checklists_sin_borrar();

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

-- La clave secreta (service_role) ya no la usa la aplicación; queda solo para el administrador.
grant usage on schema public to service_role;
grant all on table public.checklists, public.perfiles to service_role;
