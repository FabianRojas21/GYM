(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaLibrary=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function routineCard(state,routine,programOrder,helpers){
    var count=routine.items.length;
    var replacing=state.confirm==='start:'+routine.id;
    var summary=helpers.routineSummary(routine);
    return '<div class="library-card"><button class="library-open routine-open" data-act="rut-detail" data-id="'+helpers.esc(routine.id)+'"><span class="library-cover routine-cover">'+helpers.esc(routine.name.trim().charAt(0).toUpperCase()||'R')+'</span><span><strong>'+helpers.esc(routine.name)+'</strong><small class="routine-card-volume">'+count+' ejercicio'+(count===1?'':'s')+' · '+summary.workingSets+' series</small><small class="routine-card-meta">'+helpers.esc(helpers.routineMuscleLabel(summary))+' · '+helpers.esc(summary.lastSession?helpers.dFmt(summary.lastSession.date):'Aún no entrenada')+'</small></span></button>'+
      '<div class="library-card-actions">'+
      (programOrder?'<button class="mini program-routine-move" data-act="program-routine-move" data-program="'+helpers.esc(programOrder.programId)+'" data-id="'+helpers.esc(routine.id)+'" data-direction="-1"'+(programOrder.index===0?' disabled':'')+' aria-label="Mover '+helpers.esc(routine.name)+' antes">↑</button><button class="mini program-routine-move" data-act="program-routine-move" data-program="'+helpers.esc(programOrder.programId)+'" data-id="'+helpers.esc(routine.id)+'" data-direction="1"'+(programOrder.index===programOrder.count-1?' disabled':'')+' aria-label="Mover '+helpers.esc(routine.name)+' después">↓</button>':'')+
      '<button class="btn sm" data-act="rut-start" data-id="'+helpers.esc(routine.id)+'">'+(replacing?'Reemplazar':'Entrenar')+'</button><button class="mini" data-act="rut-edit" data-id="'+helpers.esc(routine.id)+'" aria-label="Editar '+helpers.esc(routine.name)+'">✎</button><button class="mini" data-act="rut-duplicate" data-id="'+helpers.esc(routine.id)+'" aria-label="Duplicar '+helpers.esc(routine.name)+'">⧉</button>'+
      (state.confirm==='delr:'+routine.id
        ? '<button class="mini danger" data-act="rut-del-ok" data-id="'+helpers.esc(routine.id)+'" aria-label="Confirmar borrar rutina">✓</button>'
        : '<button class="mini" data-act="rut-del" data-id="'+helpers.esc(routine.id)+'" aria-label="Borrar '+helpers.esc(routine.name)+'">×</button>')+'</div></div>';
  }

  function render(state,helpers){
    var query=String(state.libraryQuery||'').trim().toLocaleLowerCase('es');
    var allRoutines=helpers.routineList();
    var routines=allRoutines.filter(function(routine){return !query||routine.name.toLocaleLowerCase('es').includes(query);});
    var programs=Object.keys(state.profile.programs||{}).map(function(id){return state.profile.programs[id];})
      .sort(function(a,b){return a.name.localeCompare(b.name,'es');})
      .filter(function(program){return !query||program.name.toLocaleLowerCase('es').includes(query);});
    var activeProgram=state.selectedProgram&&state.profile.programs[state.selectedProgram];
    var title=activeProgram?activeProgram.name:'Tu biblioteca';
    var output='<div class="library-heading"><div>'+
      (activeProgram?'<button class="text-button library-back" data-act="program-back">‹ Biblioteca</button>':'')+
      '<h2>'+helpers.esc(title)+'</h2></div>'+
      (state.librarySection==='programas'&&!activeProgram
        ? '<button class="library-add" data-act="program-new" aria-label="Crear programa">＋</button>'
        : state.librarySection==='rutinas'||activeProgram
          ? '<button class="library-add" data-act="rut-new" aria-label="Crear rutina">＋</button>'
          : '')+'</div>';
    output+='<div class="library-filters" role="group" aria-label="Secciones de biblioteca">'+
      ['programas','rutinas','ejercicios'].map(function(section){
        var label=section.charAt(0).toUpperCase()+section.slice(1);
        return '<button class="library-filter'+(state.librarySection===section?' active':'')+'" data-act="library-section" data-section="'+section+'" aria-pressed="'+(state.librarySection===section)+'">'+label+'</button>';
      }).join('')+'</div>';
    if(!state.selectedRoutine&&!state.pedit&&!state.redit){
      var searchLabel=activeProgram?'Buscar rutinas del programa':state.librarySection==='programas'?'Buscar programas':state.librarySection==='rutinas'?'Buscar rutinas':'Buscar ejercicios';
      output+='<label class="field library-search"><span class="lab">'+searchLabel+'</span><input class="txt" type="search" data-library-search autocomplete="off" placeholder="Escribe para filtrar" value="'+helpers.esc(state.libraryQuery||'')+'"></label>';
    }
    if(activeProgram||state.librarySection==='programas'){
      if(activeProgram){
        var programRoutines=helpers.engine.orderedProgramRoutines(activeProgram,routines);
        var hasRoutineOrder=helpers.engine.programRoutineOrderConfigured(activeProgram,routines);
        output+='<div class="library-sort"><span>Secuencia del programa</span><button class="text-button" data-act="program-edit" data-id="'+helpers.esc(activeProgram.id)+'">Editar programa</button></div>'+
          '<p class="small muted program-sequence-hint">'+(hasRoutineOrder?'Usa las flechas para definir qué rutina sigue.':'Orden inicial alfabético. Confirma o ajusta la secuencia para sugerir el próximo día.')+'</p>'+
          '<button class="btn '+(state.profile.activeProgramId===activeProgram.id?'ghost':'')+' sm program-activate" data-act="program-activate" data-id="'+helpers.esc(activeProgram.id)+'"'+(state.profile.activeProgramId===activeProgram.id?' disabled':'')+'>'+
          (state.profile.activeProgramId===activeProgram.id?'Programa activo':hasRoutineOrder?'Usar como programa activo':'Confirmar orden y activar')+'</button>';
        output+=programRoutines.length
          ? '<div class="library-list">'+programRoutines.map(function(routine,index){
              return routineCard(state,routine,{programId:activeProgram.id,index:index,count:programRoutines.length},helpers);
            }).join('')+(!hasRoutineOrder?'<button class="btn ghost sm program-order-save" data-act="program-order-save" data-id="'+helpers.esc(activeProgram.id)+'">Usar este orden</button>':'')+'</div>'
          : query?'<section class="library-empty"><span>⌕</span><p class="eyebrow">Búsqueda</p><h3>No hay rutinas con ese nombre</h3><p>Prueba con otra búsqueda o crea una rutina nueva.</p><button class="btn ghost sm" data-act="rut-new">Crear rutina</button></section>':'<section class="library-empty"><span>▤</span><p class="eyebrow">Programa vacío</p><h3>Este programa todavía no tiene rutinas</h3><p>Añade una rutina nueva y asígnala a este programa.</p><button class="btn" data-act="rut-new">Crear rutina</button></section>';
        if(state.confirm==='delp:'+activeProgram.id) output+='<section class="card"><p>¿Borrar el programa? Las rutinas se conservarán sin asignación.</p><div class="row"><button class="btn danger sm" data-act="program-del-ok" data-id="'+helpers.esc(activeProgram.id)+'">Confirmar: borrar programa</button><button class="btn ghost sm" data-act="program-cancel-delete">Cancelar</button></div></section>';
      }else{
        output+='<div class="library-sort"><span>A-Z · Orden alfabético</span><span class="muted">'+programs.length+' programa'+(programs.length===1?'':'s')+'</span></div>';
        output+='<div class="library-list"><button class="library-card create-card" data-act="program-new"><span class="library-cover">＋</span><span><strong>Crear programa</strong><small>Organiza tus rutinas en un programa</small></span></button>'+
          (programs.length?programs.map(function(program){
            var count=allRoutines.filter(function(routine){return routine.programId===program.id;}).length;
            return '<div class="library-card"><button class="library-open" data-act="program-open" data-id="'+helpers.esc(program.id)+'"><span class="library-cover program-cover">'+helpers.esc(program.name.slice(0,1).toUpperCase())+'</span><span><strong>'+helpers.esc(program.name)+'</strong><small>'+(state.profile.activeProgramId===program.id?'Programa activo · ':'')+count+' rutina'+(count===1?'':'s')+'</small></span></button>'+
              '<button class="mini" data-act="program-del" data-id="'+helpers.esc(program.id)+'" aria-label="Borrar programa '+helpers.esc(program.name)+'">⋮</button></div>';
          }).join(''):(query?'<section class="library-empty"><span>⌕</span><p class="eyebrow">Búsqueda</p><h3>No hay programas con ese nombre</h3><p>Prueba con otra búsqueda o crea un programa.</p><button class="btn ghost sm" data-act="program-new">Crear programa</button></section>':'<section class="library-empty"><span>▤</span><p class="eyebrow">Organiza tu entrenamiento</p><h3>Aún no tienes programas</h3><p>Crea un programa para agrupar rutinas, por ejemplo: Torso/Pierna o Full Body.</p><button class="btn" data-act="program-new">Crear programa</button></section>'))+'</div>';
        if(state.confirm&&state.confirm.indexOf('delp:')===0){
          var deleteId=state.confirm.slice(5), deleteProgram=state.profile.programs[deleteId];
          if(deleteProgram) output+='<section class="card"><p>¿Borrar «'+helpers.esc(deleteProgram.name)+'»? Sus rutinas se conservarán en la biblioteca.</p><button class="btn danger sm" data-act="program-del-ok" data-id="'+helpers.esc(deleteId)+'">Confirmar: borrar programa</button><button class="btn ghost sm" data-act="program-cancel-delete">Cancelar</button></section>';
        }
      }
    }else if(state.librarySection==='rutinas'){
      output+='<div class="library-sort"><span>A-Z · Orden alfabético</span><span class="muted">'+routines.length+' rutinas</span></div>';
      output+=routines.length
        ? '<div class="library-list"><button class="library-card create-card" data-act="rut-new"><span class="library-cover">＋</span><span><strong>Crear rutina</strong><small>Diseña una sesión de entrenamiento</small></span></button>'+routines.map(function(routine){return routineCard(state,routine,null,helpers);}).join('')+'</div>'
        : query?'<section class="library-empty"><span>⌕</span><p class="eyebrow">Búsqueda</p><h3>No hay rutinas con ese nombre</h3><p>Prueba con otra búsqueda o crea una rutina.</p><button class="btn ghost sm" data-act="rut-new">Crear rutina</button></section>':'<section class="library-empty"><span>▤</span><p class="eyebrow">Primer paso</p><h3>Aún no tienes rutinas</h3><p>Crea una rutina desde cero o abre un programa para añadirla ahí.</p><button class="btn" data-act="rut-new">Crear rutina</button></section>';
    }else{
      output+=helpers.viewExercises();
    }
    return output;
  }

  return {render:render};
});
