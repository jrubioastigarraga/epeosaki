#!/usr/bin/env node
/*
 * Sube a Supabase las preguntas, baterías y bibliografía que están
 * embebidas en index.html.
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node tools/seed_supabase.cjs
 *
 * El token se obtiene en https://supabase.com/dashboard/account/tokens
 * y solo se usa desde este script; no se guarda en el repositorio.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Falta SUPABASE_ACCESS_TOKEN.');
  process.exit(1);
}

const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const urlMatch = /SUPABASE_URL\s*:\s*'([^']+)'/.exec(config);
if (!urlMatch) {
  console.error('No se ha encontrado SUPABASE_URL en config.js.');
  process.exit(1);
}
const refMatch = /https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(urlMatch[1]);
if (!refMatch) {
  console.error('No se ha podido obtener el project ref de SUPABASE_URL.');
  process.exit(1);
}
const ref = refMatch[1];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const start = html.indexOf('<script id="dataset"');
const bodyStart = html.indexOf('>', start) + 1;
const bodyEnd = html.indexOf('</script>', bodyStart);
const data = JSON.parse(html.slice(bodyStart, bodyEnd));

const BATTERIES = ['comun', 'fem', 'mi'];
const batteries = BATTERIES.map(id => ({ id, meta: data[id].meta || {} }));
const questions = [];
for (const bat of BATTERIES) {
  for (const q of data[bat].preguntas || []) {
    questions.push({
      uid: bat + '-' + q.numero,
      battery: bat,
      numero: q.numero,
      contexto: q.contexto || null,
      caso: q.caso == null ? null : q.caso,
      pregunta: q.pregunta,
      opciones: q.opciones || {},
      answer: q.answer == null ? null : q.answer,
      confidence: q.confidence == null ? null : q.confidence,
      source: q.source || null,
      tags: q.tags || [],
      notas: q.notas || null,
      tema: q.tema || null,
      tema_id: q.tema_id || null
    });
  }
}
const bibliography = (data.fuentes || []).map(f => ({ id: f.id, grupo: f.grupo || null, data: f }));

const TAG = '$seed_7f3a$';
function literal(obj) {
  const text = JSON.stringify(obj);
  if (text.includes(TAG)) throw new Error('El payload contiene el delimitador SQL.');
  return TAG + text + TAG;
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(res.status + ': ' + text);
  return text;
}

(async () => {
  await runSql(`
insert into public.batteries (id, meta)
select x.id, x.meta
from jsonb_to_recordset(${literal(batteries)}::jsonb) as x(id text, meta jsonb)
on conflict (id) do update set meta = excluded.meta, updated_at = now();
`);
  console.log('Baterías: ' + batteries.length);

  for (let i = 0; i < questions.length; i += 300) {
    const batch = questions.slice(i, i + 300);
    await runSql(`
insert into public.questions
  (uid, battery, numero, contexto, caso, pregunta, opciones, answer, confidence, source, tags, notas, tema, tema_id)
select x.uid, x.battery, x.numero, x.contexto, x.caso, x.pregunta, x.opciones, x.answer,
       x.confidence, x.source, coalesce(x.tags, '[]'::jsonb), x.notas, x.tema, x.tema_id
from jsonb_to_recordset(${literal(batch)}::jsonb) as x(
  uid text, battery text, numero integer, contexto text, caso integer, pregunta text,
  opciones jsonb, answer text, confidence integer, source jsonb, tags jsonb,
  notas text, tema text, tema_id text
)
on conflict (uid) do update set
  battery = excluded.battery, numero = excluded.numero, contexto = excluded.contexto,
  caso = excluded.caso, pregunta = excluded.pregunta, opciones = excluded.opciones,
  answer = excluded.answer, confidence = excluded.confidence, source = excluded.source,
  tags = excluded.tags, notas = excluded.notas, tema = excluded.tema,
  tema_id = excluded.tema_id, updated_at = now();
`);
    console.log('Preguntas: ' + (i + batch.length) + '/' + questions.length);
  }

  await runSql(`
insert into public.bibliography (id, grupo, data)
select x.id, x.grupo, x.data
from jsonb_to_recordset(${literal(bibliography)}::jsonb) as x(id text, grupo text, data jsonb)
on conflict (id) do update set grupo = excluded.grupo, data = excluded.data, updated_at = now();
`);
  console.log('Bibliografía: ' + bibliography.length);
  console.log('Listo.');
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
