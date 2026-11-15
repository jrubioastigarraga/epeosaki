-- =====================================================================
--  Migración: batería de Endocrinología y Nutrición (end) + notas
--  por usuario + grupos de estudio + confirmaciones privadas.
-- ---------------------------------------------------------------------
--  Ejecuta este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Es idempotente: puedes volver a ejecutarlo sin perder datos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Batería nueva: end (preguntas end-1 ... end-500)
-- ---------------------------------------------------------------------

alter table public.attempt_groups drop constraint if exists attempt_groups_battery_check;
alter table public.attempt_groups
  add constraint attempt_groups_battery_check
  check (battery in ('comun', 'fem', 'mi', 'end'));

alter table public.confirmations drop constraint if exists confirmations_question_uid_check;
alter table public.confirmations
  add constraint confirmations_question_uid_check
  check (question_uid ~ '^(comun|fem|mi|end)-[0-9]{1,3}$');

alter table public.attempts drop constraint if exists attempts_question_uid_check;
alter table public.attempts
  add constraint attempts_question_uid_check
  check (question_uid ~ '^(comun|fem|mi|end)-[0-9]{1,3}$');

alter table if exists public.question_overrides
  drop constraint if exists question_overrides_question_uid_check;
alter table if exists public.question_overrides
  add constraint question_overrides_question_uid_check
  check (question_uid ~ '^(comun|fem|mi|end)-[0-9]{1,3}$');

-- Bloques que puede elegir cada usuario.
alter table public.profiles drop constraint if exists profiles_blocks_check;
alter table public.profiles
  add constraint profiles_blocks_check
  check (blocks <@ array['comun', 'fem', 'mi', 'end']::text[]);

-- Metadatos de baterías: permitir la batería nueva.
alter table if exists public.batteries drop constraint if exists batteries_id_check;
alter table if exists public.batteries
  add constraint batteries_id_check
  check (id in ('comun', 'fem', 'mi', 'end'));

-- Preguntas de la batería nueva.
alter table if exists public.questions drop constraint if exists questions_uid_check;
alter table if exists public.questions
  add constraint questions_uid_check
  check (uid ~ '^(comun|fem|mi|end)-[0-9]{1,3}$');

create or replace function public.set_my_blocks(p_blocks text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocks text[];
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  v_blocks := array(
    select distinct b
    from unnest(coalesce(p_blocks, '{}'::text[])) as t(b)
    where b in ('comun', 'fem', 'mi', 'end')
    order by b
  );

  update public.profiles
     set blocks = v_blocks
   where id = auth.uid();

  return v_blocks;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Grupo de estudio (se crea con código de invitación)
-- ---------------------------------------------------------------------

create table if not exists public.study_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 60),
  code       text not null unique,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id  uuid not null references public.study_groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists study_group_members_user_idx
  on public.study_group_members (user_id);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;

-- ¿El usuario indicado comparte algún grupo conmigo?
create or replace function public.shares_group_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.study_group_members mine
      join public.study_group_members other on other.group_id = mine.group_id
     where mine.user_id = auth.uid()
       and other.user_id = p_user
  );
$$;

revoke all on function public.shares_group_with(uuid) from public;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- ¿Pertenezco a este grupo?
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.study_group_members
     where group_id = p_group and user_id = auth.uid()
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

drop policy if exists "study_groups_select_member" on public.study_groups;
create policy "study_groups_select_member"
  on public.study_groups for select
  to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

drop policy if exists "study_groups_insert_own" on public.study_groups;
create policy "study_groups_insert_own"
  on public.study_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "study_groups_update_owner" on public.study_groups;
create policy "study_groups_update_owner"
  on public.study_groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "study_groups_delete_owner" on public.study_groups;
create policy "study_groups_delete_owner"
  on public.study_groups for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "study_group_members_select_member" on public.study_group_members;
create policy "study_group_members_select_member"
  on public.study_group_members for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "study_group_members_delete_own_or_owner" on public.study_group_members;
create policy "study_group_members_delete_own_or_owner"
  on public.study_group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.study_groups g
       where g.id = group_id and g.owner_id = auth.uid()
    )
  );

-- Crear un grupo (devuelve id, nombre y código de invitación).
create or replace function public.create_study_group(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'El nombre del grupo debe tener entre 2 y 60 caracteres';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.study_groups where code = v_code);
  end loop;

  insert into public.study_groups (name, code, owner_id)
  values (v_name, v_code, auth.uid())
  returning id into v_id;

  insert into public.study_group_members (group_id, user_id, role)
  values (v_id, auth.uid(), 'owner')
  on conflict do nothing;

  return json_build_object('id', v_id, 'name', v_name, 'code', v_code);
