(function () {
  'use strict';

  var KEY = 'epeosaki-lang';
  var saved = localStorage.getItem(KEY);
  var lang = saved === 'es' ? 'es' : 'eu';
  document.documentElement.lang = lang;

  var EU = {
    "Batería común · 200 preguntas": "Bateria komuna · 200 galdera",
    "Temario común · 200 preguntas": "Gai komuna · 200 galdera",
    "Enfermedades Infecciosas · 500 preguntas": "Gaixotasun infekziosoak · 500 galdera",
    "Medicina Interna · 500 preguntas": "Barne medikuntza · 500 galdera",
    "Batería común": "Bateria komuna",
    "INF Enfermedades Infecciosas": "INF Gaixotasun infekziosoak",
    "Medicina Interna": "Barne medikuntza",
    "Común 200": "Komuna 200",
    "INF 500": "INF 500",
    "MI 500": "BM 500",
    "respondidas": "erantzunak",
    "aciertos": "zuzenak",
    "Menú": "Menua",
    "Menú lateral": "Alboko menua",
    "Menú principal": "Menu nagusia",
    "Migas de pan": "Ogi-migak",
    "Inicio": "Hasiera",
    "Preguntas": "Galderak",
    "Ranking": "Sailkapena",
    "Bibliografía": "Bibliografia",
    "Preguntas más falladas": "Gehien hutsegin diren galderak",
    "Administración": "Administrazioa",
    "Panel de administración": "Administrazio panela",
    "Iniciar sesión": "Saioa hasi",
    "Cerrar sesión": "Saioa itxi",
    "Crear cuenta": "Kontua sortu",
    "Entrar": "Sartu",
    "Cerrar": "Itxi",
    "Guardar": "Gorde",
    "Cancelar": "Utzi",
    "Modo local.": "Tokiko modua.",
    "Configura Supabase para activar usuarios, confirmaciones y sincronización. Instrucciones en el README.": "Konfiguratu Supabase erabiltzaileak, berrespenak eta sinkronizazioa aktibatzeko. Argibideak README fitxategian.",
    "Cómo configurarlo": "Nola konfiguratu",
    "Ocultar": "Ezkutatu",
    "Intento": "Saiakera",
    "+ Nuevo": "+ Berria",
    "Repasar falladas": "Huts egindakoak berrikusi",
    "Aleatorio": "Ausazkoa",
    "Elegir pregunta": "Aukeratu galdera",
    "Sin intento activo": "Saiakera aktiborik ez",
    "(actual)": "(unekoa)",
    "Todas": "Guztiak",
    "Mis fallos": "Nire hutsak",
    "Global": "Globala",
    "Común": "Komuna",
    "MI": "BM",
    "Mis bloques": "Nire blokeak",
    "Eliminar cuenta y datos": "Kontua eta datuak ezabatu",
    "Cerrar menú": "Menua itxi",
    "Abrir menú": "Menua ireki",

    "Teclado:": "Teklatua:",
    "responder ·": "erantzun ·",
    "navegar ·": "nabigatu ·",
    "siguiente": "hurrengoa",
    "o": "edo",
    "Respuestas generadas con IA.": "IAk sortutako erantzunak.",
    "No son oficiales: verifícalas siempre con la bibliografía antes de darlas por válidas.": "Ez dira ofizialak: egiaztatu beti bibliografiarekin baliozkotzat jo aurretik.",
    "Copiar": "Kopiatu",
    "Enunciado del caso": "Kasuaren enuntziatua",
    "Mostrando solo las preguntas respondidas en este intento.": "Saiakera honetan erantzundako galderak soilik erakusten dira.",
    "Responde a todas las preguntas del caso. Puedes confirmar cada respuesta por separado.": "Erantzun kasuko galdera guztiei. Erantzun bakoitza bananan berretsi dezakezu.",
    "Confirmar respuesta correcta": "Erantzun zuzena berretsi",
    "✓ Confirmar respuesta correcta": "✓ Erantzun zuzena berretsi",
    "No es correcta": "Ez da zuzena",
    "Retirar": "Kendu",
    "Tu confirmación": "Zure berrespena",
    "Sin confirmar": "Berretsi gabe",
    "Respuesta deducida · no oficial": "Ondorioztatutako erantzuna · ez ofiziala",
    "Sin respuesta válida": "Baliozko erantzunik gabe",
    "No respondida en este intento": "Saiakera honetan erantzun gabe",
    "Esta pregunta no se respondió en este intento.": "Galdera hau ez da erantzun saiakera honetan.",
    "Pregunta defectuosa: no tiene una respuesta correcta validada.": "Galdera akastuna: ez du baliozko erantzun zuzenik.",
    "No se puede responder hasta que un administrador establezca la respuesta correcta.": "Ezin da erantzun administratzaile batek erantzun zuzena ezarri arte.",
    "✓ Correcto": "✓ Zuzena",
    "✗ Incorrecto": "✗ Okerra",
    "Tu respuesta:": "Zure erantzuna:",
    "Correcta:": "Zuzena:",
    "Dónde está la respuesta": "Erantzuna non dagoen",
    "Abrir texto": "Testua ireki",
    "Abrir PDF": "PDF ireki",
    "Consultar fuente": "Iturria kontsultatu",
    "Buscar esta referencia": "Erreferentzia hau bilatu",
    "El texto completo no está disponible en local: es un libro o recurso con copyright. Se indica la referencia y el tema donde se encuentra.": "Testu osoa ez dago tokian eskuragarri: copyright duen liburu edo baliabidea da. Erreferentzia eta gaia adierazten dira non dagoen.",
    "Respuesta de baja seguridad: conviene verificarla en la fuente original.": "Konfiantza baxuko erantzuna: komeni da jatorrizko iturrian egiaztatzea.",
    "Siguiente →": "Hurrengoa →",
    "← Anterior": "← Aurrekoa",
    "Salir de la revisión": "Berrikuspena utzi",
    "Cargando…": "Kargatzen…",
    "Cargando⬦": "Kargatzen…",
    "Esta pregunta no se respondió": "Galdera hau ez da erantzun",
    "No hay preguntas con los filtros seleccionados.": "Ez dago galderarik hautatutako iragazkiekin.",
    "Caso clínico no encontrado.": "Kasu klinikoa ez da aurkitu.",
    "Sin resultados": "Emaitzarik ez",

    "Acepto las": "Onartzen dut",
    "condiciones de uso y la política de datos": "erabilera-baldintzak eta datu-politika",
    "Nombre visible": "Izena (ikusgai)",
    "Email": "Emaila",
    "Contraseña": "Pasahitza",
    "Nueva contraseña": "Pasahitz berria",
    "¿Has olvidado la contraseña?": "Pasahitza ahaztu duzu?",
    "← Volver a iniciar sesión": "← Saioa hasteko itzuli",
    "Recuperar contraseña": "Pasahitza berreskuratu",
    "Enviar enlace": "Esteka bidali",
    "Guardar contraseña": "Pasahitza gorde",
    "Bloques que quieres practicar": "Praktikatu nahi dituzun blokeak",
    "Puedes cambiarlos en cualquier momento desde": "Edozein unetan alda ditzakezu hemendik",
    ". Si no marcas ninguno, se muestran todos.": ". Bat ere markatzen ez baduzu, guztiak erakutsiko dira.",
    "Las confirmaciones y el progreso se guardan en tu cuenta. Puedes crear la cuenta y entrar directamente.": "Berrespenak eta aurrerapena zure kontuan gordetzen dira. Kontua sor dezakezu eta zuzenean sartu.",
    "Uso personal y no comercial.": "Erabilera pertsonala eta ez komerziala.",
    "Al finalizar la OPE se borrarán todos los datos.": "OPE amaitzean datu guztiak ezabatuko dira.",
    "Para crear la cuenta tienes que aceptar las condiciones de uso y la política de datos.": "Kontua sortzeko erabilera-baldintzak eta datu-politika onartu behar dituzu.",
    "Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.": "Kontua sortu da. Begiratu zure posta elektronikoa berresteko eta gero saioa hasi.",
    "Si existe una cuenta con ese email, te hemos enviado un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.": "Email horrekin kontu bat badago, pasahitz berria sortzeko esteka bidali dizugu. Begiratu spam karpeta ere.",
    "Contraseña actualizada. Ya puedes seguir practicando.": "Pasahitza eguneratu da. Praktikatzen jarrai dezakezu.",
    "Cuenta creada. ¡Bienvenido!": "Kontua sortu da. Ongi etorri!",
    "Sesión iniciada": "Saioa hasi da",
    "Sesión cerrada": "Saioa itxi da",
    "Escribe ELIMINAR para confirmar": "Idatzi ELIMINAR berresteko",
    "Eliminar mi cuenta": "Nire kontua ezabatu",
    "Esta acción no se puede deshacer.": "Ekintza hau ezin da desegin.",
    " Se borrarán de forma inmediata tu cuenta, tu email, tus intentos y respuestas, y tus confirmaciones y correcciones. Dejarán de contar en las estadísticas de las preguntas.": "Berehala ezabatuko dira zure kontua, emaila, saiakerak eta erantzunak, eta zure berrespenak eta zuzenketak. Galderen estatistiketan kontatzeari utziko diote.",
    "Bloques guardados": "Blokeak gorde dira",
    "Tu cuenta y todos tus datos se han eliminado.": "Zure kontua eta datu guztiak ezabatu dira.",
    "Elige los bloques que quieres practicar. Solo verás esos bloques en el selector de la barra lateral y en el ranking de preguntas falladas. Si no marcas ninguno, se muestran todos.": "Aukeratu praktikatu nahi dituzun blokeak. Alboko hautatzailean eta huts egindako galderen sailkapenean blokeok soilik ikusiko dituzu. Bat ere markatzen ez baduzu, guztiak erakutsiko dira.",

    "La respuesta no es correcta": "Erantzuna ez da zuzena",
    "Comentario (opcional)": "Iruzkina (aukerakoa)",
    "Enviar corrección": "Bidali zuzenketa",
    "Si 5 o más usuarios discrepan de esta respuesta e indican la misma opción correcta, se revisará y podrá modificarse. El cambio quedará registrado con la respuesta anterior, la nueva y la fecha.": "5 erabiltzaile edo gehiagok erantzun honekin ados ez badaude eta aukera zuzen bera adierazten badute, berrikusi eta alda daiteke. Aldaketa aurreko erantzunarekin, berriarekin eta dataz erregistratuko da.",
    "Selecciona la opción que crees que es correcta.": "Hautatu zure ustez zuzena den aukera.",
    "Gracias. Tu corrección queda registrada para revisión.": "Eskerrik asko. Zure zuzenketa berrikuspenerako erregistratu da.",
    "Respuesta confirmada. ¡Gracias!": "Erantzuna berretsi da. Eskerrik asko!",
    "Confirmación retirada": "Berrespena kendu da",
    "Confirmación eliminada": "Berrespena ezabatu da",
    "✓ Has confirmado esta respuesta como correcta": "✓ Erantzun hau zuzena dela berretsi duzu",
    "⚠ Has indicado que la respuesta correcta es": "⚠ Erantzun zuzena zela adierazi duzu:",
    "Respuesta correcta actualizada y guardada.": "Erantzun zuzena eguneratu eta gorde da.",
    "Esa ya es la respuesta correcta.": "Hori da jada erantzun zuzena.",
    "Ya estás en un intento vacío.": "Saiakera hutsean zaude jada.",
    "Mostrando todas las preguntas": "Galdera guztiak erakusten dira",
    "Copiado al portapapeles": "Arbelera kopiatu da",
    "No se pudo copiar el texto": "Ezin izan da testua kopiatu",
    "Rol actualizado": "Rola eguneratu da",
    "Gestiona usuarios, confirmaciones y correcciones de respuestas.": "Erabiltzaileak, berrespenak eta erantzun-zuzenketak kudeatu.",
    "Usuarios": "Erabiltzaileak",
    "Usuario": "Erabiltzailea",
    "Alta": "Alta",
    "Rol": "Rola",
    "Sin usuarios": "Erabiltzailerik ez",
    "Pregunta": "Galdera",
    "Respuesta actual": "Uneko erantzuna",
    "Confirman": "Berresten dute",
    "Discrepan": "Ez dute ados",
    "Opciones propuestas": "Proposatutako aukerak",
    "Comentarios": "Iruzkinak",
    "Última": "Azkena",
    "Corregir": "Zuzendu",
    "Eliminar": "Ezabatu",
    "Ver pregunta": "Galdera ikusi",
    "Aplicar": "Aplikatu",
    "corregida": "zuzendua",
    "No hay discrepancias pendientes": "Ez dago ebatzi gabeko desadostasunik",
    "No hay confirmaciones": "Ez dago berrespenik",
    "Sin confirmaciones todavía": "Oraindik ez dago berrespenik",
    "Confirmaciones": "Berrespenak",
    "Corregir": "Zuzendu",
    "Una fila por pregunta. Las columnas indican cuántas personas confirman o discrepan y qué opción proponen. Las discrepancias no cambian la respuesta automáticamente: si procede, elige la respuesta correcta en": "Galdera bakoitzeko lerro bat. Zutabeetan ikusten da zenbat pertsonak berresten edo ez dutan onartzen eta zein aukera proposatzen duten. Desadostasunek ez dute erantzuna automatikoki aldatzen: komeni bada, hautatu erantzun zuzena",
    " y pulsa ": " eta sakatu ",
    ". El cambio se guarda para todos los usuarios.": ". Aldaketa erabiltzaile guztientzat gordetzen da.",
    "¿Eliminar esta confirmación?": "Berrespen hau ezabatu?",

    "Ranking global o de tus propios intentos.": "Sailkapen globala edo zure saiakeren sailkapena.",
    "Todavía no hay preguntas falladas registradas.": "Oraindik ez dago huts egindako galderarik erregistratuta.",
    "Tus intentos": "Zure saiakerak",
    "Todos los usuarios": "Erabiltzaile guztiak",
    "Este dispositivo (sin Supabase)": "Gailu hau (Supabase gabe)",
    "Leyes, guías y manuales utilizados en las preguntas.": "Galderetan erabilitako legeak, gidak eta eskuliburuak.",
    "Temario común": "Gai komuna",
    "Temario específico (INF Enfermedades Infecciosas)": "Gai espezifikoa (INF Gaixotasun infekziosoak)",
    "Temario específico (Medicina Interna)": "Gai espezifikoa (Barne medikuntza)",
    "descargado": "deskargatuta",
    "no disponible en local": "ez dago tokian",
    "Web oficial": "Webgune ofiziala",
    "Buscar referencia": "Erreferentzia bilatu",

    "Practica tipo test para la oposición de Osakidetza": "Osakidetzako oposiziorako test motako praktika",
    "epeosaki es una herramienta de práctica con preguntas tipo test, casos clínicos y la referencia exacta de la bibliografía donde está cada respuesta.": "epeosaki test motako galderekin, kasu klinikoekin eta erantzun bakoitza non dagoen bibliografiaren erreferentzia zehatzarekin praktikatzeko tresna da.",
    "Empezar a practicar": "Praktikatzen hasi",
    "Bloques disponibles": "Eskuragarri dauden blokeak",
    "Al crear tu cuenta eliges qué bloques quieres trabajar. Puedes cambiarlos en cualquier momento desde": "Kontua sortzean lan egin nahi dituzun blokeak aukeratzen dituzu. Edozein unetan alda ditzakezu hemendik",
    ", en el menú de tu usuario.": ", erabiltzailearen menuan.",
    "Cómo funciona": "Nola funtzionatzen du",
    "Responde las preguntas. Cada intento se guarda y puedes revisarlo más tarde.": "Erantzun galderak. Saiakera bakoitza gordetzen da eta geroago berrikus dezakezu.",
    "Confirma las respuestas correctas o indica si crees que no lo son. Así ayudas a revisar la base de preguntas.": "Berretsi erantzun zuzenak edo adierazi ez direla uste baduzu. Horrela galderen oinarria berrikusten laguntzen duzu.",
    "Consulta": "Kontsultatu",
    "para ver qué preguntas fallan más los opositores.": "oposizioetan gehien huts egiten duten galderak ikusteko.",
    "Tras responder, verás": "Erantzun ondoren ikusiko duzu",
    ", con el texto y la referencia de la fuente.": ", iturriaren testuarekin eta erreferentziarekin.",
    "Uso personal y no comercial. Sin publicidad. Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde el menú de tu usuario. Al finalizar la OPE se borrarán todos los datos.": "Erabilera pertsonala eta ez komerziala. Publizitaterik gabe. Zure kontua eta datu guztiak edozein unetan ezaba ditzakezu erabiltzailearen menutik. OPE amaitzean datu guztiak ezabatuko dira.",

    "Qué hace y qué guarda esta web": "Zer egiten duen eta zer gordetzen duen webguneak",
    "Uso personal y no comercial.": "Erabilera pertsonala eta ez komerziala.",
    " Esta web es una herramienta de práctica para la OPE de Osakidetza. No tiene publicidad, no vende datos ni los comparte con terceros con fines comerciales.": " Web hau Osakidetzako OPErako praktika-tresna da. Ez du publizitaterik, ez ditu datuak saltzen ezta hirugarrenekin partekatzen merkataritza-helburuetarako.",
    "Respuestas generadas con IA.": "IAk sortutako erantzunak.",
    " Las respuestas han sido elaboradas con inteligencia artificial y no son una plantilla oficial. El usuario final debe verificarlas siempre con la bibliografía y la normativa vigente antes de darlas por válidas.": " Erantzunak adimen artifiziala erabilita egin dira eta ez dira txantiloi ofiziala. Azken erabiltzaileak beti egiaztatu behar ditu bibliografiarekin eta indarrean dagoen araudiarekin, baliozkotzat jo aurretik.",
    "Correcciones colaborativas.": "Elkarlanezko zuzenketak.",
    " Si 5 o más usuarios discrepan de una respuesta e indican otra opción como correcta, la respuesta podrá revisarse y modificarse. Los cambios también pueden aplicarlos un administrador desde el panel de administración, y quedan registrados con la respuesta anterior, la nueva y la fecha.": " 5 erabiltzaile edo gehiagok erantzun batekin ados ez badaude eta beste aukera bat zuzena dela adierazten badute, erantzuna berrikusi eta alda daiteke. Administratzaile batek ere alda ditzake administrazio-panelatik, eta aurreko erantzuna, berria eta data erregistratzen dira.",
    "Qué guarda si no inicias sesión:": "Zer gordetzen den saioa hasten ez baduzu:",
    " solo en el almacenamiento local de tu navegador (localStorage) tus respuestas, intentos y preferencias. Esa información no se envía a ningún servidor y puedes borrarla borrando los datos del sitio en tu navegador.": " soilik zure nabigatzailearen biltegi lokalean (localStorage) zure erantzunak, saiakerak eta hobespenak. Informazio hori ez da zerbitzarira bidaltzen, eta nabigatzailean webguneko datuak ezabatuz ezaba daiteke.",
    "Qué guarda si creas una cuenta:": "Zer gordetzen den kontua sortzen baduzu:",
    "Cuenta:": "Kontua:",
    " email, nombre visible, contraseña (cifrada y gestionada por Supabase; la web nunca la guarda en claro) y fecha de alta.": " emaila, bistan dagoen izena, pasahitza (Supabasek zifratuta eta kudeatuta; webguneak ez du inoiz argi gordetzen) eta alta data.",
    "Progreso:": "Aurrerapena:",
    " intentos y respuestas, para sincronizarlos entre dispositivos.": " saiakerak eta erantzunak, gailu batetik bestera sinkronizatzeko.",
    "Confirmaciones:": "Berrespenak:",
    " si confirmas una respuesta o propones una corrección, se guarda la pregunta, la opción propuesta, tu comentario y la fecha.": " erantzun bat berresten baduzu edo zuzenketa bat proposatzen baduzu, galdera, proposatutako aukera, zure iruzkina eta data gordetzen dira.",
    "Ranking:": "Sailkapena:",
    " las estadísticas de fallos se muestran de forma agregada; no se publica qué usuario falló cada pregunta.": " huts-estatistikak batuta erakusten dira; ez da argitaratzen zein erabiltzailek huts egin duen galdera bakoitzean.",
    "Servicios utilizados:": "Erabilitako zerbitzuak:",
    " GitHub Pages para alojar la web y Supabase para la autenticación y la base de datos. No se usan cookies publicitarias ni herramientas de analítica de terceros.": " GitHub Pages webgunea ostatatzeko eta Supabase autentifikaziorako eta datu-basean. Ez dira publizitate-cookieak ezta hirugarrenen analitika-tresnak erabiltzen.",
    "Conservación:": "Gordetzea:",
    " los datos se conservarán mientras se use la web para preparar la OPE. ": " datuak webgunea OPEa prestatzeko erabiltzen den bitartean gordeko dira. ",
    "Una vez finalizada la OPE se borrarán todos los datos": "OPE amaitu ondoren datu guztiak ezabatuko dira",
    " (cuentas, intentos y confirmaciones).": " (kontuak, saiakerak eta berrespenak).",
    "Eliminar tu cuenta:": "Zure kontua ezabatzea:",
    " puedes eliminarla en cualquier momento desde el menú de tu usuario, en ": " edozein unetan ezaba dezakezu erabiltzailearen menutik, ",
    "Se borrará toda la información": "Informazio guztia ezabatuko da",
    ": tu cuenta y email, tus intentos y respuestas, y tus confirmaciones y correcciones. El borrado es inmediato e irreversible.": ": zure kontua eta emaila, zure saiakerak eta erantzunak, eta zure berrespenak eta zuzenketak. Ezabaketa berehalakoa eta itzulezina da.",

    "INF Enfermedades Infecciosas · 500 preguntas": "INF Gaixotasun infekziosoak · 500 galdera",
    "Medicina Interna · 500 preguntas": "Barne medikuntza · 500 galdera",
    "Usuarios": "Erabiltzaileak",
  };

  var RULES = [
    [/^Pregunta (\d+)$/, function (m) { return m[1] + '. galdera'; }],
    [/^Pregunta (\d+)\.$/, function (m) { return m[1] + '. galdera.'; }],
    [/^Caso clínico (\S+)$/, function (m) { return 'Kasu klinikoa ' + m[1]; }],
    [/^Caso (\S+)$/, function (m) { return 'Kasua ' + m[1]; }],
    [/^Caso (\S+) · preguntas (\S+)–(\S+)$/, function (m) { return 'Kasua ' + m[1] + ' · ' + m[2] + '–' + m[3] + ' galderak'; }],
    [/^Preguntas (\S+)–(\S+)$/, function (m) { return 'Galderak ' + m[1] + '–' + m[2]; }],
    [/^(\d+) preguntas?( · (\d+) casos?)?( en este intento)?$/, function (m) {
      return m[1] + ' galdera' + (m[2] ? ' · ' + m[3] + ' kasu' : '') + (m[4] ? ' saiakera honetan' : '');
    }],
    [/^(\d+) de (\d+) en este intento$/, function (m) { return m[1] + ' / ' + m[2] + ' saiakera honetan'; }],
    [/^(\d+)\/(\d+) respondidas$/, function (m) { return m[1] + '/' + m[2] + ' erantzunda'; }],
    [/^(\d+) confirmadas?$/, function (m) { return m[1] + ' berretsita'; }],
    [/^✓ (\d+) confirmadas?$/, function (m) { return '✓ ' + m[1] + ' berretsita'; }],
    [/^✓ Confirmada por (\d+) usuarios?$/, function (m) { return '✓ ' + m[1] + ' erabiltzailek berretsita'; }],
    [/^⚠ (\d+) en desacuerdo$/, function (m) { return '⚠ ' + m[1] + ' ados ez'; }],
    [/^(\d+) confirmaciones? de otros usuarios$/, function (m) { return m[1] + ' beste erabiltzaileen berrespen'; }],
    [/^(\d+) persona(s?)$/, function (m) { return m[1] + ' pertsona'; }],
    [/^Seguridad (\d+)%$/, function (m) { return 'Segurtasuna ' + m[1] + '%'; }],
    [/^Todas \((\d+)\)$/, function (m) { return 'Guztiak (' + m[1] + ')'; }],
    [/^Discrepancias \((\d+)\)$/, function (m) { return 'Desadostasunak (' + m[1] + ')'; }],
    [/^Confirmaciones \((\d+)\)$/, function (m) { return 'Berrespenak (' + m[1] + ')'; }],
    [/^(.+) · (\d+) fallos? de (\d+) intentos?$/, function (m) { return m[1] + ' · ' + m[2] + ' huts, ' + m[3] + ' saiakeratik'; }],
    [/^(.+) · ordenado por número de fallos\. Pulsa una pregunta para abrirla\.$/, function (m) {
      return (EU[m[1]] || m[1]) + ' · hutsen kopuruaren arabera ordenatuta. Sakatu galdera bat irekitzeko.';
    }],
    [/^(\d+) resp\.$/, function (m) { return m[1] + ' erant.'; }],
    [/^No se pudo guardar: (.*)$/, function (m) { return 'Ezin izan da gorde: ' + m[1]; }],
    [/^No se pudo guardar la confirmación: (.*)$/, function (m) { return 'Ezin izan da berrespena gorde: ' + m[1]; }],
    [/^No se pudo eliminar la cuenta: (.*)$/, function (m) { return 'Ezin izan da kontua ezabatu: ' + m[1]; }],
    [/^No se pudo cambiar el rol: (.*)$/, function (m) { return 'Ezin izan da rola aldatu: ' + m[1]; }],
    [/^Error: (.*)$/, function (m) { return 'Errorea: ' + m[1]; }]
  ];

  var ATTR_ONLY = {
    "Buscar documento o tema…": "Bilatu dokumentua edo gaia…",
    "Mínimo 6 caracteres": "Gutxienez 6 karaktere",
    "Tu nombre": "Zure izena",
    "Explica brevemente por qué crees que la respuesta es incorrecta…": "Azaldu laburki zergatik uste duzun erantzuna okerra dela…",
    "Copiar la pregunta y sus opciones": "Galdera eta haren aukerak kopiatu",
    "Todas las preguntas confirmadas": "Galdera guztiak berretsiak",
    "Configura Supabase para activar el registro y las confirmaciones": "Konfiguratu Supabase erregistroa eta berrespenak aktibatzeko",
    "Nueva respuesta correcta": "Erantzun zuzen berria",
    "Respuesta confirmada": "Erantzuna berretsita",
    "Menú": "Menua",
    "Abrir menú": "Menua ireki",
    "Cerrar menú": "Menua itxi"
  };

  function tr(s) {
    var k = s.trim();
    if (!k) return s;
    var out = EU[k];
    if (out === undefined) {
      for (var i = 0; i < RULES.length; i++) {
        var m = k.match(RULES[i][0]);
        if (m) { out = RULES[i][1](m); break; }
      }
    }
    if (out === undefined || out === k) return s;
    return s.replace(k, out);
  }

  function trAttr(v) {
    if (ATTR_ONLY[v] !== undefined) return ATTR_ONLY[v];
    var out = tr(v);
    return out;
  }

  var ATTRS = ['placeholder', 'title', 'aria-label'];

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var v = el.getAttribute(a);
      if (v == null) continue;
      var nv = trAttr(v);
      if (nv !== v) el.setAttribute(a, nv);
    }
  }

  function translateTree(node) {
    if (node.nodeType === 3) {
      var v = tr(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
    translateAttrs(node);
    for (var n = node.firstChild; n; n = n.nextSibling) translateTree(n);
  }

  function applyLanguage() {
    var btn = document.getElementById('langBtn');
    if (btn) { btn.textContent = lang === 'eu' ? 'ES' : 'EU'; btn.title = lang === 'eu' ? 'Gaztelania' : 'Euskara'; }
    var search = document.getElementById('search');
    if (search && lang === 'eu') search.placeholder = 'Bilatu testuaren edo zenbakiaren arabera…';
    if (lang !== 'eu') return;
    translateTree(document.body);
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === 'characterData') translateTree(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else m.addedNodes.forEach(translateTree);
      });
    });
    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  window.OPE_LANG = lang;
  window.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('langBtn');
    if (btn) {
      btn.onclick = function () {
        localStorage.setItem(KEY, lang === 'eu' ? 'es' : 'eu');
        location.reload();
      };
    }
    applyLanguage();
  });
})();
