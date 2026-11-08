'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {render}=require('./profile.js');

const helpers={
  esc:value=>String(value),
  validWeight:value=>Number.isFinite(Number(value)),
  countsForProgress:set=>!set.type||set.type==='normal',
  exById:id=>({id,name:id==='press'?'Press banca':id}),
  effectiveWeight:(exercise,set)=>Number(set.w),
  dFmt:value=>value,
  volumeText:value=>String(value),
  weightUnitLabel:()=>'kg',
  profileSummary:()=>'<section>Resumen inyectado</section>',
  iso:()=> '2026-11-07',
  weightInput:value=>String(value),
  fmt:value=>String(value),
  fromKg:value=>Number(value),
  chartSvg:()=>'<svg></svg>'
};

const state={
  profileSection:'resumen',
  exerciseSort:'recent',
  measurementForm:false,
  sessions:[],
  profile:{exercises:{},measurements:[]}
};

test('profile render keeps section navigation and delegates the summary view',()=>{
  const html=render({state,helpers,measurementFields:{}});
  assert.match(html,/aria-label="Secciones de tu perfil"/);
  assert.match(html,/Resumen inyectado/);
});

test('profile exercise view renders visible exercise data and selected sorting',()=>{
  const exerciseState={
    ...state,
    profileSection:'ejercicios',
    exerciseSort:'most',
    profile:{exercises:{press:{id:'press'}},measurements:[]},
    sessions:[{date:'2026-11-01',entries:[{exId:'press',sets:[{w:60,r:8}]}]}]
  };
  const html=render({state:exerciseState,helpers,measurementFields:{}});
  assert.match(html,/Tus ejercicios/);
  assert.match(html,/selected>Más realizado/);
  assert.match(html,/Press banca/);
  assert.match(html,/480 kg·reps/);
});

test('profile measurements view renders records and the measurement form',()=>{
  const measurementState={
    ...state,
    profileSection:'medidas',
    measurementForm:true,
    profile:{
      exercises:{},
      measurements:[{id:'m1',date:'2026-11-01',values:{weight:70,waist:80},notes:'Medición inicial'}]
    }
  };
  const html=render({
    state:measurementState,
    helpers,
    measurementFields:{weight:'Peso',waist:'Cintura'}
  });
  assert.match(html,/Medidas corporales/);
  assert.match(html,/data-measurement-field="waist"/);
  assert.match(html,/70 kg/);
  assert.match(html,/80 cm/);
  assert.match(html,/Medición inicial/);
  assert.match(html,/Añadir medida/);
});
