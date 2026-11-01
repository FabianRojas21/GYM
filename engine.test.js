'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
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

test('el motor presenta recomendaciones en la unidad elegida sin cambiar cálculos métricos', () => {
  const result=analyze(baseExercise,[set(10),set(10),set(10)],null,{...rirSettings,weightUnit:'lb'});
  assert.equal(result.nextW,62);
  assert.match(result.headline,/136,69 lb/);
  assert.match(result.detail,/136,69 lb/);
  const kgResult=analyze(baseExercise,[set(10),set(10),set(10)],null,rirSettings);
  assert.match(kgResult.headline,/62 kg/);
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
  const app=fs.readFileSync('./app.js','utf8');
  assert.match(sw,/clients\.claim/);
  assert.match(sw,/SKIP_WAITING/);
  assert.match(index,/app\.js\?v=__BUILD_ID__/);
  assert.match(index,/serviceWorker\.register\('\.\/sw\.js\?v=__BUILD_ID__'\)/);
  assert.match(sw,/app\.js\?v=__BUILD_ID__/);
  assert.match(workflow,/BUILD_ID: \$\{\{ github\.sha \}\}[\s\S]*sed -i .*index\.html sw\.js/);
  assert.match(workflow,/Verify deployed asset versions[\s\S]*grep -q '__BUILD_ID__' index\.html sw\.js/);
  assert.match(workflow,/grep -Fq "app\.js\?v=\$\{BUILD_ID\}" index\.html/);
  assert.match(workflow,/grep -Fq "sobrecarga-\$\{BUILD_ID\}" sw\.js/);
  assert.match(app,/Store\.firebaseDb = firebase\.firestore\(firebaseApp\);/);
  assert.doesNotMatch(app,/experimentalForceLongPolling|experimentalAutoDetectLongPolling/);
  assert.equal(manifest.display,'standalone');
  assert.match(workflow,/actions\/deploy-pages/);
});

test('el Service Worker entrega la respuesta aunque falle su copia offline', async () => {
  const source=fs.readFileSync('./sw.js','utf8');
  let fetchHandler, responsePromise;
  const pendingWrites=[];
  const response={ok:true,clone(){throw new TypeError('Response body is already used');}};
  const context={
    URL,
    self:{location:{origin:'https://example.test'},addEventListener(type,handler){if(type==='fetch') fetchHandler=handler;}},
    caches:{match:async()=>null,open:async()=>({put:async()=>{}})},
    fetch:async()=>response,
    console:{warn(){}}
  };
  vm.runInNewContext(source,context);
  fetchHandler({
    request:{method:'GET',mode:'navigate',url:'https://example.test/app.js'},
    respondWith(promise){responsePromise=promise;},
    waitUntil(promise){pendingWrites.push(promise);}
  });
  assert.equal(await responsePromise,response);
  await Promise.all(pendingWrites);
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
  assert.match(app,/function recoveryHtml\(\)/);
  assert.match(app,/no mide la recuperación fisiológica/i);
  assert.match(app,/esfuerzo registrado/);
  assert.match(app,/peso más de 50 % sobre tu récord/);
  assert.match(app,/aria-selected/);
  assert.match(index,/aria-controls="view"/);
});

test('la recuperación separa carga objetiva reciente y autoevaluación opcional', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function muscleRecoverySummary\(today\)\{[\s\S]*?\n\}/);
  const labels=source.match(/function recoveryRatingLabel\(level\)\{[\s\S]*?\n\}\nfunction recoveryEstimateLabel\(load\)\{[\s\S]*?\n\}/);
  assert.ok(helper && labels);
  const context={
    S:{profile:{recoveryRatings:{}},sessions:[
      {date:'2026-10-31',entries:[{exId:'press',sets:[{rir:0}]}]},
      {date:'2026-10-28',entries:[{exId:'press',sets:[{rir:2}]}]},
      {date:'2026-10-25',entries:[{exId:'press',sets:[{rir:2}]}]},
      {date:'2026-10-20',entries:[{exId:'press',sets:[{rir:0}]}]}
    ]},
    parseISO:value=>new Date(Number(value.slice(0,4)),Number(value.slice(5,7))-1,Number(value.slice(8,10))),
    iso:date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
    entryEffectiveSets:()=>1,
    exById:()=>({muscle:'chestMid'}),
    muscleAssignments:()=>[{id:'chestMid',factor:1}],
    SobrecargaEngine:{
      groupFactors:assignments=>({chest:assignments[0].factor}),
      isEffectiveSet:set=>set.rir===undefined||set.rir<=4
    },
    Object,Date,Math,Number
  };
  vm.runInNewContext(helper[0]+';'+labels[0]+';globalThis.summaryForTest=muscleRecoverySummary;globalThis.ratingForTest=recoveryRatingLabel;globalThis.estimateForTest=recoveryEstimateLabel;',context);
  const summary=context.summaryForTest('2026-10-31');
  assert.equal(summary.chest.lastStimulus,'2026-10-31');
  assert.ok(Math.abs(summary.chest.load-1.95)<0.0001);
  assert.equal(context.ratingForTest(3),'Muy fatigado');
  assert.equal(context.ratingForTest(0),'Sin autoevaluación');
  assert.equal(context.estimateForTest(0),'Ninguna reciente');
  assert.equal(context.estimateForTest(0.5),'Baja');
  assert.equal(context.estimateForTest(1.5),'Moderada');
  assert.equal(context.estimateForTest(4),'Alta');
  assert.match(source,/Sin datos suficientes/);
  assert.match(source,/Sin carga reciente/);
  assert.match(source,/data-level=.*estimateLevel/);
  assert.match(source,/Tu sensación · autoevaluación de hoy/);
  assert.match(source,/no mide la recuperación fisiológica/i);
  assert.match(source,/data-recovery-group=/);
  assert.match(source,/S\.profile\.recoveryRatings\[recoveryGroup\]=\{level:Number\(t\.value\),date:iso\(new Date\(\)\)\}/);
});

