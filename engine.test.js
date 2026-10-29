'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {analyze, analyzeCore, effTxt} = require('./engine.js');
const {migrateBackup, parseBackup, serializeBackup, stampSession, hasSessionConflict} = require('./backup.js');

const rirSettings = {mode:'rir', targetRir:2};
const baseExercise = {sets:3, min:8, max:10, inc:2, efforts:[2,2,2]};
const set = (reps, rir=2, weight=60, type='normal') => ({w:weight, r:reps, rir, type});

test('sube cuando las series requeridas llegan al máximo con esfuerzo razonable', () => {
  const result = analyze(baseExercise, [set(10), set(10), set(10)], null, rirSettings);
  assert.equal(result.status, 'sube');
  assert.equal(result.nextW, 62);
});

test('ajusta la recomendación al incremento disponible del equipo', () => {
  const exercise = {...baseExercise, inc:2, loadStep:2};
  const result = analyze(exercise, [set(10,2,26), set(10,2,26), set(10,2,26)], null, rirSettings);
  assert.equal(result.progressTarget, 28);
  assert.equal(result.nextW, 28);
});

test('las series normales extra se guardan pero no bloquean la subida', () => {
  const result = analyze(baseExercise, [set(10), set(10), set(10), set(6, 0)], null, rirSettings);
  assert.equal(result.status, 'sube');
  assert.deepEqual(result.reps, [10,10,10]);
});

test('repite para confirmar si las series al máximo superan el esfuerzo pedido', () => {
  const result = analyze(baseExercise, [set(10,0), set(10,0), set(10,0)], null, rirSettings);
  assert.equal(result.status, 'confirma');
  assert.equal(result.nextW, 60);
});

test('propone sumar repeticiones cuando todavía no se llega al máximo', () => {
  const result = analyze(baseExercise, [set(8), set(9), set(9)], null, rirSettings);
  assert.equal(result.status, 'reps');
  assert.deepEqual(result.target, [9,10,10]);
});

test('baja el peso después de dos entrenos consecutivos bajo el mínimo', () => {
  const previous = [set(6), set(6), set(6)];
  const result = analyze(baseExercise, [set(5), set(6), set(6)], previous, rirSettings);
  assert.equal(result.status, 'bajar');
  assert.equal(result.nextW, 54);
});

test('redondea una bajada hacia un peso disponible', () => {
  const exercise = {...baseExercise, loadStep:2};
  const previous = [set(6,2,60), set(6,2,60), set(6,2,60)];
  const current = [set(5,2,60), set(6,2,60), set(6,2,60)];
  const result = analyze(exercise, current, previous, rirSettings);
  assert.equal(result.status, 'bajar');
  assert.equal(result.nextW, 54);
});

test('no cuenta aproximaciones ni series especiales para la progresión', () => {
  const result = analyze(baseExercise, [set(10,2,60,'warmup'), set(10), set(10), set(10)], null, rirSettings);
  assert.equal(result.status, 'sube');
  assert.deepEqual(result.reps, [10,10,10]);
});

test('espera ambas partes de cada ronda unilateral', () => {
  const exercise = {...baseExercise, unilateral:true};
  const incomplete = [0,1,2].map(pair => ({...set(10), pair, side:'right'}));
  assert.equal(analyze(exercise, incomplete, null, rirSettings), null);

  const complete = incomplete.flatMap((right, pair) => [
    right,
    {...set(10), pair, side:'left'}
  ]);
  assert.equal(analyze(exercise, complete, null, rirSettings).status, 'sube');
});

test('la PWA y la publicación incluyen recursos y actualización offline', () => {
  const sw=fs.readFileSync('./sw.js','utf8');
  const index=fs.readFileSync('./index.html','utf8');
  const manifest=JSON.parse(fs.readFileSync('./manifest.webmanifest','utf8'));
  const workflow=fs.readFileSync('./.github/workflows/pages.yml','utf8');
  assert.match(sw,/clients\.claim/);
  assert.match(sw,/SKIP_WAITING/);
  assert.match(index,/serviceWorker\.register/);
  assert.equal(manifest.display,'standalone');
  assert.match(workflow,/actions\/deploy-pages/);
});

