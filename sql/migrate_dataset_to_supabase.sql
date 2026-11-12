-- =====================================================================
--  Guardar todo el contenido de la web en Supabase
-- ---------------------------------------------------------------------
--  Ejecuta este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Crea:
--    - batteries    metadatos de cada batería (comun, fem, mi)
--    - questions    las 1.200 preguntas con opciones y respuesta
--    - bibliography las fuentes de la bibliografía
--
--  La web intenta cargar estos datos al arrancar y, si no hay conexión,
--  usa la copia embebida en index.html como respaldo.
-- =====================================================================

create table if not exists public.batteries (
  id          text primary key check (id in ('comun', 'fem', 'mi')),
  meta        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.questions (
  uid         text primary key check (uid ~ '^(comun|fem|mi)-[0-9]{1,3}$'),
  battery     text not null references public.batteries (id) on delete cascade,
  numero      integer not null,
  contexto    text,
  caso        integer,
  pregunta    text not null,
  opciones    jsonb not null,
  answer      text check (answer is null or answer in ('a', 'b', 'c', 'd')),
  confidence  integer,
  source      jsonb,
  tags        jsonb not null default '[]'::jsonb,
  notas       text,
  tema        text,
  tema_id     text,
  updated_at  timestamptz not null default now(),
  unique (battery, numero)
);

create index if not exists questions_battery_idx on public.questions (battery, numero);

create table if not exists public.bibliography (
  id          text primary key,
  grupo       text,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.batteries enable row level security;
alter table public.questions enable row level security;
alter table public.bibliography enable row level security;

drop policy if exists "batteries_select_all" on public.batteries;
create policy "batteries_select_all"
  on public.batteries for select
  to anon, authenticated
  using (true);

drop policy if exists "batteries_write_admin" on public.batteries;
create policy "batteries_write_admin"
  on public.batteries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "questions_select_all" on public.questions;
create policy "questions_select_all"
  on public.questions for select
  to anon, authenticated
  using (true);

drop policy if exists "questions_write_admin" on public.questions;
create policy "questions_write_admin"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "bibliography_select_all" on public.bibliography;
create policy "bibliography_select_all"
  on public.bibliography for select
  to anon, authenticated
  using (true);

drop policy if exists "bibliography_write_admin" on public.bibliography;
create policy "bibliography_write_admin"
  on public.bibliography for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.batteries, public.questions, public.bibliography to anon, authenticated;
grant insert, update, delete on public.batteries, public.questions, public.bibliography to authenticated;
