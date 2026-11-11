(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaRoutineViews=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function programEditor(state,helpers){
    var program=state.pedit, isNew=!program.id;
    return '<div class="library-heading"><button class="text-button" data-act="program-cancel">‹ Biblioteca</button></div><section class="card"><h2>'+(isNew?'Crear programa':'Editar programa')+'</h2>'+
      '<div class="field"><label class="lab" for="program-name">Nombre del programa</label><input id="program-name" class="txt" data-pf="name" value="'+helpers.esc(program.name)+'" placeholder="Ej. Torso/Pierna"></div>'+
      '<p class="small muted">Agrupa rutinas relacionadas para encontrarlas fácilmente en tu biblioteca.</p><div class="row"><button class="btn" data-act="program-save">Guardar programa</button><button class="btn ghost" data-act="program-cancel">Cancelar</button></div></section>';
  }

  function routineDetail(state,routine,helpers){
    var program=routine.programId&&state.profile.programs[routine.programId];
    var active=state.profile.activeRoutineId===routine.id;
    var summary=helpers.routineSummary(routine);
    var exercises=routine.items.map(function(item){
      var exercise=helpers.exById(item.exId);
      return '<div class="library-exercise-row"><span class="exercise-mark" aria-hidden="true">'+helpers.esc(helpers.exName(item.exId).trim().charAt(0).toUpperCase())+'</span><span><strong>'+helpers.esc(helpers.exName(item.exId))+'</strong><small>'+
        helpers.esc(helpers.routineItemPlanSummary(item))+(item.unilateral?' · por lado':'')+
        (exercise&&exercise.archived?' · ejercicio archivado (se omitirá al entrenar)':'')+'</small><small class="routine-exercise-history">'+helpers.esc(helpers.routineExerciseHistory(item.exId))+'</small></span></div>';
    }).join('');
    return '<div class="library-heading"><div><button class="text-button library-back" data-act="routine-back">‹ '+(program?helpers.esc(program.name):'Biblioteca')+'</button><h2>'+helpers.esc(routine.name)+'</h2></div>'+
      '<button class="library-add" data-act="rut-edit" data-id="'+helpers.esc(routine.id)+'" aria-label="Editar rutina">✎</button></div>'+
      '<div class="library-routine-summary routine-detail-summary"><span>'+routine.items.length+' ejercicio'+(routine.items.length===1?'':'s')+'</span><span>'+summary.workingSets+' series de trabajo'+(summary.warmupSets?' · '+summary.warmupSets+' aproximaciones':'')+'</span><span>'+helpers.esc(helpers.routineMuscleLabel(summary))+'</span><span>Último entreno: '+helpers.esc(summary.lastSession?helpers.dFmt(summary.lastSession.date):'Aún no entrenada')+'</span>'+
      (program?'<span>'+helpers.esc(program.name)+'</span>':'')+'</div>'+
      '<div class="library-exercises">'+(exercises||'<p class="muted">Añade ejercicios a esta rutina desde Editar.</p>')+'</div>'+
      '<div class="row"><button class="btn home-start" data-act="rut-start" data-id="'+helpers.esc(routine.id)+'"><span aria-hidden="true">▶</span> Entrenar rutina</button><button class="btn '+(active?'ghost':'')+'" data-act="routine-activate" data-id="'+helpers.esc(routine.id)+'"'+(active?' disabled':'')+'>'+(active?'Rutina activa':'Usar como rutina activa')+'</button><button class="btn ghost" data-act="rut-duplicate" data-id="'+helpers.esc(routine.id)+'">Duplicar rutina</button><button class="btn ghost" data-act="rut-export" data-id="'+helpers.esc(routine.id)+'">Compartir rutina</button></div>';
  }

  function routineEditor(state,helpers){
    var routine=state.redit;
    var output='<div class="routine-editor"><div class="head-row"><h2>'+(routine.id?'Editar rutina':'Nueva rutina')+'</h2></div>';
    output+='<section class="card routine-editor-settings"><div class="field"><label class="lab" for="r-name">Nombre de la rutina</label>'+
      '<input id="r-name" class="txt" type="text" data-rf="name" autocomplete="off" placeholder="Por ejemplo Empuje A" value="'+helpers.esc(routine.name)+'"></div>'+
      '<div class="field"><label class="lab" for="r-program">Programa</label><select id="r-program" class="txt" data-routine-program><option value="">Sin programa</option>'+
      Object.keys(state.profile.programs||{}).map(function(id){
        var program=state.profile.programs[id];
        return '<option value="'+helpers.esc(id)+'"'+(routine.programId===id?' selected':'')+'>'+helpers.esc(program.name)+'</option>';
      }).join('')+'</select></div>'+
      '<p class="hint">Los ajustes de cada ejercicio valen solo en esta rutina. Con mancuernas, el salto es por mancuerna. Los datos se guardan internamente en kg y se convierten según la unidad elegida.</p></section>';
    routine.items.forEach(function(item,index){
      var warmCfg=helpers.warmupSettings(item);
      var field=function(key,label,value){
        var weightSetting=['inc','loadStep','warmupStep','maxProgressIncrease'].includes(key);
        return '<div class="field"><label class="lab" for="it-'+key+'-'+index+'">'+label+'</label><input id="it-'+key+'-'+index+'" class="txt" inputmode="decimal" data-it="'+key+'" data-i="'+index+'" value="'+helpers.esc(weightSetting?helpers.weightInput(value):String(value).replace('.',','))+'"></div>';
      };
      output+='<section class="card routine-editor-item"><div class="card-head"><div class="routine-editor-title"><span class="routine-item-index">'+String(index+1).padStart(2,'0')+'</span><h3>'+helpers.esc(helpers.exName(item.exId))+'</h3></div><div class="it-tools">'+
        '<button class="mini" data-act="rut-up" data-i="'+index+'"'+(index===0?' disabled':'')+' aria-label="Subir ejercicio">↑</button>'+
        '<button class="mini" data-act="rut-down" data-i="'+index+'"'+(index===routine.items.length-1?' disabled':'')+' aria-label="Bajar ejercicio">↓</button>'+
        '<button class="mini" data-act="rut-rm-item" data-i="'+index+'" aria-label="Quitar ejercicio">×</button></div></div>'+
        '<div class="fields">'+field('inc','Salto de progresión ('+helpers.weightUnitLabel()+')',item.inc)+
        field('loadStep','Peso disponible cada ('+helpers.weightUnitLabel()+')',Number(item.loadStep)>0?item.loadStep:helpers.exerciseLoadStep(helpers.exById(item.exId)||item))+
        field('maxProgressIncrease','Salto máximo aceptable ('+helpers.weightUnitLabel()+', 0 = sin límite)',Number(item.maxProgressIncrease)||0)+
        '<div class="field"><label class="lab" for="it-progressionMode-'+index+'">Estrategia de progresión</label><select id="it-progressionMode-'+index+'" class="txt" data-it="progressionMode" data-i="'+index+'"><option value="double"'+(item.progressionMode==='weight'?'':' selected')+'>Doble: sumar reps y luego peso</option><option value="weight"'+(item.progressionMode==='weight'?' selected':'')+'>Peso primero: subir al cumplir el mínimo de reps</option></select></div>'+
        '<div class="field"><label class="lab" for="it-warmupMode-'+index+'">Peso de aproximación</label><select id="it-warmupMode-'+index+'" class="txt" data-it="warmupMode" data-i="'+index+'"><option value="auto"'+(warmCfg.warmupMode==='auto'?' selected':'')+'>Calcular automáticamente</option><option value="manual"'+(warmCfg.warmupMode==='manual'?' selected':'')+'>Anotar manualmente</option></select></div>'+
        field('warmupStep','Incremento para redondear ('+helpers.weightUnitLabel()+')',warmCfg.warmupStep)+
        '<div class="field"><label class="lab" for="it-unilateral-'+index+'">Ejecución</label><select id="it-unilateral-'+index+'" class="txt" data-it="unilateral" data-i="'+index+'"><option value="false"'+(item.unilateral?'':' selected')+'>Bilateral</option><option value="true"'+(item.unilateral?' selected':'')+'>Unilateral · ambos lados</option></select></div></div>'+
        helpers.setPlanEditorHtml(item,index)+
        '<p class="small muted">Las series elegidas para progresar determinan el objetivo. '+(warmCfg.warmupMode==='auto'?'Las aproximaciones se calculan desde el peso de trabajo y se redondean en saltos de '+helpers.weightText(warmCfg.warmupStep)+'. ':'Las aproximaciones se registran con peso manual. ')+(Number(item.maxProgressIncrease)>0?'Si el salto supera '+helpers.weightText(item.maxProgressIncrease)+', se mantiene el peso.':'')+'</p></section>';
    });
    if(routine.pick) output+=helpers.pickerHtml('routine');
    else output+='<button class="btn ghost block" data-act="rut-add">+ Añadir ejercicio</button>';
    output+='<div class="row"><button class="btn" data-act="rut-save">Guardar rutina</button><button class="btn ghost" data-act="rut-cancel">Cancelar</button></div>';
    return output+'</div>';
  }

  return {programEditor:programEditor,routineDetail:routineDetail,routineEditor:routineEditor};
});