test('el recordatorio configurable es interno, opcional y respeta intervalo y descarte diario', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function workoutReminderHtml\(latest\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const dismissed=new Map();
  const today=new Date(2026,9,31);
  const FixedDate=function(value){return value===undefined?today:new Date(value);};
  FixedDate.parse=Date.parse;
  const context={
    S:{profile:{settings:{reminderEnabled:true,reminderIntervalDays:3}}},
    validDate:value=>/^\d{4}-\d{2}-\d{2}$/.test(value),
    iso:()=> '2026-10-31',
    Date:FixedDate,
    Number,Math,
    localStorage:{getItem:key=>dismissed.get(key)||null},
    REMINDER_DISMISSED_KEY:'dismissed',
    esc:String
  };
  vm.runInNewContext(helper[0]+';globalThis.reminderForTest=workoutReminderHtml;',context);
  const latest={id:'last-session',date:'2026-10-28'};
  assert.match(context.reminderForTest(latest),/Han pasado 3 días/);
  assert.equal(context.reminderForTest({...latest,date:'2026-10-29'}),'');
  dismissed.set('dismissed','last-session:2026-10-31');
  assert.equal(context.reminderForTest(latest),'');
  context.S.profile.settings.reminderEnabled=false;
  assert.equal(context.reminderForTest(latest),'');
  assert.match(source,/data-setting="reminderEnabled"/);
});

test('la sección Tus datos muestra fecha y alcance de respaldos', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function readStoredBackup\(key\)\{[\s\S]*?\n\}\nfunction hasAutoBackup\(\)\{[\s\S]*?\n\}\nfunction backupTimestamp\(value\)\{[\s\S]*?\n\}\nfunction backupStatusHtml\(\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const stored=new Map([
    ['auto',{savedAt:1793480000000,sessions:[{id:'one'},{id:'two'}]}],
    ['export',{requestedAt:1793480000000,sessionCount:2}]
  ]);
  const context={
    localStorage:{getItem:key=>JSON.stringify(stored.get(key)||null)},
    console,Number,Date,Intl,esc:String,
    AUTO_BACKUP_KEY:'auto',BACKUP_EXPORT_KEY:'export'
  };
  vm.runInNewContext(helper[0]+';globalThis.backupStatusForTest=backupStatusHtml;globalThis.hasBackupForTest=hasAutoBackup;',context);
  assert.equal(context.hasBackupForTest(),true);
  const status=context.backupStatusForTest();
  assert.match(status,/2 entrenos/);
  assert.match(status,/Última copia automática en este navegador/);
  assert.match(status,/Última descarga solicitada/);
  assert.match(status,/Comprueba que el archivo esté en tu dispositivo/);
  assert.match(source,/Respaldo restaurado[\s\S]*addedSessions/);
  assert.match(source,/createAutoBackup\(\);\s*render\(\);\s*toast\('Copia automática restaurada/);
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

test('el catálogo ofrece asignaciones conocidas y aisladas sin inferencias inventadas', () => {
  const {curatedMuscleProfile,inferSecondaryMuscles}=require('./engine.js');
  assert.deepEqual(curatedMuscleProfile('Press banca'),{
    muscle:'chestMid',equipment:'barbell',secondaryMuscles:['tricepsLateral','tricepsMedial','shoulderAnterior']
  });
  assert.deepEqual(curatedMuscleProfile('JALÓN AL PECHO'),{
    muscle:'lats',equipment:'cable',secondaryMuscles:['bicepsShort','brachialis']
  });
  const profile=curatedMuscleProfile('Hip thrust');
  profile.secondaryMuscles.push('hamstrings');
  assert.deepEqual(curatedMuscleProfile('Hip thrust').secondaryMuscles,[]);
  assert.equal(curatedMuscleProfile('Press cualquiera'),null);
  assert.deepEqual(inferSecondaryMuscles('lats','Movimiento de espalda'),[]);
  assert.deepEqual(inferSecondaryMuscles('lats','Lat pulldown'),['bicepsShort','brachialis']);
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

test('el resumen del historial compara ventanas exactas y métricas acumuladas', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const bounds=source.match(/function historyWindowBounds\(days,today\)\{[\s\S]*?\n\}/);
  const aggregate=source.match(/function historyAggregate\(sessions\)\{[\s\S]*?\n\}/);
  const trend=source.match(/function historyTrend\(current,previous\)\{[\s\S]*?\n\}/);
  assert.ok(bounds && aggregate && trend);
  const context={
    parseISO:value=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day);},
    iso:value=>value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0'),
    sessionStats:session=>session.stats
  };
  vm.runInNewContext(bounds[0]+';'+aggregate[0]+';'+trend[0]+
    ';globalThis.boundsForTest=historyWindowBounds;globalThis.aggregateForTest=historyAggregate;globalThis.trendForTest=historyTrend;',context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.boundsForTest(7,'2026-10-31'))),{
    start:'2026-10-25',end:'2026-10-31',previousStart:'2026-10-18',previousEnd:'2026-10-24'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.aggregateForTest([
    {durationMs:60000,stats:{volume:120,effectiveSets:3}},
    {durationMs:120000,stats:{volume:80,effectiveSets:2}}
  ]))),{sessions:2,volume:200,effectiveSets:5,duration:180000});
  assert.equal(context.trendForTest(6,4),'↑ 50% vs periodo anterior');
  assert.equal(context.trendForTest(0,0),'Sin cambios previos');
  assert.match(source,/value="90"[\s\S]*Últimos 90 días/);
  assert.match(source,/id="history-summary"/);
  assert.match(source,/Comparación con los '\+S\.historyRange\+' días anteriores/);
});

