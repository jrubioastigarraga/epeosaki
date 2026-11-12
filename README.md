# epeosaki — práctica de preguntas OPE Osakidetza

Sitio estático (GitHub Pages) con 1.200 preguntas tipo test. Las preguntas, opciones, respuestas y bibliografía se guardan en **Supabase**; `index.html` conserva una copia embebida como respaldo por si falla la conexión.

- **Batería común**: 200 preguntas (temario normativo).
- **INF Enfermedades Infecciosas**: 500 preguntas.
  - Preguntas **451–500** agrupadas en **10 casos clínicos**. Al abrir un caso se muestran de una vez todas sus preguntas (por ejemplo, el caso 1 muestra las preguntas 451–455).
- **Medicina Interna**: 500 preguntas.
  - Preguntas **451–500** agrupadas en **13 casos clínicos**. Al abrir un caso se muestran de una vez todas sus preguntas.
  - Incluye 2 preguntas defectuosas sin respuesta válida, marcadas para revisión.

Además, la aplicación se conecta a **Supabase** para tener:

- Registro e inicio de sesión con email y contraseña.
- Usuarios **normales** y usuarios **administradores**.
- **Confirmación de respuestas** por parte de los usuarios (y aviso de discrepancias).
- **Intentos agrupados**: cada intento guarda las preguntas que hayas respondido, aunque no completes todas. Puedes revisar cualquier intento pasado desde el selector de la barra lateral.
- **Ranking de preguntas más falladas**: global (todos los usuarios) o solo tus fallos.
- Panel de administración en el menú lateral para gestionar roles, revisar/eliminar confirmaciones y corregir la respuesta correcta desde las discrepancias.
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
   - `question_overrides`: respuestas correctas corregidas por administradores.
   - `batteries`: metadatos de las baterías.
   - `questions`: las 1.200 preguntas, opciones y respuestas.
   - `bibliography`: fuentes de la bibliografía.
   - funciones `is_admin()`, `question_confirmation_stats()`, `question_failure_stats()`, triggers y políticas RLS.

> En este repositorio ya está ejecutado sobre el proyecto `ope_ana` (`idydmepueznvspefottp`).

> Si actualizas desde la versión anterior (una sola fila por pregunta en `attempts`), ejecuta también [`sql/migrate_attempt_groups.sql`](sql/migrate_attempt_groups.sql). En `ope_ana` ya está aplicada.

> Para activar las correcciones de respuesta del administrador, ejecuta también [`sql/migrate_question_overrides.sql`](sql/migrate_question_overrides.sql). Es necesario para que el botón **Aplicar** de las discrepancias pueda guardar el cambio.

> Para guardar todo el contenido en Supabase, ejecuta [`sql/migrate_dataset_to_supabase.sql`](sql/migrate_dataset_to_supabase.sql). Después, sube las preguntas y la bibliografía con:
>
> ```bash
> SUPABASE_ACCESS_TOKEN=sbp_... node tools/seed_supabase.cjs
> ```
>
> En `ope_ana` ya está aplicado y las 1.200 preguntas están cargadas.

> Para que cada usuario elija sus bloques (y cambiarlos desde **Mis bloques**), ejecuta [`sql/migrate_user_blocks.sql`](sql/migrate_user_blocks.sql). Los usuarios existentes quedan con los tres bloques.

> Para que los usuarios puedan guardar intentos y confirmaciones de la batería **Medicina Interna** (`mi`), ejecuta [`sql/migrate_add_mi_battery.sql`](sql/migrate_add_mi_battery.sql). Amplía las restricciones de `question_uid` y `battery` para aceptar las preguntas `mi-1 ... mi-500`.

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

3. Cierra sesión y vuelve a entrar. Aparecerá **Administración** en el menú lateral (y también en el menú del usuario).

Desde ese panel puedes:

- Convertir a cualquier usuario en administrador (o devolverlo a usuario normal).
- Ver todas las confirmaciones y discrepancias, con el usuario, la opción propuesta y el comentario.
- Eliminar confirmaciones.
- **Cambiar la respuesta correcta** de una pregunta desde una discrepancia: elige la opción en la columna **Corregir** y pulsa **Aplicar**. El cambio se guarda para todos los usuarios y recalcula los intentos ya registrados.

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