end;
$$;

revoke all on function public.create_study_group(text) from public;
grant execute on function public.create_study_group(text) to authenticated;

-- Aceptar una invitación con el código.
create or replace function public.join_study_group(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.study_groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into v_group
    from public.study_groups
   where code = upper(btrim(coalesce(p_code, '')));

  if v_group.id is null then
    raise exception 'Código de invitación no válido';
  end if;

  insert into public.study_group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'member')
  on conflict do nothing;

  return json_build_object('id', v_group.id, 'name', v_group.name, 'code', v_group.code);
end;
$$;

revoke all on function public.join_study_group(text) from public;
grant execute on function public.join_study_group(text) to authenticated;

-- Mis grupos con el número de miembros.
create or replace function public.my_study_groups()
returns table (
  id         uuid,
  name       text,
  code       text,
  owner_id   uuid,
  is_owner   boolean,
  members    integer
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.code, g.owner_id,
         g.owner_id = auth.uid() as is_owner,
         (select count(*)::int from public.study_group_members m where m.group_id = g.id) as members
    from public.study_groups g
    join public.study_group_members me on me.group_id = g.id
   where me.user_id = auth.uid()
   order by g.created_at;
$$;

revoke all on function public.my_study_groups() from public;
grant execute on function public.my_study_groups() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Confirmaciones privadas (solo las mías y las de mi grupo)
-- ---------------------------------------------------------------------

drop function if exists public.question_confirmation_stats();

create or replace function public.question_confirmation_stats()
returns table (
  question_uid text,
  confirms     integer,
  disputes     integer,
  last_at      timestamptz,
  confirmers   text[],
  comments     jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with my_people as (
    select auth.uid() as user_id
    union
    select m2.user_id
      from public.study_group_members m1
      join public.study_group_members m2 on m2.group_id = m1.group_id
     where m1.user_id = auth.uid()
  )
  select
    c.question_uid,
    count(*) filter (where c.is_correct)::int as confirms,
    count(*) filter (where not c.is_correct)::int as disputes,
    max(c.updated_at) as last_at,
    array_remove(array_agg(distinct coalesce(p.display_name, 'Usuario')) filter (where c.is_correct), null) as confirmers,
    jsonb_agg(jsonb_build_object(
      'name', coalesce(p.display_name, 'Usuario'),
      'answer', c.suggested_answer,
      'comment', c.comment,
      'at', c.updated_at
    ) order by c.updated_at) filter (where not c.is_correct and c.comment is not null) as comments
  from public.confirmations c
  join public.profiles p on p.id = c.user_id
  where auth.uid() is not null
    and c.user_id in (select user_id from my_people)
  group by c.question_uid;
$$;

revoke all on function public.question_confirmation_stats() from public;
grant execute on function public.question_confirmation_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Anotaciones por usuario y pregunta
-- ---------------------------------------------------------------------

create table if not exists public.question_notes (
  id           bigint generated by default as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_uid text not null check (question_uid ~ '^(comun|fem|mi|end)-[0-9]{1,3}$'),
  body         text not null check (char_length(body) between 1 and 4000),
  shared       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, question_uid)
);

create index if not exists question_notes_user_idx on public.question_notes (user_id);

alter table public.question_notes enable row level security;

drop policy if exists "question_notes_select_own_or_shared_group" on public.question_notes;
create policy "question_notes_select_own_or_shared_group"
  on public.question_notes for select
  to authenticated
  using (user_id = auth.uid() or (shared and public.shares_group_with(user_id)));

drop policy if exists "question_notes_insert_own" on public.question_notes;
create policy "question_notes_insert_own"
  on public.question_notes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "question_notes_update_own" on public.question_notes;
create policy "question_notes_update_own"
  on public.question_notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "question_notes_delete_own" on public.question_notes;
create policy "question_notes_delete_own"
  on public.question_notes for delete
  to authenticated
  using (user_id = auth.uid());

drop trigger if exists question_notes_touch on public.question_notes;
create trigger question_notes_touch
  before update on public.question_notes
  for each row execute function public.touch_updated_at();

-- Comentarios que mi grupo comparte conmigo.
create or replace function public.group_question_notes()
returns table (
  question_uid text,
  name         text,
  body         text,
  updated_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.question_uid, coalesce(p.display_name, 'Usuario'), n.body, n.updated_at
    from public.question_notes n
    join public.profiles p on p.id = n.user_id
   where n.shared
     and n.user_id <> auth.uid()
     and public.shares_group_with(n.user_id)
   order by n.updated_at desc;
$$;

revoke all on function public.group_question_notes() from public;
grant execute on function public.group_question_notes() to authenticated;