test('crear una rutina desde historial conserva configuración y cuenta rondas unilaterales', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function routineItemsFromSession\(session,exerciseMap\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const context={
    setType:set=>set.type||'normal',
    exerciseLoadStep:()=>2.5,
    warmupSettings:()=>({warmupMode:'auto',warmupStep:2.5,warmupPercents:[50]})
  };
  vm.runInNewContext(helper[0]+';globalThis.routineItemsForTest=routineItemsFromSession;',context);
  const session={entries:[
    {exId:'press',cfg:{min:6,max:10,inc:2,sets:3,efforts:[2,1,1]},sets:[
      {type:'warmup',w:20,r:8},{type:'normal',w:40,r:8},{type:'normal',w:40,r:8},{type:'normal',w:40,r:7},{type:'drop',w:30,r:5}
    ]},
    {exId:'split',sets:[
      {type:'normal',pair:0,side:'left'},{type:'normal',pair:0,side:'right'},
      {type:'normal',pair:1,side:'left'},{type:'normal',pair:1,side:'right'},
      {type:'normal',pair:2,side:'right'}
    ]}
  ]};
  const items=JSON.parse(JSON.stringify(context.routineItemsForTest(session,{
    press:{sets:4,min:8,max:12,inc:2.5,unilateral:false},
    split:{sets:3,min:8,max:12,inc:2.5,unilateral:true}
  })));
  assert.equal(items.length,2);
  assert.deepEqual(items.map(item=>item.sets),[3,2]);
  assert.equal(items[0].warmupSets,1);
  assert.equal(items[0].min,6);
  assert.equal(items[0].inc,2);
  assert.equal(items[1].unilateral,true);
  assert.match(source,/data-act="session-make-routine"/);
  assert.match(source,/case 'session-make-routine':[\s\S]*?routineItemsFromSession/);
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

test('los objetivos personalizados permiten actualizar progreso y calculan el avance', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function goalProgress\(goal\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const context={S:{sessions:[]},personalRecords:()=>({}),exById:()=>null,iso:()=>''};
  vm.runInNewContext(helper[0]+';globalThis.goalProgressForTest=goalProgress;',context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.goalProgressForTest({type:'custom',current:25,target:100,start:0}))),
    {current:25,percent:25}
  );
  assert.match(source,/data-act="goal-update"/);
  assert.match(source,/currentGoal\.current=updatedGoalValue/);
  assert.match(source,/data-goal-field="current"/);
  assert.match(source,/Faltan '\+fmt\(isWeightGoal\?fromKg\(remaining\):remaining\)/);
  assert.match(source,/goalType==='weekly'\?'entrenos\/7 días'/);
});

test('el objetivo semanal cuenta hoy y los seis días anteriores', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const goal=source.match(/function goalProgress\(goal\)\{[\s\S]*?\n\}/);
  const bounds=source.match(/function historyWindowBounds\(days,today\)\{[\s\S]*?\n\}/);
  assert.ok(goal && bounds);
  const RealDate=Date;
  function FixedDate(){ return arguments.length ? new RealDate(...arguments) : new RealDate(2026,0,10); }
  const iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const context={
    Date:FixedDate,
    parseISO:value=>new RealDate(Number(value.slice(0,4)),Number(value.slice(5,7))-1,Number(value.slice(8,10))),
    iso,
    S:{sessions:['2026-01-10','2026-01-09','2026-01-07','2026-01-04','2026-01-03'].map(date=>({date}))},
    personalRecords:()=>({}),
    exById:()=>null
  };
  vm.runInNewContext(bounds[0]+';'+goal[0]+';globalThis.goalProgressForTest=goalProgress;',context);
  assert.equal(context.goalProgressForTest({type:'weekly',target:4}).current,4);
  assert.match(source,/var recentStart=historyWindowBounds\(7,iso\(new Date\(\)\)\)\.start/);
});

test('no confirma la importación CSV antes de persistir y gestiona fallos de migración y borrado', () => {
  const source=fs.readFileSync('./app.js','utf8');
  assert.match(source,/return Store\.saveProfileNow\(\)\.then\(persistSessions\)/);
  assert.match(source,/Migración local a Firebase fallida/);
  assert.match(source,/fallbackToLocal:function/);
  assert.match(source,/Los cambios se guardan en este navegador/);
  assert.match(source,/Store\.cloudGeneration\+\+/);
  assert.match(source,/function loadDemo\(\)[\s\S]*?return Store\.saveProfileNow\(\)\.then\(persistSessions\)/);
  assert.match(source,/Store\.syncToCloud\(\)\.then|return Store\.syncToCloud\(\);/);
  assert.match(source,/parseNumber/);
  assert.match(source,/No se pudo borrar el entreno:/);
  assert.match(source,/throw error;\s*\}\);\s*\},\s*replaceAll:/);
  assert.match(source,/var migratedKey='sobrecarga:migrated:'\+userId/);
  assert.match(source,/if\(!alreadyMigrated && localData/);
  assert.match(source,/var migrateSessions=!remoteProfile\.exists && remoteSessions\.empty/);
  assert.match(source,/localStorage\.setItem\(migratedKey,'1'\)/);
});