test('la sección Yo incluye resumen, ejercicios y medidas corporales', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const index=fs.readFileSync('./index.html','utf8');
  assert.match(app,/function viewProfile/);
  assert.match(app,/profileSummary\(\)/);
  assert.match(app,/profileExercises\(\)/);
  assert.match(app,/profileMeasurements\(\)/);
  assert.match(app,/measurements:\[\]/);
  assert.match(app,/measurement-save/);
  assert.match(index,/data-tab="yo"/);
});

test('fatiga, anomalías y accesibilidad están integradas en la interfaz', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const index=fs.readFileSync('./index.html','utf8');
  assert.match(app,/fatiga estimada/i);
  assert.match(app,/peso más de 50 % sobre tu récord/);
  assert.match(app,/aria-selected/);
  assert.match(index,/aria-controls="view"/);
});

test('permite peso cero para ejercicios con carga corporal', () => {
  const result = analyze(baseExercise, [set(10, 2, 0), set(10, 2, 0), set(10, 2, 0)], null, rirSettings);
  assert.equal(result.status, 'sube');
  assert.equal(result.W, 0);
});

test('el motor usa ajustes explícitos para formatear RIR/RPE y objetivos', () => {
  assert.equal(effTxt(1, {mode:'rpe'}), 'RPE 9');
  const result = analyzeCore(baseExercise, [set(10), set(10), set(10)], null, {mode:'rpe', targetRir:2});
  assert.match(result.detail, /RPE 8/);
});

test('la carga corporal y los músculos secundarios están integrados en la interfaz', () => {
  const app=fs.readFileSync('./app.js','utf8');
  assert.match(app,/loadMode !== 'bodyweight'/);
  assert.match(app,/Peso corporal \+ carga añadida/);
  assert.match(app,/effectiveWeight\(/);
  assert.match(app,/normalizedSecondaryMuscles/);
  assert.match(app,/factor:0\.5/);
});

test('los sellos detectan cambios, dispositivos y sesiones borradas sin sobrescribirlas', () => {
  assert.equal(hasSessionConflict({updatedAt:20,updatedBy:'device-a'},10,'device-b'),true);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-a'},10,'device-b'),true);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-b'},10,'device-b'),false);
  assert.equal(hasSessionConflict(undefined,10,'device-b',false),true);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-a'},undefined,'device-b'),true);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-b'},10,'device-b'),false);
  const stamped=stampSession({id:'s1',ts:100},'device-a:tab-1',200);
  assert.equal(stamped.updatedAt,200);
  assert.equal(stamped.updatedBy,'device-a:tab-1');
});

test('los respaldos hacen una ida y vuelta sin perder entrenos ni perfil', () => {
  const source={
    format:'sobrecarga-backup', version:1,
    profile:{settings:{mode:'rir'}, exercises:{press:{name:'Press'}}, routines:{}, programs:{}, goals:{}, measurements:[{date:'2026-01-01',weight:80}]},
    sessions:[{id:'s1',date:'2026-01-01',entries:[{exId:'press',sets:[{w:60,r:10,rir:2,type:'normal'}]}]}]
  };
  const restored=parseBackup(serializeBackup(source));
  assert.deepEqual(restored.profile, source.profile);
  assert.equal(restored.sessions.length,1);
  assert.equal(restored.sessions[0].id,'s1');
  assert.deepEqual(restored.sessions[0].entries,source.sessions[0].entries);
  assert.equal(typeof restored.sessions[0].updatedAt,'number');
  assert.equal(restored.sessions[0].updatedBy,'backup');
});

test('los respaldos migran formatos antiguos sin aceptar versiones futuras', () => {
  const migrated=migrateBackup({version:1,profile:{},sessions:[{id:'s1',ts:1704067200000}]});
  assert.equal(migrated.version,1);
  assert.equal(migrated.sessions[0].updatedBy,'backup');
  assert.equal(migrateBackup({version:2,profile:{},sessions:[]}),null);
});

test('la carga corporal se convierte una sola vez y también en récords y gráficos', () => {
  const app=fs.readFileSync('./app.js','utf8');
  assert.match(app,/entriesFor\(exId\)[\s\S]*?sets\.concat\(e\.sets\)/);
  assert.match(app,/var sets = effectiveSetsFor\(ex, entry\.sets, session\.date\)/);
  assert.match(app,/effectiveSetsFor\(ex,h\.sets,h\.date\)/);
  assert.doesNotMatch(app,/sets\.concat\(effectiveSetsFor\(exById/);
});
