(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaExerciseList=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function render(state,helpers){
    var query=String(state.libraryQuery||'').trim().toLocaleLowerCase('es');
    var ids=Object.keys(state.profile.exercises).filter(function(id){return !state.profile.exercises[id].archived;})
      .filter(function(id){var exercise=helpers.exById(id);var searchable=helpers.searchText?helpers.searchText(id):exercise.name;return !query||searchable.toLocaleLowerCase('es').includes(query);})
      .sort(function(a,b){
        var dateA=helpers.lastDate(a),dateB=helpers.lastDate(b);
        return dateA===dateB
          ? helpers.exById(a).name.localeCompare(helpers.exById(b).name,'es')
          : (dateA<dateB?1:-1);
      });
    var output='<div class="head-row"><h2>Ejercicios</h2><span class="num muted">'+ids.length+'</span></div>';
    if(!ids.length){
      return output+(query
        ? '<div class="card"><p>No encontramos ejercicios con esa búsqueda. Prueba otro nombre, equipo o grupo muscular.</p></div>'
        : '<div class="card"><p>Aquí verás cada ejercicio con su estado de progresión. Registra un entreno en Hoy para empezar.</p><button class="btn" data-act="tab" data-tab="hoy">Ir a Hoy</button></div>');
    }
    return output+'<div class="list">'+ids.map(function(id){
      var exercise=helpers.exById(id),plan=helpers.planFor(exercise),open=state.openEx===id;
      var goal=plan.status==='nuevo'
        ? 'Sin registros todavía'
        : 'Próximo: '+(plan.displayTarget||(helpers.weightText(plan.nextW)+' × '+plan.target.join(' · ')));
      return '<section class="card exercise-progress-card'+(open?' is-open':'')+'"><button class="exrow" data-act="toggle-ex" data-id="'+helpers.esc(id)+'" aria-expanded="'+(open?'true':'false')+'">'+
        '<div class="top2"><h3>'+helpers.esc(exercise.name)+'</h3>'+helpers.chip(plan.status)+'</div>'+
        '<span class="small muted">'+helpers.esc(goal)+' · '+exercise.sets+'×'+exercise.min+'–'+exercise.max+' reps'+(exercise.unilateral?' por lado':'')+'</span>'+
        (plan.status!=='nuevo'?helpers.barHtml(plan,exercise):'')+
        '<span class="exercise-expand-hint"><span>'+(open?'Ocultar detalles':'Ver progreso y ajustes')+'</span><span class="exercise-expand-icon" aria-hidden="true">⌄</span></span>'+
        '</button>'+(open?helpers.exDetail(exercise):'')+'</section>';
    }).join('')+'</div>';
  }

  return {render:render};
});