test('la migración local no resucita sesiones borradas al volver a abrir la cuenta', async () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function migrateLocalDataOnce\([\s\S]*?\n\}/);
  assert.ok(helper);
  const values=new Map();
  const remote={profile:null,sessions:Object.create(null)};
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,value)
  };
  const ref={
    get:()=>Promise.resolve({exists:!!remote.profile}),
    set:value=>{remote.profile=JSON.parse(JSON.stringify(value));return Promise.resolve();}
  };
  const col={
    get:()=>Promise.resolve({empty:Object.keys(remote.sessions).length===0}),
    doc:id=>({set:value=>{remote.sessions[id]=JSON.parse(JSON.stringify(value));return Promise.resolve();}})
  };
  const context={localStorage,console,clone:value=>JSON.parse(JSON.stringify(value)),stampSession:value=>value};
  vm.runInNewContext(helper[0]+';globalThis.migrateLocalDataOnceForTest=migrateLocalDataOnce;',context);
  const staleLocalData={
    profile:{settings:{mode:'rir'}},
    sessions:['A','B','C'].map(id=>({id}))
  };
  await context.migrateLocalDataOnceForTest('user-1',ref,col,staleLocalData);
  assert.deepEqual(Object.keys(remote.sessions).sort(),['A','B','C']);
  assert.equal(values.get('sobrecarga:migrated:user-1'),'1');
  delete remote.sessions.B;
  await context.migrateLocalDataOnceForTest('user-1',ref,col,staleLocalData);
  assert.deepEqual(Object.keys(remote.sessions).sort(),['A','C']);
  values.delete('sobrecarga:migrated:user-1');
  await context.migrateLocalDataOnceForTest('user-1',ref,col,staleLocalData);
  assert.deepEqual(Object.keys(remote.sessions).sort(),['A','C']);
});

test('sube sesiones locales posteriores a la última sincronización sin resucitar las anteriores borradas', async () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function uploadPendingLocalSessions\([\s\S]*?\n\}/);
  assert.ok(helper);
  const values=new Map([['sobrecarga:last-cloud-sync:user-1','200']]);
  const uploaded={};
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,value)
  };
  const col={doc:id=>({set:value=>{uploaded[id]=JSON.parse(JSON.stringify(value));return Promise.resolve();}})};
  const context={
    localStorage,console,Date,
    clone:value=>JSON.parse(JSON.stringify(value)),
    stampSession:value=>Object.assign({},value,{updatedAt:Math.max(Number(value.updatedAt)||0,Number(value.ts)||0,300)})
  };
  vm.runInNewContext(helper[0]+';globalThis.uploadPendingLocalSessionsForTest=uploadPendingLocalSessions;',context);
  const result=await context.uploadPendingLocalSessionsForTest('user-1',col,{
    sessions:[
      {id:'A',updatedAt:100},
      {id:'B',updatedAt:150},
      {id:'C',updatedAt:250}
    ]
  },[{id:'A'}]);
  assert.equal(result.count,1);
  assert.deepEqual(Object.keys(uploaded),['C']);
  assert.equal(values.get('sobrecarga:last-cloud-sync:user-1')!=='200',true);
  assert.match(source,/uploadPendingLocalSessions\(user\.uid,Store\.col,localData,remoteSessions\)/);
});

test('la primera cuenta puede subir entrenos locales ausentes aunque la migración ya se haya marcado', async () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function uploadPendingLocalSessions\([\s\S]*?\n\}/);
  assert.ok(helper);
  const uploaded=[];
  const col={doc:id=>({set:()=>{uploaded.push(id);return Promise.resolve();}})};
  const context={
    localStorage:{getItem:()=>null,setItem:()=>{}},
    console,Date,clone:value=>JSON.parse(JSON.stringify(value)),
    stampSession:value=>Object.assign({},value,{updatedAt:Number(value.updatedAt)||1})
  };
  vm.runInNewContext(helper[0]+';globalThis.uploadPendingLocalSessionsForTest=uploadPendingLocalSessions;',context);
  const result=await context.uploadPendingLocalSessionsForTest('user-2',col,{
    sessions:[{id:'P1',updatedAt:10},{id:'P2',updatedAt:20}]
  },[{id:'cloud-A'}]);
  assert.equal(result.count,2);
  assert.deepEqual(uploaded,['P1','P2']);
});

