'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {programEditor,routineDetail,routineEditor}=require('./routine-views.js');

const helpers={
  esc:value=>String(value),
  routineSummary:()=>({workingSets:3,warmupSets:1,muscles:['chest'],lastSession:{date:'2026-11-01'}}),
  routineMuscleLabel:()=> 'Pecho',
  exById:id=>({id,archived:id==='archived'}),
  exName:id=>id==='press'?'Press banca':id,
  dFmt:value=>value,
  routineExerciseHistory:()=> 'Último registro: 2026-11-01 · 3 series efectivas',
  warmupSettings:()=>({warmupMode:'auto',warmupStep:2.5,warmupPercents:[50]}),
  weightInput:value=>String(value),
  effInputVal:value=>String(value),
  weightUnitLabel:()=>'kg',
  exerciseLoadStep:()=>2.5,
  weightText:value=>String(value)+' kg',
  setTypeLabel:type=>({backoff:'Back-off',dropset:'Drop set',restpause:'Rest-pause'}[type]||type),
  pickerHtml:()=>'<div class="picker">Selector</div>'
};

test('program editor renders create and edit states',()=>{
  assert.match(programEditor({pedit:{name:'Fuerza'}},helpers),/Crear programa/);
  assert.match(programEditor({pedit:{id:'p1',name:'Fuerza'}},helpers),/Editar programa/);
  assert.match(programEditor({pedit:{id:'p1',name:'Fuerza'}},helpers),/data-pf="name"/);
});

test('routine detail shows exercise configuration and actions',()=>{
  const html=routineDetail({
    profile:{programs:{p1:{id:'p1',name:'Fuerza'}},activeRoutineId:'r1'}
  },{
    id:'r1',name:'Día A',programId:'p1',
    items:[{exId:'press',sets:3,min:8,max:12,warmupSets:1,specialSets:['backoff']},{exId:'archived',sets:2,min:6,max:10}]
  },helpers);
  assert.match(html,/Día A/);
  assert.match(html,/Fuerza/);
  assert.match(html,/Último registro/);
  assert.match(html,/ejercicio archivado/);
  assert.match(html,/Rutina activa/);
  assert.match(html,/data-act="rut-export"/);
  assert.match(html,/Back-off/);
});

test('routine editor renders the existing exercise controls and actions',()=>{
  const html=routineEditor({
    redit:{
      id:'r1',name:'Día A',programId:'p1',pick:false,
      items:[{exId:'press',sets:3,min:8,max:12,inc:2.5,loadStep:2.5,maxProgressIncrease:5,progressionMode:'weight',warmupSets:1,specialSets:['backoff','dropset'],efforts:[2,2,1],warmupPercents:[50],unilateral:false}]
    },
    profile:{settings:{mode:'rir',targetRir:2},programs:{p1:{name:'Fuerza'}}}
  },helpers);
  assert.match(html,/Editar rutina/);
  assert.match(html,/data-rf="name"/);
  assert.match(html,/data-routine-program/);
  assert.match(html,/data-it="warmupMode"/);
  assert.match(html,/data-it="warmupPercent"/);
  assert.match(html,/data-it="progressionMode"/);
  assert.match(html,/data-it="maxProgressIncrease"/);
  assert.match(html,/data-it="specialSetType"/);
  assert.match(html,/data-act="rut-special-add"/);
  assert.match(html,/data-act="rut-special-remove"/);
  assert.match(html,/Peso primero: subir al cumplir el mínimo de reps/);
  assert.match(html,/Si el salto supera 5 kg, mantienes el peso actual/);
  assert.match(html,/data-ef="1"/);
  assert.match(html,/data-act="rut-up"/);
  assert.match(html,/data-act="rut-rm-item"/);
  assert.match(html,/data-act="rut-save"/);
});
