'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {render}=require('./library.js');

const routine={id:'full-body',name:'Cuerpo completo',items:[{exId:'press',sets:3}]};
const baseState={
  profile:{programs:{},routines:{},activeProgramId:null},
  selectedProgram:null,
  librarySection:'rutinas',
  confirm:null
};
const helpers={
  routineList:()=>[routine],
  routineSummary:()=>({workingSets:3,lastSession:null}),
  routineMuscleLabel:()=> 'Pecho',
  esc:value=>String(value),
  dFmt:value=>value,
  engine:{
    orderedProgramRoutines:program=>program.routines||[],
    programRoutineOrderConfigured:program=>!!program.configured
  },
  viewExercises:()=>'<section>Vista de ejercicios</section>'
};

test('library renders routine cards and routine creation actions',()=>{
  const html=render(baseState,helpers);
  assert.match(html,/Tu biblioteca/);
  assert.match(html,/data-act="library-section" data-section="rutinas"/);
  assert.match(html,/data-section="rutinas" aria-pressed="true"/);
  assert.match(html,/Cuerpo completo/);
  assert.match(html,/3 series/);
  assert.match(html,/data-act="rut-start"/);
  assert.match(html,/data-act="rut-edit"/);
  assert.match(html,/data-act="rut-duplicate"/);
  assert.match(html,/data-library-search/);
});

test('library search filters routine cards and gives a useful empty state',()=>{
  const matched=render({...baseState,libraryQuery:'cuerpo'},helpers);
  assert.match(matched,/Cuerpo completo/);
  const empty=render({...baseState,libraryQuery:'pierna'},helpers);
  assert.match(empty,/No hay rutinas con ese nombre/);
  assert.match(empty,/data-library-search/);
});

test('library renders ordered program routines with movement controls',()=>{
  const program={id:'p1',name:'Programa de fuerza',routines:[routine],configured:false};
  const state={
    ...baseState,
    profile:{programs:{p1:program},routines:{[routine.id]:routine},activeProgramId:null},
    selectedProgram:'p1',
    confirm:'delp:p1'
  };
  const html=render(state,helpers);
  assert.match(html,/Programa de fuerza/);
  assert.match(html,/data-act="program-routine-move"/);
  assert.match(html,/data-act="program-order-save"/);
  assert.match(html,/Confirmar: borrar programa/);
  const configuredHtml=render({
    ...state,
    profile:{programs:{p1:{...program,configured:true}},routines:{[routine.id]:routine},activeProgramId:null}
  },helpers);
  assert.match(configuredHtml,/Usar como programa activo/);
});

test('library delegates its exercise section without coupling the catalog view',()=>{
  const state={...baseState,librarySection:'ejercicios'};
  assert.match(render(state,helpers),/Vista de ejercicios/);
});
