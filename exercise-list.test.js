'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {render}=require('./exercise-list.js');

const exercise=(id,name,archived=false)=>({id,name,archived,sets:3,min:8,max:12,unilateral:false});
const helpers={
  lastDate:id=>({press:'2026-11-02',row:'2026-11-05'}[id]||''),
  exById:id=>helpers.exercises[id],
  planFor:item=>item.id==='new'?{status:'nuevo'}:{status:'reps',displayTarget:'50 kg × 10 · 9 · 8',target:[10,9,8],nextW:50},
  weightText:value=>value+' kg',
  esc:value=>String(value),
  chip:status=>'<span class="chip">'+status+'</span>',
  barHtml:()=>'<div class="progress"></div>',
  exDetail:item=>'<div class="details">'+item.id+'</div>',
  exercises:{
    press:exercise('press','Press banca'),
    row:exercise('row','Remo'),
    new:exercise('new','Curl'),
    archived:exercise('archived','Archivado',true)
  }
};

test('empty exercise list offers a route back to today',()=>{
  const html=render({profile:{exercises:{}},openEx:null},helpers);
  assert.match(html,/<h2>Ejercicios<\/h2>/);
  assert.match(html,/data-tab="hoy"/);
  assert.match(html,/>0<\/span>/);
});

test('exercise list sorts by latest activity, hides archived items and displays progression',()=>{
  const html=render({profile:{exercises:helpers.exercises},openEx:null},helpers);
  assert.ok(html.indexOf('Remo')<html.indexOf('Press banca'));
  assert.ok(!html.includes('Archivado'));
  assert.match(html,/Próximo: 50 kg × 10 · 9 · 8/);
  assert.match(html,/Sin registros todavía/);
  assert.match(html,/Ver progreso y ajustes/);
});

test('expanded exercise delegates detail rendering and exposes accessible toggle state',()=>{
  const html=render({profile:{exercises:helpers.exercises},openEx:'press'},helpers);
  assert.match(html,/class="card exercise-progress-card is-open"/);
  assert.match(html,/data-act="toggle-ex" data-id="press" aria-expanded="true"/);
  assert.match(html,/Ocultar detalles/);
  assert.match(html,/<div class="details">press<\/div>/);
  assert.match(html,/<div class="progress"><\/div>/);
});

test('exercise search filters by name or helper-provided catalog metadata',()=>{
  const html=render({profile:{exercises:helpers.exercises},openEx:null,libraryQuery:'pecho'},{
    ...helpers,
    searchText:id=>id==='press'?'Press banca Pecho Barra':'Remo Espalda'
  });
  assert.match(html,/Press banca/);
  assert.doesNotMatch(html,/>Remo</);
  const noResults=render({profile:{exercises:helpers.exercises},openEx:null,libraryQuery:'pierna'},helpers);
  assert.match(noResults,/No encontramos ejercicios con esa búsqueda/);
});
