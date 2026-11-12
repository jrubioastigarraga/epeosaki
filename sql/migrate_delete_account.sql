-- =====================================================================
--  Migración: eliminar la cuenta propia y todos sus datos
--  Ejecutar en Supabase > SQL Editor > New query > Run (una sola vez).
--
--  delete_my_account() borra el usuario de auth.users. Gracias a los
--  "on delete cascade" se borran también su perfil, intentos, respuestas
--  y confirmaciones/correcciones. Las correcciones de respuesta que hubiera
--  hecho como administrador se conservan, sin autor.
-- =====================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
