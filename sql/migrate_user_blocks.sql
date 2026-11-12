-- =====================================================================
--  Migración: bloques elegidos por cada usuario
--  Ejecutar en Supabase > SQL Editor > New query > Run (una sola vez).
--
--  - profiles.blocks: bloques que quiere practicar el usuario.
--    Los usuarios existentes quedan con los tres bloques.
--    Lista vacía = se muestran todos los bloques.
--  - Al registrarse, la web envía los bloques elegidos en los metadatos.
--  - set_my_blocks(): permite cambiar los bloques de la propia cuenta
--    sin dar permisos de escritura sobre el resto de columnas.
-- =====================================================================

alter table public.profiles
  add column if not exists blocks text[] not null default array['comun', 'fem', 'mi']
  check (blocks <@ array['comun', 'fem', 'mi']::text[]);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocks text[];
begin
  v_blocks := array(
    select distinct b
    from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'blocks', '[]'::jsonb)) as t(b)
    where b in ('comun', 'fem', 'mi')
    order by b
  );

  insert into public.profiles (id, email, display_name, role, blocks)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'user',
    coalesce(v_blocks, '{}'::text[])
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

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
    where b in ('comun', 'fem', 'mi')
    order by b
  );

  update public.profiles
     set blocks = v_blocks
   where id = auth.uid();

  return v_blocks;
end;
$$;

revoke all on function public.set_my_blocks(text[]) from public;
grant execute on function public.set_my_blocks(text[]) to authenticated;

-- Resumen público sin nombres de los usuarios que confirman.
drop function if exists public.question_confirmation_stats();
create function public.question_confirmation_stats()
returns table (
  question_uid text,
  confirms     integer,
  disputes     integer,
  last_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.question_uid,
    count(*) filter (where c.is_correct)::int as confirms,
    count(*) filter (where not c.is_correct)::int as disputes,
    max(c.created_at) as last_at
  from public.confirmations c
  group by c.question_uid;
$$;

revoke all on function public.question_confirmation_stats() from public;
grant execute on function public.question_confirmation_stats() to anon, authenticated;
