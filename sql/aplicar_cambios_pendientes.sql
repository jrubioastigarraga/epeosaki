-- =====================================================================
--  Aplicar todos los cambios pendientes de Supabase
-- ---------------------------------------------------------------------
--  Pega este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Incluye:
--    1) Tabla question_overrides (correcciones del administrador)
--    2) Restricciones para la batería Medicina Interna (mi)
-- =====================================================================
-- =====================================================================
--  Correcciones de la respuesta correcta (solo administradores)
-- ---------------------------------------------------------------------
--  Ejecuta este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Crea la tabla public.question_overrides, que guarda las respuestas
--  correctas cambiadas por un administrador. Cualquier visitante puede
--  leerlas (no contienen datos personales) y solo los administradores
--  pueden crearlas, modificarlas o eliminarlas.
-- =====================================================================

create table if not exists public.question_overrides (
  question_uid     text primary key check (question_uid ~ '^(comun|fem)-[0-9]{1,3}$'),
  answer           text not null check (answer in ('a', 'b', 'c', 'd')),
  previous_answer  text check (previous_answer is null or previous_answer in ('a', 'b', 'c', 'd')),
  updated_by       uuid references public.profiles (id) on delete set null,
  updated_at       timestamptz not null default now()
);

alter table public.question_overrides enable row level security;

-- Lectura pÃºblica: la app necesita aplicar las correcciones a todos.
drop policy if exists "question_overrides_select_all" on public.question_overrides;
create policy "question_overrides_select_all"
  on public.question_overrides for select
  to anon, authenticated
  using (true);

-- Solo administradores pueden crear, cambiar o borrar correcciones.
drop policy if exists "question_overrides_insert_admin" on public.question_overrides;
create policy "question_overrides_insert_admin"
  on public.question_overrides for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "question_overrides_update_admin" on public.question_overrides;
create policy "question_overrides_update_admin"
  on public.question_overrides for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "question_overrides_delete_admin" on public.question_overrides;
create policy "question_overrides_delete_admin"
  on public.question_overrides for delete
  to authenticated
  using (public.is_admin());

grant select on public.question_overrides to anon, authenticated;
grant insert, update, delete on public.question_overrides to authenticated;

-- Al cambiar una respuesta correcta, recalcula el acierto de los intentos
-- ya guardados para que el progreso y el ranking sigan siendo coherentes.
create or replace function public.apply_question_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attempts
     set is_correct = (pick = new.answer)
   where question_uid = new.question_uid;
  return new;
end;
$$;

drop trigger if exists question_overrides_apply on public.question_overrides;
create trigger question_overrides_apply
  after insert or update of answer on public.question_overrides
  for each row execute function public.apply_question_override();


-- =====================================================================
--  AÃ±adir la baterÃ­a de Medicina Interna (mi)
-- ---------------------------------------------------------------------
--  Ejecuta este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Las tablas ya existentes solo permitÃ­an question_uid de comun/fem y
--  battery de comun/fem. Este script amplÃ­a las restricciones para que
--  tambiÃ©n acepten las preguntas mi-1 ... mi-500.
-- =====================================================================

alter table public.attempt_groups drop constraint if exists attempt_groups_battery_check;
alter table public.attempt_groups
  add constraint attempt_groups_battery_check
  check (battery in ('comun', 'fem', 'mi'));

alter table public.confirmations drop constraint if exists confirmations_question_uid_check;
alter table public.confirmations
  add constraint confirmations_question_uid_check
  check (question_uid ~ '^(comun|fem|mi)-[0-9]{1,3}$');

alter table public.attempts drop constraint if exists attempts_question_uid_check;
alter table public.attempts
  add constraint attempts_question_uid_check
  check (question_uid ~ '^(comun|fem|mi)-[0-9]{1,3}$');

alter table if exists public.question_overrides drop constraint if exists question_overrides_question_uid_check;
alter table if exists public.question_overrides
  add constraint question_overrides_question_uid_check
  check (question_uid ~ '^(comun|fem|mi)-[0-9]{1,3}$');

