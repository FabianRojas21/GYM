(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaSettings=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function render(options){
    var state=options.state, helpers=options.helpers;
    var settings=state.profile.settings, targetRir=settings.targetRir;
    var section=state.settingsSection||'home';
    var hasDemo=state.sessions.some(function(session){return session.demo;});
    var trainingHtml='<section class="card"><p class="sec-title">Unidades de peso</p><label class="field"><span class="lab">Mostrar e ingresar pesos en</span><select class="txt" data-setting="weightUnit"><option value="kg"'+(settings.weightUnit==='kg'?' selected':'')+'>Kilogramos (kg)</option><option value="lb"'+(settings.weightUnit==='lb'?' selected':'')+'>Libras (lb)</option></select></label><p class="small muted">Cambiar esta opción solo convierte lo que ves y escribes. Los datos se conservan en kg para mantener la sincronización, el historial y la progresión consistentes.</p></section>';
    trainingHtml+='<section class="card"><p class="sec-title">Objetivo del entrenamiento</p><label class="field"><span class="lab">Qué priorizas hoy</span><select class="txt" data-setting="trainingGoal"><option value="hypertrophy"'+(settings.trainingGoal==='hypertrophy'?' selected':'')+'>Hipertrofia</option><option value="strength"'+(settings.trainingGoal==='strength'?' selected':'')+'>Fuerza</option><option value="volume"'+(settings.trainingGoal==='volume'?' selected':'')+'>Volumen</option></select></label><p class="small muted">Esto cambia la forma en que la app interpreta la recomendación del siguiente entrenamiento: fuerza suele priorizar intensidad, volumen prioriza repeticiones y hipertrofia mantiene el equilibrio.</p></section>';
    trainingHtml+='<section class="card"><p class="sec-title">Escala de esfuerzo</p><div class="seg" role="group" aria-label="Escala de esfuerzo">'+
      '<button data-act="set-mode" data-mode="rir" aria-pressed="'+(settings.mode==='rir')+'">RIR</button>'+
      '<button data-act="set-mode" data-mode="rpe" aria-pressed="'+(settings.mode==='rpe')+'">RPE</button></div>'+
      '<p class="small muted">RIR son las repeticiones que te sobraron al terminar la serie. RPE es el esfuerzo de 1 a 10. RPE 8 equivale a RIR 2.</p>'+
      '<p class="lab">Esfuerzo objetivo por defecto</p><div class="stepper"><button class="btn ghost sm" data-act="tr-minus" aria-label="Bajar esfuerzo objetivo">−</button>'+
      '<span class="v">'+(settings.mode==='rpe'?'RPE '+helpers.fmt(10-targetRir):'RIR '+targetRir)+'</span><button class="btn ghost sm" data-act="tr-plus" aria-label="Subir RIR objetivo">+</button></div>'+
      '<p class="small muted">Se usa en ejercicios sueltos. En una rutina puedes fijar el esfuerzo de cada serie. Se sube de peso cuando todas las series llegan al tope sin quedar más de una repetición por debajo del esfuerzo pedido.</p></section>';
    var restHtml='<section class="card"><p class="sec-title">Temporizador de descanso</p><div class="field"><label class="lab" for="rest-setting">Series efectivas y back-off</label><select id="rest-setting" class="txt" data-setting="restSeconds">'+
      [60,90,120,180,300].map(function(seconds){return '<option value="'+seconds+'"'+(Number(settings.restSeconds)===seconds?' selected':'')+'>'+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' min</option>';}).join('')+
      '</select></div><div class="field"><label class="lab" for="warmup-rest-setting">Series de aproximación</label><select id="warmup-rest-setting" class="txt" data-setting="warmupRestSeconds">'+
      [0,15,30,45,60,90,120].map(function(seconds){return '<option value="'+seconds+'"'+(Number(settings.warmupRestSeconds)===seconds?' selected':'')+'>'+(seconds?seconds+' s':'Sin temporizador')+'</option>';}).join('')+
      '</select></div><p class="small muted">El descanso empieza al completar una serie (en unilateral, al completar ambos lados). Drop set y rest-pause no inician el temporizador automáticamente. También puedes iniciarlo manualmente.</p></section>';
    restHtml+='<section class="card"><p class="sec-title">Recordatorio de entrenamiento</p><label class="field setting-toggle"><input type="checkbox" data-setting="reminderEnabled"'+(settings.reminderEnabled?' checked':'')+'><span>Mostrar un recordatorio dentro de la app</span></label>'+
      '<div class="field"><label class="lab" for="reminder-interval">Después de cuántos días sin entrenar</label><select id="reminder-interval" class="txt" data-setting="reminderIntervalDays">'+
      [2,3,5,7].map(function(days){return '<option value="'+days+'"'+(Number(settings.reminderIntervalDays)===days?' selected':'')+'>'+days+' días</option>';}).join('')+
      '</select></div><p class="small muted">Aparece al abrir Hoy cuando haya pasado el intervalo desde tu último entreno. Solo es un aviso dentro de la app: no recibirás notificaciones con la app cerrada. Desactivado por defecto.</p></section>';
    var progressionHtml='<section class="card"><p class="sec-title">Valores anteriores al entrenar</p><div class="field"><label class="lab" for="previous-exercise-scope">Buscar el entreno anterior del ejercicio</label><select id="previous-exercise-scope" class="txt" data-setting="previousExerciseScope"><option value="any"'+(settings.previousExerciseScope==='any'?' selected':'')+'>La última vez que hice el ejercicio, en cualquier rutina</option><option value="sameRoutine"'+(settings.previousExerciseScope==='sameRoutine'?' selected':'')+'>La última vez que hice el ejercicio en esta rutina</option></select></div><p class="small muted">Al añadir un ejercicio, la app precarga peso, repeticiones y esfuerzo de la sesión encontrada, y muestra la comparación. Los datos se pueden editar. «Esta rutina» solo encuentra resultados cuando el entreno actual parte de una rutina.</p></section>';
    progressionHtml+='<section class="card"><details class="how"><summary>Cómo decide la app</summary><ul class="small">'+
      '<li>Cada ejercicio tiene series y un rango de repeticiones, por ejemplo 3×8–12.</li>'+
      '<li>Mantienes el peso y sumas repeticiones hasta llegar al tope en todas las series.</li>'+
      '<li>Con el tope en todas las series y esfuerzo razonable, el siguiente entreno sube de peso y vuelves al mínimo de reps.</li>'+
      '<li>Si llegas al tope pero al límite, repites el peso para confirmar.</li>'+
      '<li>Si sobran muchas repeticiones (RIR alto), la app te sugiere subir antes.</li>'+
      '<li>Dos entrenos seguidos bajo el mínimo con el mismo peso sugieren bajar cerca de 10%.</li>'+
      '<li>Las series marcadas con C son calentamiento y no cuentan.</li></ul></details></section>';
    var calculatorHtml=helpers.loadToolSettingsHtml();
    var goalsHtml=helpers.goalsHtml();

    var accountHtml='';
    if(options.firebaseEnabled){
      if(state.cloudUser){
        var cloudLoading=!state.ready&&!state.syncUnavailable;
        var cloudStatus=state.syncUnavailable
          ? 'La cuenta no terminó de cargar; los datos locales no se subirán hasta verificar primero la nube.'
          : cloudLoading
            ? 'Cargando y verificando los datos de la cuenta. No sincronices todavía.'
            : 'Tus datos se sincronizan en todos tus dispositivos.';
        var cloudChip=state.syncUnavailable?'Guardado local':cloudLoading?'Cargando cuenta…':'Sincronización activa';
        var cloudChipClass=state.syncUnavailable||cloudLoading?'warn':'ok';
        var syncLabel=state.cloudSyncing?'Sincronizando…':state.syncUnavailable?'Reintentar conexión':cloudLoading?'Cargando cuenta…':'Sincronizar ahora';
        accountHtml='<section class="card"><p class="sec-title">Cuenta y sincronización</p><p class="small">Conectado como <strong>'+helpers.esc(state.cloudUser.email||state.cloudUser.displayName||'usuario')+'</strong>. '+cloudStatus+'</p><div class="row"><span class="chip '+cloudChipClass+'">'+cloudChip+'</span><button class="btn ghost sm" data-act="cloud-sync"'+(state.cloudSyncing||cloudLoading?' disabled':'')+'>'+syncLabel+'</button><button class="btn ghost sm" data-act="cloud-signout">Cerrar sesión</button></div></section>';
      }else{
        accountHtml='<section class="card"><p class="sec-title">Cuenta y sincronización</p><p class="small">Inicia sesión con Google para mantener tus datos en varios dispositivos y recuperarlos si cambias de navegador.</p><div class="row"><button class="btn sm" data-act="cloud-signin">Continuar con Google</button></div></section>';
      }
    }
    var dataHtml='<section class="card settings-data-card"><p class="sec-title">Tus datos</p><p class="small">'+
      (['db','cloud'].includes(state.kind)?'Se guardan en tu cuenta y solo tú los ves. Los abres desde cualquier dispositivo.':state.syncUnavailable?'Se guardan en este navegador mientras la nube no esté disponible. Usa «Sincronizar ahora» cuando vuelva la conexión.':'Se guardan solo en este navegador. Inicia sesión arriba para sincronizarlos.')+'</p>'+
      helpers.backupStatusHtml()+'<div class="row settings-data-actions">'+
      '<button class="btn ghost sm" data-act="auto-restore"'+(helpers.hasAutoBackup()?'':' disabled')+'>Restaurar última copia automática</button>'+
      '<button class="btn ghost sm" data-act="export">Descargar respaldo</button><button class="btn ghost sm" data-act="import">Restaurar respaldo</button>'+
      '<button class="btn ghost sm" data-act="export-csv">Exportar CSV</button><button class="btn ghost sm" data-act="import-csv">Importar CSV</button>'+
      '<button class="btn ghost sm" data-act="import-routine">Importar rutina</button>'+
      (hasDemo?'<button class="btn ghost sm" data-act="demo-clear">Quitar datos de ejemplo</button>':'<button class="btn ghost sm" data-act="demo-load">Cargar datos de ejemplo</button>')+
      (state.confirm==='wipe'?'<button class="btn danger sm" data-act="wipe-ok">Confirmar: borrar todo</button>':'<button class="btn danger sm" data-act="wipe">Borrar todo</button>')+
      '</div><input id="backup-file" type="file" accept="application/json,.json" hidden><input id="csv-file" type="file" accept="text/csv,.csv" hidden><input id="routine-file" type="file" accept="application/json,.json" hidden>'+
      (state.pendingImport?'<div class="restore-confirm"><p class="small">El respaldo contiene '+Object.keys(state.pendingImport.profile.exercises).length+' ejercicios, '+Object.keys(state.pendingImport.profile.routines).length+' rutinas y '+state.pendingImport.sessions.length+' entrenos. Se combinará con los datos actuales: no se borrarán entrenos existentes y, si un ID ya existe, se conservará la versión actual.</p><div class="row"><button class="btn sm" data-act="import-confirm">Combinar respaldo</button><button class="btn ghost sm" data-act="import-cancel">Cancelar</button></div></div>':'')+
      '</section>';
    var categories=[
      {id:'training',title:'Entrenamiento',description:'Unidades · objetivo · RIR/RPE',icon:'↗'},
      {id:'rest',title:'Descanso y recordatorios',description:'Temporizadores · aviso de entrenamiento',icon:'◷'},
      {id:'calculator',title:'Calculadora de discos',description:'Barras · máquinas · discos',icon:'◉'},
      {id:'progression',title:'Progresión',description:'Valores anteriores · cómo decide la app',icon:'⇧'},
      {id:'goals',title:'Objetivos',description:'Revisa y administra tus metas',icon:'◎'},
      {id:'account',title:'Cuenta y sincronización',description:'Estado de conexión · iniciar o cerrar sesión',icon:'☁',enabled:!!options.firebaseEnabled},
      {id:'data',title:'Datos y respaldos',description:'Importar · exportar · copias · ejemplos',icon:'▤'}
    ].filter(function(category){return category.enabled!==false;});
    var content={
      training:trainingHtml,
      rest:restHtml,
      calculator:calculatorHtml,
      progression:progressionHtml,
      goals:goalsHtml,
      account:accountHtml,
      data:dataHtml
    };
    var current=categories.filter(function(category){return category.id===section;})[0];
    if(section==='home'||!current){
      var cards=categories.map(function(category){
        return '<button class="settings-category-card" data-act="settings-section" data-section="'+category.id+'"><span class="settings-category-icon" aria-hidden="true">'+category.icon+'</span><span class="settings-category-copy"><strong>'+category.title+'</strong><small>'+category.description+'</small></span><span class="settings-category-arrow" aria-hidden="true">›</span></button>';
      }).join('');
      return '<div class="head-row"><div><h2>Ajustes</h2><p class="small muted">Personaliza cómo funciona Sobrecarga.</p></div></div><div class="list settings-category-list">'+cards+'</div>';
    }
    return '<div class="head-row settings-subpage-heading"><div><button class="text-button settings-back" data-act="settings-home">‹ Ajustes</button><h2>'+current.title+'</h2></div></div>'+content[section];
  }

  return {render:render};
});
