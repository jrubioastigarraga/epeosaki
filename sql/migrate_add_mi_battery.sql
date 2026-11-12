-- =====================================================================
--  Añadir la batería de Medicina Interna (mi)
-- ---------------------------------------------------------------------
--  Ejecuta este archivo completo en:
--    Supabase Dashboard > SQL Editor > New query > Run
--
--  Las tablas ya existentes solo permitían question_uid de comun/fem y
--  battery de comun/fem. Este script amplía las restricciones para que
--  también acepten las preguntas mi-1 ... mi-500.
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
