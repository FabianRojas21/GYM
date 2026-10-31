'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {analyze, analyzeCore, effTxt} = require('./engine.js');
const {migrateBackup, parseBackup, serializeBackup, stampSession, hasSessionConflict, csvSetType, csvSessionSignature, parseNumber} = require('./backup.js');

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
  assert.match(app,/Porcentaje del peso corporal que se desplaza/);
  assert.equal(require('./engine.js').muscleAssignments('chestMid',['tricepsLateral'])[1].factor,0.5);
});

test('los sellos detectan cambios, dispositivos y sesiones borradas sin sobrescribirlas', () => {
  assert.equal(hasSessionConflict({updatedAt:20,updatedBy:'device-a'},10,'device-b'),true);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-a'},10,'device-b'),false);
  assert.equal(hasSessionConflict({updatedAt:10,updatedBy:'device-b'},10,'device-b'),false);
  assert.equal(hasSessionConflict(undefined,10,'device-b',false),true);
  assert.equal(hasSessionConflict({},undefined,'device-b'),false);
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

test('peso corporal cero nunca recomienda bajar de peso', () => {
  const exercise={sets:3,min:8,max:10,inc:2.5, loadMode:'bodyweight'};
  const previous=[set(6,2,0),set(6,2,0),set(6,2,0)];
  const result=analyze(exercise,[set(5,2,0),set(6,2,0),set(6,2,0)],previous,{mode:'rir',targetRir:2});
  assert.notEqual(result.status,'bajar');
});

test('normaliza tipos de CSV sin cambiar tipos válidos ni producir tipos inválidos', () => {
  assert.equal(csvSetType('backoff'),'backoff');
  assert.equal(csvSetType('dropset'),'dropset');
  assert.equal(csvSetType('drop'),'dropset');
  assert.equal(csvSetType('failure'),'normal');
  assert.equal(csvSetType('rest-pause'),'restpause');
});

test('parsea números completos con coma decimal y rechaza texto agregado', () => {
  assert.equal(parseNumber('60'),60);
  assert.equal(parseNumber(' 2,5 '),2.5);
  assert.equal(parseNumber('.75'),0.75);
  assert.equal(parseNumber(''),null);
  assert.equal(parseNumber('60kg'),null);
  assert.equal(parseNumber('1.2.3'),null);
});

test('la firma CSV distingue esfuerzo y lado de cada ronda', () => {
  const left=[{exId:'curl',sets:[{w:12,r:10,rir:2,type:'normal',side:'left',pair:0}]}];
  const right=[{exId:'curl',sets:[{w:12,r:10,rir:2,type:'normal',side:'right',pair:0}]}];
  const changedEffort=[{exId:'curl',sets:[{w:12,r:10,rir:1,type:'normal',side:'left',pair:0}]}];
  assert.notEqual(csvSessionSignature(left),csvSessionSignature(right));
  assert.notEqual(csvSessionSignature(left),csvSessionSignature(changedEffort));
  assert.equal(csvSessionSignature(left),csvSessionSignature([{exId:'curl',sets:[{w:12,r:10,rir:2,type:'normal',side:'left',pair:0}],unilateral:true}]));
});

test('no baja de peso cuando el siguiente peso disponible es cero o negativo', () => {
  const exercise={sets:3,min:8,max:10,inc:5,loadStep:5};
  const previous=[set(6,2,5),set(6,2,5),set(6,2,5)];
  const result=analyze(exercise,[set(5,2,5),set(6,2,5),set(6,2,5)],previous,{mode:'rir',targetRir:2});
  assert.equal(result.status,'mantener');
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

test('series duras cuentan para hipertrofia independientemente del tipo', () => {
  const {isEffectiveSet, countEffectiveSets} = require('./engine.js');
  assert.equal(isEffectiveSet(set(10,1)),true);
  assert.equal(isEffectiveSet(set(10,8)),false);
  assert.equal(isEffectiveSet(set(10,1,60,'backoff')),true);
  assert.equal(isEffectiveSet(set(10,2,60,'dropset')),true);
  assert.equal(isEffectiveSet(set(10,2,60,'restpause')),true);
  assert.equal(isEffectiveSet(set(10,null,60,'warmup')),false);
  assert.equal(isEffectiveSet({w:60,r:10,type:'normal'}),true);
  assert.equal(isEffectiveSet(set(10,'no válido')),false);
  assert.equal(countEffectiveSets([set(10,1),set(10,8),set(10,1,60,'backoff')],false),2);
  assert.equal(require('./engine.js').entryVolume([set(10,8),set(10,1,60,'backoff')],false),1200);
});

test('el volumen de unilaterales exige pares completos incluso en series especiales', () => {
  const {entryVolume,countEffectiveSets,isUnilateralEntry} = require('./engine.js');
  const sets=[
    {...set(10,1,12),pair:0,side:'right'},
    {...set(10,1,12),pair:0,side:'left'},
    {...set(8,1,8,'dropset'),pair:1,side:'right'},
    {...set(8,1,8,'dropset'),pair:1,side:'left'},
    {...set(10,1,50,'backoff'),pair:2,side:'right'}
  ];
  assert.equal(entryVolume(sets,true),368);
  assert.equal(countEffectiveSets(sets,true),2);
  assert.equal(isUnilateralEntry({sets:[{pair:0,side:'left'}]},null),true);
  const historicalBilateral={sets:[set(10,2,12),set(10,2,12),set(10,2,12)]};
  assert.equal(isUnilateralEntry(historicalBilateral),false);
  assert.equal(countEffectiveSets(historicalBilateral.sets,isUnilateralEntry(historicalBilateral)),3);
});

test('los accesorios aislados no heredan secundarios de su grupo', () => {
  const {inferSecondaryMuscles}=require('./engine.js');
  assert.deepEqual(inferSecondaryMuscles('shoulderLateral','Elevaciones laterales'),[]);
  assert.deepEqual(inferSecondaryMuscles('tricepsLong','Extensión de tríceps en polea'),[]);
  assert.deepEqual(inferSecondaryMuscles('quads','Extensión de cuádriceps'),[]);
  assert.deepEqual(inferSecondaryMuscles('hamstrings','Curl femoral'),[]);
  assert.deepEqual(inferSecondaryMuscles('calvesGastro','Elevación de talones'),[]);
  assert.deepEqual(inferSecondaryMuscles('bicepsShort','Curl de bíceps'),[]);
  assert.deepEqual(inferSecondaryMuscles('chestMid','Aperturas'),[]);
  assert.deepEqual(inferSecondaryMuscles('chestMid','Press banca'),['tricepsLateral','tricepsMedial','shoulderAnterior']);
  assert.deepEqual(inferSecondaryMuscles('chestMid','Push-ups'),['tricepsLateral','tricepsMedial','shoulderAnterior']);
  assert.deepEqual(inferSecondaryMuscles('chestMid','Flexiones'),['tricepsLateral','tricepsMedial','shoulderAnterior']);
  assert.deepEqual(inferSecondaryMuscles('quads','Zancadas'),['glutesMax','adductors']);
  assert.deepEqual(inferSecondaryMuscles('quads','Leg press'),['glutesMax','adductors']);
  assert.deepEqual(inferSecondaryMuscles('hamstrings','Romanian deadlift'),['glutesMax','lowerBack']);
  assert.deepEqual(inferSecondaryMuscles('lowerBack','Hyperextensions'),['glutesMax']);
  assert.deepEqual(inferSecondaryMuscles('lats','Pullover'),[]);
});

test('agrupa subdivisiones y calcula series directas e indirectas', () => {
  const {muscleGroupId,muscleAssignments,groupFactors}=require('./engine.js');
  assert.equal(muscleGroupId('chestUpper'),'chest');
  assert.equal(muscleGroupId('chestMid'),'chest');
  assert.equal(muscleGroupId('adductors'),'adductors');
  assert.equal(muscleGroupId('hipFlexors'),'hipFlexors');
  assert.equal(muscleGroupId('neck'),'neck');
  assert.equal(muscleGroupId('unassigned'),'unassigned');
  assert.deepEqual(muscleAssignments('chestMid',['tricepsLateral','tricepsMedial']),[
    {id:'chestMid',factor:1},{id:'tricepsLateral',factor:0.5},{id:'tricepsMedial',factor:0.5}
  ]);
  assert.deepEqual(groupFactors(muscleAssignments('chestMid',['tricepsLateral','tricepsMedial'])),{chest:1,triceps:0.5});
  assert.deepEqual(groupFactors(muscleAssignments('lats',['bicepsShort','brachialis'])),{back:1,biceps:0.5});
});

test('compara días equivalentes y detecta tendencias sin semanas falsas', () => {
  const {comparableWeekRange,compareWeeklyTrend}=require('./engine.js');
  assert.deepEqual(comparableWeekRange('2026-10-31',1),{start:'2026-10-19',end:'2026-10-24'});
  assert.equal(compareWeeklyTrend(5,[10,10]),'Carga a la baja');
  assert.equal(compareWeeklyTrend(10,[10]),'Carga estable');
  assert.equal(compareWeeklyTrend(10,[]),'Carga nueva');
});

test('calcula peso corporal ponderado por ejercicio', () => {
  const {effectiveBodyweight}=require('./engine.js');
  assert.equal(effectiveBodyweight(80,0,67),53.6);
});

test('CSV unilateral mantiene su estado y las tendencias agrupan músculos', () => {
  const source=fs.readFileSync('./app.js','utf8');
  assert.match(source,/unilateral:!!exercise\.unilateral \|\| SobrecargaEngine\.isUnilateralEntry\(\{sets:sets\}\)/);
  assert.match(source,/groupFactors\(muscleAssignments/);
  assert.match(source,/comparableWeekRange\(today,weekIndex\)/);
  assert.match(source,/indirectLabel\*0\.5/);
});

test('no confirma la importación CSV antes de persistir y gestiona fallos de migración y borrado', () => {
  const source=fs.readFileSync('./app.js','utf8');
  assert.match(source,/return Store\.saveProfileNow\(\)\.then\(persistSessions\)/);
  assert.match(source,/Migración local a Firebase fallida/);
  assert.match(source,/fallbackToLocal:function/);
  assert.match(source,/Los cambios se guardan en este navegador/);
  assert.match(source,/Store\.cloudGeneration\+\+/);
  assert.match(source,/function loadDemo\(\)[\s\S]*?return Store\.saveProfileNow\(\)\.then\(persistSessions\)/);
  assert.match(source,/Store\.syncToCloud\(\)\.then/);
  assert.match(source,/parseNumber/);
  assert.match(source,/No se pudo borrar el entreno:/);
  assert.match(source,/throw error;\s*\}\);\s*\},\s*replaceAll:/);
});

test('la interfaz de entrenamiento e historial expone ayudas rápidas y filtros', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const styles=fs.readFileSync('./styles.css','utf8');
  assert.match(app,/data-act="repeat-set"/);
  assert.match(app,/data-act="finish-set"/);
  assert.match(app,/case 'finish-set':[\s\S]*?startRest\(finishRestSeconds, finishRow\.restToken\)/);
  assert.match(app,/set-finish-done/);
  assert.match(app,/data-act="toggle-entry"/);
  assert.match(app,/completedSets \+ '\/' \+ targetSets/);
  assert.match(app,/finishControl\.replaceWith\(finishButton\)/);
  const inputHandler=app.match(/function onInput\(ev\)\{([\s\S]*?)\n\}\nfunction onChange/);
  assert.ok(inputHandler);
  assert.doesNotMatch(inputHandler[1],/delete row\.restTriggered/);
  assert.match(app,/case 'undo-finish-set':[\s\S]*?cancelRestForRow\(undoRow\)/);
  assert.match(app,/localStorage\.setItem\(RTOK, S\.restOwner\)/);
  assert.doesNotMatch(app,/toast\('Serie terminada · descanso iniciado'\)/);
  assert.match(app,/function onWorkoutKeydown/);
  assert.match(app,/closest\('section\.card\[data-ei\]'\)/);
  assert.match(app,/id="draft-save-status"/);
  assert.match(app,/data-history-search/);
  assert.match(app,/data-history-range/);
  assert.match(app,/Cómo se calcula el volumen y la fatiga/);
  assert.ok(styles.includes('.workout-finish{position:sticky'));
  assert.ok(styles.includes('padding-bottom:calc(124px'));
});
