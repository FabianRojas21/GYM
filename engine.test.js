'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {analyze, analyzeCore, effTxt} = require('./engine.js');

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
