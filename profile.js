(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaProfile=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function profileNav(section){
    return '<div class="seg profile-nav" role="group" aria-label="Secciones de tu perfil">'+
      [['resumen','Resumen'],['ejercicios','Ejercicios'],['medidas','Medidas']].map(function(item){
        return '<button aria-pressed="'+(section===item[0])+'" data-act="profile-section" data-section="'+item[0]+'">'+item[1]+'</button>';
      }).join('')+'</div>';
  }

  function profileExercises(state,helpers){
    var counts={}, last={}, volumes={};
    state.sessions.forEach(function(session){session.entries.forEach(function(entry){
      counts[entry.exId]=(counts[entry.exId]||0)+1;
      if(!last[entry.exId]||session.date>last[entry.exId]) last[entry.exId]=session.date;
      entry.sets.forEach(function(set){
        if(helpers.validWeight(set.w)&&Number(set.r)>0&&helpers.countsForProgress(set)){
          var exercise=helpers.exById(entry.exId);
          volumes[entry.exId]=(volumes[entry.exId]||0)+helpers.effectiveWeight(exercise||{},set,session.date)*Number(set.r);
        }
      });
    });});
    var ids=Object.keys(state.profile.exercises).filter(function(id){return !state.profile.exercises[id].archived;});
    ids.sort(function(a,b){
      var exerciseA=helpers.exById(a), exerciseB=helpers.exById(b);
      if(state.exerciseSort==='name') return exerciseA.name.localeCompare(exerciseB.name,'es');
      if(state.exerciseSort==='most') return (counts[b]||0)-(counts[a]||0)||(exerciseA.name.localeCompare(exerciseB.name,'es'));
      if(state.exerciseSort==='volume') return (volumes[b]||0)-(volumes[a]||0)||(exerciseA.name.localeCompare(exerciseB.name,'es'));
      return (last[b]||'').localeCompare(last[a]||'')||exerciseA.name.localeCompare(exerciseB.name,'es');
    });
    var sort='<label class="field"><span class="lab">Ordenar ejercicios</span><select class="txt" data-profile-exercise-sort><option value="recent"'+(state.exerciseSort==='recent'?' selected':'')+'>Reciente</option><option value="most"'+(state.exerciseSort==='most'?' selected':'')+'>Más realizado</option><option value="volume"'+(state.exerciseSort==='volume'?' selected':'')+'>Mayor volumen</option><option value="name"'+(state.exerciseSort==='name'?' selected':'')+'>Alfabético</option></select></label>';
    var cards=ids.length?ids.map(function(id){
      var exercise=helpers.exById(id), lastDateText=last[id]?helpers.dFmt(last[id]):'Nunca realizado';
      return '<button class="card profile-exercise-card" data-act="profile-open-exercise" data-id="'+helpers.esc(id)+'"><span><strong>'+helpers.esc(exercise.name)+'</strong><small>'+ (counts[id]||0)+' entrenos · Último: '+helpers.esc(lastDateText)+'</small></span><span class="num">'+helpers.esc(helpers.volumeText(volumes[id]||0))+' '+helpers.weightUnitLabel()+'·reps</span></button>';
    }).join(''):'<div class="card"><p class="muted">Añade ejercicios desde la biblioteca para verlos aquí.</p></div>';
    return '<section class="card"><p class="sec-title">Tus ejercicios</p>'+sort+'</section><div class="list">'+cards+'</div>';
  }

  function measurementChart(state,field,helpers){
    var points=state.profile.measurements.filter(function(measurement){
      return measurement.values[field]!==undefined&&measurement.values[field]!==null&&Number.isFinite(Number(measurement.values[field]));
    }).sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(measurement){
      return {label:helpers.dFmt(measurement.date),y:field==='weight'?helpers.fromKg(measurement.values[field]):Number(measurement.values[field])};
    });
    if(points.length<2) return '';
    var unit=field==='weight'?helpers.weightUnitLabel():(field==='bodyFat'?'%':'cm');
    return helpers.chartSvg(points,unit);
  }

  function profileMeasurements(state,measurementFields,helpers){
    var latest=state.profile.measurements.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var form=state.measurementForm?'<section class="card"><p class="sec-title">Nueva medición</p><div class="fields"><div class="field"><label class="lab" for="measurement-date">Fecha</label><input id="measurement-date" class="txt" type="date" value="'+helpers.esc(helpers.iso(new Date()))+'"></div>'+Object.keys(measurementFields).map(function(key){
      return '<div class="field"><label class="lab" for="measurement-'+key+'">'+helpers.esc(measurementFields[key])+' '+((key==='weight'?'('+helpers.weightUnitLabel()+')':(key==='bodyFat'?'(%)':'(cm)')))+'</label><input id="measurement-'+key+'" class="txt" inputmode="decimal" data-measurement-field="'+key+'"></div>';
    }).join('')+'</div><div class="field"><label class="lab" for="measurement-notes">Notas</label><textarea id="measurement-notes" class="txt" rows="3"></textarea></div><div class="row"><button class="btn sm" data-act="measurement-save">Guardar medición</button><button class="btn ghost sm" data-act="measurement-cancel">Cancelar</button></div></section>':'';
    var rows=latest.map(function(measurement){
      var values=Object.keys(measurement.values).map(function(key){
        return '<span>'+helpers.esc(measurementFields[key]||key)+': <strong>'+
          (key==='weight'?helpers.weightInput(measurement.values[key]):helpers.fmt(measurement.values[key]))+
          (key==='bodyFat'?' %':' '+(key==='weight'?helpers.weightUnitLabel():'cm'))+'</strong></span>';
      }).join(' · ');
      return '<section class="card"><div class="row" style="justify-content:space-between"><p class="sec-title">'+helpers.esc(helpers.dFmt(measurement.date))+'</p><button class="icon" data-act="measurement-delete" data-id="'+helpers.esc(measurement.id)+'" aria-label="Eliminar medición">×</button></div><p class="small">'+(values||'Sin datos')+'</p>'+
        (measurement.notes?'<p class="small muted">'+helpers.esc(measurement.notes)+'</p>':'')+'</section>';
    }).join('');
    var currentWeight=latest.filter(function(measurement){return measurement.values.weight!==undefined;})[0];
    var chart=currentWeight?measurementChart(state,'weight',helpers):'';
    return '<div class="head-row"><h2>Medidas corporales</h2><button class="btn sm" data-act="measurement-new">Añadir medida</button></div>'+form+
      (chart?'<section class="card"><p class="sec-title">Evolución del peso</p>'+chart+'</section>':'')+
      (rows||'<div class="card"><p class="muted">Todavía no tienes mediciones corporales.</p></div>');
  }

  function render(options){
    var state=options.state, helpers=options.helpers;
    var output='<div class="head-row"><h2>Yo</h2></div>'+profileNav(state.profileSection);
    if(state.profileSection==='ejercicios') return output+profileExercises(state,helpers);
    if(state.profileSection==='medidas') return output+profileMeasurements(state,options.measurementFields,helpers);
    return output+helpers.profileSummary();
  }

  return {render:render};
});
