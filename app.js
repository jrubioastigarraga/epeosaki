(function () {
  'use strict';

  // Datos embebidos: se usan como respaldo si Supabase no está disponible.
  const datasetEl = document.getElementById('dataset');
  const EMBEDDED = datasetEl ? JSON.parse(datasetEl.textContent || '{}') : {};
  let RAW = EMBEDDED;
  let FUENTES = [];
  let questions = {};
  let cases = {};
  let unitCache = {};
  const BATS = {
    comun: { data: { meta: {}, preguntas: [] }, label: 'Batería común', sub: 'Temario común · 200 preguntas' },
    fem: { data: { meta: {}, preguntas: [] }, label: 'INF Enfermedades Infecciosas', sub: 'Enfermedades Infecciosas · 500 preguntas' },
    mi: { data: { meta: {}, preguntas: [] }, label: 'Medicina Interna', sub: 'Medicina Interna · 500 preguntas' }
  };
  const BAT_KEYS = Object.keys(BATS);
  const BAT_SHORT = { comun: 'Común', fem: 'INF', mi: 'MI' };

  function rebuildDataset(raw) {
    if (raw) RAW = raw;
    FUENTES = RAW.fuentes || [];
    questions = {};
    for (const k of BAT_KEYS) {
      BATS[k].data = RAW[k] || { meta: {}, preguntas: [] };
      for (const q of BATS[k].data.preguntas || []) {
        questions[k + '-' + q.numero] = Object.assign({}, q, { uid: k + '-' + q.numero, bat: k });
      }
    }

    // Agrupación de casos clínicos por batería (INF y Medicina Interna).
    cases = {};
    for (const q of Object.values(questions)) {
      if (q.caso == null) continue;
      const key = q.bat + ':' + q.caso;
      const c = cases[key] || (cases[key] = { key: key, id: q.caso, bat: q.bat, questions: [], contexto: '' });
      c.questions.push(q);
    }
    for (const c of Object.values(cases)) {
      c.questions.sort((a, b) => a.numero - b.numero);
      c.desde = c.questions[0].numero;
      c.hasta = c.questions[c.questions.length - 1].numero;
      c.contexto = c.bat === 'mi'
        ? String(c.questions[0].contexto || '').trim()
        : cleanCaseContext(c.questions);
    }

    // En el dataset original, la última opción de algunos casos arrastra el
    // enunciado del caso siguiente. Lo recortamos para no mostrar texto ajeno.
    const caseStarts = Object.values(cases)
      .map(c => ({ bat: c.bat, id: c.id, text: c.contexto.slice(0, 60) }))
      .filter(x => x.text.length > 20);
    for (const q of Object.values(questions)) {
      if (!q.opciones) continue;
      for (const k of Object.keys(q.opciones)) {
        const v = q.opciones[k];
        for (const c of caseStarts) {
          if (c.bat === q.bat && c.id === q.caso) continue;
          const i = v.indexOf(c.text);
          if (i > 0) { q.opciones[k] = v.slice(0, i).trim(); break; }
        }
      }
    }

    unitCache = {};
  }

  // El campo `contexto` de los casos incluye el enunciado + todas las preguntas
  // y opciones del caso. Para mostrar el caso agrupado dejamos solo el enunciado.
  function cleanCaseContext(qs) {
    const ctx = String(qs[0].contexto || '').trim();
    if (!ctx) return '';
    const words = String(qs[0].pregunta || '').trim().split(/\s+/).slice(0, 10)
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (words.length) {
      try {
        const m = new RegExp(words.join('\\s+'), 'i').exec(ctx);
        if (m && m.index > 40) return ctx.slice(0, m.index).replace(/\s*\d+\s*\.\s*-\s*$/, '').trim();
      } catch (e) { /* expresión no válida: seguimos con el texto completo */ }
    }
    const m2 = ctx.search(new RegExp('\\b' + qs[0].numero + '\\.\\s*-'));
    if (m2 > 40) return ctx.slice(0, m2).replace(/\s*\d+\s*\.\s*-\s*$/, '').trim();
    return ctx;
  }

  const DS_CACHE = 'epeosaki-dataset-v1';
  function readDatasetCache() {
    try {
      const c = JSON.parse(localStorage.getItem(DS_CACHE) || 'null');
      return c && c.data && c.data.comun ? c.data : null;
    } catch (e) { return null; }
  }
  rebuildDataset(readDatasetCache() || EMBEDDED);

  // ============================================================
  //  Utilidades
  // ============================================================
  const $ = (s) => document.querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const LS = 'ope-ana-v1';
  const CONFIG = window.OPE_CONFIG || {};
  const HAS_CONFIG = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY &&
    !/TU-PROYECTO|TU-ANON-KEY/i.test(CONFIG.SUPABASE_URL + ' ' + CONFIG.SUPABASE_ANON_KEY));
  function unitsFor(bat) {
    if (unitCache[bat]) return unitCache[bat];
    const list = [];
    const seen = new Set();
    const arr = Object.values(questions).filter(q => q.bat === bat).sort((a, b) => a.numero - b.numero);
    for (const q of arr) {
      if (q.caso != null) {
        const key = bat + ':' + q.caso;
        if (seen.has(key)) continue;
        seen.add(key);
        const c = cases[key];
        if (c) {
          list.push({ type: 'case', key: key, id: c.id, order: c.desde, desde: c.desde, hasta: c.hasta, questions: c.questions });
          continue;
        }
      }
      list.push({ type: 'q', uid: q.uid, order: q.numero, questions: [q] });
    }
    unitCache[bat] = list;
    return list;
  }
  const unitKey = (u) => u.type === 'case' ? 'case-' + (u.key || u.id) : u.uid;
  function unitForUid(uid) {
    const q = questions[uid];
    if (!q) return null;
    return unitsFor(q.bat).find(u => u.questions.includes(q)) || null;
  }

  function topicOf(q) {
    if (q.tema) return q.tema;
    if (q.caso != null) return 'Casos clínicos';
    if (q.bat === 'fem') return 'INF · general';
    if (q.bat === 'mi') return 'MI · general';
    return 'General';
  }

  // ============================================================
  //  Estado local: intentos agrupados
  // ============================================================
  // Cada intento guarda solo las preguntas que el usuario haya respondido.
  // Puede quedar incompleto y se puede revisar cuando quiera.
  const EMPTY = Object.freeze({});
  const newId = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

  function emptyStore() {
    return { v: 2, owner: null, groups: [], active: { comun: null, fem: null, mi: null } };
  }

  function migrateLegacyStore(s) {
    const st = emptyStore();
    st.owner = s.owner || null;
    const answers = s.answers || {};
    for (const bat of BAT_KEYS) {
      const subset = {};
      for (const [uid, a] of Object.entries(answers)) {
        if (uid.startsWith(bat + '-')) subset[uid] = a;
      }
      if (Object.keys(subset).length) {
        const id = newId();
        st.groups.push({
          id,
          battery: bat,
          name: 'Progreso anterior',
          created_at: new Date().toISOString(),
          answers: subset
        });
        st.active[bat] = id;
      }
    }
    return st;
  }

  let store = emptyStore();
  try {
    const s = JSON.parse(localStorage.getItem(LS) || 'null');
    if (s && s.v === 2 && Array.isArray(s.groups)) store = s;
    else if (s && s.answers) store = migrateLegacyStore(s);
  } catch (e) { /* almacenamiento no disponible */ }
  if (!store.active) store.active = { comun: null, fem: null, mi: null };
  for (const b of BAT_KEYS) if (!(b in store.active)) store.active[b] = null;
  if (!Array.isArray(store.groups)) store.groups = [];
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) { /* almacenamiento no disponible */ } };

  const state = {
    bat: 'comun',
    uid: 'comun-1',
    page: 'preguntas',      // 'preguntas' | 'bibliografia' | 'ranking'
    view: 'q',              // 'q' | 'case'
    caseId: null,
    text: '',
    status: 'all',
    conf: 'all',
    topic: 'all',
    shuffle: null,
    reviewGroupId: null     // null = intento actual; id = revisando un intento pasado
  };

  // ---------- helpers de intentos ----------
  function groupById(id) { return store.groups.find(g => g.id === id) || null; }
  function groupsFor(bat) {
    return store.groups
      .filter(g => g.battery === bat)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  function activeGroup(bat) {
    return groupById(store.active[bat || state.bat]);
  }
  function reviewGroup() {
    return state.reviewGroupId ? groupById(state.reviewGroupId) : null;
  }
  function viewGroup() {
    return reviewGroup() || activeGroup(state.bat);
  }
  function viewAnswers() {
    const g = viewGroup();
    return g ? g.answers : EMPTY;
  }
  function groupStats(g) {
    if (!g) return { answered: 0, correct: 0, pct: 0 };
    const answers = Object.values(g.answers || {});
    const correct = answers.filter(a => a.ok).length;
    return {
      answered: answers.length,
      correct,
      pct: answers.length ? Math.round(correct * 100 / answers.length) : 0
    };
  }
  function nextAttemptName(bat) {
    let max = 0;
    for (const g of groupsFor(bat)) {
      const m = /^Intento\s+(\d+)$/i.exec(g.name || '');
      if (m) max = Math.max(max, Number(m[1]));
    }
    return 'Intento ' + (max + 1);
  }
  function createGroup(bat) {
    const g = {
      id: newId(),
      battery: bat,
      name: nextAttemptName(bat),
      created_at: new Date().toISOString(),
      answers: {}
    };
    store.groups.push(g);
    store.active[bat] = g.id;
    save();
    if (SB && session) {
      SB.from('attempt_groups').upsert({
        id: g.id,
        user_id: session.user.id,
        battery: g.battery,
        name: g.name,
        created_at: g.created_at
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('[intentos]', error.message);
      });
    }
    return g;
  }
  function ensureActiveGroup(bat) {
    return activeGroup(bat) || createGroup(bat);
  }

  // ============================================================
  //  Supabase: sesión, perfil, confirmaciones, progreso
  // ============================================================
  let SB = null;
  let session = null;
  let profile = null;
  let confirmStats = {};   // question_uid -> { confirms, disputes, confirmers, last_at }
  let myConf = {};         // question_uid -> fila de confirmación del usuario
  let overrides = {};      // question_uid -> { answer, previous_answer }
  let authMode = 'login';
  let autoHome = false;
  let disputeUid = null;
  let adminTab = 'users';
  let adminConfFilter = 'all';
  let statsBat = 'all';

  function toast(msg, type) {
    let t = $('#toast');
    if (!t) { t = el('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 4200);
  }
  toast._t = null;

  async function copyText(text) {
    const value = String(text || '').trim();
    if (!value) return;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (e) { /* probamos el método clásico */ }
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        ta.remove();
      } catch (e) { copied = false; }
    }
    if (copied) toast('Copiado al portapapeles', 'ok');
    else toast('No se pudo copiar el texto', 'err');
  }

  function authError(err) {
    const m = String((err && err.message) || '').toLowerCase();
    if (m.includes('invalid login')) return 'Email o contraseña incorrectos.';
    if (m.includes('already registered') || m.includes('already been registered')) return 'Ese email ya tiene una cuenta. Prueba a iniciar sesión.';
    if (m.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (m.includes('email not confirmed')) return 'Debes confirmar tu email antes de entrar. Revisa tu correo.';
    if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    if (m.includes('unable to validate email')) return 'El email no es válido.';
    return (err && err.message) ? err.message : 'No se ha podido completar la operación.';
  }

  const fmtDate = (s) => {
    try { return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }); }
    catch (e) { return String(s || ''); }
  };

  async function loadRemoteDataset() {
    if (!SB) return false;
    try {
      const questionPage = (from) => SB.from('questions')
        .select('battery,numero,contexto,caso,pregunta,opciones,answer,confidence,source,tags,notas,tema,tema_id')
        .order('battery', { ascending: true })
        .order('numero', { ascending: true })
        .range(from, from + 999);
      const [batRes, bibRes, q0, q1] = await Promise.all([
        SB.from('batteries').select('id,meta'),
        SB.from('bibliography').select('id,grupo,data'),
        questionPage(0),
        questionPage(1000)
      ]);
      if (batRes.error) throw batRes.error;
      if (bibRes.error) throw bibRes.error;
      if (q0.error) throw q0.error;
      if (q1.error) throw q1.error;

      let rows = (q0.data || []).concat(q1.data || []);
      if ((q1.data || []).length === 1000) {
        for (let from = 2000; ; from += 1000) {
          const { data, error } = await questionPage(from);
          if (error) throw error;
          rows = rows.concat(data || []);
          if (!data || data.length < 1000) break;
        }
      }
      if (!rows.length) return false;

      const remote = {};
      for (const k of BAT_KEYS) remote[k] = { meta: {}, preguntas: [] };
      for (const b of batRes.data || []) {
        remote[b.id] = { meta: b.meta || {}, preguntas: [] };
      }
      for (const r of rows) {
        const b = remote[r.battery];
        if (!b) continue;
        b.preguntas.push({
          numero: r.numero,
          contexto: r.contexto || '',
          caso: r.caso,
          pregunta: r.pregunta,
          opciones: r.opciones || {},
          answer: r.answer,
          confidence: r.confidence,
          source: r.source,
          tags: r.tags || [],
          notas: r.notas,
          tema: r.tema,
          tema_id: r.tema_id
        });
      }
      remote.fuentes = (bibRes.data || []).map(r =>
        Object.assign({}, r.data || {}, { id: r.id, grupo: r.grupo || (r.data || {}).grupo })
      );
      if (!remote.fuentes.length) remote.fuentes = EMBEDDED.fuentes || [];

      const total = BAT_KEYS.reduce((n, k) => n + (remote[k].preguntas.length || 0), 0);
      if (!total) return false;
      try { localStorage.setItem(DS_CACHE, JSON.stringify({ ts: Date.now(), data: remote })); } catch (e) { /* cuota llena: se carga siempre desde Supabase */ }
      rebuildDataset(remote);
      return true;
    } catch (e) {
      console.warn('[dataset] No se pudo cargar desde Supabase; se usa la copia embebida.', e.message || e);
      return false;
    }
  }

  async function initSupabase() {
    if (!HAS_CONFIG) { if (location.hash === '#/admin') setPage('preguntas'); showSetupBanner('local'); return; }
    if (!window.supabase) { if (location.hash === '#/admin') setPage('preguntas'); showSetupBanner('cdn'); return; }
    try {
      SB = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const remoteP = loadRemoteDataset();
      const overP = loadQuestionOverrides();
      const sessP = SB.auth.getSession();
      const remoteLoaded = await remoteP;
      await overP;
      if (remoteLoaded) {
        renderAttemptSelect();
        setPage(state.page, { skipHash: true, render: true });
      }
      const { data } = await sessP;
      await setSession(data.session || null);
      if (autoHome && session) { autoHome = false; setPage('preguntas', { skipHash: true, render: false }); }
      if (remoteLoaded) {
        renderAttemptSelect();
        setPage(state.page, { skipHash: true, render: true });
      }
      SB.auth.onAuthStateChange((event, sess) => {
        if (event === 'SIGNED_OUT') { setSession(null); return; }
        if (event === 'PASSWORD_RECOVERY') openAuth('newpass');
        if (sess && (!session || sess.user.id !== session.user.id)) setTimeout(() => setSession(sess), 0);
      });
    } catch (e) {
      console.error('[supabase]', e);
      toast('No se pudo conectar con Supabase. Revisa config.js y el SQL.', 'err');
    }
  }

  function showSetupBanner(reason) {
    const b = $('#setupBanner');
    if (!b) return;
    b.hidden = false;
    if (reason === 'cdn') b.querySelector('.banner-txt').textContent = 'No se ha podido cargar el cliente de Supabase. Comprueba que vendor/supabase.js se ha subido al servidor.';
  }

  async function setSession(sess) {
    session = sess || null;
    profile = null;
    myConf = {};
    if (!session) {
      await loadConfirmationStats();
      renderAuthUI();
      applyBlockVisibility();
      renderAll(false);
      if (location.hash === '#/admin') routeFromHash();
      return;
    }
    await Promise.all([loadProfile(), loadConfirmationStats(), loadMyConfirmations(), syncAttempts()]);
    renderAuthUI();
    applyBlockVisibility();
    renderAll(false);
    if (location.hash === '#/admin') routeFromHash();
  }

  async function loadProfile() {
    if (!session || !SB) return;
    try {
      const { data, error } = await SB.from('profiles')
        .select('id,email,display_name,role,blocks')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!error && data) profile = data;
    } catch (e) { /* la tabla puede no existir todavía */ }
    if (!profile) {
      const meta = session.user.user_metadata || {};
      const email = session.user.email || '';
      profile = {
        id: session.user.id,
        email,
        display_name: meta.display_name || email.split('@')[0] || 'Usuario',
        role: 'user',
        blocks: []
      };
    }
  }

  async function loadConfirmationStats() {
    if (!SB) return;
    try {
      const { data, error } = await SB.rpc('question_confirmation_stats');
      if (error) { console.warn('[confirmaciones]', error.message); return; }
      const map = {};
      for (const r of data || []) map[r.question_uid] = r;
      confirmStats = map;
    } catch (e) { console.warn('[confirmaciones]', e); }
  }

  async function loadMyConfirmations() {
    if (!SB || !session) return;
    try {
      const { data, error } = await SB.from('confirmations')
        .select('question_uid,is_correct,suggested_answer,comment,created_at')
        .eq('user_id', session.user.id);
      if (error) { console.warn('[mis confirmaciones]', error.message); return; }
      const map = {};
      for (const r of data || []) map[r.question_uid] = r;
      myConf = map;
    } catch (e) { console.warn('[mis confirmaciones]', e); }
  }

  // ------------------------------------------------------------
  //  Correcciones de la respuesta correcta (administración)
  // ------------------------------------------------------------
  async function loadQuestionOverrides() {
    if (!SB) return;
    try {
      const { data, error } = await SB.from('question_overrides')
        .select('question_uid,answer,previous_answer,updated_at');
      if (error) { console.warn('[correcciones]', error.message); return; }
      const map = {};
      for (const r of data || []) map[r.question_uid] = r;
      overrides = map;
      applyQuestionOverrides();
    } catch (e) { console.warn('[correcciones]', e); }
  }

  function applyQuestionOverrides() {
    let changed = false;
    for (const [uid, o] of Object.entries(overrides)) {
      const q = questions[uid];
      if (!q || !o || !o.answer) continue;
      q.answer = o.answer;
    }
    // Recalcular el resultado local de las respuestas ya guardadas.
    for (const g of store.groups) {
      for (const [uid, a] of Object.entries(g.answers || {})) {
        const q = questions[uid];
        if (!q) continue;
        const ok = a.pick === q.answer;
        if (ok !== a.ok) { a.ok = ok; changed = true; }
      }
    }
    if (changed) save();
  }

  function canAdmin() {
    return !!(session && profile && profile.role === 'admin');
  }

  async function applyAnswerCorrection(uid, newAnswer) {
    const q = questions[uid];
    if (!q || !canAdmin() || !SB) return;
    if (!newAnswer || !q.opciones[newAnswer]) return;
    if (newAnswer === q.answer) {
      toast('Esa ya es la respuesta correcta.', 'ok');
      return;
    }
    const oldAnswer = q.answer;
    const label = String(newAnswer) + ') ' + String(q.opciones[newAnswer] || '').slice(0, 90);
    const ok = await openAsk({
      title: 'Cambiar respuesta correcta',
      text: '¿Cambiar la respuesta correcta de la pregunta ' + q.numero + ' a «' + label + '»?\n\nEl cambio se aplica a todos los usuarios y recalcula sus intentos.',
      okText: 'Cambiar',
      danger: true
    });
    if (!ok) return;
    const now = new Date().toISOString();
    const { error } = await SB.from('question_overrides').upsert({
      question_uid: uid,
      answer: newAnswer,
      previous_answer: oldAnswer,
      updated_by: session.user.id,
      updated_at: now
    }, { onConflict: 'question_uid' });
    if (error) {
      toast('No se pudo guardar la corrección: ' + error.message + '. ¿Has ejecutado sql/migrate_question_overrides.sql?', 'err');
      return;
    }
    const { error: qErr } = await SB.from('questions').update({ answer: newAnswer }).eq('uid', uid);
    if (qErr) console.warn('[questions] no se pudo actualizar la respuesta base:', qErr.message);
    overrides[uid] = { question_uid: uid, answer: newAnswer, previous_answer: oldAnswer, updated_at: now };
    q.answer = newAnswer;
    applyQuestionOverrides();
    toast('Respuesta correcta actualizada y guardada.', 'ok');
    renderAll(true);
    renderAdmin();
  }

  async function syncAttempts() {
    if (!SB || !session) return;
    try {
      // Aislamiento en dispositivos compartidos: los intentos locales
      // pertenecen al último usuario que inició sesión.
      if (store.owner && store.owner !== session.user.id) {
        store.groups = [];
        store.active = { comun: null, fem: null, mi: null };
        save();
      }
      store.owner = session.user.id;
      save();

      const { data: rgroups, error: eg } = await SB.from('attempt_groups')
        .select('id,battery,name,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (eg) { console.warn('[intentos]', eg.message); return; }

      // Descarga paginada de todas las respuestas del usuario.
      let rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await SB.from('attempts')
          .select('group_id,question_uid,pick,is_correct,answered_at')
          .eq('user_id', session.user.id)
          .order('answered_at', { ascending: true })
          .range(from, from + 999);
        if (error) { console.warn('[intentos]', error.message); break; }
        rows = rows.concat(data || []);
        if (!data || data.length < 1000) break;
      }

      const remoteById = new Map();
      for (const g of rgroups || []) remoteById.set(g.id, Object.assign({}, g, { answers: {} }));
      for (const r of rows) {
        const g = remoteById.get(r.group_id);
        if (!g || !questions[r.question_uid]) continue;
        g.answers[r.question_uid] = {
          pick: r.pick,
          ok: !!r.is_correct,
          ts: Date.parse(r.answered_at) || 0
        };
      }

      const localById = new Map(store.groups.map(g => [g.id, g]));
      const uploadGroups = [];
      const uploadAnswers = [];

      // Fusionar lo remoto con lo local (gana la respuesta más reciente).
      for (const [id, rg] of remoteById) {
        const lg = localById.get(id);
        if (!lg) { store.groups.push(rg); continue; }
        if (!lg.answers) lg.answers = {};
        for (const [uid, ra] of Object.entries(rg.answers)) {
          const la = lg.answers[uid];
          if (!la || (la.ts || 0) < (ra.ts || 0)) {
            lg.answers[uid] = ra;
          } else if ((la.ts || 0) > (ra.ts || 0)) {
            uploadAnswers.push({ group_id: id, uid, a: la });
          }
        }
      }

      // Subir intentos y respuestas que solo existen en local.
      for (const lg of store.groups) {
        if (!lg.answers) lg.answers = {};
        if (!remoteById.has(lg.id)) {
          uploadGroups.push(lg);
          for (const [uid, a] of Object.entries(lg.answers)) {
            uploadAnswers.push({ group_id: lg.id, uid, a });
          }
        } else {
          const rg = remoteById.get(lg.id);
          for (const [uid, a] of Object.entries(lg.answers)) {
            if (!rg.answers[uid]) uploadAnswers.push({ group_id: lg.id, uid, a });
          }
        }
      }

      // Elegir intento activo si no hay uno válido.
      for (const bat of BAT_KEYS) {
        if (!store.active[bat] || !groupById(store.active[bat])) {
          const gs = groupsFor(bat);
          store.active[bat] = gs.length ? gs[0].id : null;
        }
      }
      save();

      if (uploadGroups.length) {
        const payload = uploadGroups.map(g => ({
          id: g.id,
          user_id: session.user.id,
          battery: g.battery,
          name: g.name,
          created_at: g.created_at
        }));
        const { error } = await SB.from('attempt_groups').upsert(payload, { onConflict: 'id' });
        if (error) console.warn('[intentos]', error.message);
      }

      if (uploadAnswers.length) {
        const payload = uploadAnswers.map(x => ({
          group_id: x.group_id,
          user_id: session.user.id,
          question_uid: x.uid,
          pick: x.a.pick,
          is_correct: !!x.a.ok,
          answered_at: new Date(x.a.ts || Date.now()).toISOString()
        }));
        for (let i = 0; i < payload.length; i += 500) {
          const { error } = await SB.from('attempts').upsert(payload.slice(i, i + 500), { onConflict: 'group_id,question_uid' });
          if (error) { console.warn('[intentos]', error.message); break; }
        }
      }

      updateStats();
      renderAttemptSelect();
    } catch (e) { console.warn('[intentos]', e); }
  }

  // ============================================================
  //  Intentos: selector, revisión y arranque
  // ============================================================
  function fmtShortDate(s) {
    try {
      const d = new Date(s);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' +
        d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function renderAttemptSelect() {
    const sel = $('#fAttempt');
    if (!sel) return;
    const active = activeGroup(state.bat);
    const groups = groupsFor(state.bat);
    let html = '';
    if (active) {
      const s = groupStats(active);
      html += `<option value="active">${esc(active.name)} (actual) · ${s.answered} resp.${s.answered ? ' · ' + s.pct + '%' : ''}</option>`;
    } else {
      html += '<option value="">Sin intento activo</option>';
    }
    for (const g of groups) {
      if (active && g.id === active.id) continue;
      const s = groupStats(g);
      html += `<option value="g:${g.id}">${esc(g.name)} · ${fmtShortDate(g.created_at)} · ${s.answered} resp.${s.answered ? ' · ' + s.pct + '%' : ''}</option>`;
    }
    sel.innerHTML = html;
    sel.value = state.reviewGroupId && groupById(state.reviewGroupId)
      ? 'g:' + state.reviewGroupId
      : (active ? 'active' : '');
  }

  function applyBatteryUI(bat, opts) {
    state.bat = bat;
    state.topic = 'all';
    state.status = 'all';
    state.text = '';
    state.shuffle = null;
    $('#search').value = '';
    if (!opts || !opts.keepReview) state.reviewGroupId = null;
    $('#subtitle').textContent = BATS[bat].sub;
    document.querySelectorAll('.tab[data-bat]').forEach(x => x.classList.toggle('on', x.dataset.bat === bat));
    renderAttemptSelect();
  }

  function allowedBats() {
    const mine = session && profile && Array.isArray(profile.blocks) ? profile.blocks : [];
    return mine.length ? BAT_KEYS.filter(k => mine.includes(k)) : BAT_KEYS.slice();
  }

  function switchBattery(bat) {
    state.view = 'q';
    state.caseId = null;
    applyBatteryUI(bat);
    const arr = poolUnits();
    if (arr.length) goUnit(arr[0]);
    else { state.uid = state.bat + '-1'; renderAll(false); }
  }

  function applyBlockVisibility() {
    const allowed = allowedBats();
    document.querySelectorAll('.tab[data-bat]').forEach(t => { t.hidden = !allowed.includes(t.dataset.bat); });
    if (statsBat !== 'all' && !allowed.includes(statsBat)) statsBat = 'all';
    $('#statsBat').innerHTML = '<option value="all">Todas</option>' +
      allowed.map(k => `<option value="${k}">${BAT_SHORT[k]}</option>`).join('');
    $('#statsBat').value = statsBat;
    if (!allowed.includes(state.bat)) {
      const first = unitsFor(allowed[0])[0];
      applyBatteryUI(allowed[0]);
      state.view = first && first.type === 'case' ? 'case' : 'q';
      state.caseId = first && first.type === 'case' ? first.key : null;
      state.uid = first ? first.questions[0].uid : allowed[0] + '-1';
    }
  }

  function startNewAttempt() {
    const active = activeGroup(state.bat);
    if (active && Object.keys(active.answers).length === 0 && !state.reviewGroupId) {
      toast('Ya estás en un intento vacío.', 'ok');
      return;
    }
    state.reviewGroupId = null;
    const g = createGroup(state.bat);
    renderAttemptSelect();
    renderAll(false);
    toast(g.name + ' iniciado', 'ok');
  }

  function groupFirstQuestion(g) {
    const uids = Object.keys(g.answers || {}).filter(uid => questions[uid]);
    uids.sort((a, b) => questions[a].numero - questions[b].numero);
    return uids.length ? questions[uids[0]] : null;
  }

  function enterReview(id) {
    const g = groupById(id);
    if (!g) return;
    state.shuffle = null;
    if (g.battery !== state.bat) {
      state.reviewGroupId = g.id;
      applyBatteryUI(g.battery, { keepReview: true });
    } else {
      state.reviewGroupId = g.id;
      renderAttemptSelect();
    }
    const q = groupFirstQuestion(g);
    if (q) go(q.uid);
    else renderAll(false);
  }

  function exitReview() {
    state.reviewGroupId = null;
    renderAttemptSelect();
    renderAll(false);
  }

  function reviewBanner() {
    const g = reviewGroup();
    if (!g) return '';
    const s = groupStats(g);
    return `<div class="review-banner">
      <div><b>Revisando ${esc(g.name)}</b> &middot; ${fmtDate(g.created_at)} &middot;
        ${s.answered} respondidas &middot; ${s.pct}% aciertos</div>
      <button class="btn" id="exitReviewBtn" type="button">Salir de la revisión</button>
    </div>`;
  }


  // ============================================================
  //  Autenticación (UI)
  // ============================================================
  function renderAuthUI() {
    const box = $('#authBox');
    if (!box) return;
    const adminItem = $('#adminMenuItem');
    if (adminItem) adminItem.hidden = !canAdmin();
    if (!HAS_CONFIG) {
      box.innerHTML = '<button class="btn" id="authBtn" type="button" title="Configura Supabase para activar el registro y las confirmaciones">Iniciar sesión</button>';
      $('#authBtn').onclick = () => openAuth();
      return;
    }
    if (session) {
      const name = (profile && profile.display_name) || session.user.email || 'Usuario';
      const initial = String(name).trim().charAt(0) || 'U';
      const isAdmin = profile && profile.role === 'admin';
      box.innerHTML = `
        <button class="userchip" id="userChip" type="button" title="${esc(session.user.email || '')}">
          <span class="avatar">${esc(initial)}</span>
          <span class="uname">${esc(name)}</span>
          ${isAdmin ? '<span class="role">admin</span>' : ''}
        </button>
        <div class="user-menu" id="userMenu" hidden>
          <div class="um-head">${esc(session.user.email || '')}</div>
          <button type="button" id="blocksBtn">Mis bloques</button>
          <button type="button" id="deleteBtn">Eliminar cuenta y datos</button>
          ${isAdmin ? '<button type="button" id="adminBtn">Panel de administración</button>' : ''}
          <button type="button" id="logoutBtn">Cerrar sesión</button>
        </div>`;
      $('#userChip').onclick = (e) => { e.stopPropagation(); const m = $('#userMenu'); m.hidden = !m.hidden; };
      if (isAdmin) $('#adminBtn').onclick = () => { $('#userMenu').hidden = true; setPage('admin', { push: true }); };
      $('#blocksBtn').onclick = () => { $('#userMenu').hidden = true; openBlocks(); };
      $('#deleteBtn').onclick = () => { $('#userMenu').hidden = true; openDelete(); };
      $('#logoutBtn').onclick = async () => {
        $('#userMenu').hidden = true;
        if (SB) await SB.auth.signOut();
        session = null; profile = null; myConf = {}; confirmStats = {};
        // No dejar intentos del usuario anterior en el navegador.
        store.groups = [];
        store.active = { comun: null, fem: null, mi: null };
        store.owner = null;
        state.reviewGroupId = null;
        applyBlockVisibility();
        setPage('inicio', { render: false });
        save();
        renderAuthUI();
        renderAttemptSelect();
        renderAll(false);
        toast('Sesión cerrada', 'ok');
      };
    } else {
      box.innerHTML = '<button class="btn primary" id="authBtn" type="button">Iniciar sesión</button>';
      $('#authBtn').onclick = () => openAuth();
    }
  }

  function openBlocks() {
    if (!session) return openAuth();
    const mine = profile && Array.isArray(profile.blocks) ? profile.blocks : [];
    document.querySelectorAll('input[name="blockopt"]').forEach(i => { i.checked = mine.includes(i.value); });
    $('#blocksMsg').textContent = '';
    $('#blocksModal').classList.add('open');
  }

  async function saveBlocks() {
    if (!session || !SB) return;
    const picked = [...document.querySelectorAll('input[name="blockopt"]:checked')].map(i => i.value);
    const btn = $('#blocksSubmit');
    btn.disabled = true;
    const { data, error } = await SB.rpc('set_my_blocks', { p_blocks: picked });
    btn.disabled = false;
    if (error) { $('#blocksMsg').textContent = 'No se pudo guardar: ' + error.message; return; }
    profile.blocks = Array.isArray(data) ? data : picked;
    $('#blocksModal').classList.remove('open');
    toast('Bloques guardados', 'ok');
    applyBlockVisibility();
    renderAll(true);
  }

  // ---- Modal genérico de confirmación/aviso (sustituye a confirm/alert nativos) ----
  let askResolve = null;
  function openAsk(opts) {
    const m = $('#askModal');
    if (!m) return Promise.resolve(!opts || !opts.info);
    $('#askTitle').textContent = opts.title || 'Confirmar';
    $('#askText').textContent = opts.text || '';
    const ok = $('#askOk'), cancel = $('#askCancel');
    ok.textContent = opts.okText || 'Aceptar';
    if (opts.danger) { ok.style.background = 'var(--bad)'; ok.style.borderColor = 'var(--bad)'; ok.style.color = '#fff'; }
    else { ok.style.background = ''; ok.style.borderColor = ''; ok.style.color = ''; }
    cancel.hidden = !!opts.info;
    m.classList.add('open');
    setTimeout(() => { if (ok) ok.focus(); }, 40);
    return new Promise(res => { askResolve = res; });
  }
  function closeAsk(result) {
    const m = $('#askModal');
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open');
    if (askResolve) { const r = askResolve; askResolve = null; r(!!result); }
  }

  function openDelete() {
    if (!session) return openAuth();
    $('#deleteInput').value = '';
    $('#deleteMsg').textContent = '';
    $('#deleteModal').classList.add('open');
    setTimeout(() => { const i = $('#deleteInput'); if (i) i.focus(); }, 40);
  }

  async function deleteAccount() {
    if (!session || !SB) return;
    if ($('#deleteInput').value.trim().toUpperCase() !== 'ELIMINAR') {
      $('#deleteMsg').textContent = 'Escribe ELIMINAR para confirmar.';
      return;
    }
    const btn = $('#deleteSubmit');
    btn.disabled = true;
    const { error } = await SB.rpc('delete_my_account');
    btn.disabled = false;
    if (error) { $('#deleteMsg').textContent = 'No se pudo eliminar la cuenta: ' + error.message; return; }
    try { await SB.auth.signOut(); } catch (e) { /* la sesión ya no es válida */ }
    session = null; profile = null; myConf = {}; confirmStats = {};
    store.groups = [];
    store.active = { comun: null, fem: null, mi: null };
    store.owner = null;
    state.reviewGroupId = null;
    save();
    $('#deleteModal').classList.remove('open');
    await loadConfirmationStats();
    applyBlockVisibility();
    setPage('inicio', { render: false });
    renderAuthUI();
    renderAttemptSelect();
    renderAll(false);
    toast('Tu cuenta y todos tus datos se han eliminado.', 'ok');
  }

  function openAuth(mode) {
    if (!HAS_CONFIG || !SB) {
      toast('Supabase no está disponible. Revisa config.js y vendor/supabase.js (ver README).', 'err');
      return;
    }
    setAuthMode(mode || 'login');
    $('#authMsg').textContent = '';
    $('#authModal').classList.add('open');
    setTimeout(() => { const e = $('#authEmail'); if (e) e.focus(); }, 40);
  }

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';
    const recover = mode === 'recover';
    const newpass = mode === 'newpass';
    document.querySelectorAll('[data-auth]').forEach(t => t.classList.toggle('on', t.dataset.auth === mode));
    $('#authTabs').hidden = recover || newpass;
    $('#authTitle').textContent = { login: 'Iniciar sesión', signup: 'Crear cuenta', recover: 'Recuperar contraseña', newpass: 'Nueva contraseña' }[mode];
    $('#authSubmit').textContent = { login: 'Entrar', signup: 'Crear cuenta', recover: 'Enviar enlace', newpass: 'Guardar contraseña' }[mode];
    $('#nameField').hidden = !signup;
    $('#termsField').hidden = !signup;
    $('#termsBox').hidden = !signup;
    $('#termsBox').open = signup;
    $('#blocksPickField').hidden = !signup;
    if (signup) document.querySelectorAll('input[name="signupBlock"]').forEach(i => { i.checked = true; });
    if (!signup) {
      $('#authTerms').checked = false;
      $('#termsBox').open = false;
    }
    $('#emailField').hidden = newpass;
    $('#authEmail').required = !newpass;
    $('#passField').hidden = recover;
    $('#authPass').required = !recover;
    $('#authPassLabel').textContent = newpass ? 'Nueva contraseña' : 'Contraseña';
    $('#authPass').autocomplete = signup || newpass ? 'new-password' : 'current-password';
    $('#forgotBtn').hidden = mode !== 'login';
    $('#backLoginBtn').hidden = !recover;
    $('#authMsg').textContent = '';
    $('#authMsg').className = 'auth-msg';
  }

  function setAuthMsg(msg, cls) {
    const n = $('#authMsg');
    n.textContent = msg || '';
    n.className = 'auth-msg' + (cls ? ' ' + cls : '');
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    if (!SB) return;
    const email = $('#authEmail').value.trim();
    const pass = $('#authPass').value;
    const name = $('#authName').value.trim();
    if (authMode === 'signup' && !$('#authTerms').checked) {
      setAuthMsg('Para crear la cuenta tienes que aceptar las condiciones de uso y la política de datos.', 'err');
      return;
    }
    const btn = $('#authSubmit');
    btn.disabled = true;
    setAuthMsg('');
    try {
      if (authMode === 'recover') {
        const { error } = await SB.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname
        });
        if (error) throw error;
        setAuthMsg('Si existe una cuenta con ese email, te hemos enviado un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.', 'ok');
      } else if (authMode === 'newpass') {
        const { error } = await SB.auth.updateUser({ password: pass });
        if (error) throw error;
        $('#authModal').classList.remove('open');
        toast('Contraseña actualizada. Ya puedes seguir practicando.', 'ok');
      } else if (authMode === 'signup') {
        if (!$('#termsBox').open) $('#termsBox').open = true;
        const blocks = [...document.querySelectorAll('input[name="signupBlock"]:checked')].map(i => i.value);
        const { data, error } = await SB.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              display_name: name || email.split('@')[0],
              blocks,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '2026-11'
            }
          }
        });
        if (error) throw error;
        if (data.session) {
          $('#authModal').classList.remove('open');
          toast('Cuenta creada. ¡Bienvenido!', 'ok');
          if (state.page === 'inicio') setPage('preguntas', { push: true });
        } else {
          setAuthMsg('Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.', 'ok');
        }
      } else {
        const { error } = await SB.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        $('#authModal').classList.remove('open');
        toast('Sesión iniciada', 'ok');
        if (state.page === 'inicio') setPage('preguntas', { push: true });
      }
    } catch (err) {
      setAuthMsg(authError(err), 'err');
    } finally {
      btn.disabled = false;
    }
  }

  // ============================================================
  //  Confirmaciones
  // ============================================================
  async function confirmAnswer(uid) {
    if (!session) return openAuth();
    const { error } = await SB.from('confirmations').upsert({
      user_id: session.user.id,
      question_uid: uid,
      is_correct: true,
      suggested_answer: null,
      comment: null
    }, { onConflict: 'question_uid,user_id' });
    if (error) { toast('No se pudo guardar la confirmación: ' + error.message, 'err'); return; }
    toast('Respuesta confirmada. ¡Gracias!', 'ok');
    await Promise.all([loadConfirmationStats(), loadMyConfirmations()]);
    renderAll(true);
  }

  async function withdrawConfirmation(uid) {
    if (!session) return;
    const { error } = await SB.from('confirmations').delete()
      .eq('question_uid', uid).eq('user_id', session.user.id);
    if (error) { toast('No se pudo retirar: ' + error.message, 'err'); return; }
    toast('Confirmación retirada', 'ok');
    await Promise.all([loadConfirmationStats(), loadMyConfirmations()]);
    renderAll(true);
  }

  function openDispute(uid) {
    if (!session) return openAuth();
    const q = questions[uid];
    if (!q) return;
    disputeUid = uid;
    $('#disputeQ').innerHTML = `<b>Pregunta ${q.numero}.</b> ${esc(q.pregunta)}`;
    $('#disputeOpts').innerHTML = Object.entries(q.opciones).map(([k, v]) =>
      `<label class="disopt"><input type="radio" name="disopt" value="${k}"><span><b>${k})</b> ${esc(v)}</span></label>`
    ).join('');
    $('#disputeComment').value = '';
    $('#disputeMsg').textContent = '';
    $('#disputeModal').classList.add('open');
  }

  async function submitDispute() {
    if (!session || !disputeUid) return;
    const picked = document.querySelector('input[name="disopt"]:checked');
    if (!picked) { $('#disputeMsg').textContent = 'Selecciona la opción que crees que es correcta.'; return; }
    const comment = $('#disputeComment').value.trim() || null;
    const btn = $('#disputeSubmit');
    btn.disabled = true;
    const { error } = await SB.from('confirmations').upsert({
      user_id: session.user.id,
      question_uid: disputeUid,
      is_correct: false,
      suggested_answer: picked.value,
      comment
    }, { onConflict: 'question_uid,user_id' });
    btn.disabled = false;
    if (error) { $('#disputeMsg').textContent = 'No se pudo guardar: ' + error.message; return; }
    $('#disputeModal').classList.remove('open');
    toast('Gracias. Tu corrección queda registrada para revisión.', 'ok');
    await Promise.all([loadConfirmationStats(), loadMyConfirmations()]);
    renderAll(true);
  }

  function confirmBadges(q) {
    const st = confirmStats[q.uid] || {};
    const n = st.confirms || 0;
    const d = st.disputes || 0;
    const mine = myConf[q.uid];
    let html = '';
    if (n > 0) {
      html += `<span class="tag conf-ok" title="${esc(`Confirmada por ${n} usuario(s)`)}">&#10003; Confirmada por ${n} usuario${n === 1 ? '' : 's'}</span>`;
    } else {
      html += '<span class="tag conf-none">Sin confirmar</span>';
    }
    if (d > 0) {
      html += `<span class="tag conf-bad" title="${esc(d + ' usuario(s) creen que la respuesta es incorrecta')}">&#9888; ${d} en desacuerdo</span>`;
    }
    if (mine && mine.is_correct) html += '<span class="tag conf-me">Tu confirmación</span>';
    return html;
  }

  function confirmRow(q) {
    if (!HAS_CONFIG) return '';
    const st = confirmStats[q.uid] || {};
    const mine = myConf[q.uid];
    if (!session) {
      return `<div class="confirm-row">
        <span class="confirm-hint">Inicia sesión para confirmar si esta respuesta es correcta.</span>
        <button class="btn" type="button" data-auth-open="1">Iniciar sesión</button>
      </div>`;
    }
    if (mine && mine.is_correct) {
      return `<div class="confirm-row">
        <span class="confirm-done">&#10003; Has confirmado esta respuesta como correcta</span>
        <button class="btn ghost" type="button" data-unconfirm="${q.uid}">Retirar</button>
      </div>`;
    }
    if (mine && !mine.is_correct) {
      return `<div class="confirm-row">
        <span class="confirm-done bad">&#9888; Has indicado que la respuesta correcta es <b>${esc(mine.suggested_answer || '?')})</b></span>
        <button class="btn ghost" type="button" data-unconfirm="${q.uid}">Retirar</button>
      </div>`;
    }
    const count = st.confirms ? `<span class="confirm-count">${st.confirms} confirmación${st.confirms === 1 ? '' : 'es'} de otros usuarios</span>` : '';
    return `<div class="confirm-row">
      <button class="btn confirm" type="button" data-confirm="${q.uid}">&#10003; Confirmar respuesta correcta</button>
      <button class="btn ghost" type="button" data-dispute="${q.uid}">No es correcta</button>
      ${count}
    </div>`;
  }

  // ============================================================
  //  Lista lateral y filtros
  // ============================================================
  function matchesFilters(unit) {
    const st = state;
    if (st.topic !== 'all') {
      const topics = new Set(unit.questions.map(topicOf));
      if (!topics.has(st.topic)) return false;
    }
    if (st.status !== 'all') {
      const has = unit.questions.some(q => {
        const a = viewAnswers()[q.uid];
        if (st.status === 'pending') return !a;
        if (st.status === 'wrong') return a && !a.ok;
        if (st.status === 'right') return a && a.ok;
        return true;
      });
      if (!has) return false;
    }
    if (st.conf !== 'all') {
      const has = unit.questions.some(q => {
        const c = q.confidence || 0;
        if (st.conf === 'hi') return c >= 80;
        if (st.conf === 'mid') return c >= 60 && c < 80;
        return c < 60;
      });
      if (!has) return false;
    }
    if (st.text.trim()) {
      const t = norm(st.text);
      let hay = unit.questions.map(q =>
        norm(String(q.numero)) + ' ' + norm(q.pregunta) + ' ' +
        Object.values(q.opciones || {}).map(norm).join(' ') + ' ' + norm(q.tema || '')
      ).join(' ');
      if (unit.type === 'case') hay += ' ' + norm(cases[unit.key].contexto);
      if (!hay.includes(t)) return false;
    }
    return true;
  }

  function poolUnits() {
    let base = unitsFor(state.bat);
    const rg = reviewGroup();
    if (rg) {
      base = base.map(u => {
        const qs = u.questions.filter(q => rg.answers[q.uid]);
        if (!qs.length) return null;
        return Object.assign({}, u, { questions: qs, reviewTotal: u.questions.length });
      }).filter(Boolean);
    }
    let arr = base.filter(matchesFilters);
    if (state.shuffle) {
      const pos = new Map(state.shuffle.map((u, i) => [u, i]));
      arr = arr.slice().sort((a, b) => {
        const pa = pos.has(unitKey(a)) ? pos.get(unitKey(a)) : 1e9;
        const pb = pos.has(unitKey(b)) ? pos.get(unitKey(b)) : 1e9;
        return pa - pb;
      });
    }
    return arr;
  }

  function currentUnitKey() {
    return state.view === 'case' ? 'case-' + state.caseId : state.uid;
  }

  function stats() {
    const all = Object.values(questions).filter(q => q.bat === state.bat);
    let done = 0, ok = 0;
    const ans = viewAnswers();
    for (const q of all) { const a = ans[q.uid]; if (a) { done++; if (a.ok) ok++; } }
    return { total: all.length, done, ok };
  }

  function updateStats() {
    const s = stats();
    $('#statDone').textContent = s.done + '/' + s.total;
    $('#statOK').textContent = s.done ? Math.round(s.ok * 100 / s.done) + '%' : '0%';
    $('#bar').style.width = (s.done * 100 / s.total) + '%';
  }

  function collapsePicker() {
    if (window.innerWidth >= 900) return;
    const pick = $('#asideQuestions');
    if (pick && pick.open !== undefined) pick.open = false;
  }

  function renderList() {
    const arr = poolUnits();
    const ans = viewAnswers();
    const rg = reviewGroup();
    const box = $('#qlist');
    box.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const u of arr) {
      const cur = unitKey(u) === currentUnitKey();
      if (u.type === 'case') {
        const total = rg ? (u.reviewTotal || u.questions.length) : u.questions.length;
        const answered = rg ? u.questions.length : u.questions.filter(q => ans[q.uid]).length;
        const anyDone = answered > 0;
        const anyWrong = u.questions.some(q => { const a = ans[q.uid]; return a && !a.ok; });
        const allDone = !rg && answered === total;
        const allCorrect = allDone && !anyWrong;
        const allConf = u.questions.every(q => (confirmStats[q.uid] || {}).confirms > 0);
        const stateCls = rg
          ? (anyWrong ? ' bad' : ' ok')
          : (allDone ? (allCorrect ? ' ok' : ' bad') : (anyWrong ? ' bad' : ''));
        const dotCls = rg || allDone || anyWrong ? '' : (anyDone ? ' part' : '');
        const b = el('button', 'qitem caseitem' + stateCls + (cur ? ' cur' : ''));
        b.innerHTML = `<span class="dot${dotCls}"></span>` +
          `<span class="casename">Caso ${u.id}</span><small>${u.desde}&ndash;${u.hasta}</small>` +
          (allConf ? '<span class="confmark" title="Todas las preguntas confirmadas">&#10003;</span>' : '');
        b.title = `Caso clínico ${u.id} · preguntas ${u.desde}-${u.hasta}` +
          (rg ? ` · ${answered}/${total} en este intento` : (answered ? ` · ${answered}/${total} respondidas` : '')) +
          (anyWrong ? ' · con fallos' : '');
        b.onclick = () => { goUnit(u); closeSidebar(true); collapsePicker(); };
        frag.appendChild(b);
      } else {
        const q = u.questions[0];
        const a = ans[q.uid];
        const confirmed = (confirmStats[q.uid] || {}).confirms > 0;
        const b = el('button', 'qitem' + (a ? (a.ok ? ' ok' : ' bad') : '') + (cur ? ' cur' : '') + (confirmed ? ' confirmed' : ''));
        b.innerHTML = `<span class="dot"></span>${q.numero}`;
        b.title = q.pregunta.slice(0, 90) + (confirmed ? ' · Respuesta confirmada' : '');
        b.onclick = () => { go(q.uid); closeSidebar(true); collapsePicker(); };
        frag.appendChild(b);
      }
    }
    box.appendChild(frag);
    const totalQ = arr.reduce((n, u) => n + u.questions.length, 0);
    const nCases = arr.filter(u => u.type === 'case').length;
    $('#viewCount').textContent = totalQ + ' pregunta' + (totalQ === 1 ? '' : 's') +
      (rg ? ' en este intento' : (nCases ? ' · ' + nCases + ' caso' + (nCases === 1 ? '' : 's') : ''));
    const cur = box.querySelector('.cur');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  // ============================================================
  //  Tarjeta principal
  // ============================================================
  function confidenceBadge(c) {
    const cls = c >= 80 ? 'conf-hi' : c >= 60 ? 'conf-mid' : 'conf-low';
    return `<span class="tag ${cls}">Seguridad ${c}%</span>`;
  }

  function sourceHtml(q) {
    const s = q.source || {};
    if (!s.documento && !s.extracto) return '';
    const refDiff = s.referencia && s.referencia !== s.documento;
    const qq = encodeURIComponent((s.documento || '') + ' ' + (s.referencia || ''));
    const esGuia = /bib\.\s*(8|11|12)\b/.test(s.documento || '');
    const searchUrl = 'https://www.google.com/search?q=' + qq + (esGuia ? '' : '&tbm=bks');
    return `<div class="source show">
      <h4>Dónde está la respuesta</h4>
      <div class="doc">${esc(s.documento || '')}</div>
      ${refDiff ? `<div class="ref">${esc(s.referencia)}</div>` : ''}
      ${s.extracto ? `<blockquote>${esc(s.extracto)}</blockquote>` : ''}
      ${s.linea ? `<div class="lines">Archivo: ${esc(s.texto || s.archivo || '')} &middot; línea ${s.linea}${s.linea_fin && s.linea_fin !== s.linea ? '&ndash;' + s.linea_fin : ''}</div>` : ''}
      <div class="src-actions">
        ${s.visor ? `<a class="btn" href="${esc(s.visor)}" target="_blank" rel="noopener">Abrir texto${s.linea ? ' (línea ' + s.linea + ')' : ''}</a>` : ''}
        ${s.pdf ? `<a class="btn" href="${esc(s.pdf)}" target="_blank" rel="noopener">Abrir PDF</a>` : ''}
        ${s.url ? `<a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.urlLabel || 'Consultar fuente')}</a>` : (!s.disponible ? `<a class="btn" href="${searchUrl}" target="_blank" rel="noopener">Buscar esta referencia</a>` : '')}
      </div>
      ${!s.disponible ? '<div class="lines">El texto completo no está disponible en local: es un libro o recurso con copyright. Se indica la referencia y el tema donde se encuentra.</div>' : ''}
      ${(q.confidence || 0) < 60 ? '<div class="lines">&#9888; Respuesta de baja seguridad: conviene verificarla en la fuente original.</div>' : ''}
    </div>`;
  }

  function questionCopyText(q) {
    const lines = [];
    lines.push('Pregunta ' + q.numero + (q.tema ? ' · ' + q.tema : ''));
    if (q.caso != null) lines.push('Caso clínico ' + q.caso);
    if (q.contexto) { lines.push(''); lines.push(String(q.contexto).trim()); }
    lines.push('');
    lines.push(String(q.pregunta || '').trim());
    lines.push('');
    for (const [k, v] of Object.entries(q.opciones || {})) lines.push(k + ') ' + v);
    return lines.join('\n');
  }

  function correctionNotice(q) {
    const o = overrides[q.uid];
    if (!o) return '';
    const oldK = o.previous_answer;
    const newK = o.answer;
    const oldTxt = oldK && q.opciones ? q.opciones[oldK] : null;
    const newTxt = newK && q.opciones ? q.opciones[newK] : null;
    return `<div class="correction-notice">
      <b class="title">Respuesta modificada</b>
      <div class="row old">Antes: <b>${oldK ? esc(oldK) + ')' : '—'}</b> ${oldTxt ? esc(oldTxt) : ''}</div>
      <div class="row new">Ahora: <b>${newK ? esc(newK) + ')' : '—'}</b> ${newTxt ? esc(newTxt) : ''}</div>
      ${o.updated_at ? `<div class="date">Fecha del cambio: ${esc(fmtDate(o.updated_at))}</div>` : ''}
    </div>`;
  }

  function questionHtml(q, opts) {
    opts = opts || {};
    const a = viewAnswers()[q.uid];
    const review = !!reviewGroup();
    const entries = Object.entries(q.opciones || {});
    let html = `<div class="qhead">
      <span class="num">Pregunta ${q.numero}</span>
      ${opts.caseView ? '' : `<span class="tag">${esc(topicOf(q))}</span>`}
      ${confirmBadges(q)}
      ${!q.answer ? '<span class="tag conf-bad">Sin respuesta válida</span>' : ''}
      ${review && !a
        ? '<span class="tag conf-none">No respondida en este intento</span>'
        : (a ? confidenceBadge(q.confidence || 0) : '<span class="tag">Respuesta deducida · no oficial</span>')}
      <button class="btn q-copy" type="button" data-copy-question="${q.uid}" title="Copiar la pregunta y sus opciones">Copiar</button>
    </div>
    ${correctionNotice(q)}`;

    if (q.contexto && !opts.caseView) {
      html += `<div class="case">
        <div class="case-top"><b>Caso clínico ${q.caso || ''}</b><button class="btn case-copy" type="button" data-copy-case="1">Copiar</button></div>
        <div class="txt">${esc(q.contexto)}</div>
      </div>`;
    }
    html += `<h2 class="question">${esc(q.pregunta)}</h2>`;
    if (!q.answer) {
      html += `<div class="notes">${esc(q.notas || 'Pregunta defectuosa: no tiene una respuesta correcta validada.')} No se puede responder hasta que un administrador establezca la respuesta correcta.</div>`;
    }
    html += '<div class="options">' + entries.map(([k, v]) => {
      let cls = 'opt';
      if (a) {
        if (k === q.answer) cls += ' correct';
        else if (k === a.pick) cls += ' wrong';
        else cls += ' dim';
      }
      return `<button class="${cls}" type="button" data-k="${k}" data-uid="${q.uid}" ${(a || review || !q.answer) ? 'disabled' : ''}><span class="k">${k}</span><span class="t">${esc(v)}</span></button>`;
    }).join('') + '</div>';

    if (a) {
      const ok = a.pick === q.answer;
      html += `<div class="feedback show ${ok ? 'ok' : 'bad'}">${ok ? '&#10003; Correcto' : '&#10007; Incorrecto'}
        <small>Tu respuesta: <b>${esc(a.pick)})</b> ${esc(q.opciones[a.pick] || '')} &middot;
        Correcta: <b>${String(q.answer).toLowerCase()})</b> ${esc(q.opciones[q.answer])}</small></div>`;
      html += sourceHtml(q);
      if (q.notas) html += `<div class="notes">${esc(q.notas)}</div>`;
    } else if (review) {
      html += '<div class="notes">Esta pregunta no se respondió en este intento.</div>';
    }
    if (!review && q.answer) html += confirmRow(q);
    return html;
  }

  function navHtml() {
    const arr = poolUnits();
    const key = currentUnitKey();
    const idx = arr.findIndex(u => unitKey(u) === key);
    const cur = idx >= 0 ? arr[idx] : null;
    const label = cur && cur.type === 'case'
      ? `Caso ${cur.id} · preguntas ${cur.desde}&ndash;${cur.hasta}`
      : '';
    return `<div class="nav">
      <button class="btn" id="prevBtn" type="button" ${idx <= 0 ? 'disabled' : ''}>&larr; Anterior</button>
      <span class="mid">${idx >= 0 ? (idx + 1) + ' de ' + arr.length : ''}${label ? ' &middot; ' + label : ''}</span>
      <button class="btn primary" id="nextBtn" type="button" ${idx < 0 || idx >= arr.length - 1 ? 'disabled' : ''}>Siguiente &rarr;</button>
    </div>`;
  }

  function caseHtml(c) {
    const rg = reviewGroup();
    const ans = viewAnswers();
    const qs = rg ? c.questions.filter(q => ans[q.uid]) : c.questions;
    const answered = qs.filter(q => ans[q.uid]).length;
    const confirmed = qs.filter(q => (confirmStats[q.uid] || {}).confirms > 0).length;
    let html = `<div class="case-head">
      <span class="num">Caso clínico ${c.id}</span>
      <span class="tag">Preguntas ${c.desde}&ndash;${c.hasta}</span>
      <span class="tag">${rg ? `${answered} de ${c.questions.length} en este intento` : `${answered}/${c.questions.length} respondidas`}</span>
      <span class="tag ${confirmed ? 'conf-ok' : 'conf-none'}">${confirmed ? '&#10003; ' + confirmed + ' confirmada' + (confirmed === 1 ? '' : 's') : 'Sin confirmar'}</span>
    </div>`;
    if (c.contexto) {
      html += `<div class="case case-full">
        <div class="case-top"><b>Enunciado del caso</b><button class="btn case-copy" type="button" data-copy-case="1">Copiar</button></div>
        <div class="txt">${esc(c.contexto)}</div>
      </div>`;
    }
    html += `<div class="case-progress">${rg
      ? 'Mostrando solo las preguntas respondidas en este intento.'
      : 'Responde a todas las preguntas del caso. Puedes confirmar cada respuesta por separado.'}</div>`;
    if (!qs.length) {
      html += '<div class="notes">No hay preguntas de este caso en este intento.</div>';
    } else {
      html += qs.map(q => `<section class="case-sub" data-uid="${q.uid}">${questionHtml(q, { caseView: true })}</section>`).join('');
    }
    html += navHtml();
    return html;
  }

  function renderCard(preserveScroll) {
    const y = preserveScroll ? window.scrollY : 0;
    const card = $('#card');
    if (state.view === 'case') {
      const c = cases[state.caseId];
      if (!c) { card.innerHTML = '<div class="empty">Caso clínico no encontrado.</div>'; return; }
      card.innerHTML = reviewBanner() + caseHtml(c);
    } else {
      const q = questions[state.uid];
      if (!q) {
        card.innerHTML = '<div class="empty">No hay preguntas con los filtros seleccionados.</div>';
        return;
      }
      card.innerHTML = reviewBanner() + questionHtml(q, { caseView: false }) + navHtml();
    }
    bindCard();
    if (preserveScroll) requestAnimationFrame(() => { try { window.scrollTo(0, y); } catch (e) { /* navegador sin scroll */ } });
  }

  function bindCard() {
    const card = $('#card');
    card.querySelectorAll('.opt').forEach(b => {
      b.onclick = () => answer(b.dataset.uid || state.uid, b.dataset.k);
    });
    card.querySelectorAll('[data-confirm]').forEach(b => { b.onclick = () => confirmAnswer(b.dataset.confirm); });
    card.querySelectorAll('[data-dispute]').forEach(b => { b.onclick = () => openDispute(b.dataset.dispute); });
    card.querySelectorAll('[data-unconfirm]').forEach(b => { b.onclick = () => withdrawConfirmation(b.dataset.unconfirm); });
    card.querySelectorAll('[data-auth-open]').forEach(b => { b.onclick = () => openAuth(); });
    const exitBtn = $('#exitReviewBtn');
    if (exitBtn) exitBtn.onclick = () => exitReview();
    card.querySelectorAll('[data-copy-case]').forEach(b => {
      b.onclick = () => {
        const box = b.closest('.case');
        const txt = box ? box.querySelector('.txt') : null;
        copyText(txt ? (txt.innerText || txt.textContent || '') : '');
      };
    });
    card.querySelectorAll('[data-copy-question]').forEach(b => {
      b.onclick = () => {
        const q = questions[b.dataset.copyQuestion];
        if (q) copyText(questionCopyText(q));
      };
    });
    const prev = $('#prevBtn'), next = $('#nextBtn');
    if (prev) prev.onclick = () => jump(-1);
    if (next) next.onclick = () => jump(1);
  }

  function renderAll(preserveScroll) {
    renderCard(preserveScroll);
    renderList();
    updateStats();
    renderCrumbs();
  }

  // ============================================================
  //  Páginas, menú lateral y migas de pan
  // ============================================================
  const PAGES = ['inicio', 'preguntas', 'bibliografia', 'ranking', 'admin'];

  function renderHome() {
    $('#homeBats').innerHTML = BAT_KEYS.map(k =>
      `<li><b>${esc(BATS[k].label)}</b> · ${esc(BATS[k].sub)}</li>`
    ).join('');
    const guest = !session && HAS_CONFIG;
    $('#homeSignup').hidden = !guest;
    $('#homeLogin').hidden = !guest;
  }

  function renderCrumbs() {
    const box = $('#crumbs');
    if (!box) return;
    const sep = '<span class="sep">/</span>';
    const home = '<button type="button" data-page="inicio">Inicio</button>';
    let html = home;
    if (state.page === 'bibliografia') {
      html += sep + '<span aria-current="page">Bibliografía</span>';
    } else if (state.page === 'ranking') {
      html += sep + '<span aria-current="page">Preguntas más falladas</span>';
    } else if (state.page === 'admin') {
      html += sep + '<span aria-current="page">Administración</span>';
    } else {
      let current = 'Preguntas';
      if (state.view === 'case') {
        const c = cases[state.caseId];
        current = 'Caso clínico ' + (c ? c.id : state.caseId);
      } else {
        const q = questions[state.uid];
        if (q) current = 'Pregunta ' + q.numero;
      }
      html += sep + '<button type="button" data-page="preguntas">Preguntas</button>' +
        sep + `<span aria-current="page">${esc(current)}</span>`;
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-page]').forEach(b => {
      b.onclick = () => setPage(b.dataset.page);
    });
  }

  function setPage(page, opts) {
    opts = opts || {};
    if (!PAGES.includes(page)) page = 'preguntas';
    if (page === 'admin' && !canAdmin()) {
      page = 'preguntas';
      opts.skipHash = false;
      toast('El panel de administración solo está disponible para administradores.', 'err');
    }
    state.page = page;
    const onQuestions = page === 'preguntas';
    document.body.classList.toggle('page-preguntas', onQuestions);
    $('#pageHome').hidden = page !== 'inicio';
    $('#pageQuestions').hidden = !onQuestions;
    $('#pageBib').hidden = page !== 'bibliografia';
    $('#pageRanking').hidden = page !== 'ranking';
    $('#pageAdmin').hidden = page !== 'admin';
    $('#asideQuestions').hidden = !onQuestions;
    document.querySelectorAll('.mm-item').forEach(b => {
      const on = b.dataset.page === page;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    renderCrumbs();
    closeSidebar();
    if (!opts.skipHash) {
      const hash = onQuestions ? (state.uid ? '#' + state.uid : '') : '#/' + page;
      try {
        if (opts.push) history.pushState(null, '', hash);
        else history.replaceState(null, '', hash);
      } catch (e) { /* file:// */ }
    }
    if (page === 'bibliografia') renderBib($('#bibSearch').value || '');
    else if (page === 'ranking') openStats();
    else if (page === 'admin') openAdmin();
    else if (page === 'inicio') renderHome();
    else if (opts.render !== false) renderAll(false);
  }

  // ============================================================
  //  Navegación / respuestas
  // ============================================================
  function answer(uid, letter) {
    const q = questions[uid];
    if (!q || !q.answer || state.reviewGroupId) return;
    const g = ensureActiveGroup(q.bat);
    if (g.answers[uid]) return;
    const ts = Date.now();
    const isCorrect = letter === q.answer;
    g.answers[uid] = { pick: letter, ok: isCorrect, ts };
    save();
    if (SB && session) {
      const row = {
        group_id: g.id,
        user_id: session.user.id,
        question_uid: uid,
        pick: letter,
        is_correct: isCorrect,
        answered_at: new Date(ts).toISOString()
      };
      (async () => {
        // Aseguramos el intento antes de insertar la respuesta (FK).
        const { error: e1 } = await SB.from('attempt_groups').upsert({
          id: g.id,
          user_id: session.user.id,
          battery: g.battery,
          name: g.name,
          created_at: g.created_at
        }, { onConflict: 'id' });
        if (e1) { console.warn('[intentos]', e1.message); return; }
        const { error: e2 } = await SB.from('attempts').upsert(row, { onConflict: 'group_id,question_uid' });
        if (e2) console.warn('[intentos]', e2.message);
      })();
    }
    renderAttemptSelect();
    renderAll(true);
  }

  function go(uid) {
    const q = questions[uid];
    if (!q) return;
    if (state.page !== 'preguntas') setPage('preguntas', { skipHash: true, render: false });
    state.uid = uid;
    if (q.caso != null) { state.view = 'case'; state.caseId = q.bat + ':' + q.caso; }
    else { state.view = 'q'; state.caseId = null; }
    try { history.replaceState(null, '', '#' + uid); } catch (e) { /* file:// */ }
    renderCard(false);
    renderList();
    renderCrumbs();
  }

  function goUnit(u) {
    if (!u) return;
    if (u.type === 'case') {
      const ans = viewAnswers();
      const pending = u.questions.find(q => !ans[q.uid]);
      go((pending || u.questions[0]).uid);
    } else {
      go(u.uid);
    }
  }

  function jump(d) {
    const arr = poolUnits();
    const idx = arr.findIndex(u => unitKey(u) === currentUnitKey());
    if (idx < 0) return;
    const n = arr[idx + d];
    if (n) goUnit(n);
  }

  let menuScrollY = 0;

  function openSidebar() {
    if (window.innerWidth > 900) return;
    menuScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = '-' + menuScrollY + 'px';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.classList.add('menu-open');
    $('#sidebar').classList.add('open');
    const backdrop = $('#navBackdrop');
    if (backdrop) backdrop.hidden = false;
  }

  function closeSidebar(resetScroll) {
    const wasLocked = document.body.style.position === 'fixed';
    $('#sidebar').classList.remove('open');
    const backdrop = $('#navBackdrop');
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    if (wasLocked) window.scrollTo(0, resetScroll ? 0 : menuScrollY);
  }

  // ============================================================
  //  Administración
  // ============================================================
  async function openAdmin() {
    if (!canAdmin()) return;
    adminTab = 'users';
    adminConfFilter = 'all';
    document.querySelectorAll('[data-admin]').forEach(t => t.classList.toggle('on', t.dataset.admin === 'users'));
    await renderAdmin();
  }

  async function renderAdmin() {
    const body = $('#adminBody');
    body.innerHTML = '<div class="empty">Cargando&hellip;</div>';
    if (!SB) return;
    if (adminTab === 'users') {
      const { data, error } = await SB.from('profiles')
        .select('id,email,display_name,role,created_at')
        .order('created_at', { ascending: true });
      if (error) { body.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
      const rows = (data || []).map(u => {
        const self = session && u.id === session.user.id;
        return `<tr>
          <td><div class="admin-name">${esc(u.display_name || '—')}</div><div class="admin-sub">${esc(u.email || '')}</div></td>
          <td>${fmtDate(u.created_at)}</td>
          <td>${self
            ? `<span class="pill">${esc(u.role)}</span>`
            : `<select data-role="${u.id}" data-old="${u.role}">
                 <option value="user" ${u.role === 'user' ? 'selected' : ''}>usuario</option>
                 <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
               </select>`}</td>
        </tr>`;
      }).join('');
      body.innerHTML = `<div class="table-wrap"><table class="admin">
        <thead><tr><th>Usuario</th><th>Alta</th><th>Rol</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="empty-row">Sin usuarios</td></tr>'}</tbody>
      </table></div>`;
      body.querySelectorAll('select[data-role]').forEach(sel => {
        sel.onchange = async () => {
          const id = sel.dataset.role;
          const role = sel.value;
          sel.disabled = true;
          const { error: e } = await SB.from('profiles').update({ role }).eq('id', id);
          sel.disabled = false;
          if (e) { sel.value = sel.dataset.old; toast('No se pudo cambiar el rol: ' + e.message, 'err'); return; }
          sel.dataset.old = role;
          toast('Rol actualizado', 'ok');
          if (session && id === session.user.id) { await loadProfile(); renderAuthUI(); }
        };
      });
    } else {
      const confRes = await SB.from('confirmations')
        .select('id,question_uid,is_correct,suggested_answer,comment,created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (confRes.error) { body.innerHTML = `<div class="empty">Error: ${esc(confRes.error.message)}</div>`; return; }
      const groups = new Map();
      for (const r of confRes.data || []) {
        const g = groups.get(r.question_uid) || { uid: r.question_uid, confirms: 0, disputes: 0, proposals: {}, comments: [], last: r.created_at };
        if (r.is_correct) {
          g.confirms += 1;
        } else {
          g.disputes += 1;
          if (r.suggested_answer) g.proposals[r.suggested_answer] = (g.proposals[r.suggested_answer] || 0) + 1;
          if (r.comment) g.comments.push({ id: r.id, text: r.comment });
        }
        groups.set(r.question_uid, g);
      }
      const all = [...groups.values()];
      const confs = all.filter(g => g.confirms > 0).length;
      const disc = all.filter(g => g.disputes > 0).length;
      const filtered = adminConfFilter === 'disputes'
        ? all.filter(g => g.disputes > 0)
        : adminConfFilter === 'confirms'
          ? all.filter(g => g.confirms > 0)
          : all;
      const rows = filtered.map(g => {
        const q = questions[g.uid];
        const actual = q ? q.answer : null;
        const actualText = q && q.opciones ? q.opciones[actual] : '';
        const proposals = Object.entries(g.proposals).sort((a, b) => b[1] - a[1]);
        const newAns = proposals.length ? proposals[0][0] : (actual || 'a');
        const qText = q ? q.pregunta : g.uid;
        const editor = (g.disputes > 0 && q)
          ? `<div class="correct-editor">
               <select data-new-answer="${g.uid}" aria-label="Nueva respuesta correcta">
                 ${['a', 'b', 'c', 'd'].map(k => `<option value="${k}"${k === newAns ? ' selected' : ''}>${k}) ${esc(String(q.opciones[k] || '').slice(0, 55))}</option>`).join('')}
               </select>
               <button class="btn primary" type="button" data-apply-answer="${g.uid}">Aplicar</button>
             </div>`
          : '—';
        const corrected = overrides[g.uid] ? ' <span class="pill">corregida</span>' : '';
        const propHtml = proposals.length
          ? proposals.map(([k, n]) => `<div><b>${esc(k)})</b> ${n} persona${n === 1 ? '' : 's'}</div>`).join('')
          : '—';
        const comHtml = g.comments.length
          ? g.comments.map(c => `<div class="comment-item"><span>${esc(c.text)}</span><button class="btn" type="button" data-delconf="${c.id}">Eliminar</button></div>`).join('')
          : '—';
        return `<tr>
          <td><div class="admin-name">${q ? 'Pregunta ' + q.numero : esc(g.uid)}</div><div class="admin-sub">${esc(qText.slice(0, 90))}${qText.length > 90 ? '…' : ''}</div></td>
          <td>${actual ? `<b>${esc(actual)})</b> ${esc(actualText || '')}${corrected}` : '—'}</td>
          <td>${g.confirms ? `<span class="tag conf-ok">${g.confirms} persona${g.confirms === 1 ? '' : 's'}</span>` : '—'}</td>
          <td>${g.disputes ? `<span class="tag conf-bad">${g.disputes} persona${g.disputes === 1 ? '' : 's'}</span>` : '—'}</td>
          <td>${propHtml}</td>
          <td class="admin-comment">${comHtml}</td>
          <td>${fmtDate(g.last)}</td>
          <td>${editor}</td>
          <td><div class="admin-actions">
            <button class="btn" type="button" data-open-q="${g.uid}">Ver pregunta</button>
          </div></td>
        </tr>`;
      }).join('');
      const emptyMsg = adminConfFilter === 'disputes'
        ? 'No hay discrepancias pendientes'
        : adminConfFilter === 'confirms'
          ? 'No hay confirmaciones'
          : 'Sin confirmaciones todavía';
      body.innerHTML = `<div class="stats-note">Una fila por pregunta. Las columnas indican cuántas personas confirman o discrepan y qué opción proponen. Las discrepancias no cambian la respuesta automáticamente: si procede, elige la respuesta correcta en <b>Corregir</b> y pulsa <b>Aplicar</b>. El cambio se guarda para todos los usuarios.</div>
        <div class="admin-filter">
          <button class="tab${adminConfFilter === 'all' ? ' on' : ''}" type="button" data-conf-filter="all">Todas (${all.length})</button>
          <button class="tab${adminConfFilter === 'disputes' ? ' on' : ''}" type="button" data-conf-filter="disputes">Discrepancias (${disc})</button>
          <button class="tab${adminConfFilter === 'confirms' ? ' on' : ''}" type="button" data-conf-filter="confirms">Confirmaciones (${confs})</button>
        </div>
        <div class="table-wrap"><table class="admin">
        <thead><tr><th>Pregunta</th><th>Respuesta actual</th><th>Confirman</th><th>Discrepan</th><th>Opciones propuestas</th><th>Comentarios</th><th>Última</th><th>Corregir</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9" class="empty-row">${emptyMsg}</td></tr>`}</tbody>
      </table></div>`;
      body.querySelectorAll('[data-conf-filter]').forEach(b => {
        b.onclick = () => {
          adminConfFilter = b.dataset.confFilter;
          renderAdmin();
        };
      });
      body.querySelectorAll('[data-open-q]').forEach(b => {
        b.onclick = () => {
          goToStatQuestion(b.dataset.openQ);
        };
      });
      body.querySelectorAll('[data-apply-answer]').forEach(b => {
        b.onclick = () => {
          const uid = b.dataset.applyAnswer;
          const sel = body.querySelector('select[data-new-answer="' + uid + '"]');
          applyAnswerCorrection(uid, sel ? sel.value : null);
        };
      });
      body.querySelectorAll('[data-delconf]').forEach(b => {
        b.onclick = async () => {
          const ok = await openAsk({ title: 'Eliminar confirmación', text: '¿Eliminar esta confirmación?', okText: 'Eliminar', danger: true });
          if (!ok) return;
          const { error: e } = await SB.from('confirmations').delete().eq('id', b.dataset.delconf);
          if (e) { toast('No se pudo eliminar: ' + e.message, 'err'); return; }
          toast('Confirmación eliminada', 'ok');
          await loadConfirmationStats();
          renderAll(true);
          renderAdmin();
        };
      });
    }
  }

  // ============================================================
  //  Ranking de preguntas más falladas
  // ============================================================
  function computeMyFailureStats() {
    const map = {};
    for (const g of store.groups) {
      for (const [uid, a] of Object.entries(g.answers || {})) {
        if (!questions[uid]) continue;
        const m = map[uid] || (map[uid] = { question_uid: uid, attempts: 0, failures: 0 });
        m.attempts += 1;
        if (!a.ok) m.failures += 1;
      }
    }
    return Object.values(map).map(m => Object.assign({}, m, {
      failure_rate: m.attempts ? Math.round(m.failures * 1000 / m.attempts) / 10 : 0
    }));
  }

  function renderFailureStats(rows, sourceLabel) {
    const body = $('#statsBody');
    if (!rows.length) {
      body.innerHTML = '<div class="empty">Todavía no hay preguntas falladas registradas.</div>';
      return;
    }
    const maxFail = Math.max.apply(null, rows.map(r => r.failures).concat([1]));
    let html = `<div class="stats-note">${esc(sourceLabel)} &middot; ordenado por número de fallos. Pulsa una pregunta para abrirla.</div><div class="fail-list">`;
    rows.forEach((r, i) => {
      const q = questions[r.question_uid];
      if (!q) return;
      const rate = Number(r.failure_rate) || 0;
      const batLabel = q.bat === 'comun' ? 'Común' : q.bat === 'mi' ? 'MI' : 'INF';
      const caseLabel = q.caso != null ? ` &middot; Caso ${q.caso}` : '';
      const width = Math.max(4, Math.round(r.failures * 100 / maxFail));
      const text = q.pregunta.length > 160 ? q.pregunta.slice(0, 160) + '…' : q.pregunta;
      html += `<button class="fail-row" type="button" data-uid="${r.question_uid}">
        <span class="fail-rank">${i + 1}</span>
        <span class="fail-main">
          <span class="fail-q"><b>${q.numero}.</b> ${esc(text)}</span>
          <span class="fail-meta">${batLabel}${caseLabel} &middot; ${r.failures} fallo${r.failures === 1 ? '' : 's'} de ${r.attempts} intento${r.attempts === 1 ? '' : 's'}</span>
        </span>
        <span class="fail-rate"><b>${rate}%</b><span class="fail-bar"><i style="width:${width}%"></i></span></span>
      </button>`;
    });
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.fail-row').forEach(btn => {
      btn.onclick = () => {
        goToStatQuestion(btn.dataset.uid);
      };
    });
  }

  async function loadFailureStats() {
    const body = $('#statsBody');
    if (!session) {
      body.innerHTML = '<div class="empty">Entra en tu cuenta para ver tus preguntas falladas.<br><button class="btn" id="statsLogin" type="button">Entrar</button></div>';
      const b = $('#statsLogin');
      if (b) b.onclick = () => openAuth('login');
      return;
    }
    body.innerHTML = '<div class="empty">Cargando&hellip;</div>';
    const source = 'Tus intentos';
    let rows = computeMyFailureStats();
    const allowed = allowedBats();
    rows = rows.filter(r => questions[r.question_uid] && allowed.includes(questions[r.question_uid].bat));
    if (statsBat !== 'all') {
      rows = rows.filter(r => questions[r.question_uid] && questions[r.question_uid].bat === statsBat);
    }
    rows = rows.filter(r => questions[r.question_uid] && Number(r.failures) > 0);
    rows.sort((a, b) => (b.failures - a.failures) || (b.failure_rate - a.failure_rate) || (b.attempts - a.attempts));
    renderFailureStats(rows.slice(0, 30), source);
  }

  function goToStatQuestion(uid) {
    const q = questions[uid];
    if (!q) return;
    state.reviewGroupId = null;
    setPage('preguntas', { skipHash: true, render: false });
    if (q.bat !== state.bat) {
      state.view = 'q';
      state.caseId = null;
      applyBatteryUI(q.bat);
    }
    go(uid);
  }

  function openStats() {
    statsBat = 'all';
    $('#statsBat').value = 'all';
    loadFailureStats();
  }

  // ============================================================
  //  Bibliografía
  // ============================================================
  function renderBib(text) {
    const t = norm(text || '');
    const arr = FUENTES.filter(f => !t || norm(f.titulo + ' ' + (f.ref || '')).includes(t));
    const groups = { comun: 'Temario común', fem: 'Temario específico (INF Enfermedades Infecciosas)', mi: 'Temario específico (Medicina Interna)' };
    let html = '';
    for (const g of BAT_KEYS) {
      const items = arr.filter(f => f.grupo === g);
      if (!items.length) continue;
      html += `<div class="bib-group">${groups[g]}</div>`;
      for (const f of items) {
        const ok = f.estado === 'descargado';
        html += `<div class="bib-item"><div class="bib-main">
          <div class="bib-title">${esc(f.titulo)}</div>
          <div class="bib-meta">${esc(f.ref || '')}${f.lineas ? ' &middot; ' + f.lineas + ' líneas' : ''}
            <span class="pill ${ok ? '' : 'no'}">${ok ? 'descargado' : 'no disponible en local'}</span></div>
          <div class="bib-links">
            ${f.visor ? `<a href="${esc(f.visor)}" target="_blank" rel="noopener">Abrir texto</a>` : ''}
            ${f.pdf ? `<a href="${esc(f.pdf)}" target="_blank" rel="noopener">PDF</a>` : ''}
            ${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${ok ? 'Web oficial' : 'Buscar referencia'}</a>` : ''}
          </div>
        </div></div>`;
      }
    }
    $('#bibBody').innerHTML = html || '<div class="empty">Sin resultados</div>';
  }

  // ============================================================
  //  Eventos
  // ============================================================
  document.querySelectorAll('.tab[data-bat]').forEach(t => {
    t.onclick = () => switchBattery(t.dataset.bat);
  });

  $('#fAttempt').onchange = e => {
    const v = e.target.value;
    if (v.startsWith('g:')) enterReview(v.slice(2));
    else {
      state.reviewGroupId = null;
      renderAttemptSelect();
      renderAll(false);
    }
  };
  $('#newAttemptBtn').onclick = () => startNewAttempt();

  $('#search').oninput = e => { state.text = e.target.value; renderList(); };

  $('#shuffleBtn').onclick = () => {
    const before = poolUnits();
    state.shuffle = before.map(unitKey).sort(() => Math.random() - 0.5);
    renderList();
    const arr = poolUnits();
    if (arr.length) goUnit(arr[0]);
  };
  $('#wrongOnlyBtn').onclick = () => {
    if (state.status === 'wrong') { state.status = 'all'; renderList(); toast('Mostrando todas las preguntas', 'ok'); return; }
    state.status = 'wrong'; renderList();
    const arr = poolUnits();
    if (arr.length) { goUnit(arr[0]); closeSidebar(); }
    else openAsk({ title: 'Sin preguntas falladas', text: 'No hay preguntas falladas todavía.', okText: 'De acuerdo', info: true });
  };
  $('#menuBtn').onclick = () => {
    const s = $('#sidebar');
    if (s.classList.contains('open')) closeSidebar();
    else openSidebar();
  };
  $('#sidebarClose').onclick = () => closeSidebar();
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeSidebar();
  });
  let lastScrollY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.documentElement.style.setProperty('--c', Math.min(1, Math.max(0, y / 60)).toFixed(3));
    const bar = document.querySelector('.tabbar');
    if (bar && window.innerWidth < 900) {
      const dy = y - lastScrollY;
      if (y < 40 || dy < -6) bar.classList.remove('tb-hidden');
      else if (dy > 6) bar.classList.add('tb-hidden');
    }
    lastScrollY = y;
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) { const bar = document.querySelector('.tabbar'); if (bar) bar.classList.remove('tb-hidden'); }
  });

  // Bibliografía (página normal dentro de la app, accesible desde el menú lateral)
  $('#bibSearch').oninput = (e) => renderBib(e.target.value);

  // Menú lateral: navegación entre páginas
  document.querySelectorAll('.mm-item').forEach(b => {
    if (!b.dataset.page) return;
    b.onclick = () => setPage(b.dataset.page, { push: true });
  });
  $('#navBackdrop').onclick = () => closeSidebar();

  // Mi cuenta (abajo en el menú): si hay sesión abre el menú de cuenta; si no, el acceso
  $('#tbAccount').onclick = (e) => {
    e.stopPropagation();
    if (!session) { openAuth('login'); return; }
    const chip = $('#userChip');
    if (chip) { chip.click(); return; }
    openAuth('login');
  };

  // Autenticación
  document.querySelectorAll('[data-auth]').forEach(t => {
    t.onclick = () => setAuthMode(t.dataset.auth);
  });
  $('#authForm').onsubmit = onAuthSubmit;
  $('#authClose').onclick = () => $('#authModal').classList.remove('open');
  $('#forgotBtn').onclick = () => setAuthMode('recover');
  $('#backLoginBtn').onclick = () => setAuthMode('login');

  // Mis bloques
  $('#blocksClose').onclick = () => $('#blocksModal').classList.remove('open');
  $('#blocksCancel').onclick = () => $('#blocksModal').classList.remove('open');
  $('#blocksSubmit').onclick = saveBlocks;
  $('#blocksModal').onclick = (e) => { if (e.target.id === 'blocksModal') $('#blocksModal').classList.remove('open'); };

  // Eliminar cuenta
  $('#deleteClose').onclick = () => $('#deleteModal').classList.remove('open');
  $('#deleteCancel').onclick = () => $('#deleteModal').classList.remove('open');
  $('#deleteSubmit').onclick = deleteAccount;
  $('#deleteModal').onclick = (e) => { if (e.target.id === 'deleteModal') $('#deleteModal').classList.remove('open'); };

  // Página principal
  $('#homeStart').onclick = () => setPage('preguntas', { push: true });
  $('#homeSignup').onclick = () => openAuth('signup');
  $('#homeLogin').onclick = () => openAuth('login');
  $('#authModal').onclick = (e) => { if (e.target.id === 'authModal') $('#authModal').classList.remove('open'); };

  // Modal genérico de confirmación/aviso
  $('#askOk').onclick = () => closeAsk(true);
  $('#askCancel').onclick = () => closeAsk(false);
  $('#askModal').onclick = (e) => { if (e.target.id === 'askModal') closeAsk(false); };

  // Discrepancias
  $('#disputeClose').onclick = () => $('#disputeModal').classList.remove('open');
  $('#disputeCancel').onclick = () => $('#disputeModal').classList.remove('open');
  $('#disputeSubmit').onclick = submitDispute;
  $('#disputeModal').onclick = (e) => { if (e.target.id === 'disputeModal') $('#disputeModal').classList.remove('open'); };

  // Administración (página normal dentro de la app)
  document.querySelectorAll('[data-admin]').forEach(t => {
    t.onclick = () => {
      adminTab = t.dataset.admin;
      document.querySelectorAll('[data-admin]').forEach(x => x.classList.toggle('on', x === t));
      renderAdmin();
    };
  });

  // Ranking de fallos (página normal dentro de la app, accesible desde el menú lateral)
  $('#statsBat').onchange = (e) => { statsBat = e.target.value; loadFailureStats(); };

  // Banner de configuración
  const bannerClose = $('#bannerClose');
  if (bannerClose) bannerClose.onclick = () => { $('#setupBanner').hidden = true; };

  // Cerrar menú de usuario al hacer clic fuera
  document.addEventListener('click', e => {
    const m = $('#userMenu');
    if (m && !m.hidden && !e.target.closest('#userChip') && !e.target.closest('#userMenu')) m.hidden = true;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const ask = $('#askModal');
      if (ask && ask.classList.contains('open')) { closeAsk(false); return; }
      ['#authModal', '#disputeModal', '#blocksModal', '#deleteModal'].forEach(s => {
        const n = $(s); if (n) n.classList.remove('open');
      });
      closeSidebar();
      return;
    }
    if (e.target.matches('input,select,textarea')) return;
    if ($('.modal.open')) return;
    if (state.page !== 'preguntas') return;
    const q = questions[state.uid]; if (!q) return;
    const a = viewAnswers()[q.uid];
    const k = e.key.toLowerCase();
    const map = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', a: 'a', b: 'b', c: 'c', d: 'd' };
    if (!a && !state.reviewGroupId && map[k] && state.view === 'q') { e.preventDefault(); answer(q.uid, map[k]); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); jump(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); jump(-1); }
  });

  // ============================================================
  //  Arranque
  // ============================================================
  function routeFromHash() {
    const h = (() => { try { return decodeURIComponent(location.hash.replace('#', '')); } catch (e) { return ''; } })();
    const page = h.startsWith('/') ? h.slice(1) : '';
    if (!page || page === 'inicio') {
      if (state.page !== 'inicio') setPage('inicio', { skipHash: true, render: true });
      return;
    }
    if (PAGES.includes(page) && page !== 'preguntas') {
      setPage(page, { skipHash: true, render: true });
      return;
    }
    if (questions[h]) {
      const q = questions[h];
      state.reviewGroupId = null;
      if (q.bat !== state.bat) applyBatteryUI(q.bat);
      go(h);
      return;
    }
    if (state.page !== 'preguntas') setPage('preguntas', { skipHash: true, render: true });
  }
  window.addEventListener('hashchange', routeFromHash);

  const hash = (() => { try { return decodeURIComponent(location.hash.replace('#', '')); } catch (e) { return ''; } })();
  const hashPage = hash.startsWith('/') ? hash.slice(1) : '';
  let startPage = 'preguntas';
  if (PAGES.includes(hashPage) && hashPage !== 'preguntas') {
    startPage = hashPage;
  } else if (!hash) {
    startPage = 'inicio';
    autoHome = true;
  } else if (questions[hash]) {
    state.uid = hash;
    state.bat = questions[hash].bat;
    if (questions[hash].caso != null) { state.view = 'case'; state.caseId = questions[hash].bat + ':' + questions[hash].caso; }
  }
  document.body.classList.toggle('page-preguntas', startPage === 'preguntas');
  document.querySelectorAll('.tab[data-bat]').forEach(x => x.classList.toggle('on', x.dataset.bat === state.bat));
  $('#subtitle').textContent = BATS[state.bat].sub;
  renderAttemptSelect();
  renderAll(false);
  if (startPage !== 'preguntas' && startPage !== 'admin') setPage(startPage, { skipHash: true, render: true });
  renderAuthUI();
  if (window.innerWidth >= 900) { const pk = $('#asideQuestions'); if (pk) pk.open = true; }
  initSupabase();
})();
