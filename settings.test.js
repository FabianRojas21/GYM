'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {render}=require('./settings.js');

const helpers={
  fmt:value=>String(value),
  loadToolSettingsHtml:()=>'<section>Barras y máquinas cargables</section>',
  goalsHtml:()=>'<section>Objetivos</section>',
  esc:value=>String(value),
  backupStatusHtml:()=>'<div class="backup-status">Estado del respaldo</div>',
  hasAutoBackup:()=>true
};

function makeState(overrides={}){
  return {
    profile:{settings:{
      weightUnit:'kg',
      trainingGoal:'hypertrophy',
      mode:'rir',
      targetRir:2,
      restSeconds:90,
      warmupRestSeconds:45,
      reminderEnabled:false,
      reminderIntervalDays:3,
      previousExerciseScope:'any'
    }},
    sessions:[],
    kind:'local',
    syncUnavailable:false,
    confirm:null,
    pendingImport:null,
    ...overrides
  };
}

test('settings render preserves exercise, effort, rest, reminder, and progression options',()=>{
  const html=render({state:makeState(),helpers,firebaseEnabled:false});
  assert.match(html,/data-setting="weightUnit"[\s\S]*Kilogramos \(kg\)/);
  assert.match(html,/data-setting="trainingGoal"[\s\S]*Hipertrofia/);
  assert.match(html,/aria-label="Escala de esfuerzo"/);
  assert.match(html,/RIR 2/);
  assert.match(html,/data-setting="restSeconds"/);
  assert.match(html,/data-setting="warmupRestSeconds"/);
  assert.match(html,/data-setting="reminderEnabled"/);
  assert.match(html,/data-setting="previousExerciseScope"/);
  assert.match(html,/Dos entrenos seguidos bajo el mínimo/);
  assert.match(html,/Barras y máquinas cargables/);
  assert.match(html,/Objetivos/);
});

test('settings render displays cloud state and protects pending account synchronization',()=>{
  const html=render({
    state:makeState({
      ready:false,
      cloudUser:{email:'user@example.test'},
      syncUnavailable:false,
      cloudSyncing:false,
      kind:'cloud'
    }),
    helpers,
    firebaseEnabled:true
  });
  assert.match(html,/Conectado como <strong>user@example\.test/);
  assert.match(html,/Cargando y verificando los datos de la cuenta/);
  assert.match(html,/data-act="cloud-sync" disabled/);
  assert.match(html,/data-act="cloud-signout"/);
  assert.match(html,/Se guardan en tu cuenta/);
});

test('settings render keeps backup actions, demo controls, and pending import confirmation',()=>{
  const html=render({
    state:makeState({
      sessions:[{demo:true}],
      confirm:'wipe',
      pendingImport:{
        profile:{exercises:{a:{},b:{}},routines:{r:{}}},
        sessions:[{id:'one'}]
      }
    }),
    helpers,
    firebaseEnabled:true
  });
  assert.match(html,/Estado del respaldo/);
  assert.match(html,/data-act="auto-restore"/);
  assert.match(html,/data-act="export-csv"/);
  assert.match(html,/data-act="demo-clear"/);
  assert.match(html,/data-act="wipe-ok"/);
  assert.match(html,/El respaldo contiene 2 ejercicios, 1 rutinas y 1 entrenos/);
  assert.match(html,/data-act="import-confirm"/);
  assert.match(html,/data-act="import-cancel"/);
});
