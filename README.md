# OPE Osakidetza — práctica de preguntas

Sitio estático (GitHub Pages) con 700 preguntas tipo test:

- **Batería común**: 200 preguntas (temario normativo).
- **FEM Enfermedades Infecciosas**: 500 preguntas.
  - Preguntas **451–500** agrupadas en **10 casos clínicos**. Al abrir un caso se muestran de una vez todas sus preguntas (por ejemplo, el caso 1 muestra las preguntas 451–455).

Además, la aplicación se conecta a **Supabase** para tener:

- Registro e inicio de sesión con email y contraseña.
- Usuarios **normales** y usuarios **administradores**.
- **Confirmación de respuestas** por parte de los usuarios (y aviso de discrepancias).
- Panel de administración para gestionar roles y revisar/eliminar confirmaciones.
- Sincronización del progreso entre dispositivos (si se inicia sesión).

---

## 1. Configurar Supabase

### 1.1 Crear el proyecto

1. Entra en <https://supabase.com> y crea un proyecto gratuito.
2. Espera a que termine de aprovisionarse.

### 1.2 Crear las tablas, funciones y políticas

1. En el panel del proyecto abre **SQL Editor → New query**.
2. Copia y pega todo el contenido de [`sql/schema.sql`](sql/schema.sql).
3. Pulsa **Run**.
4. Debe terminar sin errores. Se crean:
   - `profiles`: perfil y rol (`user` / `admin`) de cada usuario.
   - `confirmations`: confirmaciones y discrepancias de respuestas.
   - `attempts`: progreso de cada usuario.
   - funciones `is_admin()`, `question_confirmation_stats()`, trigger de alta de perfil y políticas RLS.

> En este repositorio ya está ejecutado sobre el proyecto `ope_ana` (`idydmepueznvspefottp`).

### 1.3 Copiar las claves

En **Project Settings → API** copia:

- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

Edita [`config.js`](config.js):

```js
window.OPE_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...'
};
```

> En este repositorio `config.js` ya contiene la URL y la clave anon del proyecto `ope_ana`. Si usas otro proyecto, sustituye esos dos valores.

> La clave `anon` es pública y puede estar en el navegador; la seguridad la ponen las políticas RLS. **Nunca** pongas la clave `service_role` en el frontend.

### 1.4 Configurar el login por email

En **Authentication → Providers → Email**:

- Deja habilitado **Email**.
- Para probar rápido, desactiva **Confirm email** (los usuarios podrán entrar sin confirmar el correo).
- Si mantienes la confirmación por email, en **Authentication → URL Configuration** pon la URL de tu web en **Site URL** y añádela también en **Redirect URLs** (por ejemplo `https://tu-usuario.github.io/ope-ana-web/`).

> En `ope_ana` ya está configurado: **Site URL** = `https://jrubioastigarraga.github.io/ope-ana-web/`, la URL de GitHub Pages está en **Redirect URLs** y **Confirm email** está desactivado para que el registro sea inmediato.

### 1.5 Crear el primer administrador

1. Abre la web y pulsa **Iniciar sesión → Crear cuenta**.
2. Ejecuta en el SQL Editor, cambiando el email:

```sql
update public.profiles
   set role = 'admin'
 where email = 'tu-email@ejemplo.com';
```

3. Cierra sesión y vuelve a entrar. Aparecerá el **Panel de administración** en el menú del usuario.

Desde ese panel puedes:

- Convertir a cualquier usuario en administrador (o devolverlo a usuario normal).
- Ver todas las confirmaciones y discrepancias, con el usuario, la opción propuesta y el comentario.
- Eliminar confirmaciones.

---

## 2. Cómo funciona la confirmación de respuestas

Cada pregunta muestra su estado:

- `Sin confirmar`: nadie ha validado la respuesta todavía.
- `✓ Confirmada por N usuarios`: N usuarios han marcado la respuesta como correcta. Al pasar el ratón se ven los nombres.
- `⚠ N en desacuerdo`: N usuarios creen que la respuesta es incorrecta.

Con sesión iniciada, cada pregunta tiene dos acciones:

- **Confirmar respuesta correcta**: guarda (o cambia) tu confirmación. Se puede retirar.
- **No es correcta**: eliges la opción que crees correcta y, opcionalmente, dejas un comentario. Queda registrado como discrepancia para que el administrador lo revise.

Las confirmaciones son públicas (cualquier visitante ve el estado agregado), pero solo los usuarios registrados pueden confirmar. Las políticas RLS impiden leer o modificar confirmaciones ajenas.

El progreso (preguntas respondidas) se guarda en `localStorage` y, si hay sesión, también en Supabase. Al iniciar sesión se combinan ambos y se sincronizan.

---

## 3. Modo local (sin Supabase)

Si `config.js` conserva los valores de ejemplo, la web funciona igual que antes: guarda el progreso en el navegador y muestra un aviso de **Modo local**. No aparecen usuarios ni confirmaciones.

---

## 4. Publicar en GitHub Pages

Sube al repositorio, además de `index.html`:

- `app.js`
- `config.js`
- `vendor/supabase.js`
- `sql/schema.sql`
- `bibliografia/` (ya existente)

GitHub Pages sirve el contenido de la rama configurada (normalmente `main` / raíz). No hace falta build ni servidor propio.

> `index.html` incluye el dataset de preguntas y carga `app.js`. Si vuelves a generar el sitio con `node tools/publish.js`, tendrás que volver a añadir los `<script>` de `vendor/supabase.js`, `config.js` y `app.js` al final del HTML.

---

## 5. Estructura

```
index.html              aplicación + dataset de las 700 preguntas
app.js                  lógica de la aplicación (casos, usuarios, confirmaciones)
config.js               URL y clave anon de Supabase
vendor/supabase.js      cliente oficial de Supabase (UMD, servido en local)
sql/schema.sql          tablas, funciones, triggers y políticas RLS
bibliografia/           leyes, guías y manuales (lectores + PDF)
```

---

## 6. Notas

- Las respuestas del dataset son deducidas y no son una plantilla oficial. El campo `confidence` muestra la seguridad con la que se propuso cada respuesta; las confirmaciones de usuarios son independientes de ese valor.
- La agrupación de casos clínicos usa el campo `caso` del dataset y muestra solo el enunciado del caso, sin repetir dentro las preguntas y opciones.
- Para cambiar el número de confirmaciones que se muestran en el tooltip, ajusta `[1:5]` en la función `question_confirmation_stats()` de `sql/schema.sql`.
