# epeosaki — práctica de preguntas OPE Osakidetza

Sitio estático (GitHub Pages) con 700 preguntas tipo test:

- **Batería común**: 200 preguntas (temario normativo).
- **FEM Enfermedades Infecciosas**: 500 preguntas.
  - Preguntas **451–500** agrupadas en **10 casos clínicos**. Al abrir un caso se muestran de una vez todas sus preguntas (por ejemplo, el caso 1 muestra las preguntas 451–455).

Además, la aplicación se conecta a **Supabase** para tener:

- Registro e inicio de sesión con email y contraseña.
- Usuarios **normales** y usuarios **administradores**.
- **Confirmación de respuestas** por parte de los usuarios (y aviso de discrepancias).
- **Intentos agrupados**: cada intento guarda las preguntas que hayas respondido, aunque no completes todas. Puedes revisar cualquier intento pasado desde el selector de la barra lateral.
- **Ranking de preguntas más falladas**: global (todos los usuarios) o solo tus fallos.
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
   - `attempt_groups`: cada intento (puede quedar incompleto).
   - `attempts`: respuestas de cada intento.
   - funciones `is_admin()`, `question_confirmation_stats()`, `question_failure_stats()`, triggers y políticas RLS.

> En este repositorio ya está ejecutado sobre el proyecto `ope_ana` (`idydmepueznvspefottp`).

> Si actualizas desde la versión anterior (una sola fila por pregunta en `attempts`), ejecuta también [`sql/migrate_attempt_groups.sql`](sql/migrate_attempt_groups.sql). En `ope_ana` ya está aplicada.

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
- Si mantienes la confirmación por email, en **Authentication → URL Configuration** pon la URL de tu web en **Site URL** y añádela también en **Redirect URLs** (por ejemplo `https://tu-usuario.github.io/epeosaki/`).

> En `ope_ana` ya está configurado: **Site URL** = `https://jrubioastigarraga.github.io/epeosaki/`, la URL de GitHub Pages está en **Redirect URLs** y **Confirm email** está desactivado para que el registro sea inmediato.

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

### Qué ocurre con «No es correcta»

Marcar **No es correcta** **no cambia la respuesta automáticamente**. Se guarda como una discrepancia con:

- La opción que el usuario cree correcta.
- Un comentario opcional.
- El usuario y la fecha.

El administrador las revisa en **Panel de administración → Confirmaciones → Discrepancias**. Ahí aparecen la respuesta actual, la opción propuesta, el comentario y un botón **Ver pregunta**. Las discrepancias no modifican el dataset por sí solas; si la corrección es válida, hay que actualizar la respuesta en los datos.

El progreso (preguntas respondidas) se guarda en `localStorage` y, si hay sesión, también en Supabase. Al iniciar sesión se combinan ambos y se sincronizan.

---

## 3. Intentos y preguntas más falladas

### Intentos

Cada vez que respondes una pregunta sin tener un intento activo, la app crea un **intento** automáticamente. Puedes empezar uno nuevo con el botón **+ Nuevo** de la barra lateral o con el icono ↻ de la cabecera.

- Un intento **no tiene que completarse**: se guardan las preguntas que respondas y puedes dejarlo a medias.
- El selector **Intento** de la barra lateral permite elegir el intento actual o cualquier intento anterior.
- Al elegir un intento anterior entras en **modo revisión**: solo se muestran las preguntas respondidas en ese intento, con tu respuesta, la correcta y la explicación.
- En revisión no se pueden cambiar las respuestas. El botón **Salir de la revisión** vuelve al intento actual.
- **Borrar intentos** elimina todos los intentos de la batería actual (no solo el actual).
- Cada intento guarda su propia copia de las respuestas, por lo que puedes responder la misma pregunta en intentos distintos.

Los intentos se guardan en `attempt_groups` y sus respuestas en `attempts`. Si no hay sesión, se guardan en `localStorage`; al iniciar sesión se sincronizan con Supabase.

### Preguntas más falladas

El botón **Preguntas más falladas** abre un ranking con:

- **Global**: todas las respuestas de todos los usuarios (función `question_failure_stats()`).
- **Mis fallos**: agregado de todos tus intentos.
- Filtro por batería (Todas / Común / FEM).
- Número de fallos, número de intentos y porcentaje de fallo.
- Al pulsar una fila se abre esa pregunta.

El ranking global solo expone datos agregados; no muestra qué usuario falló cada pregunta.

---

## 4. Modo local (sin Supabase)

Si `config.js` conserva los valores de ejemplo, la web funciona igual que antes: guarda el progreso en el navegador y muestra un aviso de **Modo local**. No aparecen usuarios ni confirmaciones.

---

## 5. Publicar en GitHub Pages

Sube al repositorio, además de `index.html`:

- `app.js`
- `config.js`
- `vendor/supabase.js`
- `sql/schema.sql`
- `bibliografia/` (ya existente)

GitHub Pages sirve el contenido de la rama configurada (normalmente `main` / raíz). No hace falta build ni servidor propio.

> `index.html` incluye el dataset de preguntas y carga `app.js`. Si vuelves a generar el sitio con `node tools/publish.js`, tendrás que volver a añadir los `<script>` de `vendor/supabase.js`, `config.js` y `app.js` al final del HTML.

---

## 6. Estructura

```
index.html              aplicación + dataset de las 700 preguntas
app.js                  lógica de la aplicación (casos, usuarios, confirmaciones)
config.js               URL y clave anon de Supabase
favicon.svg             icono del sitio
vendor/supabase.js      cliente oficial de Supabase (UMD, servido en local)
sql/schema.sql          tablas, funciones, triggers y políticas RLS
sql/migrate_attempt_groups.sql  migración de progreso antiguo a intentos
bibliografia/           leyes, guías y manuales (lectores + PDF)
```

---

## 7. Condiciones de uso y datos

La web es una herramienta de **uso personal y no comercial** para preparar la OPE de Osakidetza. No tiene publicidad ni vende o comparte datos con terceros con fines comerciales.

- **Sin cuenta:** las respuestas, intentos y preferencias se guardan solo en `localStorage`, en el navegador. No se envían a ningún servidor.
- **Con cuenta:** se guardan en Supabase el email, el nombre visible, la contraseña cifrada (la web nunca la almacena en claro), la fecha de alta, los intentos y respuestas, y las confirmaciones o correcciones con su comentario y fecha. La aceptación de estas condiciones queda registrada en los metadatos de la cuenta.
- **Ranking:** solo se publican datos agregados de fallos; no se muestra qué usuario falló cada pregunta.
- **Servicios:** GitHub Pages (alojamiento) y Supabase (autenticación y base de datos). Sin cookies publicitarias ni analítica de terceros.
- **Conservación:** los datos se mantienen mientras se use la web para preparar la OPE. **Una vez finalizada la OPE se borrarán todos los datos** (cuentas, intentos y confirmaciones). También se puede solicitar el borrado antes contactando con el administrador.

---

## 8. Notas

- Las respuestas del dataset son deducidas y no son una plantilla oficial. El campo `confidence` muestra la seguridad con la que se propuso cada respuesta; las confirmaciones de usuarios son independientes de ese valor.
- La agrupación de casos clínicos usa el campo `caso` del dataset y muestra solo el enunciado del caso, sin repetir dentro las preguntas y opciones.
- Para cambiar el número de confirmaciones que se muestran en el tooltip, ajusta `[1:5]` en la función `question_confirmation_stats()` de `sql/schema.sql`.