El administrador las revisa en **Administración → Confirmaciones → Discrepancias**. Ahí aparecen la respuesta actual, la opción propuesta, el comentario y un botón **Ver pregunta**. Desde la columna **Corregir** puede elegir la nueva respuesta correcta y pulsar **Aplicar**; el cambio se guarda en `question_overrides`, se aplica a todos los usuarios y recalcula automáticamente los intentos ya registrados.

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
- Filtro por batería (Todas / Común / INF / MI).
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
index.html              página de inicio (y lógica de la web)
preguntas.html          página de preguntas (idéntica a index.html salvo data-app="preguntas"; cualquier cambio en la interfaz hay que copiarlo en ambos)
app.js                  lógica de la aplicación (casos, usuarios, confirmaciones)
config.js               URL y clave anon de Supabase
favicon.svg             icono del sitio
vendor/supabase.js      cliente oficial de Supabase (UMD, servido en local)
sql/schema.sql          tablas, funciones, triggers y políticas RLS
sql/migrate_attempt_groups.sql  migración de progreso antiguo a intentos
sql/migrate_question_overrides.sql  tabla para corregir respuestas (administradores)
sql/migrate_add_mi_battery.sql  amplía las restricciones para la batería Medicina Interna
sql/migrate_user_blocks.sql  bloques elegidos por cada usuario (perfil y cambio desde la cuenta)
sql/migrate_delete_account.sql  función para eliminar la cuenta y todos sus datos
sql/migrate_dataset_to_supabase.sql  tablas batteries, questions y bibliography
tools/seed_supabase.cjs sube a Supabase las preguntas y la bibliografía
bibliografia/           leyes, guías y manuales (lectores + PDF)
bibliografia/mi/        bibliografía de Medicina Interna
```

---

## 7. Condiciones de uso y datos

La web es una herramienta de **uso personal y no comercial** para preparar la OPE de Osakidetza. No tiene publicidad ni vende o comparte datos con terceros con fines comerciales.

- **Respuestas generadas con IA:** las respuestas han sido elaboradas con inteligencia artificial y no son una plantilla oficial. El usuario final debe verificarlas con la bibliografía y la normativa vigente antes de darlas por válidas.
- **Correcciones:** si 5 o más usuarios discrepan de una respuesta e indican la misma opción correcta, la respuesta podrá revisarse y modificarse. Un administrador también puede corregirla desde el panel de administración. Cada cambio guarda la respuesta anterior, la nueva y la fecha, y se muestra en la pregunta afectada.
- **Sin cuenta:** las respuestas, intentos y preferencias se guardan solo en `localStorage`, en el navegador. No se envían a ningún servidor.
- **Con cuenta:** se guardan en Supabase el email, el nombre visible, la contraseña cifrada (la web nunca la almacena en claro), la fecha de alta, los intentos y respuestas, y las confirmaciones o correcciones con su comentario y fecha. La aceptación de estas condiciones queda registrada en los metadatos de la cuenta.
- **Ranking:** solo se publican datos agregados de fallos; no se muestra qué usuario falló cada pregunta.
- **Servicios:** GitHub Pages (alojamiento) y Supabase (autenticación y base de datos). Sin cookies publicitarias ni analítica de terceros.
- **Conservación:** los datos se mantienen mientras se use la web para preparar la OPE. **Una vez finalizada la OPE se borrarán todos los datos** (cuentas, intentos y confirmaciones).
- **Eliminar la cuenta:** en cualquier momento, desde el menú de usuario (**Eliminar cuenta y datos**). **Se borrará toda la información**: cuenta y email, intentos y respuestas, y confirmaciones y correcciones. El borrado es inmediato e irreversible.

---

## 8. Notas

- Las respuestas del dataset han sido generadas con IA y no son una plantilla oficial; el usuario final debe verificarlas con la bibliografía. El campo `confidence` muestra la seguridad con la que se propuso cada respuesta; las confirmaciones de usuarios son independientes de ese valor.
- La agrupación de casos clínicos usa el campo `caso` del dataset y muestra solo el enunciado del caso, sin repetir dentro las preguntas y opciones.
- Para cambiar el número de confirmaciones que se muestran en el tooltip, ajusta `[1:5]` en la función `question_confirmation_stats()` de `sql/schema.sql`.