test('restaurar un respaldo combina datos y conserva los actuales ante IDs duplicados', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function mergeBackupData\([\s\S]*?\n\}/);
  assert.ok(helper);
  const context={clone:value=>JSON.parse(JSON.stringify(value))};
  vm.runInNewContext(helper[0]+';globalThis.mergeBackupDataForTest=mergeBackupData;',context);
  const currentProfile={
    settings:{mode:'rpe'},
    exercises:{same:{name:'Ejercicio actual'}},
    routines:{current:{name:'Rutina actual'}},
    programs:{},goals:{},
    recoveryRatings:{chest:{level:1,date:'2026-10-30'}},
    measurements:[{id:'current',values:{weight:80}},{id:'shared',values:{weight:81}}]
  };
  const backupProfile={
    settings:{mode:'rir'},
    exercises:{same:{name:'Ejercicio del respaldo'},added:{name:'Ejercicio nuevo'}},
    routines:{current:{name:'Rutina antigua'},added:{name:'Rutina nueva'}},
    programs:{added:{name:'Programa nuevo'}},goals:{},
    recoveryRatings:{chest:{level:3,date:'2026-10-31'},back:{level:2,date:'2026-10-31'}},
    measurements:[{id:'shared',values:{weight:70}},{id:'backup',values:{weight:79}}]
  };
  const currentSessions=[{id:'same',notes:'nube'},{id:'keep',notes:'actual'}];
  const backupSessions=[{id:'same',notes:'respaldo antiguo'},{id:'new',notes:'respaldo nuevo'}];
  const merged=context.mergeBackupDataForTest(currentProfile,currentSessions,backupProfile,backupSessions);
  assert.equal(merged.profile.settings.mode,'rpe');
  assert.equal(merged.profile.exercises.same.name,'Ejercicio actual');
  assert.equal(merged.profile.exercises.added.name,'Ejercicio nuevo');
  assert.equal(merged.profile.routines.current.name,'Rutina actual');
  assert.equal(merged.profile.routines.added.name,'Rutina nueva');
  assert.equal(merged.profile.recoveryRatings.chest.level,1);
  assert.equal(merged.profile.recoveryRatings.back.level,2);
  assert.deepEqual(Array.from(merged.profile.measurements,m=>m.id),['current','shared','backup']);
  assert.deepEqual(Array.from(merged.sessions,m=>m.id),['same','keep','new']);
  assert.equal(merged.sessions[0].notes,'nube');
  const fresh=context.mergeBackupDataForTest(
    {settings:{mode:'rir'},exercises:{},routines:{},programs:{},goals:{},measurements:[]},
    [],
    backupProfile,
    backupSessions
  );
  assert.equal(fresh.profile.exercises.added.name,'Ejercicio nuevo');
  assert.deepEqual(Array.from(fresh.sessions,m=>m.id),['same','new']);
  assert.match(source,/function restoreBackup\(\)[\s\S]*?mergeBackupData\(S\.profile,S\.sessions/);
  assert.match(source,/function restoreAutoBackup\(\)[\s\S]*?mergeBackupData\(S\.profile,S\.sessions/);
  assert.match(source,/var syncLabel=S\.cloudSyncing \? 'Sincronizando…' : S\.syncUnavailable \? 'Reintentar conexión'/);
  assert.match(source,/if\(!S\.ready \|\| S\.syncUnavailable \|\| S\.kind!==?'cloud'\)\{[\s\S]*?no se subieron datos/);
  assert.match(source,/if\(!S\.ready \|\| S\.syncUnavailable \|\| S\.kind!=='cloud'\)\{\s*return Promise\.reject/);
  assert.match(source,/gotProfile && gotSessions && gotDraft/);
  assert.match(source,/No se pudo comprobar el entreno en curso de la cuenta/);
  assert.match(source,/ref\.get\(\{source:'server'\}\)/);
  assert.match(source,/col\.get\(\{source:'server'\}\)/);
  assert.match(source,/Store\.ref\.onSnapshot\(\{includeMetadataChanges:true\}/);
  assert.match(source,/Store\.col\.onSnapshot\(\{includeMetadataChanges:true\}/);
  assert.match(source,/if\(!snap\.metadata \|\| snap\.metadata\.fromCache\) return;/);
  assert.match(source,/doc\('draft'\)\.get\(\{source:'server'\}\)/);
  assert.match(source,/S\.kind==='cloud' && S\.ready && !S\.syncUnavailable/);
  assert.match(source,/Cargando y verificando los datos de la cuenta/);
  assert.doesNotMatch(source.match(/function restoreBackup\(\)[\s\S]*?\n\}/)[0],/blankDraft\(\)/);
});

test('la interfaz de entrenamiento e historial expone ayudas rápidas y filtros', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const styles=fs.readFileSync('./styles.css','utf8');
  assert.match(app,/data-act="repeat-set"/);
  assert.match(app,/data-act="finish-set"/);
  assert.match(app,/<label class="set-input"><span>Peso · /);
  assert.match(app,/<label class="set-input"><span>Reps<\/span>/);
  assert.match(app,/<label class="set-type-label"><span>Tipo de serie<\/span>/);
  assert.match(styles,/.set-input>span/);
  assert.match(styles,/@media \(max-width:520px\)[\s\S]*?\.set-fields\{gap:5px\}/);
  assert.match(styles,/@media \(max-width:520px\)[\s\S]*?\.library-card:not\(\.create-card\)\{flex-wrap:wrap/);
  assert.match(styles,/@media \(max-width:520px\)[\s\S]*?select\[data-it="warmupMode"\]/);
  assert.match(app,/class="card history-session-card"/);
  assert.match(app,/class="row history-actions"/);
  assert.match(app,/class="row settings-data-actions"/);
  assert.match(styles,/\.profile-nav\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles,/@media \(max-width:520px\)[\s\S]*?\.history-actions\{display:grid/);
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
  assert.match(app,/restOwner=S\.restOwner \|\| null/);
  assert.match(app,/remoteDraft\.restOwner==='string'/);
  assert.match(app,/function restoreRestAfterUndo\(rows, state\)/);
  assert.match(app,/restoreRestAfterUndo\(removedEntry\.rows, removedEntryRestState\)/);
  assert.match(app,/restoreRestAfterUndo\(\[removedRow\], removedSetRestState\)/);
  assert.match(app,/collapsedEntryIds:\[\]/);
  assert.match(app,/S\.draft\.collapsedEntryIds=Array\.from\(S\.collapsedEntries\)/);
  assert.match(app,/function syncCollapsedEntries\(\)/);
  assert.doesNotMatch(app,/toast\('Serie terminada · descanso iniciado'\)/);
  assert.match(app,/function onWorkoutKeydown/);
  assert.match(app,/section\.card\[data-ei\] input\[data-f\]/);
  assert.match(app,/if\(!next\)\{ ev\.target\.blur\(\); return; \}/);
  assert.match(app,/enterkeyhint="next"/);
  assert.match(app,/id="draft-save-status"/);
  assert.match(app,/data-history-search/);
  assert.match(app,/data-history-range/);
  assert.match(app,/Cómo se calcula el volumen y el esfuerzo/);
  assert.ok(styles.includes('.workout-finish{position:sticky'));
  assert.ok(styles.includes('padding-bottom:calc(124px'));
});

test('el editor del historial mantiene avance, plegado y estado de series', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const styles=fs.readFileSync('./styles.css','utf8');
  const readme=fs.readFileSync('./README.md','utf8');
  assert.match(app,/function prepareSessionForEdit\(session\)/);
  assert.match(app,/function sessionEditProgressText\(entry, exercise\)/);
  assert.match(app,/data-act="session-toggle-entry"/);
  assert.match(app,/case 'session-finish-set':[\s\S]*?setSessionEditDone\(finishEditEntry,finishEditSet,markDone/);
  assert.match(app,/function saveSessionEdit\(\)[\s\S]*?delete set\.editorDone/);
  assert.match(app,/function onInput\(ev\)\{[\s\S]*?setSessionEditDone\(entry,set,false/);
  assert.match(app,/updateSessionEditFinishControls\(\+t\.dataset\.entry,\+t\.dataset\.set\)/);
  assert.ok(styles.includes('.session-entry-edit .session-set-edit .set-finish'));
  assert.match(readme,/Al \*\*editar un entrenamiento del historial\*\*[\s\S]*?no inicia un descanso/);
});

test('el error de renderizado muestra sus detalles técnicos sin alterar los datos', () => {
  const app=fs.readFileSync('./app.js','utf8');
  const styles=fs.readFileSync('./styles.css','utf8');
  assert.match(app,/var errorDetails=error && \(error\.stack \|\| error\.message\)/);
  assert.match(app,/<details class="render-error-details"><summary>Detalles técnicos<\/summary><pre>' \+ esc\(errorDetails\)/);
  assert.ok(styles.includes('.render-error-details pre{'));
});

test('la app mantiene el parseo numérico si backup.js está desactualizado', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const parser=source.match(/var num = [\s\S]*?\n    };/);
  const limits=source.match(/var MAX_WEIGHT_KG = \d+;\nvar MAX_REPS = \d+;/);
  const validWeight=source.match(/var validWeight = function\(v\)\{[^\n]*\};/);
  const validReps=source.match(/var validReps = function\(v\)\{[^\n]*\};/);
  assert.ok(parser && limits && validWeight && validReps);
  const context={SobrecargaBackup:{}};
  vm.runInNewContext(limits[0]+';'+parser[0]+';'+validWeight[0]+';'+validReps[0]+';globalThis.parseNumberForTest=num;globalThis.validWeightForTest=validWeight;globalThis.validRepsForTest=validReps;',context);
  assert.equal(context.parseNumberForTest('62,5'),62.5);
  assert.equal(context.parseNumberForTest(''),null);
  assert.equal(context.parseNumberForTest('62 kg'),null);
  assert.equal(context.validWeightForTest('0'),true);
  assert.equal(context.validWeightForTest('-1'),false);
  assert.equal(context.validWeightForTest('1000'),true);
  assert.equal(context.validWeightForTest('1000.01'),false);
  assert.equal(context.validRepsForTest('500'),true);
  assert.equal(context.validRepsForTest('501'),false);
});

test('los gráficos limitan marcas y filtran valores no finitos', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const chart=source.match(/function niceStep\(raw\)\{[\s\S]*?\n\}\nfunction chartSvg\(pts, unit\)\{[\s\S]*?\n\}/);
  assert.ok(chart);
  const context={
    Number,Math,
    document:{documentElement:{clientWidth:400}},
    fmt:value=>String(Math.round(value*100)/100),
    fmt1:value=>String(Math.round(value*10)/10),
    esc:value=>String(value)
  };
  vm.runInNewContext(chart[0]+';globalThis.chartSvgForTest=chartSvg;globalThis.niceStepForTest=niceStep;',context);
  assert.equal(context.niceStepForTest(2100),2500);
  const ordinary=context.chartSvgForTest([{label:'A',y:4000},{label:'B',y:10000}],'kg·reps');
  assert.equal((ordinary.match(/stroke="var\(--line\)"/g)||[]).length,3);
  const huge=context.chartSvgForTest([{label:'A',y:99999999},{label:'B',y:100000000},{label:'invalid',y:Infinity}],'kg');
  assert.ok((huge.match(/stroke="var\(--line\)"/g)||[]).length<=12);
  assert.ok(huge.length<10000);
});

test('el selector de unidad convierte valores de entrada a kg sin reescribir datos', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helpers=source.match(/var KG_PER_LB = [\s\S]*?function volumeInCurrentUnit\(value\)\{[^\n]*\}/);
  assert.ok(helpers);
  const context={
    S:{profile:{settings:{weightUnit:'lb'}}},
    num:value=>value===''?null:Number(String(value).replace(',','.')),
    fmt:value=>(Math.round(value*100)/100).toString().replace('.',',')
  };
  vm.runInNewContext(helpers[0]+';globalThis.toKgForTest=toKg;globalThis.fromKgForTest=fromKg;globalThis.weightTextForTest=weightText;globalThis.volumeInCurrentUnitForTest=volumeInCurrentUnit;',context);
  assert.equal(context.toKgForTest('135,58'),61.4981);
  assert.equal(context.fromKgForTest(60),132.27735731092652);
  assert.equal(context.weightTextForTest(60),'132,28 lb');
  assert.ok(Math.abs(context.volumeInCurrentUnitForTest(100)-220.462262185)<1e-9);
  assert.match(source,/data-setting="weightUnit"/);
  assert.match(source,/peso_lb\|\|r\.weight_lb/);
});

test('la sincronización finaliza con error si Firebase deja una escritura pendiente', async () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function withTimeout\(promise, timeoutMs, message\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const context={setTimeout,clearTimeout,Promise,Error};
  vm.runInNewContext(helper[0]+';globalThis.withTimeoutForTest=withTimeout;',context);
  await assert.rejects(
    context.withTimeoutForTest(new Promise(()=>{}),5,'Firebase sin respuesta'),
    /Firebase sin respuesta/
  );
  assert.match(source,/Firebase no respondió al guardar el perfil/);
  assert.match(source,/Firebase no respondió al guardar tus entrenamientos/);
  assert.match(source,/Firebase no respondió al guardar el entreno en curso/);
  assert.match(source,/S\.cloudSyncing=false; render\(\);[\s\S]*?toast\(error && error\.message/);
  assert.match(source,/Promise\.resolve\(\)\.then\(function\(\)\{ return Store\.syncToCloud\(\); \}\)/);
});

test('precarga los valores de la última sesión y respeta el alcance de rutina elegido', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helperNames=['previousExerciseSessions','previousExerciseEntry','applyPreviousValues'];
  const helpers=helperNames.map(name=>{
    const match=source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
    assert.ok(match,`missing ${name}`);
    return match[0];
  }).join('\n');
  const context={
    S:{profile:{settings:{previousExerciseScope:'any'}},sessions:[
      {id:'a-old',date:'2026-01-01',ts:1,routineId:'routine-a',entries:[{exId:'press',sets:[{w:60,r:8,rir:2,type:'normal'}]}]},
      {id:'b',date:'2026-01-10',ts:2,routineId:'routine-b',entries:[{exId:'press',sets:[{w:65,r:9,rir:1,type:'normal'}]}]},
      {id:'a-new',date:'2026-01-20',ts:3,routineId:'routine-a',entries:[{exId:'press',sets:[{w:70,r:10,rir:0,type:'normal'}]}]}
    ]},
    setType:row=>row.type||'normal',
    validWeight:value=>Number.isFinite(Number(value))&&Number(value)>=0,
    validReps:value=>Number.isFinite(Number(value))&&Number(value)>0
  };
  vm.runInNewContext(helpers+';globalThis.applyPreviousValuesForTest=applyPreviousValues;',context);
  const anyRows=[{type:'normal',w:'',r:'',rir:''}];
  context.applyPreviousValuesForTest('press',anyRows,false,'routine-b');
  assert.deepEqual(anyRows[0],{type:'normal',w:'70',r:'10',rir:'0'});
  context.S.profile.settings.previousExerciseScope='sameRoutine';
  const routineRows=[{type:'normal',w:'',r:'',rir:''}];
  context.applyPreviousValuesForTest('press',routineRows,false,'routine-b');
  assert.deepEqual(routineRows[0],{type:'normal',w:'65',r:'9',rir:'1'});
  const noRoutineRows=[{type:'normal',w:'',r:'',rir:''}];
  context.applyPreviousValuesForTest('press',noRoutineRows,false,null);
  assert.deepEqual(noRoutineRows[0],{type:'normal',w:'',r:'',rir:''});
});

test('alternativas, modo simple y borrado reversible están conectados al entrenamiento', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const styles=fs.readFileSync('./styles.css','utf8');
  const readme=fs.readFileSync('./README.md','utf8');
  assert.match(source,/previousExerciseScope:'any'/);
  assert.match(source,/data-setting="previousExerciseScope"/);
  assert.match(source,/function applyPreviousValues\(/);
  assert.match(source,/data-cfg="substitution"/);
  assert.match(source,/data-workout-substitution/);
  assert.match(source,/function resetEntryExercise\(/);
  assert.match(source,/case 'substitution-confirm':/);
  assert.match(source,/data-act="workout-simple-toggle"/);
  assert.match(source,/workout-card-simple/);
  assert.ok(styles.includes('.workout-card-simple .set:not(.head) .in{min-height:50px'));
  assert.match(source,/case 'rm-set':[\s\S]*?toast\('Serie quitada del entreno', 'Deshacer'/);
  assert.match(source,/case 'rm-ex':[\s\S]*?toast\('Ejercicio quitado del entreno', 'Deshacer'/);
  assert.match(readme,/ejercicios\s+alternativos/i);
  assert.match(readme,/alcance de\s+búsqueda/);
});

test('un sustituto reemplaza solo el ejercicio actual y permite volver al original', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helper=source.match(/function resetEntryExercise\(entry, exerciseId\)\{[\s\S]*?\n\}/);
  assert.ok(helper);
  const exercises={
    original:{id:'original',sets:2,warmupSets:0,unilateral:false,min:6,max:10,inc:2},
    alternate:{id:'alternate',sets:3,warmupSets:0,unilateral:true,min:8,max:12,inc:2}
  };
  const routine={items:[{exId:'original',sets:2,unilateral:false}]};
  const context={
    S:{draft:{routineId:'routine'},profile:{settings:{previousExerciseScope:'any'}}},
    exById:id=>exercises[id],
    clone:value=>JSON.parse(JSON.stringify(value)),
    cancelRestForRow:()=>{},
    effEx:entry=>Object.assign({},exercises[entry.exId],entry.cfg||{}),
    planFor:()=>({nextW:20}),
    newRow:(_weight,unilateral)=>unilateral?{type:'normal',right:{w:'',r:'',rir:''},left:{w:'',r:'',rir:''}}:{type:'normal',w:'',r:'',rir:''},
    warmupSettings:()=>({warmupMode:'manual'}),
    plannedRow:(_plan,unilateral)=>unilateral
      ?{type:'normal',right:{w:'',r:'',rir:''},left:{w:'',r:'',rir:''}}
      :{type:'normal',w:'',r:'',rir:''},
    applyPreviousValues:()=>{},
    syncAutoWarmupWeights:()=>{}
  };
  vm.runInNewContext(helper[0]+';globalThis.resetEntryExerciseForTest=resetEntryExercise;',context);
  const entry={baseExId:'original',exId:'original',cfg:{sets:2,unilateral:false},routineCfg:{sets:2,unilateral:false},rows:[{type:'normal'}]};
  assert.equal(context.resetEntryExerciseForTest(entry,'alternate'),true);
  assert.equal(entry.exId,'alternate');
  assert.equal(entry.substituteFor,'original');
  assert.equal(entry.cfg.unilateral,true);
  assert.equal(routine.items[0].exId,'original');
  assert.equal(context.resetEntryExerciseForTest(entry,'original'),true);
  assert.equal(entry.exId,'original');
  assert.equal(entry.cfg.unilateral,false);
  assert.equal(entry.substituteFor,undefined);
  assert.equal(routine.items[0].exId,'original');
});

test('la comparación muestra el progreso de reps y el cambio de esfuerzo', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helpers=['hasEffortValue','previousEffortText','compareWorkSet','completedComparisonHtml','previousReferenceHtml']
    .map(name=>{
      const match=source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
      assert.ok(match,`missing ${name}`);
      return match[0];
    }).join('\n');
  const context={
    S:{profile:{settings:{mode:'rir'}}},
    fmt:value=>String(value),
    weightText:value=>`${value} kg`,
    esc:value=>String(value),
    dFmt:value=>value,
    previousWorkSet:()=>({set:{w:60,r:8,rir:2},session:{date:'2026-10-30',routineName:'Torso A'}})
  };
  vm.runInNewContext(helpers+';globalThis.compareWorkSetForTest=compareWorkSet;globalThis.previousReferenceHtmlForTest=previousReferenceHtml;',context);
  assert.equal(context.compareWorkSetForTest({w:60,r:9,rir:1},{w:60,r:8,rir:2}),
    'sumaste 1 repetición más con el mismo peso · más esfuerzo (RIR 2 → RIR 1)');
  assert.match(context.compareWorkSetForTest({w:60,r:8,rir:''},{w:60,r:8,rir:2}),/esfuerzo actual sin registrar \(anterior RIR 2\)/);
  const row={w:'60',r:'9',rir:'1',restTriggered:true};
  const summary=vm.runInNewContext('completedComparisonHtml('+JSON.stringify(row)+',{set:{w:60,r:8,rir:2},session:{date:"2026-10-30",routineName:"Torso A"}},false)',context);
  assert.match(summary,/sumaste 1 repetición más/);
  const unilateral=vm.runInNewContext('completedComparisonHtml({restTriggered:true,right:{w:"20",r:"9",rir:"1"},left:{w:"20",r:"8",rir:"2"}},{set:{right:{w:20,r:8,rir:2},left:{w:20,r:8,rir:2}},session:{}},true)',context);
  assert.match(unilateral,/Derecho:/);
  assert.match(unilateral,/Izquierdo:/);
  const reference=context.previousReferenceHtmlForTest('press',0,false);
  assert.match(reference,/2026-10-30 · Torso A/);
  assert.match(reference,/RIR 2/);
  context.S.profile.settings.mode='rpe';
  assert.match(context.previousReferenceHtmlForTest('press',0,false),/RPE 8/);
});

test('los filtros de sustitución acotan por equipo y grupo, y el cambio unilateral pide confirmación', () => {
  const source=fs.readFileSync('./app.js','utf8');
  const helperNames=['substitutionFilterKey','substitutionFilter','filteredSubstitutions','substitutionNeedsConfirmation'];
  const helpers=helperNames.map(name=>{
    const match=source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
    assert.ok(match,`missing ${name}`);
    return match[0];
  }).join('\n');
  const exercises={
    bench:{id:'bench',equipment:'barbell',muscle:'chestMid'},
    dumbbellPress:{id:'dumbbellPress',equipment:'dumbbell',muscle:'chestUpper',unilateral:false},
    pushup:{id:'pushup',equipment:'bodyweight',muscle:'chestMid',unilateral:false},
    row:{id:'row',equipment:'cable',muscle:'lats',unilateral:true}
  };
  const context={
    S:{substitutionFilters:{'workout:entry':{equipment:'dumbbell',muscle:'chest'}},profile:{exercises:{bench:{substitutions:['dumbbellPress','pushup','row']}}}},
    EQUIPMENT_TYPES:{barbell:'Barra',dumbbell:'Mancuernas',bodyweight:'Peso corporal',cable:'Polea'},
    exById:id=>exercises[id],
    exerciseEquipment:exercise=>exercise.equipment,
    muscleId:exercise=>exercise.muscle,
    muscleGroupId:id=>id.indexOf('chest')===0?'chest':'back',
    exerciseSubstitutions:id=>context.S.profile.exercises[id].substitutions,
    entryHasWorkoutData:entry=>entry.hasData,
    effEx:entry=>entry.exercise
  };
  vm.runInNewContext(helpers+';globalThis.filteredSubstitutionsForTest=filteredSubstitutions;globalThis.substitutionNeedsConfirmationForTest=substitutionNeedsConfirmation;',context);
  assert.deepEqual(Array.from(context.filteredSubstitutionsForTest('bench','workout','entry')),['dumbbellPress']);
  assert.equal(context.substitutionNeedsConfirmationForTest({hasData:false,exercise:{unilateral:false}},'row'),true);
  assert.equal(context.substitutionNeedsConfirmationForTest({hasData:false,exercise:{unilateral:false}},'dumbbellPress'),false);
  assert.equal(context.substitutionNeedsConfirmationForTest({hasData:true,exercise:{unilateral:false}},'dumbbellPress'),true);
});
