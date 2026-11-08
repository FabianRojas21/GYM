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

function renderSettings(section='home',state={},firebaseEnabled=false){
  return render({state:makeState({...state,settingsSection:section}),helpers,firebaseEnabled});
}

test('settings home shows categories without exposing their controls',()=>{
  const html=renderSettings('home',{},true);
  ['training','rest','calculator','progression','goals','account','data'].forEach(section=>{
    assert.match(html,new RegExp('data-section="'+section+'"'));
  });
  assert.match(html,/Personaliza cómo funciona Sobrecarga/);
  assert.match(html,/Calculadora de discos/);
  assert.match(html,/Datos y respaldos/);
  assert.doesNotMatch(html,/data-setting="weightUnit"/);
  assert.doesNotMatch(html,/data-act="cloud-sync"/);
  assert.doesNotMatch(html,/data-act="export"/);
});

test('training category keeps units, goal, and effort controls together',()=>{
  const html=renderSettings('training');
  assert.match(html,/data-setting="weightUnit"[\s\S]*Kilogramos \(kg\)/);
  assert.match(html,/data-setting="trainingGoal"[\s\S]*Hipertrofia/);
  assert.match(html,/aria-label="Escala de esfuerzo"/);
  assert.match(html,/RIR 2/);
  assert.match(html,/data-act="settings-home">‹ Ajustes/);
  assert.doesNotMatch(html,/data-setting="restSeconds"/);
});

test('rest, calculator, and progression options live in their own categories',()=>{
  const rest=renderSettings('rest');
  assert.match(rest,/data-setting="restSeconds"/);
  assert.match(rest,/data-setting="warmupRestSeconds"/);
  assert.match(rest,/data-setting="reminderEnabled"/);
  assert.doesNotMatch(rest,/data-setting="weightUnit"/);

  const calculator=renderSettings('calculator');
  assert.match(calculator,/Barras y máquinas cargables/);

  const progression=renderSettings('progression');
  assert.match(progression,/data-setting="previousExerciseScope"/);
  assert.match(progression,/Dos entrenos seguidos bajo el mínimo/);
});

test('goals and account pages keep their existing controls and status',()=>{
  assert.match(renderSettings('goals'),/Objetivos/);
  const html=renderSettings('account',{
    ready:false,
    cloudUser:{email:'user@example.test'},
    syncUnavailable:false,
    cloudSyncing:false,
    kind:'cloud'
  },true);
  assert.match(html,/Conectado como <strong>user@example\.test/);
  assert.match(html,/Cargando y verificando los datos de la cuenta/);
  assert.match(html,/data-act="cloud-sync" disabled/);
  assert.match(html,/data-act="cloud-signout"/);
});

test('data page keeps backup actions, demo controls, and pending import confirmation',()=>{
  const html=renderSettings('data',{
    sessions:[{demo:true}],
    confirm:'wipe',
    pendingImport:{
      profile:{exercises:{a:{},b:{}},routines:{r:{}}},
      sessions:[{id:'one'}]
    }
  },true);
  assert.match(html,/Estado del respaldo/);
  assert.match(html,/data-act="auto-restore"/);
  assert.match(html,/data-act="export-csv"/);
  assert.match(html,/data-act="demo-clear"/);
  assert.match(html,/data-act="wipe-ok"/);
  assert.match(html,/El respaldo contiene 2 ejercicios, 1 rutinas y 1 entrenos/);
  assert.match(html,/data-act="import-confirm"/);
  assert.match(html,/data-act="import-cancel"/);
});

test('account category is hidden when Firebase is not configured',()=>{
  const html=renderSettings('home');
  assert.doesNotMatch(html,/data-section="account"/);
  assert.equal(renderSettings('account').includes('Conectado como'),false);
  assert.match(renderSettings('invalid'),/class="list settings-category-list"/);
});
