// =====================================================================
//  Configuración de Supabase
// ---------------------------------------------------------------------
//  1. Crea un proyecto en https://supabase.com
//  2. Ejecuta sql/schema.sql en el SQL Editor del proyecto.
//  3. Ve a Project Settings > API y copia:
//       - Project URL          -> SUPABASE_URL
//       - anon / public key    -> SUPABASE_ANON_KEY
//  4. Pega aquí los dos valores y vuelve a subir la web.
//
//  La clave "anon" es pública y puede estar en el navegador: la seguridad
//  real la ponen las políticas RLS de sql/schema.sql. NUNCA pongas aquí la
//  clave "service_role".
// =====================================================================
window.OPE_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU-ANON-KEY'
};
