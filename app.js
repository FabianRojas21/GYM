(function(){
'use strict';

/* ---------- utilidades ---------- */
var $ = function(s, el){ return (el||document).querySelector(s); };
var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var fmt = function(n){ return (Math.round(n*100)/100).toString().replace('.', ','); };
var fmt1 = function(n){ return (Math.round(n*10)/10).toString().replace('.', ','); };
var num = typeof SobrecargaBackup !== 'undefined' && typeof SobrecargaBackup.parseNumber === 'function'
  ? SobrecargaBackup.parseNumber
  : function(value){
      if(value === null || value === undefined || String(value).trim() === '') return null;
      var raw = String(value).trim();
      if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) return null;
      var number = Number(raw.replace(',', '.'));
      return Number.isFinite(number) ? number : null;
    };
var validWeight = function(v){ var n=num(v); return n !== null && n >= 0; };
var clone = function(o){ return JSON.parse(JSON.stringify(o)); };
var roundTo = function(x, step){ return Math.round(x/step)*step; };
var iso = function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
var parseISO = function(s){ var p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); };
function validDate(value){
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  var parsed=parseISO(value);
  return !isNaN(parsed.getTime()) && iso(parsed)===value;
}
var dFmt = function(s, o){ return new Intl.DateTimeFormat('es-CL', o || {day:'numeric', month:'short'}).format(parseISO(s)); };
var use = function(n){ try { return (window.claude && window.claude.use) ? window.claude.use(n) : Promise.resolve(null); } catch(e){ return Promise.resolve(null); } };
var uid = function(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2,5); };
var clientDeviceId = (function(){
  var key='sobrecarga:device-id';
  try { var saved=localStorage.getItem(key); if(saved) return saved; var id=uid('device'); localStorage.setItem(key,id); return id; }
  catch(e){ return uid('device'); }
})();
var clientWriterId=clientDeviceId+':'+uid('tab');

/* ---------- catálogo sugerido ---------- */
var LIB = [
  {name:'Press banca', sets:3, min:6, max:10, inc:2.5},
  {name:'Sentadilla', sets:3, min:6, max:10, inc:2.5},
  {name:'Peso muerto', sets:3, min:5, max:8, inc:5},
  {name:'Press militar', sets:3, min:6, max:10, inc:2.5},
  {name:'Remo con barra', sets:3, min:8, max:12, inc:2.5},
  {name:'Dominadas lastradas', sets:3, min:5, max:8, inc:2.5},
  {name:'Press inclinado con mancuernas', sets:3, min:8, max:12, inc:2},
  {name:'Peso muerto rumano', sets:3, min:8, max:12, inc:2.5},
  {name:'Prensa de piernas', sets:3, min:10, max:15, inc:5},
  {name:'Hip thrust', sets:3, min:8, max:12, inc:5},
  {name:'Jalón al pecho', sets:3, min:8, max:12, inc:2.5},
  {name:'Curl de bíceps', sets:3, min:10, max:15, inc:2},
  {name:'Extensión de tríceps en polea', sets:3, min:10, max:15, inc:2.5},
  {name:'Elevaciones laterales', sets:3, min:12, max:20, inc:1}
];
var MUSCLES = {
  unassigned:'Sin asignar',
  chestUpper:'Pecho superior', chestMid:'Pecho medio', chestLower:'Pecho inferior',
  shoulderAnterior:'Hombro anterior', shoulderLateral:'Hombro lateral', shoulderPosterior:'Hombro posterior',
  lats:'Dorsales', upperBack:'Espalda alta / romboides', lowerBack:'Lumbar', traps:'Trapecio', serratus:'Serrato anterior',
  bicepsLong:'Bíceps · porción larga', bicepsShort:'Bíceps · porción corta', brachialis:'Braquial', forearms:'Antebrazos',
  tricepsLong:'Tríceps · porción larga', tricepsLateral:'Tríceps · porción lateral', tricepsMedial:'Tríceps · porción medial',
  quads:'Cuádriceps', adductors:'Aductores', hamstrings:'Isquiotibiales', glutesMax:'Glúteo mayor', glutesMed:'Glúteo medio',
  calvesGastro:'Pantorrilla · gastrocnemio', calvesSoleus:'Pantorrilla · sóleo', tibialis:'Tibial anterior', hipFlexors:'Flexores de cadera',
  rectusAbdominis:'Abdominal recto', obliques:'Oblicuos', transverseCore:'Transverso / core profundo', neck:'Cuello', other:'Otro'
};
var LEGACY_MUSCLE_IDS={shoulders:'shoulderLateral',back:'lats',chest:'chestMid',biceps:'bicepsShort',triceps:'tricepsLong',glutes:'glutesMax',calves:'calvesGastro',core:'rectusAbdominis'};
var MUSCLE_GROUPS={chest:'Pecho',shoulder:'Hombros',back:'Espalda',biceps:'Bíceps',triceps:'Tríceps',forearms:'Antebrazos',quads:'Cuádriceps',adductors:'Aductores',hipFlexors:'Flexores de cadera',hamstrings:'Isquiotibiales',glutes:'Glúteos',calves:'Pantorrillas',core:'Core',neck:'Cuello',unassigned:'Sin asignar',other:'Otro'};
function muscleGroupId(id){
  return SobrecargaEngine.muscleGroupId(id);
}
var MEASUREMENT_FIELDS={
  weight:'Peso corporal', height:'Altura', chest:'Pecho', waist:'Cintura', abdomen:'Abdomen', hips:'Cadera', neck:'Cuello',
  armLeft:'Brazo izquierdo', armRight:'Brazo derecho', thighLeft:'Muslo izquierdo', thighRight:'Muslo derecho', calfLeft:'Pantorrilla izquierda', calfRight:'Pantorrilla derecha', bodyFat:'Grasa corporal'
};

/* ---------- estado ---------- */
var DK = 'sobrecarga:draft:v1';
var LK = 'sobrecarga:data:v1';
var TK = 'sobrecarga:tab';
var RTK = 'sobrecarga:rest-timer:v1';
var RTOK = RTK + ':owner';
function defaultProfile(){ return {v:2, settings:{mode:'rir', targetRir:2, restSeconds:90, warmupRestSeconds:45}, exercises:{}, routines:{}, programs:{}, goals:{}, measurements:[]}; }
function normProfile(p){
  var d = defaultProfile();
  if(!p) return d;
  p = clone(p);
  d.settings = Object.assign(d.settings, p.settings || {});
  if(![60,90,120,180,300].includes(Number(d.settings.restSeconds))) d.settings.restSeconds = 90;
  if(![0,15,30,45,60,90,120].includes(Number(d.settings.warmupRestSeconds))) d.settings.warmupRestSeconds = 45;
  d.exercises = p.exercises || {};
  d.routines = p.routines || {};
  d.programs = p.programs || {};
  d.goals = p.goals || {};
  d.measurements = Array.isArray(p.measurements) ? p.measurements.filter(function(m){ return isObject(m) && typeof m.id === 'string'; }).map(function(m){ return {id:m.id, date:typeof m.date === 'string' ? m.date : iso(new Date()), values:isObject(m.values) ? clone(m.values) : {}, notes:typeof m.notes === 'string' ? m.notes : ''}; }) : [];
  return d;
}
function exerciseLoadStep(ex){ return Number(ex.loadStep) > 0 ? Number(ex.loadStep) : (Number(ex.inc) > 0 ? Number(ex.inc) : 2.5); }
function muscleId(ex){
  var id=LEGACY_MUSCLE_IDS[ex.muscle] || ex.muscle;
  return Object.prototype.hasOwnProperty.call(MUSCLES, id) ? id : 'unassigned';
}
function muscleOptions(selected){
  return Object.keys(MUSCLES).map(function(id){
    return '<option value="' + id + '"' + (muscleId({muscle:selected}) === id ? ' selected' : '') + '>' + MUSCLES[id] + '</option>';
  }).join('');
}
function normalizedSecondaryMuscles(ex){
  var explicit=(ex.secondaryMuscles||[]).map(function(id){ return LEGACY_MUSCLE_IDS[id] || id; }).filter(function(id){ return MUSCLES[id] && id!==muscleId(ex); });
  if(explicit.length || Array.isArray(ex.secondaryMuscles)) return explicit.filter(function(id,index){ return explicit.indexOf(id)===index; });
  return SobrecargaEngine.inferSecondaryMuscles(muscleId(ex),ex.name).filter(function(id,index,all){ return MUSCLES[id] && id!==muscleId(ex) && all.indexOf(id)===index; });
}
function muscleAssignments(ex){
  var primary = muscleId(ex);
  return SobrecargaEngine.muscleAssignments(primary,normalizedSecondaryMuscles(ex));
}
function latestBodyWeight(date){
  var matches=(S.profile.measurements||[]).filter(function(m){ return m.values && Number(m.values.weight)>=0 && typeof m.date==='string' && (!date || m.date<=date); }).sort(function(a,b){ return b.date.localeCompare(a.date); });
  return matches.length ? Number(matches[0].values.weight) : null;
}
function effectiveWeight(ex, set, date){
  if(ex.loadMode !== 'bodyweight') return Number(set.w);
  var added = Number(set.w); if(!isFinite(added) || added < 0) return Number(set.w);
  var bodyWeight = latestBodyWeight(date);
  return bodyWeight === null ? added : SobrecargaEngine.effectiveBodyweight(bodyWeight,added,ex.bodyweightPercent === undefined ? 100 : ex.bodyweightPercent);
}
function effectiveSetsFor(ex, sets, date){
  return sets.map(function(set){ var copy=clone(set); copy.w=effectiveWeight(ex,set,date); return copy; });
}
function blankDraft(){ return {date:null, startedAt:null, routineId:null, entries:[], collapsedEntryIds:[]}; }
function normalizeDraft(value){
  var draft=Object.assign(blankDraft(), value);
  draft.entries.forEach(function(entry){ if(!entry.uiId) entry.uiId=uid('entry_'); });
  draft.collapsedEntryIds=Array.isArray(draft.collapsedEntryIds)
    ? draft.collapsedEntryIds.filter(function(id){ return typeof id==='string'; })
    : [];
  return draft;
}
function loadDraft(){
  try { var d = JSON.parse(localStorage.getItem(DK)); if(d && Array.isArray(d.entries)) return normalizeDraft(d); } catch(e){}
  return blankDraft();
}
function loadRestEnd(){
  try { var value = Number(localStorage.getItem(RTK)); return isFinite(value) && value > Date.now() ? value : null; } catch(e){ return null; }
}
function loadRestOwner(){
  try {
    if(!loadRestEnd()){ localStorage.removeItem(RTOK); return null; }
    return localStorage.getItem(RTOK) || null;
  } catch(e){ return null; }
}
var S = {
  ready:false, kind:'local', canDownload:false, syncUnavailable:false, cloudSyncing:false,
  draftSaveState:'saved', historyQuery:'', historyRange:'all',
  profile:defaultProfile(), sessions:[], draft:loadDraft(),
  tab:'hoy', picker:false, pkMode:'day', openEx:null, openCfg:null, confirm:null, justSaved:null, redit:null,
  librarySection:'programas', selectedProgram:null, selectedRoutine:null, pedit:null, profileSection:'resumen', exerciseSort:'recent', measurementForm:false, collapsedEntries:new Set(),
  restEndsAt:loadRestEnd(), restOwner:loadRestOwner(), pendingImport:null, pendingRoutine:null, sessionEdit:null, finishSaving:false, goalNew:false, progressMetric:'estimated', anomalySignature:''
};
S.collapsedEntries=new Set(S.draft.collapsedEntryIds || []);
try { var t0 = localStorage.getItem(TK); if(t0) S.tab = t0; } catch(e){}
if(S.tab === 'ejercicios') S.tab = 'rutinas';
function refreshDraftSaveStatus(){
  var status=$('#draft-save-status');
  if(!status) return;
  var labels={saving:'Guardando…',saved:'Guardado en este dispositivo',synced:'Guardado y sincronizado',localOnly:'Guardado local · sincronización pendiente',error:'No se pudo guardar'};
  status.textContent=labels[S.draftSaveState]||labels.saved;
  status.dataset.state=S.draftSaveState;
}
function saveDraft(syncCloud){
  try {
    localStorage.setItem(DK, JSON.stringify(S.draft));
    draftSaveWarningShown = false;
    if(['cloud'].includes(S.kind) && Store.firebaseDb && Store.firebaseUser && syncCloud !== false){
      S.draftSaveState='saving'; refreshDraftSaveStatus();
      clearTimeout(cloudDraftTimer);
      cloudDraftTimer=setTimeout(function(){
        var payload=clone(S.draft); payload.updatedAt=Date.now(); payload.restEndsAt=S.restEndsAt || null; payload.restOwner=S.restOwner || null;
        Store.firebaseDb.collection('users').doc(Store.firebaseUser.uid).collection('app').doc('draft').set(payload).then(function(){
          S.draftSaveState='synced'; refreshDraftSaveStatus();
        }).catch(function(error){
          console.warn('No se pudo sincronizar el entreno en curso',error);
          S.draftSaveState='localOnly'; refreshDraftSaveStatus();
          toast('No se pudo sincronizar el entreno en curso');
        });
      }, 350);
    }else if(S.syncUnavailable) S.draftSaveState='localOnly';
    else S.draftSaveState='saved';
    refreshDraftSaveStatus();
    return true;
  } catch(e){
    S.draftSaveState='error'; refreshDraftSaveStatus();
    if(!draftSaveWarningShown){ toast('No se pudo guardar el entreno en curso. Copia tus datos antes de salir'); draftSaveWarningShown = true; }
    return false;
  }
}
if(S.draft.entries.length && !S.draft.startedAt){ S.draft.startedAt = Date.now(); saveDraft(); }

function formatDuration(ms){
  var seconds = Math.max(0, Math.floor(ms / 1000));
  var hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  var minutes = String(Math.floor(seconds % 3600 / 60)).padStart(2, '0');
  var remainder = String(seconds % 60).padStart(2, '0');
  return hours + ':' + minutes + ':' + remainder;
}
function updateWorkoutClock(){
  var el = $('#workout-clock');
  if(el && S.draft.startedAt) el.textContent = formatDuration(Date.now() - S.draft.startedAt);
}
function saveRestEnd(syncCloud){
  try {
    if(S.restEndsAt){
      localStorage.setItem(RTK, String(S.restEndsAt));
      if(S.restOwner) localStorage.setItem(RTOK, S.restOwner);
      else localStorage.removeItem(RTOK);
    }else{
      S.restOwner=null;
      localStorage.removeItem(RTK);
      localStorage.removeItem(RTOK);
    }
    if(['cloud'].includes(S.kind) && syncCloud !== false) saveDraft();
  } catch(e){ toast('No se pudo guardar el temporizador'); }
}
function startRest(seconds, owner){
  S.restEndsAt = Date.now() + seconds * 1000;
  S.restOwner = owner || null;
  saveRestEnd();
  refreshRestTimerSection();
}
function cancelRestForRow(row){
  if(row && row.restToken && S.restOwner === row.restToken){
    S.restEndsAt=null;
    S.restOwner=null;
    saveRestEnd();
  }
}
function restStateForRows(rows){
  if(!S.restEndsAt || !S.restOwner || !rows.some(function(row){ return row && row.restToken===S.restOwner && row.restTriggered; })) return null;
  return {endsAt:S.restEndsAt, owner:S.restOwner};
}
function restoreRestAfterUndo(rows, state){
  if(!state || state.endsAt<=Date.now() || (S.restEndsAt && S.restEndsAt>Date.now())) return;
  if(!rows.some(function(row){ return row && row.restToken===state.owner && row.restTriggered; })) return;
  S.restEndsAt=state.endsAt;
  S.restOwner=state.owner;
  saveRestEnd();
}
function syncCollapsedEntries(){
  var activeIds={};
  var changed=false;
  S.draft.entries.forEach(function(entry){
    if(!entry.uiId){ entry.uiId=uid('entry_'); changed=true; }
    activeIds[entry.uiId]=true;
  });
  var collapsed=(Array.isArray(S.draft.collapsedEntryIds) ? S.draft.collapsedEntryIds : [])
    .filter(function(id){ return activeIds[id]; });
  if(collapsed.length !== (S.draft.collapsedEntryIds || []).length) changed=true;
  S.draft.collapsedEntryIds=collapsed;
  S.collapsedEntries=new Set(collapsed);
  if(changed) saveDraft();
}
function restTimerHtml(){
  if(!S.draft.entries.length) return '';
  var restSeconds = Number(S.profile.settings.restSeconds) || 90;
  var remaining = S.restEndsAt ? Math.max(0, Math.ceil((S.restEndsAt - Date.now()) / 1000)) : 0;
  var clock = S.restEndsAt
    ? String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0')
    : 'Listo';
  return '<section class="rest-timer" id="rest-timer" aria-live="polite"><div><span class="lab">Descanso</span><strong class="num" id="rest-clock">' +
    clock + '</strong></div><div class="row">' +
    '<button class="btn ghost sm" data-act="rest-start">Iniciar ' + Math.floor(restSeconds / 60) + ':' + String(restSeconds % 60).padStart(2, '0') + '</button>' +
    (S.restEndsAt ? '<button class="btn ghost sm" data-act="rest-add">+30 s</button><button class="btn ghost sm" data-act="rest-stop">Detener</button>' : '') +
    '</div></section>';
}
function refreshRestTimerSection(){
  var el = $('#rest-timer');
  if(!el) return;
  var html = restTimerHtml();
  if(html) el.outerHTML = html;
  else el.remove();
  updateRestTimer();
}
function updateRestTimer(){
  var el = $('#rest-clock');
  if(!S.restEndsAt){ if(el) el.textContent = 'Listo'; return; }
  var remaining = S.restEndsAt - Date.now();
  if(remaining <= 0){
    S.restEndsAt = null; S.restOwner=null; saveRestEnd();
    refreshRestTimerSection();
    toast('Descanso terminado');
    return;
  }
  if(el){
    var total = Math.ceil(remaining / 1000);
    el.textContent = String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }
}

var toastTimer;
var draftSaveWarningShown = false;
function toast(msg, actionLabel, action){
  var el = $('#toast'); el.textContent = msg;
  if(actionLabel && action){
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'toast-action'; button.textContent = actionLabel;
    button.addEventListener('click', function(){
      clearTimeout(toastTimer); el.hidden = true; action();
    }, {once:true});
    el.appendChild(button);
  }
  el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ el.hidden = true; }, action ? 5000 : 2600);
}

/* ---------- almacenamiento: cuenta (db) o este navegador ---------- */
var profTimer = null, profBusy = false, profDirty = false;
var cloudDraftTimer = null;
var cloudLoadingTimer = null, cloudUnsubs = [];
function withTimeout(promise, timeoutMs, message){
  return new Promise(function(resolve,reject){
    var timer=setTimeout(function(){ reject(new Error(message)); },timeoutMs);
    Promise.resolve(promise).then(function(value){
      clearTimeout(timer);
      resolve(value);
    },function(error){
      clearTimeout(timer);
      reject(error);
    });
  });
}
var Store = {
  ref:null, col:null, firebaseAuth:null, firebaseDb:null, firebaseUser:null, cloudGeneration:0,
  detachCloudListeners:function(){
    cloudUnsubs.forEach(function(unsubscribe){ unsubscribe(); });
    cloudUnsubs=[];
  },
  readLocalData:function(){
    try {
      var data=JSON.parse(localStorage.getItem(LK));
      if(data && isObject(data)){
        S.profile=normProfile(data.profile);
        S.sessions=Array.isArray(data.sessions) ? data.sessions : [];
      }
      return data;
    } catch(error){
      console.warn('No se pudieron leer los datos locales',error);
      return null;
    }
  },
  fallbackToLocal:function(generation, profile, sessions, message){
    if(generation!==Store.cloudGeneration) return;
    Store.cloudGeneration++;
    Store.detachCloudListeners();
    clearTimeout(cloudLoadingTimer);
    cloudLoadingTimer=null;
    S.profile=profile;
    S.sessions=sessions;
    S.kind='local';
    S.syncUnavailable=true;
    S.ready=true;
    Store.saveLocal();
    createAutoBackup();
    render();
    toast(message);
  },
  init:function(){
    use('downloads').then(function(d){ S.canDownload = !!d; if(S.ready) render(); }).catch(function(){});
    if(window.firebase && window.SOBRECARGA_FIREBASE_CONFIG){
      try{
        var firebaseApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.SOBRECARGA_FIREBASE_CONFIG);
        Store.firebaseAuth = firebase.auth(firebaseApp);
        Store.firebaseDb = firebase.firestore(firebaseApp);
        Store.firebaseDb.settings({experimentalForceLongPolling:true,merge:true});
        Store.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){ });
        var redirectPending=false;
        try{ redirectPending=sessionStorage.getItem('sobrecarga-google-redirect')==='1'; }catch(e){}
        Store.firebaseAuth.getRedirectResult().then(function(result){
          try{ sessionStorage.removeItem('sobrecarga-google-redirect'); }catch(e){}
          if(result && result.user){ Store.startFirebase(result.user); }
        }).catch(function(error){
          try{ sessionStorage.removeItem('sobrecarga-google-redirect'); }catch(e){}
          console.warn('No se pudo completar el inicio de sesión con Google', error);
          if(error && error.code) toast('No se pudo iniciar sesión (' + error.code + '). En Brave, desactiva Shields para esta página o permite cookies de Google.');
        });
        if(redirectPending) setTimeout(function(){
          if(!S.cloudUser){
            try{ sessionStorage.removeItem('sobrecarga-google-redirect'); }catch(e){}
            toast('Google regresó sin iniciar la cuenta. En Brave desactiva Shields para esta página y permite las cookies de accounts.google.com y firebaseapp.com.');
          }
        }, 15000);
        var authResolved=false;
        Store.firebaseAuth.onAuthStateChanged(function(user){
          authResolved=true;
          if(user) Store.startFirebase(user);
          else { S.cloudUser=null; Store.startLocal(); }
        });
        setTimeout(function(){ if(!authResolved && !S.ready){ Store.startLocal(); } }, 8000);
        return;
      }catch(error){ console.warn('Firebase no disponible', error); }
    }
    Promise.all([use('user'), use('db')]).then(function(r){
      var user = r[0], db = r[1];
      if(!user || !db) return null;
      return user.id().then(function(id){ return id ? {db:db, id:id} : null; });
    }).catch(function(){ return null; }).then(function(ok){
      if(ok) Store.startDb(ok.db, ok.id); else Store.startLocal();
    });
  },
  startFirebase:function(user){
    Store.detachCloudListeners();
    clearTimeout(cloudLoadingTimer);
    cloudLoadingTimer=null;
    Store.cloudGeneration++;
    var generation=Store.cloudGeneration;
    S.ready=false;
    S.syncUnavailable=false;
    S.cloudUser=user;
    S.kind='cloud';
    Store.firebaseUser=user;
    var localData=Store.readLocalData();
    var localProfile=clone(S.profile), localSessions=clone(S.sessions);
    render();
    var root=Store.firebaseDb.collection('users').doc(user.uid);
    Store.ref=root.collection('app').doc('state');
    Store.col=root.collection('sessions');
    cloudLoadingTimer=setTimeout(function(){
      Store.fallbackToLocal(generation,localProfile,localSessions,'No se pudo conectar con la cuenta. Los cambios se guardan en este navegador; al recuperar conexión, usa «Sincronizar ahora».');
    },12000);
    var migration=Promise.resolve();
    if(localData && (localData.profile || (localData.sessions && localData.sessions.length))){
      migration=Store.ref.get().then(function(remoteProfile){
        var writes=[];
        if(!remoteProfile.exists && localData.profile){ writes.push(Store.ref.set(clone(localData.profile))); }
        if(writes.length) return Promise.all(writes);
      }).then(function(){ return Store.col.get(); }).then(function(remoteSessions){
        var remoteIds={}; remoteSessions.forEach(function(doc){ remoteIds[doc.id]=true; });
        return (localData.sessions || []).reduce(function(queue,session){
          if(remoteIds[session.id]) return queue;
          return queue.then(function(){ return Store.col.doc(session.id).set(clone(stampSession(session))); });
        }, Promise.resolve());
      });
    }
    migration.then(function(){
      if(generation!==Store.cloudGeneration) return;
      var gotProfile=false, gotSessions=false;
      var done=function(){ if(gotProfile && gotSessions){ S.ready=true; createAutoBackup(); render(); } };
      cloudUnsubs.push(Store.ref.onSnapshot(function(snap){
        if(generation!==Store.cloudGeneration) return;
        if(!(profDirty || profBusy)){
          if(snap.exists) S.profile=normProfile(snap.data());
          else S.profile=defaultProfile();
        }
        gotProfile=true; done();
        if(gotProfile && gotSessions){ clearTimeout(cloudLoadingTimer); cloudLoadingTimer=null; }
      }, function(error){
        if(generation!==Store.cloudGeneration) return;
        console.warn('No se pudo descargar el perfil de Firebase',error);
        clearTimeout(cloudLoadingTimer); cloudLoadingTimer=null;
        Store.fallbackToLocal(generation,localProfile,localSessions,'No se pudieron descargar los datos de la cuenta. Se seguirá guardando en este navegador; usa «Sincronizar ahora» cuando vuelva la conexión.');
      }));
      cloudUnsubs.push(Store.col.onSnapshot(function(snap){
        if(generation!==Store.cloudGeneration) return;
        S.sessions=snap.docs.map(function(d){ return clone(d.data()); });
        gotSessions=true; done();
        if(gotProfile && gotSessions){ clearTimeout(cloudLoadingTimer); cloudLoadingTimer=null; }
      }, function(error){
        if(generation!==Store.cloudGeneration) return;
        console.warn('No se pudieron descargar los entrenos de Firebase',error);
        clearTimeout(cloudLoadingTimer); cloudLoadingTimer=null;
        Store.fallbackToLocal(generation,localProfile,localSessions,'No se pudieron descargar los entrenos. Se seguirá guardando en este navegador; usa «Sincronizar ahora» cuando vuelva la conexión.');
      }));
      root.collection('app').doc('draft').get().then(function(snap){
        if(generation!==Store.cloudGeneration) return;
        if(snap.exists && snap.data() && Array.isArray(snap.data().entries)){
          var remoteDraft=normalizeDraft(snap.data());
          if(!S.draft.entries.length || remoteDraft.updatedAt >= (S.draft.updatedAt||0)){
            S.draft=remoteDraft;
            var remoteRestEnd=Number(remoteDraft.restEndsAt);
            S.restEndsAt=isFinite(remoteRestEnd) && remoteRestEnd>Date.now() ? remoteRestEnd : null;
            S.restOwner=S.restEndsAt && typeof remoteDraft.restOwner==='string' ? remoteDraft.restOwner : null;
            saveRestEnd(false);
            saveDraft(false);
          }
        }else if(S.draft.entries.length || S.draft.startedAt){
          saveDraft(false);
        }
      }).catch(function(error){ if(generation===Store.cloudGeneration) console.warn('No se pudo sincronizar el borrador',error); });
    }).catch(function(error){
      if(generation!==Store.cloudGeneration) return;
      console.warn('Migración local a Firebase fallida',error);
      Store.fallbackToLocal(generation,localProfile,localSessions,'No se pudo completar la migración. Se mantienen tus datos en este navegador; sincroniza cuando vuelva la conexión.');
    });
  },
  signIn:function(){
    if(!Store.firebaseAuth) return Promise.reject(new Error('Firebase no inicializado'));
    var provider=new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    return Store.firebaseAuth.signInWithPopup(provider).catch(function(error){
      if(error && ['auth/popup-blocked','auth/popup-closed-by-user','auth/web-storage-unsupported','auth/operation-not-supported-in-this-environment'].includes(error.code)){
        try{ sessionStorage.setItem('sobrecarga-google-redirect','1'); }catch(e){}
        return Store.firebaseAuth.signInWithRedirect(provider);
      }
      throw error;
    });
  },
  signOut:function(){ return Store.firebaseAuth ? Store.firebaseAuth.signOut() : Promise.resolve(); },
  startLocal:function(){
    Store.cloudGeneration++;
    Store.detachCloudListeners();
    clearTimeout(cloudLoadingTimer);
    cloudLoadingTimer=null;
    S.kind = 'local';
    S.cloudUser=null;
    Store.firebaseUser=null;
    S.syncUnavailable=false;
    Store.readLocalData();
    S.ready = true; createAutoBackup(); render();
  },
  syncToCloud:function(){
    if(!Store.firebaseUser || !Store.ref || !Store.col) return Promise.reject(new Error('No hay una cuenta de Firebase disponible'));
    var user=Store.firebaseUser, fallback=S.syncUnavailable;
    var profileWrite=withTimeout(
      fallback ? Store.ref.set(clone(S.profile)) : Store.saveProfileNow(),
      15000,
      'Firebase no respondió al guardar el perfil. Tus datos locales se conservaron; revisa la conexión y vuelve a intentar.'
    );
    var sessionsWrite=S.sessions.reduce(function(queue,session){
      return queue.then(function(){
        var write=fallback
          ? Store.col.doc(session.id).set(clone(stampSession(session)))
          : Store.saveSession(session);
        return withTimeout(
          write,
          15000,
          'Firebase no respondió al guardar tus entrenamientos. Tus datos locales se conservaron; revisa la conexión y vuelve a intentar.'
        );
      });
    },Promise.resolve());
    var draft=clone(S.draft);
    draft.updatedAt=Date.now(); draft.restEndsAt=S.restEndsAt || null;
    var draftWrite=withTimeout(
      Store.firebaseDb.collection('users').doc(user.uid).collection('app').doc('draft').set(draft),
      15000,
      'Firebase no respondió al guardar el entreno en curso. Tus datos locales se conservaron; revisa la conexión y vuelve a intentar.'
    );
    return Promise.all([profileWrite,sessionsWrite,draftWrite]).then(function(){
      if(fallback) Store.startFirebase(user);
    });
  },
  startDb:function(db, id){
    S.kind = 'db';
    Store.ref = db.doc('data/users/'+id+'/profile');
    Store.col = Store.ref.collection('sessions');
    var gotP = false, gotS = false;
    var done = function(){ if(gotP && gotS){ S.ready = true; createAutoBackup(); render(); } };
    var fail = function(){ toast('No se pudo conectar con tu cuenta. Uso este navegador.'); Store.startLocal(); };
    Store.ref.onSnapshot(function(snap){
      if(!(profDirty || profBusy)) S.profile = normProfile(snap.exists ? snap.data() : null);
      gotP = true; done();
    }, fail);
    Store.col.onSnapshot(function(snap){
      S.sessions = snap.docs.map(function(d){ return clone(d.data()); });
      gotS = true; done();
    }, fail);
  },
  saveLocal:function(){
    try {
      localStorage.setItem(LK, JSON.stringify({profile:S.profile, sessions:S.sessions}));
      return true;
    } catch(e){
      toast('No se pudo guardar en este navegador');
      return false;
    }
  },
  saveProfile:function(){
    if(!['db','cloud'].includes(S.kind)){ Store.saveLocal(); return; }
    profDirty = true; clearTimeout(profTimer); profTimer = setTimeout(function(){ Store.flush().catch(function(){}); }, 350);
  },
  saveProfileNow:function(){
    if(!['db','cloud'].includes(S.kind)){
      return Store.saveLocal() ? Promise.resolve() : Promise.reject(new Error('No se pudo guardar el perfil en este navegador'));
    }
    profDirty=true; clearTimeout(profTimer);
    return Store.flush();
  },
  flush:function(){
    if(profBusy) return new Promise(function(resolve,reject){
      profTimer=setTimeout(function(){ Store.flush().then(resolve,reject); },200);
    });
    if(!profDirty) return Promise.resolve();
    profDirty = false; profBusy = true;
    return Store.ref.set(clone(S.profile)).then(function(){
      profBusy = false;
      if(profDirty) profTimer = setTimeout(function(){ Store.flush().catch(function(){}); }, 200);
    }).catch(function(error){
      profBusy = false;
      profDirty = true;
      toast('No se pudieron guardar los cambios; se reintentará');
      profTimer = setTimeout(function(){ Store.flush().catch(function(){}); }, 5000);
      throw error;
    });
  },
  saveSession:function(s){
    s=stampSession(s);
    if(!['db','cloud'].includes(S.kind)){
      var exists = S.sessions.some(function(item){ return item.id === s.id; });
      var sessions = exists ? S.sessions.map(function(item){ return item.id === s.id ? s : item; }) : S.sessions.concat([s]);
      try {
        localStorage.setItem(LK, JSON.stringify({profile:S.profile, sessions:sessions}));
        return Promise.resolve(s);
      } catch(e){
        toast('No se pudo guardar el entreno en este navegador');
        return Promise.reject(e);
      }
    }
    return Store.col.doc(s.id).set(clone(s)).then(function(){ return s; }).catch(function(error){
      toast('No se pudo guardar el entreno');
      throw error;
    });
  },
  updateSession:function(session, options){
    options=options || {};
    if(['db','cloud'].includes(S.kind)){
      var ref=Store.col.doc(session.id);
      var expected=Number(session.updatedAt)||0;
      var stamped=stampSession(session), written=stamped;
      return Store.firebaseDb.runTransaction(function(transaction){
        return transaction.get(ref).then(function(remote){
          var current=remote.exists ? remote.data() : null;
          var conflict=!options.overwrite && (remote.exists
            ? SobrecargaBackup.hasSessionConflict(current, expected, clientWriterId)
            : SobrecargaBackup.hasSessionConflict(null, expected, clientWriterId, false));
          if(conflict){
            var error=new Error(remote.exists ? 'Otro dispositivo cambió este entreno mientras lo editabas' : 'Este entrenamiento fue borrado en otro dispositivo');
            error.code='session-conflict'; error.remoteSession=current; error.deleted=!remote.exists; throw error;
          }
          written=stamped;
          if(options.overwrite){
            written=Object.assign({}, stamped, {updatedAt:Math.max(Date.now(), Number(current&&current.updatedAt||0)+1), updatedBy:clientWriterId});
          }
          transaction.set(ref,clone(written));
        });
      }).then(function(){ return written; }).catch(function(error){
        toast(error.code==='session-conflict' ? error.message : 'No se pudieron guardar los cambios del entreno');
        throw error;
      });
    }
    session=stampSession(session);
    try {
      var sessions = S.sessions.map(function(item){ return item.id === session.id ? session : item; });
      localStorage.setItem(LK, JSON.stringify({profile:S.profile, sessions:sessions}));
      return Promise.resolve(session);
    } catch(error){
      toast('No se pudo guardar los cambios del entreno');
      return Promise.reject(error);
    }
  },
  deleteSessions:function(ids){
    if(!['db','cloud'].includes(S.kind)) return Promise.resolve();
    return ids.reduce(function(p, id){ return p.then(function(){ return Store.col.doc(id).delete(); }); }, Promise.resolve())
      .catch(function(error){ toast('No se pudo borrar el entreno: ' + (error && error.message ? error.message : 'error de sincronización')); throw error; });
  },
  replaceAll:function(profile, sessions){
    try { localStorage.setItem(LK, JSON.stringify({profile:profile, sessions:sessions})); }
    catch(e){ return Promise.reject(e); }

    var oldIds = S.sessions.map(function(session){ return session.id; });
    S.profile = profile; S.sessions = sessions;
    if(!['db','cloud'].includes(S.kind)) return Promise.resolve();

    var incomingIds = {};
    sessions.forEach(function(session){ incomingIds[session.id] = true; });
    oldIds = oldIds.filter(function(id){ return !incomingIds[id]; });
    profDirty = false; clearTimeout(profTimer);
    var withTimeout = function(promise){
      return Promise.race([
        promise,
        new Promise(function(resolve,reject){ setTimeout(function(){ reject(new Error('Firestore no respondió a tiempo')); }, 15000); })
      ]);
    };
    var writes=sessions.reduce(function(p, session){
      return p.then(function(){ return withTimeout(Store.col.doc(session.id).set(clone(session))); });
    }, Promise.resolve());
    return writes.then(function(){
      return withTimeout(Store.ref.set(clone(profile)));
    }).then(function(){
      return oldIds.reduce(function(p, id){
        return p.then(function(){ return withTimeout(Store.col.doc(id).delete()); });
      }, Promise.resolve());
    });
  }
};

/* ---------- motor de sobrecarga progresiva ---------- */
function exById(id){ return S.profile.exercises[id]; }
function exName(id){ var e = exById(id); return e ? e.name : 'Ejercicio eliminado'; }
var Engine = window.SobrecargaEngine;
var effTxt = Engine.effTxt;
var SET_TYPES = {
  normal:'Normal', warmup:'Aproximación', backoff:'Back-off',
  dropset:'Drop set', restpause:'Rest-pause'
};
var CSV_TYPE_ALIASES={
  drop:'dropset', 'drop set':'dropset', 'back-off':'backoff', 'rest-pause':'restpause',
  'rest pause':'restpause', aproximacion:'warmup', 'warm-up':'warmup', failure:'normal'
};
function csvSetType(value){ return SobrecargaBackup.csvSetType(value, SET_TYPES, CSV_TYPE_ALIASES); }
function setType(s){
  return s && Object.prototype.hasOwnProperty.call(SET_TYPES, s.type) ? s.type : (s && s.warm ? 'warmup' : 'normal');
}
function countsForProgress(s){ return setType(s) === 'normal'; }
function restSecondsFor(row){
  return setType(row) === 'warmup'
    ? Number(S.profile.settings.warmupRestSeconds) || 0
    : Number(S.profile.settings.restSeconds) || 90;
}
function autoRestEligible(row){ return ['normal','warmup','backoff'].includes(setType(row)); }
function rowComplete(row, unilateral){
  if(unilateral){
    var sides = ensureRowMode(row, true);
    return ['right','left'].every(function(side){ return validWeight(sides[side].w) && num(sides[side].r) > 0; });
  }
  return validWeight(row.w) && num(row.r) > 0;
}
/* ejercicio efectivo: ajustes base + ajustes propios de la rutina (solo en esa rutina) */
function effEx(en){ return Object.assign({}, exById(en.exId), en.cfg || {}); }
var effortTarget = Engine.effortTarget;
var tgtText = Engine.targetText;
function entriesFor(exId){
  return S.sessions.filter(function(s){ return s.entries.some(function(e){ return e.exId === exId; }); })
    .sort(function(a,b){ return a.date === b.date ? (a.ts||0)-(b.ts||0) : (a.date < b.date ? -1 : 1); })
    .map(function(s){
      var sets = [];
      s.entries.filter(function(e){ return e.exId === exId; }).forEach(function(e){ sets = sets.concat(e.sets); });
      return {date:s.date, sets:sets};
    });
}
function mean(a){ return a.reduce(function(x,y){ return x+y; }, 0) / a.length; }

var analyzeCore = Engine.analyzeCore;
var analyze = Engine.analyze;
function planFor(ex){
  var hist = entriesFor(ex.id);
  if(!hist.length) return {status:'nuevo'};
  var last = hist[hist.length-1], prev = hist[hist.length-2];
  var a = analyze(ex, effectiveSetsFor(ex, last.sets, last.date), prev ? effectiveSetsFor(ex, prev.sets, prev.date) : null, S.profile.settings);
  if(!a) return {status:'nuevo'};
  a.last = last;
  return a;
}
function e1rm(set){
  var tr = S.profile.settings.targetRir;
  return set.w * (1 + (set.r + (set.rir === null || set.rir === undefined ? tr : set.rir)) / 30);
}
function estimatedEx1rm(ex, sets){
  var working = sets.filter(function(s){ return countsForProgress(s) && validWeight(s.w) && s.r > 0; });
  if(!ex.unilateral) return working.length ? Math.max.apply(null, working.map(e1rm)) : null;
  var right = working.filter(function(s){ return s.side === 'right'; });
  var left = working.filter(function(s){ return s.side === 'left'; });
  if(!right.length || !left.length) return null;
  return Math.min(Math.max.apply(null, right.map(e1rm)), Math.max.apply(null, left.map(e1rm)));
}
function personalRecords(ex){
  var records = {weight:null, reps:null, estimated:null};
  S.sessions.forEach(function(session){
    session.entries.filter(function(entry){ return entry.exId === ex.id; }).forEach(function(entry){
      var sets = effectiveSetsFor(ex, entry.sets, session.date);
      sets.filter(function(set){ return countsForProgress(set) && validWeight(set.w) && Number(set.r) > 0; }).forEach(function(set){
        var weight = Number(set.w), reps = Number(set.r);
        if(!records.weight || weight > records.weight.value) records.weight = {value:weight, date:session.date};
        if(!records.reps || reps > records.reps.value) records.reps = {value:reps, date:session.date};
      });
      var estimated = estimatedEx1rm(ex, sets);
      if(estimated !== null && (!records.estimated || estimated > records.estimated.value)) records.estimated = {value:estimated, date:session.date};
    });
  });
  return records;
}
function isObject(value){ return value !== null && typeof value === 'object' && !Array.isArray(value); }
function stampSession(session){
  return SobrecargaBackup.stampSession(session, clientWriterId, Date.now());
}
function validBackup(data){
  if(!isObject(data) || !isObject(data.profile) || !Array.isArray(data.sessions)) return false;
  var profile = data.profile;
  if((profile.settings !== undefined && !isObject(profile.settings)) || !isObject(profile.exercises || {}) ||
  !isObject(profile.routines || {}) || !isObject(profile.programs || {}) || !isObject(profile.goals || {}) ||
  (profile.measurements !== undefined && !Array.isArray(profile.measurements))) return false;
  var validNumber = function(value){ return typeof value === 'number' && isFinite(value); };
  var validPositiveNumber = function(value){ return validNumber(value) && value >= 0; };
  var validDate = function(value){
    if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = parseISO(value);
    return !isNaN(parsed.getTime()) && iso(parsed) === value;
  };
  if(profile.settings && profile.settings.mode && !['rir','rpe'].includes(profile.settings.mode)) return false;
  if(profile.settings && profile.settings.targetRir !== undefined && !validNumber(profile.settings.targetRir)) return false;
  var validWarmupConfig = function(item){
    return (item.warmupMode === undefined || ['auto','manual'].includes(item.warmupMode)) &&
      (item.warmupStep === undefined || (validNumber(item.warmupStep) && item.warmupStep > 0)) &&
      (item.warmupPercents === undefined || (Array.isArray(item.warmupPercents) &&
        item.warmupPercents.every(function(percent){ return validNumber(percent) && percent >= 1 && percent <= 100; }))) &&
      (item.loadStep === undefined || (validNumber(item.loadStep) && item.loadStep > 0)) &&
      (item.bodyweightPercent === undefined || (validNumber(item.bodyweightPercent) && item.bodyweightPercent >= 0 && item.bodyweightPercent <= 100)) &&
      (item.muscle === undefined || Object.prototype.hasOwnProperty.call(MUSCLES, LEGACY_MUSCLE_IDS[item.muscle] || item.muscle));
  };
  var exerciseIds = Object.keys(profile.exercises || {});
  for(var i=0;i<exerciseIds.length;i++){
    var ex = profile.exercises[exerciseIds[i]];
    if(!isObject(ex) || typeof ex.name !== 'string' || !validNumber(ex.sets) || !validNumber(ex.min) || !validNumber(ex.max) || !validNumber(ex.inc) ||
      (ex.warmupSets !== undefined && !validNumber(ex.warmupSets)) || !validWarmupConfig(ex) ||
      (ex.loadMode !== undefined && !['external','bodyweight'].includes(ex.loadMode)) ||
      (ex.secondaryMuscles !== undefined && (!Array.isArray(ex.secondaryMuscles) || !ex.secondaryMuscles.every(function(id){ var normalizedId=LEGACY_MUSCLE_IDS[id] || id; return MUSCLES[normalizedId] && normalizedId !== 'unassigned' && normalizedId !== (LEGACY_MUSCLE_IDS[ex.muscle] || ex.muscle); })))) return false;
  }
  var routineIds = Object.keys(profile.routines || {});
  for(var j=0;j<routineIds.length;j++){
    var routine = profile.routines[routineIds[j]];
    if(!isObject(routine) || typeof routine.name !== 'string' || !Array.isArray(routine.items)) return false;
    if(!routine.items.every(function(item){
      return isObject(item) && typeof item.exId === 'string' && validNumber(item.sets) &&
        validNumber(item.min) && validNumber(item.max) && validNumber(item.inc) &&
        (item.warmupSets === undefined || validNumber(item.warmupSets)) &&
        (item.efforts === undefined || Array.isArray(item.efforts)) && validWarmupConfig(item);
    })) return false;
  }
  var programIds = Object.keys(profile.programs || {});
  for(var p=0;p<programIds.length;p++){
    var program = profile.programs[programIds[p]];
    if(!isObject(program) || typeof program.name !== 'string') return false;
  }
  var goalIds = Object.keys(profile.goals || {});
  for(var g=0;g<goalIds.length;g++){
    var goal=profile.goals[goalIds[g]];
    if(!isObject(goal) || typeof goal.id !== 'string' || typeof goal.name !== 'string' ||
      !(validNumber(goal.target) && goal.target > 0) || !validNumber(goal.start) ||
      (goal.exerciseId !== null && goal.exerciseId !== undefined && typeof goal.exerciseId !== 'string')) return false;
  }
  if(profile.measurements && !profile.measurements.every(function(measurement){
    return isObject(measurement) && typeof measurement.id === 'string' && validDate(measurement.date) &&
      isObject(measurement.values || {}) && Object.keys(measurement.values || {}).every(function(key){ return validPositiveNumber(measurement.values[key]); }) &&
      (measurement.notes === undefined || typeof measurement.notes === 'string');
  })) return false;
  var sessionIds = {};
  return data.sessions.every(function(session){
    if(!isObject(session) || typeof session.id !== 'string' || !validDate(session.date) || !Array.isArray(session.entries)) return false;
    if(session.durationMs !== undefined && !validPositiveNumber(session.durationMs)) return false;
    if(['ts','startedAt','finishedAt'].some(function(field){
      return session[field] !== undefined && !validPositiveNumber(session[field]);
    })) return false;
    if(sessionIds[session.id]) return false;
    sessionIds[session.id] = true;
    return session.entries.every(function(entry){
      return isObject(entry) && typeof entry.exId === 'string' && Array.isArray(entry.sets) &&
        entry.sets.every(function(set){
          return isObject(set) && validPositiveNumber(set.w) && validPositiveNumber(set.r) &&
            (set.rir === undefined || set.rir === null || validNumber(set.rir)) &&
            (set.type === undefined || Object.prototype.hasOwnProperty.call(SET_TYPES, set.type)) &&
            (set.restMs === undefined || validPositiveNumber(set.restMs));
        });
    });
  });
}
function downloadBackup(){
  var payload = SobrecargaBackup.serializeBackup({format:'sobrecarga-backup', version:1, profile:S.profile, sessions:S.sessions}, 2);
  use('downloads').then(function(downloads){
    if(downloads) return downloads.save({filename:'sobrecarga-respaldo-' + iso(new Date()) + '.json', data:payload});
    var url = URL.createObjectURL(new Blob([payload], {type:'application/json'}));
    var link = document.createElement('a');
    link.href = url; link.download = 'sobrecarga-respaldo-' + iso(new Date()) + '.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }).then(function(){ toast('Respaldo descargado'); })
    .catch(function(e){ if(!e || e.code !== 'declined') toast('No se pudo descargar el respaldo'); });
}
function restoreBackup(){
  if(!S.pendingImport) return;
  var data = S.pendingImport;
  var pending = Store.replaceAll(normProfile(data.profile), data.sessions);
  S.draft = blankDraft(); saveDraft(); S.restEndsAt = null; saveRestEnd();
  S.pendingImport = null; S.confirm = null; S.justSaved = null;
  render(); toast('Respaldo restaurado en este navegador');
  pending.then(function(){
    if(['db','cloud'].includes(S.kind)) toast('Respaldo sincronizado con tu cuenta');
  }).catch(function(error){
    toast('Respaldo restaurado aquí, pero no pudo sincronizarse' + (error && error.message ? ': ' + error.message : ''));
  });
}
function csvCell(value){
  var text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
function downloadSessionsCsv(){
  var rows = [['fecha','ejercicio','tipo','peso_kg','repeticiones','esfuerzo','serie','duracion_min','lado','ronda']];
  S.sessions.slice().sort(function(a,b){ return a.date.localeCompare(b.date) || a.ts-b.ts; }).forEach(function(session){
    session.entries.forEach(function(entry){
      var exercise = exById(entry.exId);
      entry.sets.forEach(function(set, index){
        rows.push([session.date, exercise ? exercise.name : entry.exId, setType(set), set.w, set.r, set.rir,
          index+1, Math.max(0, Math.round((Number(session.durationMs)||0)/60000)), set.side || '', set.pair === undefined ? '' : Number(set.pair)+1]);
      });
    });
  });
  var csv = '\ufeff' + rows.map(function(row){ return row.map(csvCell).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'sobrecarga-entrenos-' + iso(new Date()) + '.csv';
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  toast('Entrenos exportados a CSV');
}
function parseCsv(text){
  text = text.replace(/^\ufeff/, '');
  var rows=[], row=[], value='', quoted=false;
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(c==='"'){ if(quoted && text[i+1]==='"'){ value+='"'; i++; } else quoted=!quoted; }
    else if(c===',' && !quoted){ row.push(value); value=''; }
    else if((c==='\n'||c==='\r') && !quoted){ if(c==='\r' && text[i+1]==='\n') i++; row.push(value); if(row.some(function(v){ return v; })) rows.push(row); row=[]; value=''; }
    else value+=c;
  }
  row.push(value); if(row.some(function(v){ return v; })) rows.push(row);
  if(!rows.length) return [];
  var headers=rows.shift().map(function(v){ return v.trim().toLowerCase(); });
  return rows.map(function(values){ var obj={}; headers.forEach(function(header,k){ obj[header]=values[k]||''; }); return obj; });
}
function exportRoutine(routine){
  var exercises={};
  routine.items.forEach(function(item){
    var exercise=exById(item.exId);
    if(exercise && !exercises[item.exId]) exercises[item.exId]={name:exercise.name,muscle:muscleId(exercise),unilateral:!!exercise.unilateral};
  });
  var payload={format:'sobrecarga-routine',version:1,name:routine.name,items:routine.items,exercises:exercises};
  var url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  var link=document.createElement('a'); link.href=url; link.download='rutina-'+routine.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.json';
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },1000); toast('Rutina exportada');
}
function importRoutine(payload){
  if(!payload || payload.format!=='sobrecarga-routine' || !Array.isArray(payload.items) || !isObject(payload.exercises)) throw new Error('invalid routine');
  var oldToNew={};
  Object.keys(payload.exercises).forEach(function(oldId){
    var info=payload.exercises[oldId], existing=Object.keys(S.profile.exercises).map(function(id){ return S.profile.exercises[id]; }).find(function(e){ return e.name.toLowerCase()===(info.name||'').toLowerCase(); });
    var exercise=existing || {id:uid('ex'),name:String(info.name||'Ejercicio'),sets:3,min:1,max:20,inc:2.5,muscle:info.muscle||'unassigned',unilateral:!!info.unilateral};
    if(!existing) S.profile.exercises[exercise.id]=exercise; oldToNew[oldId]=exercise.id;
  });
  var id=uid('rut');
  S.profile.routines[id]={id:id,name:String(payload.name||'Rutina compartida'),items:payload.items.map(function(item){ item=clone(item); item.exId=oldToNew[item.exId]||item.exId; return item; }),programId:''};
  Store.saveProfile(); S.selectedRoutine=id; S.librarySection='rutinas'; S.tab='rutinas'; render(); toast('Rutina importada');
}
function importSessionsCsv(text){
  var previousProfile=clone(S.profile), previousSessions=S.sessions.slice();
  var records=parseCsv(text), grouped={}, durations={};
  records.forEach(function(r){
    var date=(r.fecha||r.date||'').trim(), name=(r.ejercicio||r.exercise||'').trim();
    var weight=num(r.peso_kg||r.peso||r.weight), reps=num(r.repeticiones||r.reps);
    if(!validDate(date) || !name || !Number.isFinite(weight) || weight < 0 || !(reps>0)) return;
    var effort=num(r.esfuerzo||r.rir||r.effort);
    var duration=num(r.duracion_min||r.duration_min||r.duration); if(Number.isFinite(duration) && duration>=0) durations[date]=Math.max(durations[date]||0,duration);
    var side=(r.lado||r.side||'').trim().toLowerCase(), pair=num(r.ronda||r.round||r.pair);
    var importedSet={w:weight,r:reps,rir:Number.isFinite(effort)?effort:null,type:csvSetType(r.tipo||r.type)};
    if(side==='derecha'||side==='der'||side==='right'||side==='d') importedSet.side='right';
    else if(side==='izquierda'||side==='izq'||side==='left'||side==='i'||side==='l') importedSet.side='left';
    if(Number.isFinite(pair) && pair>=0) importedSet.pair=Math.max(0,Math.floor(pair)-1);
    if(!grouped[date]) grouped[date]={};
    if(!grouped[date][name]) grouped[date][name]=[];
    grouped[date][name].push(importedSet);
  });
  var imported=0, importedSessions=[];
  Object.keys(grouped).forEach(function(date){
    var entries=[];
    Object.keys(grouped[date]).forEach(function(name){
      var exercise=Object.keys(S.profile.exercises).map(function(id){ return S.profile.exercises[id]; }).find(function(e){ return e.name.toLowerCase()===name.toLowerCase(); });
      if(!exercise){ exercise={id:uid('ex'),name:name,sets:3,min:1,max:20,inc:2.5,muscle:'unassigned'}; S.profile.exercises[exercise.id]=exercise; }
      var sets=grouped[date][name];
      entries.push({exId:exercise.id,sets:sets,unilateral:!!exercise.unilateral || SobrecargaEngine.isUnilateralEntry({sets:sets})});
    });
    var signature=SobrecargaBackup.csvSessionSignature(entries);
    var duplicate=S.sessions.some(function(session){
      return session.date===date && session.csvImport && SobrecargaBackup.csvSessionSignature(session.entries)===signature;
    });
    if(duplicate) return;
    var durationMinutes=durations[date] || 60;
    var durationMs=durationMinutes*60000;
    var session={id:uid('ses'),date:date,ts:new Date(date+'T12:00:00').getTime(),startedAt:new Date(date+'T12:00:00').getTime(),finishedAt:new Date(date+'T12:00:00').getTime()+durationMs,durationMs:durationMs,entries:entries,csvImport:true};
    importedSessions.push(session); imported++;
  });
  if(!imported){ S.profile=previousProfile; toast('No se encontraron entrenos nuevos válidos'); return Promise.resolve(false); }
  if(!['db','cloud'].includes(S.kind)){
    S.sessions=previousSessions.concat(importedSessions);
    if(!Store.saveLocal()){
      S.profile=previousProfile; S.sessions=previousSessions; render(); return Promise.resolve(false);
    }
    render(); toast(imported+' entreno'+(imported===1?'':'s')+' importado'+(imported===1?'':'s')+' desde CSV');
    return Promise.resolve(true);
  }
  var persistSessions=function(){
    return importedSessions.reduce(function(queue,session){
      return queue.then(function(saved){ return Store.saveSession(session).then(function(persisted){ saved.push(persisted); return saved; }); });
    },Promise.resolve([]));
  };
  return Store.saveProfileNow().then(persistSessions).then(function(savedSessions){
    var savedById={};
    S.sessions.concat(savedSessions).forEach(function(session){ savedById[session.id]=session; });
    S.sessions=Object.keys(savedById).map(function(id){ return savedById[id]; });
    render(); toast(imported+' entreno'+(imported===1?'':'s')+' importado'+(imported===1?'':'s')+' desde CSV');
    return true;
  }).catch(function(error){
    console.error('Falló la importación CSV; se intentará revertir lo escrito',error);
    S.profile=previousProfile;
    return Store.deleteSessions(importedSessions.map(function(session){ return session.id; })).catch(function(rollbackError){
      console.error('No se pudieron revertir todos los entrenos de la importación CSV',rollbackError);
    }).then(function(){
      return Store.saveProfileNow().catch(function(rollbackError){
        console.error('No se pudo restaurar el perfil previo a la importación CSV',rollbackError);
      });
    }).then(function(){
      render(); toast('No se pudo completar la importación CSV; revisa la conexión y vuelve a intentarlo');
      return false;
    });
  });
}

/* ---------- presentación de series ---------- */
var CHIP = {
  sube:['go','Sube de peso'], reps:['acc','Sumar reps'], confirma:['warn','Confirmar'],
  mantener:['warn','Mantener'], bajar:['stop','Bajar'], nuevo:['mut','Nuevo']
};
function chip(st){ var c = CHIP[st] || CHIP.nuevo; return '<span class="chip ' + c[0] + '">' + c[1] + '</span>'; }
function setsText(sets, withWarm){
  if(sets.some(function(s){ return s.side === 'right' || s.side === 'left'; })){
    var pairs = {};
    sets.forEach(function(s){
      if(s.pair === undefined || (setType(s) === 'warmup' && !withWarm)) return;
      var key = String(s.pair);
      if(!pairs[key]) pairs[key] = {};
      pairs[key][s.side] = s;
    });
    return Object.keys(pairs).sort(function(a,b){ return +a - +b; }).map(function(key){
      var pair = pairs[key], parts = [];
      ['right','left'].forEach(function(side){
        var s = pair[side]; if(!s) return;
        var type = setType(s);
        var label = side === 'right' ? 'Der.' : 'Izq.';
        if(type !== 'normal') label += ' ' + SET_TYPES[type];
        var text = label + ': ' + fmt(s.w) + ' kg × ' + s.r;
        if(s.rir !== null && s.rir !== undefined && type !== 'warmup') text += ' · ' + effTxt(s.rir, S.profile.settings);
        parts.push(text);
      });
      return 'Serie ' + (+key+1) + ': ' + parts.join(' · ');
    }).join(' | ');
  }
  var groups = [], cur = null;
  sets.forEach(function(s){
    var type = setType(s);
    if(type === 'warmup' && !withWarm) return;
    var key = type + ':' + (s.side || '') + ':' + s.w;
    if(!cur || cur.key !== key){ cur = {key:key, w:s.w, type:type, side:s.side, reps:[], rirs:[]}; groups.push(cur); }
    cur.reps.push(s.r); if(s.rir !== null && s.rir !== undefined) cur.rirs.push(s.rir);
  });
  return groups.map(function(g){
    var prefix = g.side ? (g.side === 'right' ? 'Der. ' : 'Izq. ') : '';
    prefix += g.type === 'warmup' ? 'cal. ' : (g.type === 'normal' ? '' : SET_TYPES[g.type] + ': ');
    var t = prefix + fmt(g.w) + ' kg × ' + g.reps.join(', ');
    if(g.rirs.length && g.type !== 'warmup') t += ' · ' + effTxt(mean(g.rirs), S.profile.settings);
    return t;
  }).join(' | ');
}
function barHtml(a, ex){
  if(a.sidePlans){
    return '<div class="side-progress">' + ['right','left'].map(function(side){
      var plan = a.sidePlans[side], name = side === 'right' ? 'Derecho' : 'Izquierdo';
      var p = Math.round(Math.min(1, plan.progress) * 100);
      return '<div class="barwrap"><div class="small muted">' + name + '</div><div class="bar" role="img" aria-label="Avance del lado ' + name.toLowerCase() + ': ' + p + '%"><i class="' + (p >= 100 ? 'full' : '') + '" style="width:' + p + '%"></i></div>' +
        '<div class="barlab"><span>' + fmt(plan.W) + ' kg</span><span>' + fmt(plan.progressTarget || plan.W + ex.inc) + ' kg</span></div></div>';
    }).join('') + '</div>';
  }
  var p = Math.round(Math.min(1, a.progress) * 100);
  var targetWeight = a.progressTarget || a.W + ex.inc;
  return '<div class="barwrap"><div class="bar" role="img" aria-label="Avance hacia ' + fmt(targetWeight) + ' kg: ' + p + '%"><i class="' + (p >= 100 ? 'full' : '') + '" style="width:' + p + '%"></i></div>' +
    '<div class="barlab"><span>' + fmt(a.W) + ' kg</span><span>' + fmt(targetWeight) + ' kg</span></div></div>';
}

/* ---------- borrador del entreno de hoy ---------- */
function ensureRowMode(row, unilateral){
  var type = setType(row);
  if(unilateral){
    if(row.savedSides){
      row.right = row.savedSides.right; row.left = row.savedSides.left; delete row.savedSides;
    } else if(!row.right || !row.left){
      var side = function(){ return {w:row.w || '', r:row.r || '', rir:row.rir || ''}; };
      row.right = side(); row.left = side();
    }
    row.type = type; delete row.w; delete row.r; delete row.rir; delete row.warm;
  } else if(row.right || row.left){
    var right = row.right || {}, left = row.left || {};
    row.w = right.w || left.w || ''; row.r = right.r || left.r || ''; row.rir = right.rir || left.rir || '';
    row.savedSides = {right:clone(right), left:clone(left)};
    delete row.right; delete row.left;
  }
  return row;
}
function rowsToSets(rows, unilateral){
  return rows.reduce(function(all, raw, i){
    var r = ensureRowMode(raw, unilateral);
    if(unilateral){
      ['right','left'].forEach(function(side){
        var values = r[side], effort = String(values.rir).trim() === '' ? null : num(values.rir);
        var unilateralSet={w:num(values.w), r:num(values.r), rir:effort, type:setType(r), side:side, pair:i};
        if(r.restMs > 0) unilateralSet.restMs=Number(r.restMs);
        all.push(unilateralSet);
      });
    } else {
      var rir = String(r.rir).trim() === '' ? null : num(r.rir);
      var bilateralSet={w:num(r.w), r:num(r.r), rir:rir, type:setType(r)};
      if(r.restMs > 0) bilateralSet.restMs=Number(r.restMs);
      all.push(bilateralSet);
    }
    return all;
  }, []);
}
function newRow(w, unilateral){
  var value = w ? String(w).replace('.', ',') : '';
  var row = {type:'normal'};
  if(unilateral){
    row.right = {w:value, r:'', rir:''}; row.left = {w:value, r:'', rir:''};
  } else { row.w=value; row.r=''; row.rir=''; }
  return row;
}
function plannedRow(plan, unilateral, fallback){
  var row = newRow(fallback, unilateral);
  if(unilateral && plan && plan.sidePlans){
    row.right.w = String(plan.sidePlans.right.nextW).replace('.', ',');
    row.left.w = String(plan.sidePlans.left.nextW).replace('.', ',');
  }
  return row;
}
function defaultWarmupPercent(index){
  return [50,80,90,95,97,98,99,99,99,99][index] || 99;
}
function warmupSettings(ex){
  return {
    warmupMode:ex.warmupMode === 'manual' ? 'manual' : 'auto',
    warmupStep:Number(ex.warmupStep) > 0 ? Number(ex.warmupStep) : (Number(ex.inc) > 0 ? Number(ex.inc) : 2.5),
    warmupPercents:Array.from({length:Number(ex.warmupSets) || 0}, function(_, index){
      var value = ex.warmupPercents && num(ex.warmupPercents[index]);
      return value !== null && value > 0 && value <= 100 ? value : defaultWarmupPercent(index);
    })
  };
}
function warmupWeight(load, percent, step){
  if(!(Number(load) > 0) || !(Number(percent) > 0) || !(Number(step) > 0)) return '';
  var rounded = Math.floor((Number(load) * Number(percent) / 100 + 1e-9) / Number(step)) * Number(step);
  return rounded > 0 ? String(Math.round(rounded * 100) / 100).replace('.', ',') : '';
}
function syncAutoWarmupWeights(en, ex){
  var settings = warmupSettings(ex);
  if(settings.warmupMode !== 'auto') return;
  var work = en.rows.find(function(row){ return setType(row) === 'normal'; });
  var plan = planFor(ex);
  var warmIndex = 0;
  en.rows.forEach(function(row){
    if(setType(row) !== 'warmup') return;
    var percent = settings.warmupPercents[warmIndex] || defaultWarmupPercent(warmIndex);
    if(ex.unilateral){
      ['right','left'].forEach(function(side){
        var entered = work && work[side] ? num(work[side].w) : null;
        var planned = plan.sidePlans && plan.sidePlans[side] ? plan.sidePlans[side].nextW : plan.nextW;
        row[side].w = warmupWeight(entered || planned, percent, settings.warmupStep);
      });
    } else {
      var enteredWeight = work ? num(work.w) : null;
      row.w = warmupWeight(enteredWeight || plan.nextW, percent, settings.warmupStep);
    }
    warmIndex++;
  });
}
function refreshAutoWarmupInputs(ei, en, ex){
  syncAutoWarmupWeights(en, ex);
  en.rows.forEach(function(row, ri){
    if(setType(row) !== 'warmup') return;
    if(ex.unilateral){
      ['right','left'].forEach(function(side){
        var input = $('[data-f="w"][data-ei="' + ei + '"][data-ri="' + ri + '"][data-side="' + side + '"]');
        if(input) input.value = row[side].w;
      });
    } else {
      var input = $('[data-f="w"][data-ei="' + ei + '"][data-ri="' + ri + '"]');
      if(input) input.value = row.w;
    }
  });
}
function nextRow(previous, unilateral){
  if(!unilateral) return newRow(previous ? previous.w : '');
  var row = newRow('', true);
  if(previous && previous.right && previous.left){
    row.right.w = previous.right.w; row.left.w = previous.left.w;
  }
  return row;
}
function addEntry(exId){
  var ex = exById(exId), p = planFor(ex), rows = [];
  for(var j=0;j<(Number(ex.warmupSets) || 0);j++){
    var warm = newRow(warmupSettings(ex).warmupMode === 'manual' ? '' : p.nextW, ex.unilateral);
    warm.type = 'warmup'; rows.push(warm);
  }
  for(var i=0;i<ex.sets;i++) rows.push(plannedRow(p, ex.unilateral, p.nextW));
  syncAutoWarmupWeights({rows:rows}, ex);
  if(!S.draft.date) S.draft.date = iso(new Date());
  if(!S.draft.startedAt) S.draft.startedAt = Date.now();
  S.draft.entries.push({uiId:uid('entry_'), exId:exId, rows:rows});
  saveDraft();
}
function effDisplay(row){
  if(String(row.rir).trim() === '') return '';
  var v = num(row.rir); if(v === null) return '';
  return fmt(S.profile.settings.mode === 'rpe' ? 10 - v : v);
}
function liveHtml(ei){
  var en = S.draft.entries[ei], ex = effEx(en);
  var sets = rowsToSets(en.rows, ex.unilateral);
  var hist = entriesFor(ex.id), last = hist[hist.length-1];
  var a = analyze(ex, effectiveSetsFor(ex, sets, S.draft.date || iso(new Date())), last ? effectiveSetsFor(ex, last.sets, last.date) : null, S.profile.settings);
  if(!a) return '<p class="muted small">' + (ex.unilateral
    ? 'Completa peso y repeticiones en ambos lados para ver tu progreso.'
    : 'Anota tus series y verás cuánto te falta para subir de peso.') + '</p>';
  return '<div class="goal-row">' + chip(a.status) + '<strong>Así vas: ' + esc(a.headline) + '</strong></div>' + barHtml(a, ex) + '<p class="small">' + esc(a.detail) + '</p>';
}
function previousWorkSet(exId, workIndex, unilateral){
  var sessions = S.sessions.filter(function(session){
    return session.entries.some(function(entry){ return entry.exId === exId; });
  }).sort(function(a,b){
    return a.date === b.date ? (b.ts || 0) - (a.ts || 0) : (a.date < b.date ? 1 : -1);
  });
  if(!sessions.length) return null;
  var entries = sessions[0].entries.filter(function(entry){ return entry.exId === exId; });
  if(!entries.length || !!entries[0].unilateral !== !!unilateral) return null;
  var sets = [];
  entries.forEach(function(entry){ sets = sets.concat(entry.sets); });
  if(!unilateral){
    var normalSets = sets.filter(function(set){ return setType(set) === 'normal' && validWeight(set.w) && set.r > 0; });
    return normalSets[workIndex] || null;
  }
  var pairs = {};
  sets.forEach(function(set){
    if(set.pair === undefined || setType(set) !== 'normal' || !(validWeight(set.w) && set.r > 0)) return;
    var key = String(set.pair);
    if(!pairs[key]) pairs[key] = {};
    pairs[key][set.side] = set;
  });
  var complete = Object.keys(pairs).sort(function(a,b){ return Number(a) - Number(b); })
    .map(function(key){ return pairs[key]; })
    .filter(function(pair){ return pair.right && pair.left; });
  return complete[workIndex] || null;
}
function previousReferenceHtml(exId, workIndex, unilateral){
  var previous = previousWorkSet(exId, workIndex, unilateral);
  if(!previous) return '';
  var value = unilateral
    ? 'Anterior: der. ' + fmt(previous.right.w) + ' kg × ' + previous.right.r + ' · izq. ' + fmt(previous.left.w) + ' kg × ' + previous.left.r
    : 'Anterior: ' + fmt(previous.w) + ' kg × ' + previous.r;
  return '<span class="set-reference">' + esc(value) + '</span>';
}
function workingDone(){
  var c = 0;
  S.draft.entries.forEach(function(en){
    var ex = effEx(en);
    if(ex.unilateral){
      en.rows.forEach(function(raw){
        var row = ensureRowMode(raw, true), right = row.right, left = row.left;
        if(setType(row) === 'normal' && num(right.w) > 0 && num(right.r) > 0 && num(left.w) > 0 && num(left.r) > 0) c++;
      });
    } else rowsToSets(en.rows, false).forEach(function(s){ if(countsForProgress(s) && validWeight(s.w) && s.r > 0) c++; });
  });
  return c;
}
function goalHtml(ex){
  var p = planFor(ex);
  var plan = '<p class="muted small">' + ex.sets + (ex.unilateral ? ' rondas · cada lado: ' : ' series × ') + ex.min + '–' + ex.max + ' reps · esfuerzo por serie: ' + esc(tgtText(ex, S.profile.settings)) + ' · salto ' + fmt(ex.inc) + ' kg</p>';
  if(p.status === 'nuevo'){
    return '<div class="goal"><div class="goal-row">' + chip('nuevo') + '<strong>Primera vez</strong></div>' +
      '<p class="small">Elige un peso con el que llegues a ' + ex.min + '–' + ex.max + ' reps con ' + esc(tgtText(ex, S.profile.settings)) + (ex.unilateral ? ' en cada lado' : '') + '. Con eso te armo el objetivo del próximo entreno.</p>' + plan + '</div>';
  }
  return '<div class="goal"><div class="goal-row">' + chip(p.status) + '<span class="goal-h num' + (p.sidePlans ? ' goal-sides' : '') + '">' + esc(p.displayTarget || (fmt(p.nextW) + ' kg × ' + p.target.join(' · '))) + '</span></div>' +
    barHtml(p, ex) +
    '<details class="goal-more"><summary>Ver recomendación y último resultado</summary><p class="muted small">Última vez, ' + dFmt(p.last.date) + ': ' + esc(setsText(p.last.sets)) + '</p><p class="small">' + esc(p.detail) + '</p>' + plan + '</details></div>';
}
function completedWorkSets(en, ex){
  var target = Math.max(1, Number(ex.sets) || 1);
  return Math.min(target, en.rows.filter(function(row){
    return setType(row) === 'normal' && row.restTriggered;
  }).length);
}
function entryHtml(en, ei){
  if(!exById(en.exId)) return '';
  var ex = effEx(en);
  var mode = S.profile.settings.mode;
  var effLab = mode === 'rpe' ? 'RPE' : 'RIR';
  var p = planFor(ex);
  var targetSets = Math.max(1, Number(ex.sets) || 1);
  var completedSets = completedWorkSets(en, ex);
  var collapsed = S.collapsedEntries.has(en.uiId);
  var workIndex = 0;
  var rows = en.rows.map(function(r, ri){
    ensureRowMode(r, ex.unilateral);
    var type = setType(r);
    var wi = workIndex;
    if(type === 'normal') workIndex++;
    var effPh = type === 'normal' ? fmt(mode === 'rpe' ? 10 - effortTarget(ex, wi, S.profile.settings) : effortTarget(ex, wi, S.profile.settings)) : '';
    var tgt = type === 'normal' && p.target && p.target[wi] !== undefined ? String(p.target[wi]) : 'reps';
    var options = Object.keys(SET_TYPES).map(function(key){
      return '<option value="' + key + '"' + (type === key ? ' selected' : '') + '>' + SET_TYPES[key] + '</option>';
    }).join('');
    var fields = ex.unilateral ? ['right','left'].map(function(side){
      var sideData = r[side], name = side === 'right' ? 'derecho' : 'izquierdo';
      var sideTarget = type === 'normal' && p.sidePlans && p.sidePlans[side] && p.sidePlans[side].target[wi] !== undefined
        ? String(p.sidePlans[side].target[wi]) : tgt;
      return '<div class="side-inputs"><span class="side-label">' + (side === 'right' ? 'Der.' : 'Izq.') + '</span>' +
        '<input class="in" data-f="w" data-side="' + side + '" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="decimal" autocomplete="off" placeholder="kg" aria-label="Peso lado ' + name + ', serie ' + (ri+1) + '" value="' + esc(sideData.w) + '">' +
        '<input class="in" data-f="r" data-side="' + side + '" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="numeric" autocomplete="off" placeholder="' + esc(sideTarget) + '" aria-label="Repeticiones lado ' + name + ', serie ' + (ri+1) + '" value="' + esc(sideData.r) + '">' +
        '<input class="in" data-f="e" data-side="' + side + '" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="decimal" autocomplete="off" placeholder="' + effPh + '" aria-label="' + effLab + ' lado ' + name + ', serie ' + (ri+1) + '" value="' + esc(effDisplay(sideData)) + '"></div>';
    }).join('') : '<input class="in" data-f="w" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="decimal" autocomplete="off" placeholder="kg" aria-label="Peso de la serie ' + (ri+1) + '" value="' + esc(r.w) + '">' +
      '<input class="in" data-f="r" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="numeric" autocomplete="off" placeholder="' + esc(tgt) + '" aria-label="Repeticiones de la serie ' + (ri+1) + '" value="' + esc(r.r) + '">' +
      '<input class="in" data-f="e" data-ei="' + ei + '" data-ri="' + ri + '" inputmode="decimal" autocomplete="off" placeholder="' + effPh + '" aria-label="' + effLab + ' de la serie ' + (ri+1) + '" value="' + esc(effDisplay(r)) + '">';
    return '<div class="set' + (ex.unilateral ? ' set-unilateral' : '') + (type === 'normal' ? '' : ' is-special') + (type === 'warmup' ? ' is-warm' : '') + '">' +
      '<span class="n">' + (ri+1) + '</span>' + fields +
      '<button class="icon" data-act="rm-set" data-ei="' + ei + '" data-ri="' + ri + '" aria-label="Quitar serie ' + (ri+1) + '">×</button>' +
      '<select class="set-type" data-set-type="1" data-ei="' + ei + '" data-ri="' + ri + '" aria-label="Tipo de serie ' + (ri+1) + '">' + options + '</select>' +
      (type === 'normal' ? previousReferenceHtml(en.exId, wi, ex.unilateral) : '') +
      (r.restTriggered
        ? '<button class="set-finish set-finish-done" data-act="undo-finish-set" data-ei="' + ei + '" data-ri="' + ri + '" aria-label="Deshacer fin de la serie ' + (ri+1) + '"><span aria-hidden="true">✓</span> Hecha · deshacer</button>'
        : '<button class="btn ghost sm set-finish" data-act="finish-set" data-ei="' + ei + '" data-ri="' + ri + '"' +
          (!rowComplete(r, ex.unilateral) ? ' disabled' : '') + '>Terminar serie</button>') + '</div>';
  }).join('');
  var head = ex.unilateral
    ? '<div class="set head unilateral-head"><span>#</span><span class="side-type-head">Lado · kg · reps · ' + effLab + '</span></div>'
    : '<div class="set head"><span>#</span><span>kg</span><span>Reps</span><span>' + effLab + '</span><span></span><span class="set-type-head">Tipo de serie</span></div>';
  var orderControls = S.draft.entries.length > 1
    ? '<div class="workout-card-tools"><button class="mini" data-act="move-exercise" data-ei="' + ei + '" data-direction="-1"' + (ei === 0 ? ' disabled' : '') + ' aria-label="Mover ' + esc(ex.name) + ' arriba" title="Mover arriba">↑</button>' +
      '<button class="mini" data-act="move-exercise" data-ei="' + ei + '" data-direction="1"' + (ei === S.draft.entries.length - 1 ? ' disabled' : '') + ' aria-label="Mover ' + esc(ex.name) + ' abajo" title="Mover abajo">↓</button></div>'
    : '';
  return '<section class="card workout-card' + (collapsed ? ' is-collapsed' : '') + '" data-ei="' + ei + '">' +
    '<div class="card-head workout-card-head"><h3 class="workout-card-heading"><button class="workout-card-toggle" data-act="toggle-entry" data-ei="' + ei + '" aria-expanded="' + (!collapsed) + '">' +
    '<span class="workout-card-title"><span class="workout-card-name">' + esc(ex.name) + '</span><span class="workout-progress">' + completedSets + '/' + targetSets + ' series</span></span>' +
    '<span class="workout-card-chevron" aria-hidden="true">' + (collapsed ? '▸' : '▾') + '</span></button></h3>' +
    '<div class="workout-card-actions">' + orderControls + '<button class="icon" data-act="rm-ex" data-ei="' + ei + '" aria-label="Quitar ' + esc(ex.name) + ' de hoy">×</button></div></div>' +
    (collapsed ? '' : '<div class="workout-card-body">' + goalHtml(ex) +
    '<div class="sets">' + head + rows + '</div>' +
    '<details class="workout-help"><summary>Ayuda con las series</summary><p class="hint">' + (ex.unilateral
      ? 'Cada ronda registra ambos lados. Cuenta como una serie cuando completaste derecho e izquierdo; la progresión espera que ambos lados cumplan el objetivo. '
      : 'Solo las series normales cuentan para la sobrecarga. ') +
      'Registra cada tramo de drop set o rest-pause en una fila aparte; todos los tipos quedan en el historial.</p></details>' +
    '<div class="row"><button class="btn ghost sm" data-act="add-set" data-ei="' + ei + '">+ Serie</button>' +
    '<button class="btn ghost sm" data-act="repeat-set" data-ei="' + ei + '">Copiar última serie</button>' +
    '<button class="btn ghost sm" data-act="toggle-cfg" data-ei="' + ei + '" aria-expanded="' + (S.openCfg === en.exId ? 'true' : 'false') + '">Ajustar series, reps y salto</button></div>' +
    (S.openCfg === en.exId ? cfgPanel(en, ei) : '') +
    '<div class="live" id="live-' + ei + '">' + liveHtml(ei) + '</div></div>') + '</section>';
}
function cfgPanel(en, ei){
  var ex = effEx(en), lab = S.profile.settings.mode === 'rpe' ? 'RPE' : 'RIR';
  var warmCfg = warmupSettings(ex);
  var rt = en.cfg && S.draft.routineId && S.profile.routines[S.draft.routineId];
  var f = function(key, label, val){
    return '<div class="field"><label class="lab" for="hc-' + key + '-' + ei + '">' + label + '</label><input id="hc-' + key + '-' + ei + '" class="txt" inputmode="decimal" data-hc="' + key + '" data-ei="' + ei + '" value="' + esc(String(val).replace('.', ',')) + '"></div>';
  };
  var ef = '';
  for(var k=0;k<ex.sets;k++){
    ef += '<div class="field"><label class="lab" for="hef-' + ei + '-' + k + '">Serie ' + (k+1) + '</label><input id="hef-' + ei + '-' + k + '" class="in" inputmode="decimal" data-hef="1" data-ei="' + ei + '" data-k="' + k + '" value="' + esc(effInputVal(effortTarget(ex, k, S.profile.settings))) + '"></div>';
  }
  return '<div class="goal"><div class="fields">' + f('sets', 'Series de trabajo', ex.sets) + f('warmupSets', 'Series de aproximación', Number(ex.warmupSets) || 0) + f('min', 'Reps mín.', ex.min) + f('max', 'Reps máx.', ex.max) + f('inc', 'Salto de progresión (kg)', ex.inc) + f('loadStep', 'Peso disponible cada (kg)', exerciseLoadStep(ex)) +
    '<div class="field"><label class="lab" for="hc-warmupMode-' + ei + '">Peso de aproximación</label><select id="hc-warmupMode-' + ei + '" class="txt" data-hc="warmupMode" data-ei="' + ei + '"><option value="auto"' + (warmCfg.warmupMode === 'auto' ? ' selected' : '') + '>Calcular automáticamente</option><option value="manual"' + (warmCfg.warmupMode === 'manual' ? ' selected' : '') + '>Anotar manualmente</option></select></div>' +
    f('warmupStep', 'Incremento para redondear (kg)', warmCfg.warmupStep) +
    '<div class="field"><label class="lab" for="hc-unilateral-' + ei + '">Ejecución</label><select id="hc-unilateral-' + ei + '" class="txt" data-hc="unilateral" data-ei="' + ei + '"><option value="false"' + (ex.unilateral ? '' : ' selected') + '>Bilateral</option><option value="true"' + (ex.unilateral ? ' selected' : '') + '>Unilateral · ambos lados</option></select></div></div>' +
    ((Number(ex.warmupSets) || 0) ? '<div class="field"><span class="lab">Porcentaje de cada aproximación</span><div class="efforts">' + warmCfg.warmupPercents.map(function(percent, index){
      return '<label class="field"><span class="lab">Serie ' + (index+1) + ' · %</span><input class="in" inputmode="decimal" data-hc="warmupPercent" data-ei="' + ei + '" data-k="' + index + '" value="' + esc(String(percent).replace('.', ',')) + '"></label>';
    }).join('') + '</div></div>' : '') +
    '<div class="field"><span class="lab">Esfuerzo objetivo por serie (' + lab + ')</span><div class="efforts">' + ef + '</div></div>' +
    '<p class="small muted">' + (rt ? 'Estos ajustes solo cambian el entreno de hoy. Al terminar puedes actualizar «' + esc(rt.name) + '» o conservar su configuración.' : 'Se guardan en este ejercicio y valen para tus próximos entrenos.') +
    ' El redondeo de aproximaciones es hacia abajo; el peso disponible se usa para ajustar las recomendaciones de progresión.</p></div>';
}
function applyEntryCfg(ei, key, v, k){
  var en = S.draft.entries[ei]; if(!en) return;
  var ex = effEx(en), tr = S.profile.settings.targetRir;
  var c = Object.assign({sets:ex.sets, warmupSets:Number(ex.warmupSets) || 0, min:ex.min, max:ex.max, inc:ex.inc, loadStep:exerciseLoadStep(ex), efforts:(ex.efforts || []).slice(), unilateral:!!ex.unilateral}, warmupSettings(ex));
  while(c.efforts.length < c.sets) c.efforts.push(c.efforts.length ? c.efforts[c.efforts.length-1] : tr);
  if(key === 'sets') c.sets = Math.min(10, Math.max(1, Math.round(v)));
  if(key === 'warmupSets') c.warmupSets = Math.min(10, Math.max(0, Math.round(v)));
  if(key === 'min'){ c.min = Math.min(50, Math.max(1, Math.round(v))); if(c.max <= c.min) c.max = c.min + 1; }
  if(key === 'max'){ c.max = Math.min(60, Math.max(2, Math.round(v))); if(c.min >= c.max) c.min = c.max - 1; }
  if(key === 'inc') c.inc = Math.min(25, Math.max(0.25, v));
  if(key === 'loadStep') c.loadStep = Math.min(100, Math.max(0.05, v));
  if(key === 'warmupStep') c.warmupStep = Math.min(100, Math.max(0.05, v));
  if(key === 'warmupMode') c.warmupMode = v;
  if(key === 'unilateral') c.unilateral = !!v;
  if(key === 'ef') c.efforts[k] = Math.min(6, Math.max(0, S.profile.settings.mode === 'rpe' ? 10 - v : v));
  while(c.efforts.length < c.sets) c.efforts.push(c.efforts.length ? c.efforts[c.efforts.length-1] : tr);
  c.warmupPercents = warmupSettings(c).warmupPercents;
  if(key === 'warmupPercent') c.warmupPercents[k] = Math.min(100, Math.max(1, v));
  c.efforts = c.efforts.slice(0, c.sets);
  if(en.cfg){
    en.cfg = c;
  } else {
    Object.assign(exById(en.exId), clone(c));
  }
  en.rows.forEach(function(row){ ensureRowMode(row, c.unilateral); });
  var warmCount = en.rows.filter(function(row){ return setType(row) === 'warmup'; }).length;
  while(warmCount > c.warmupSets){
    var warmIndex = en.rows.map(setType).lastIndexOf('warmup');
    en.rows[warmIndex].type = 'normal'; warmCount--;
  }
  while(warmCount < c.warmupSets){
    var firstWork = en.rows.find(function(row){ return setType(row) !== 'warmup'; });
    var firstValue = c.warmupMode === 'manual' ? '' : (firstWork ? (c.unilateral ? firstWork.right.w : firstWork.w) : '');
    var warm = newRow(firstValue, c.unilateral);
    warm.type = 'warmup'; en.rows.unshift(warm); warmCount++;
  }
  var normalCount = en.rows.filter(function(row){ return setType(row) === 'normal'; }).length;
  while(normalCount < c.sets){
    var lastNormalIndex = en.rows.map(setType).lastIndexOf('normal');
    var insertAt = lastNormalIndex >= 0 ? lastNormalIndex + 1 : warmCount;
    var previous = en.rows[insertAt - 1] || en.rows[insertAt];
    en.rows.splice(insertAt, 0, nextRow(previous, c.unilateral)); normalCount++;
  }
  while(normalCount > c.sets){
    var normalIndex = en.rows.map(setType).lastIndexOf('normal');
    var last = en.rows[normalIndex];
    var hasReps = c.unilateral
      ? (String(last.right.r).trim() !== '' || String(last.left.r).trim() !== '')
      : String(last.r).trim() !== '';
    if(hasReps) break;
    en.rows.splice(normalIndex, 1); normalCount--;
  }
  syncAutoWarmupWeights(en, effEx(en));
  if(!en.cfg) Store.saveProfile();
  saveDraft(); render();
}

/* ---------- selector de ejercicio ---------- */
function pickerList(raw, mode){
  var q = raw.trim().toLowerCase();
  var pa = mode === 'routine' ? 'rpick' : 'pick', ca = mode === 'routine' ? 'rcreate' : 'create';
  var inDraft = {};
  if(mode === 'routine') (S.redit ? S.redit.items : []).forEach(function(e){ inDraft[e.exId] = 1; });
  else S.draft.entries.forEach(function(e){ inDraft[e.exId] = 1; });
  var all = Object.keys(S.profile.exercises).map(function(k){ return S.profile.exercises[k]; });
  var mine = all.filter(function(e){ return !e.archived && !inDraft[e.id]; }).sort(function(a,b){ return a.name.localeCompare(b.name, 'es'); });
  var own = {}; all.forEach(function(e){ if(!e.archived) own[e.name.toLowerCase()] = 1; });
  var lib = LIB.filter(function(l){ return !own[l.name.toLowerCase()]; });
  var m = function(x){ return !q || x.name.toLowerCase().indexOf(q) !== -1; };
  var out = '';
  var mm = mine.filter(m), ll = lib.filter(m);
  if(mm.length){
    out += '<div class="pk-group">Tus ejercicios</div>' + mm.map(function(e){
      return '<button class="pk" data-act="' + pa + '" data-id="' + esc(e.id) + '"><span class="t">' + esc(e.name) + '</span><span class="s">' + e.sets + '×' + e.min + '–' + e.max + '</span></button>';
    }).join('');
  }
  if(ll.length){
    out += '<div class="pk-group">Sugeridos</div>' + ll.map(function(l){
      return '<button class="pk" data-act="' + pa + '" data-lib="' + esc(l.name) + '"><span class="t">' + esc(l.name) + '</span><span class="s">' + l.sets + '×' + l.min + '–' + l.max + '</span></button>';
    }).join('');
  }
  var exact = all.some(function(e){ return !e.archived && e.name.toLowerCase() === q; }) || LIB.some(function(l){ return l.name.toLowerCase() === q; });
  if(q && !exact){
    out = '<button class="pk create" data-act="' + ca + '" data-name="' + esc(raw.trim()) + '"><span class="t">Crear «' + esc(raw.trim()) + '»</span><span class="s">3×8–12</span></button>' + out;
  }
  return out || '<div class="pk-group">Escribe el nombre del ejercicio</div>';
}
function pickerHtml(mode){
  return '<div class="card picker"><label class="lab" for="pk-q">Añadir ejercicio</label>' +
    '<input id="pk-q" class="txt" type="text" autocomplete="off" placeholder="Buscar o crear, por ejemplo Press banca">' +
    '<div class="pk-list" id="pk-list">' + pickerList('', mode) + '</div>' +
    '<button class="btn ghost sm" data-act="picker-close">Cancelar</button></div>';
}
function lastDate(exId){ var h = entriesFor(exId); return h.length ? h[h.length-1].date : ''; }

/* ---------- vistas ---------- */
function loadingView(){
  return '<div class="app-loading" role="status" aria-label="Cargando tu registro">' +
    '<div class="loading-heading"><span class="loading-mark" aria-hidden="true"></span><span>Cargando tu registro</span></div>' +
    '<div class="loading-card"><span></span><span></span><span></span></div>' +
    '<div class="loading-card loading-card-short"><span></span><span></span></div>' +
    '</div>';
}
function savedHtml(){
  if(!S.justSaved) return '';
  var session = S.justSaved.session, stats = sessionStats(session);
  var exercises = session.entries.map(function(entry){
    var ex = exById(entry.exId);
    if(!ex) return '';
    var effective = entry.unilateral
      ? Object.keys(entry.sets.reduce(function(pairs, set){
          if(set.pair !== undefined && countsForProgress(set) && validWeight(set.w) && set.r > 0){
            if(!pairs[set.pair]) pairs[set.pair] = {};
            pairs[set.pair][set.side] = true;
          }
          return pairs;
        }, {})).filter(function(pair){
          var sides = entry.sets.filter(function(set){ return String(set.pair) === pair && countsForProgress(set) && validWeight(set.w) && set.r > 0; });
          return sides.some(function(set){ return set.side === 'right'; }) && sides.some(function(set){ return set.side === 'left'; });
        }).length
      : entry.sets.filter(function(set){ return countsForProgress(set) && validWeight(set.w) && set.r > 0; }).length;
    var reps = entry.sets.reduce(function(total, set){ return total + (setType(set) !== 'warmup' ? set.r : 0); }, 0);
    return '<div class="suggest"><div><div class="nm">' + esc(ex.name) + '</div><div class="small muted">' +
      effective + ' serie' + (effective === 1 ? '' : 's') + (effective === 1 ? ' efectiva' : ' efectivas') + (entry.unilateral ? ' · por lado' : '') +
      ' · ' + reps + ' reps registradas</div><div class="small">' + esc(setsText(entry.sets, true)) + '</div></div></div>';
  }).join('');
  var items = S.justSaved.next.map(function(it){
    if(!exById(it.exId)) return '';
    var ex = Object.assign({}, exById(it.exId), it.cfg || {});
    var p = planFor(ex); if(p.status === 'nuevo') return '';
    return '<div class="suggest"><div><div class="nm">' + esc(ex.name) + '</div><div class="small muted">' + esc(p.displayTarget || (fmt(p.nextW) + ' kg × ' + p.target.join(' · '))) + '</div></div>' + chip(p.status) + '</div>';
  }).join('');
  return '<section class="card workout-summary"><div class="card-head"><div><h3>Resumen del entreno</h3><p class="small muted">' + esc(dFmt(session.date, {weekday:'long', day:'numeric', month:'long'})) + '</p></div><button class="icon" data-act="dismiss-saved" aria-label="Cerrar resumen">×</button></div>' +
    '<div class="summary-stats"><div><strong>' + formatDuration(session.durationMs || 0) + '</strong><span>Duración</span></div>' +
      '<div><strong>' + session.entries.length + '</strong><span>Ejercicios</span></div>' +
      '<div><strong>' + stats.effectiveSets + '</strong><span>Series efectivas</span></div>' +
      '<div><strong>' + stats.reps + '</strong><span>Reps sin aproximaciones</span></div>' +
      '<div><strong>' + fmt(stats.volume) + ' kg</strong><span>Volumen sin aprox.</span></div></div>' +
    '<div class="list"><p class="sec-title">Lo que hiciste</p>' + exercises + '</div>' +
    '<div class="list"><p class="sec-title">Objetivo para la próxima sesión</p>' +
      (items || '<p class="small muted">Registra otro entreno para obtener sugerencias.</p>') + '</div></section>';
}
function sessionStats(session){
  var stats = {effectiveSets:0, reps:0, volume:0};
  session.entries.forEach(function(entry){
    stats.effectiveSets += entryEffectiveSets(entry);
    entry.sets.forEach(function(set){
      if(setType(set) !== 'warmup' && validWeight(set.w) && set.r > 0) stats.reps += set.r;
    });
    stats.volume += entryVolume(entry, session.date);
  });
  return stats;
}
function entryVolume(entry, sessionDate){
  var ex = exById(entry.exId);
  var sets = ex ? effectiveSetsFor(ex, entry.sets, sessionDate) : entry.sets;
  return SobrecargaEngine.entryVolume(sets,SobrecargaEngine.isUnilateralEntry(entry));
}
function entryEffectiveSets(entry){
  return SobrecargaEngine.countEffectiveSets(entry.sets,SobrecargaEngine.isUnilateralEntry(entry));
}
function weeklyMuscleSummaryHtml(week){
  var counts = {}, directCounts = {}, indirectCounts = {}, groupCounts = {}, groupDirect = {}, groupIndirect = {};
  week.forEach(function(session){
    session.entries.forEach(function(entry){
      var count = entryEffectiveSets(entry);
      if(!count) return;
      var exercise = exById(entry.exId);
      muscleAssignments(exercise || {}).forEach(function(assignment){
        counts[assignment.id] = (counts[assignment.id] || 0) + count * assignment.factor;
        if(assignment.factor === 1) directCounts[assignment.id] = (directCounts[assignment.id] || 0) + count;
        else indirectCounts[assignment.id] = (indirectCounts[assignment.id] || 0) + count;
      });
      var perGroup=SobrecargaEngine.groupFactors(muscleAssignments(exercise||{}));
      Object.keys(perGroup).forEach(function(group){
        groupCounts[group]=(groupCounts[group]||0)+count*perGroup[group];
        if(perGroup[group]===1) groupDirect[group]=(groupDirect[group]||0)+count;
        else groupIndirect[group]=(groupIndirect[group]||0)+count;
      });
    });
  });
  var groups = Object.keys(counts).sort(function(a,b){ return counts[b] - counts[a] || MUSCLES[a].localeCompare(MUSCLES[b], 'es'); });
  var groupDetails={};
  groups.forEach(function(id){
    var group=muscleGroupId(id);
    groupDetails[group]=groupDetails[group]||[];
    groupDetails[group].push(id);
  });
  var groupIds=Object.keys(groupCounts).sort(function(a,b){ return groupCounts[b]-groupCounts[a] || MUSCLE_GROUPS[a].localeCompare(MUSCLE_GROUPS[b],'es'); });
  var content = groupIds.length
    ? '<div class="weekly-muscle-list">' + groupIds.map(function(group){
        var details=groupDetails[group];
        var subgroups=details.length>1 ? '<details class="muscle-volume-detail"><summary>Ver subdivisiones</summary>'+details.map(function(id){ return '<div><span>'+esc(MUSCLES[id])+'</span><strong>'+fmt1(counts[id])+' estimadas</strong></div>'; }).join('')+'</details>' : '';
        var directLabel=groupDirect[group]||0;
        var indirectLabel=groupIndirect[group]||0;
        var secondary=indirectLabel ? ' · '+fmt1(indirectLabel)+' indirectas × 0,5 = '+fmt1(indirectLabel*0.5) : '';
        return '<div class="weekly-muscle-row"><div><span>' + esc(MUSCLE_GROUPS[group] || group) + '</span><small>' + fmt1(directLabel) + ' directas' + secondary + (details.length===1 ? ' · '+esc(MUSCLES[details[0]]) : '') + '</small>' + subgroups + '</div><strong>' + fmt1(groupCounts[group]) + ' estimadas</strong></div>';
      }).join('') + '</div>'
    : '<p class="home-weekly-note">Aún no hay series efectivas registradas esta semana.</p>';
  var now=new Date(), today=iso(now);
  var previousGroupValues={};
  for(var weekIndex=1; weekIndex<=4; weekIndex++){
    var range=SobrecargaEngine.comparableWeekRange(today,weekIndex);
    var weekCounts={};
    S.sessions.forEach(function(session){
      if(session.date>=range.start && session.date<=range.end){
        session.entries.forEach(function(entry){
          var count=entryEffectiveSets(entry), ex=exById(entry.exId);
          if(!count) return;
          var assignments=muscleAssignments(ex||{});
          var perGroup=SobrecargaEngine.groupFactors(assignments);
          Object.keys(perGroup).forEach(function(group){ weekCounts[group]=(weekCounts[group]||0)+count*perGroup[group]; });
        });
      }
    });
    Object.keys(weekCounts).forEach(function(group){ previousGroupValues[group]=previousGroupValues[group]||[]; previousGroupValues[group].push(weekCounts[group]); });
  }
  var effortByMuscle={};
  week.forEach(function(session){ session.entries.forEach(function(entry){ var ex=exById(entry.exId), id=muscleId(ex||{}); entry.sets.forEach(function(set){ if(!countsForProgress(set)) return; if(set.rir!==null && set.rir!==undefined && isFinite(Number(set.rir))){ effortByMuscle[id]=effortByMuscle[id]||[]; effortByMuscle[id].push(Number(set.rir)); } }); }); });
  var trends=groupIds.slice(0,5).map(function(group){
    var current=groupCounts[group]||0;
    var trend=SobrecargaEngine.compareWeeklyTrend(current,previousGroupValues[group]||[]);
    var efforts=[];
    (groupDetails[group]||[]).forEach(function(id){ efforts=efforts.concat(effortByMuscle[id]||[]); });
    var average=efforts.length?efforts.reduce(function(sum,value){return sum+value;},0)/efforts.length:null;
    var fatigue=average===null?'':average<=1?' · fatiga alta':average<=2?' · fatiga media':' · fatiga baja';
    return '<div class="weekly-muscle-row"><span>'+esc(MUSCLE_GROUPS[group] || group)+'</span><strong>'+esc(trend+fatigue)+'</strong></div>';
  }).join('');
  return '<section class="weekly-muscles"><div><h3>Series efectivas por músculo</h3><details class="volume-help"><summary>Cómo se calcula el volumen y la fatiga</summary><p>Las series directas cuentan completas; las indirectas se estiman al 50 % y el total suma ambas contribuciones. La fatiga estimada usa el RIR/RPE registrado: menor RIR indica mayor fatiga reciente.</p></details></div>' +
    content + (trends?'<div class="weekly-muscle-list"><p class="small muted">Tendencia frente al promedio semanal anterior</p>'+trends+'</div>':'') + (counts.unassigned ? '<p class="home-weekly-note">Asigna un grupo muscular desde Biblioteca → Ejercicios para organizar «Sin asignar».</p>' : '') + '</section>';
}
function suggestHtml(){
  var ids = Object.keys(S.profile.exercises).filter(function(k){
    var e = S.profile.exercises[k]; return !e.archived && lastDate(k) && !S.draft.entries.some(function(x){ return x.exId === k; });
  }).sort(function(a,b){ return lastDate(b) < lastDate(a) ? -1 : 1; }).slice(0, 6);
  if(!ids.length) return '';
  return '<div class="list"><p class="sec-title">Retomar desde tu último entreno</p>' + ids.map(function(id){
    var ex = exById(id), p = planFor(ex);
    var goal = p.status === 'nuevo' ? '' : (p.displayTarget || (fmt(p.nextW) + ' kg × ' + p.target.join(' · ')));
    return '<div class="suggest"><div><div class="nm">' + esc(ex.name) + '</div><div class="small muted">' + goal + '</div></div>' +
      '<div class="line">' + chip(p.status) + '<button class="btn sm" data-act="pick" data-id="' + esc(id) + '" aria-label="Añadir ' + esc(ex.name) + ' a hoy">Añadir</button></div></div>';
  }).join('') + '</div>';
}
function routineList(){
  return Object.keys(S.profile.routines).map(function(k){ return S.profile.routines[k]; })
    .sort(function(a,b){ return a.name.localeCompare(b.name, 'es'); });
}
function routineQuick(){
  var rs = routineList(); if(!rs.length) return '';
  return '<div class="list"><p class="sec-title">Empezar una rutina</p>' + rs.map(function(r){
    return '<div class="suggest"><div><div class="nm">' + esc(r.name) + '</div><div class="small muted">' + r.items.length + ' ejercicio' + (r.items.length === 1 ? '' : 's') + '</div></div>' +
      '<button class="btn sm" data-act="rut-start" data-id="' + esc(r.id) + '">Empezar</button></div>';
  }).join('') + '</div>';
}
function humanDuration(ms){
  var minutes = Math.floor(Math.max(0, ms) / 60000), hours = Math.floor(minutes / 60);
  var rest = minutes % 60;
  return hours ? hours + ' h' + (rest ? ' ' + rest + ' min' : '') : minutes + ' min';
}
function sessionEditorHtml(session){
  var edit = S.sessionEdit;
  var minutes = Math.max(0, Math.floor((Number(session.durationMs) || 0) / 60000));
  var hours = Math.floor(minutes / 60), remainder = minutes % 60;
  var data = edit.session, date = edit.date, editHours = edit.hours, editMinutes = edit.minutes;
  var setsHtml = data.entries.map(function(entry, entryIndex){
    var exercise = exName(entry.exId);
    var collapsed = edit.collapsedEntries.has(entry);
    var exerciseConfig = S.profile.exercises[entry.exId];
    var rows = entry.sets.map(function(set, setIndex){
      var side = set.side === 'right' ? ' · Der.' : (set.side === 'left' ? ' · Izq.' : '');
      var effort = set.rir === null || set.rir === undefined ? '' : fmt(S.profile.settings.mode === 'rpe' ? 10 - set.rir : set.rir);
      var input = function(field, label, value, mode){
        return '<label class="field session-set-field"><span class="lab">' + label + '</span><input class="in" data-session-edit="' + field + '" data-entry="' + entryIndex + '" data-set="' + setIndex + '" inputmode="' + mode + '" value="' + esc(value === null || value === undefined ? '' : value) + '"' + (edit.saving ? ' disabled' : '') + '></label>';
      };
      var options = Object.keys(SET_TYPES).map(function(key){
        return '<option value="' + key + '"' + (setType(set) === key ? ' selected' : '') + '>' + SET_TYPES[key] + '</option>';
      }).join('');
      var finishControl = set.editorDone
        ? '<button class="set-finish set-finish-done" data-act="session-undo-finish-set" data-entry="' + entryIndex + '" data-set="' + setIndex + '" aria-label="Deshacer fin de la serie ' + (set.pair !== undefined ? set.pair + 1 : setIndex + 1) + '"' + (edit.saving ? ' disabled' : '') + '><span aria-hidden="true">✓</span> Hecha</button>'
        : '<button class="btn ghost sm set-finish" data-act="session-finish-set" data-entry="' + entryIndex + '" data-set="' + setIndex + '"' + (!sessionEditSetCanFinish(entry, set, exerciseConfig) || edit.saving ? ' disabled' : '') + '>Terminar serie</button>';
      return '<div class="session-set-edit" data-entry="' + entryIndex + '" data-set="' + setIndex + '"><strong>Serie ' + (set.pair !== undefined ? set.pair + 1 : setIndex + 1) + esc(side) + '</strong>' +
        input('weight', 'Kg', set.w, 'decimal') + input('reps', 'Reps', set.r, 'numeric') + input('effort', S.profile.settings.mode === 'rpe' ? 'RPE' : 'RIR', effort, 'decimal') +
        '<select class="txt session-set-type" data-session-edit="type" data-entry="' + entryIndex + '" data-set="' + setIndex + '" aria-label="Tipo de serie"' + (edit.saving ? ' disabled' : '') + '>' + options + '</select>' +
        input('rest', 'Descanso s', Number.isFinite(set.restMs) ? Math.round(set.restMs/1000) : '', 'numeric') +
        finishControl + '<button class="btn ghost sm" data-act="session-remove-set" data-entry="'+entryIndex+'" data-set="'+setIndex+'"'+(edit.saving?' disabled':'')+'>Quitar serie</button></div>';
    }).join('');
    var tools='<div class="row"><button class="btn ghost sm" data-act="session-add-set" data-entry="'+entryIndex+'"'+(edit.saving?' disabled':'')+'>Añadir serie</button>' +
      (edit.confirmEntry===entryIndex
        ? '<button class="btn danger sm" data-act="session-remove-exercise-ok" data-entry="'+entryIndex+'"'+(edit.saving?' disabled':'')+'>Confirmar quitar ejercicio</button><button class="btn ghost sm" data-act="session-remove-exercise-cancel"'+(edit.saving?' disabled':'')+'>Cancelar</button>'
        : '<button class="btn ghost sm" data-act="session-remove-exercise" data-entry="'+entryIndex+'"'+(edit.saving?' disabled':'')+'>Quitar ejercicio</button>') + '</div>';
    var replaceOptions='<option value="'+esc(entry.exId)+'">'+esc(exercise)+'</option>'+Object.keys(S.profile.exercises).filter(function(id){return id!==entry.exId && !S.profile.exercises[id].archived;}).map(function(id){return '<option value="'+esc(id)+'">'+esc(S.profile.exercises[id].name)+'</option>';}).join('');
    var replace='<label class="field"><span class="lab">Cambiar ejercicio</span><select class="txt" data-session-replace-exercise data-entry="'+entryIndex+'"'+(edit.saving?' disabled':'')+'>'+replaceOptions+'</select></label>';
    var orderControls='<div class="row"><button class="btn ghost sm" data-act="session-move-exercise" data-entry="'+entryIndex+'" data-direction="-1"'+(entryIndex===0||edit.saving?' disabled':'')+'>↑ Mover arriba</button><button class="btn ghost sm" data-act="session-move-exercise" data-entry="'+entryIndex+'" data-direction="1"'+(entryIndex===data.entries.length-1||edit.saving?' disabled':'')+'>↓ Mover abajo</button></div>';
    return '<div class="session-entry-edit' + (collapsed ? ' is-collapsed' : '') + '" data-entry="' + entryIndex + '">' +
      '<div class="card-head workout-card-head"><h3 class="workout-card-heading"><button class="workout-card-toggle" data-act="session-toggle-entry" data-entry="' + entryIndex + '" aria-expanded="' + (!collapsed) + '">' +
      '<span class="workout-card-title"><span class="workout-card-name">' + esc(exercise) + '</span><span class="workout-progress session-progress">' + sessionEditProgressText(entry, exerciseConfig) + '</span></span>' +
      '<span class="workout-card-chevron" aria-hidden="true">' + (collapsed ? '▸' : '▾') + '</span></button></h3></div>' +
      (collapsed ? '' : '<div class="workout-card-body">' + replace + orderControls + rows + tools + '</div>') + '</div>';
  }).join('');
  var addPicker=edit.addPicker ? '<div class="field"><label class="lab" for="session-add-exercise">Ejercicio</label><select id="session-add-exercise" class="txt" data-session-add-exercise>'+
    '<option value="">Seleccionar ejercicio</option>'+Object.keys(S.profile.exercises).filter(function(id){return !S.profile.exercises[id].archived;}).map(function(id){var ex=S.profile.exercises[id];return '<option value="'+esc(id)+'">'+esc(ex.name)+'</option>';}).join('')+'</select></div><button class="btn ghost sm" data-act="session-add-exercise-cancel"'+(edit.saving?' disabled':'')+'>Cancelar</button>' : '<button class="btn ghost sm" data-act="session-add-exercise-picker"'+(edit.saving?' disabled':'')+'>Añadir ejercicio</button>';
  return '<section class="card"><p class="sec-title">Editar entrenamiento</p>' +
    '<div class="fields"><div class="field"><label class="lab" for="session-edit-date">Día del entrenamiento</label><input class="txt" id="session-edit-date" data-session-meta="date" type="date" required value="' + esc(date) + '"' + (edit.saving ? ' disabled' : '') + '></div>' +
    '<div class="field"><label class="lab" for="session-edit-hours">Horas</label><input class="txt" id="session-edit-hours" data-session-meta="hours" type="number" min="0" max="999" step="1" inputmode="numeric" required value="' + esc(editHours) + '"' + (edit.saving ? ' disabled' : '') + '></div>' +
    '<div class="field"><label class="lab" for="session-edit-minutes">Minutos</label><input class="txt" id="session-edit-minutes" data-session-meta="minutes" type="number" min="0" max="59" step="1" inputmode="numeric" required value="' + esc(editMinutes) + '"' + (edit.saving ? ' disabled' : '') + '></div></div>' +
    '<p class="small muted">La duración se guarda con precisión de minutos. Corrige aquí peso, reps o esfuerzo de cada serie; también puedes cambiar el tipo. Al editar una serie marcada, vuelve a quedar pendiente. La fecha corregida actualiza el resumen semanal.</p>' +
    setsHtml + addPicker +
    (edit.conflict ? '<div class="alert warn"><strong>Conflicto de sincronización</strong><p class="small muted">' + esc(edit.conflict.message) + '</p><div class="row"><button class="btn ghost sm" data-act="session-conflict-reload"' + (edit.saving ? ' disabled' : '') + '>Recargar versión remota</button><button class="btn sm" data-act="session-conflict-overwrite"' + (edit.saving ? ' disabled' : '') + '>Sobrescribir</button></div></div>' : '') +
    '<div class="row"><button class="btn sm" data-act="session-edit-save"' + (edit.saving ? ' disabled' : '') + '>Guardar cambios</button><button class="btn ghost sm" data-act="session-edit-cancel"' + (edit.saving ? ' disabled' : '') + '>Cancelar</button></div></section>';
}
function sessionEditSetValid(set){
  return !!set && Number.isFinite(set.w) && set.w >= 0 && Number.isInteger(set.r) && set.r > 0;
}
function sessionEntryIsUnilateral(entry, exercise){
  return typeof entry.unilateral === 'boolean' ? entry.unilateral : !!(exercise && exercise.unilateral);
}
function sessionEditSetCanFinish(entry, set, exercise){
  if(!sessionEditSetValid(set)) return false;
  if(!sessionEntryIsUnilateral(entry,exercise) || set.pair === undefined) return true;
  var pair = entry.sets.filter(function(item){ return item.pair === set.pair; });
  return pair.length === 2 && pair.some(function(item){ return item.side === 'left'; }) &&
    pair.some(function(item){ return item.side === 'right'; }) && pair.every(sessionEditSetValid);
}
function prepareSessionForEdit(session){
  var editable = clone(session);
  editable.entries.forEach(function(entry){
    entry.sets.forEach(function(set){ set.editorDone=sessionEditSetValid(set); });
  });
  return editable;
}
function sessionEditProgressText(entry, exercise){
  var target = Math.max(1, Number(entry.cfg && entry.cfg.sets) || Number(exercise && exercise.sets) || 1), completed = 0;
  if(sessionEntryIsUnilateral(entry,exercise)){
    var pairs = Object.create(null);
    entry.sets.forEach(function(set){
      if(set.pair === undefined || setType(set) !== 'normal' || !set.editorDone) return;
      var key = String(set.pair);
      if(!pairs[key]) pairs[key] = {left:false,right:false};
      if(set.side === 'left' || set.side === 'right') pairs[key][set.side] = true;
    });
    completed = Object.keys(pairs).filter(function(key){ return pairs[key].left && pairs[key].right; }).length;
  }else{
    completed = entry.sets.filter(function(set){ return setType(set) === 'normal' && set.editorDone; }).length;
  }
  return Math.min(target, completed) + '/' + target + ' series';
}
function refreshSessionEditProgress(entryIndex){
  var edit = S.sessionEdit, entry = edit && edit.session.entries[entryIndex];
  if(!entry) return;
  var progress = $('.session-entry-edit[data-entry="' + entryIndex + '"] .session-progress');
  if(progress) progress.textContent = sessionEditProgressText(entry, S.profile.exercises[entry.exId]);
}
function setSessionEditDone(entry, set, done, exercise){
  if(sessionEntryIsUnilateral(entry,exercise) && set.pair !== undefined){
    entry.sets.forEach(function(item){ if(item.pair === set.pair) item.editorDone = done; });
  }else set.editorDone = done;
}
function updateSessionEditFinishControl(entryIndex, setIndex){
  var edit = S.sessionEdit, entry = edit && edit.session.entries[entryIndex], set = entry && entry.sets[setIndex];
  var row = $('.session-set-edit[data-entry="' + entryIndex + '"][data-set="' + setIndex + '"]');
  var oldButton = row && $('.set-finish', row);
  if(!set || !oldButton) return;
  var exercise = S.profile.exercises[entry.exId], button = document.createElement('button');
  button.dataset.entry = String(entryIndex); button.dataset.set = String(setIndex); button.className = 'set-finish';
  if(set.editorDone){
    button.dataset.act = 'session-undo-finish-set';
    button.classList.add('set-finish-done');
    button.setAttribute('aria-label', 'Deshacer fin de la serie ' + (set.pair !== undefined ? set.pair + 1 : setIndex + 1));
    button.innerHTML = '<span aria-hidden="true">✓</span> Hecha';
  }else{
    button.dataset.act = 'session-finish-set';
    button.classList.add('btn','ghost','sm');
    button.textContent = 'Terminar serie';
    button.disabled = !sessionEditSetCanFinish(entry, set, exercise);
  }
  oldButton.replaceWith(button);
  refreshSessionEditProgress(entryIndex);
}
function updateSessionEditFinishControls(entryIndex, setIndex){
  var edit = S.sessionEdit, entry = edit && edit.session.entries[entryIndex], set = entry && entry.sets[setIndex];
  if(!set) return;
  var exercise = S.profile.exercises[entry.exId];
  if(sessionEntryIsUnilateral(entry,exercise) && set.pair !== undefined){
    entry.sets.forEach(function(item,index){ if(item.pair === set.pair) updateSessionEditFinishControl(entryIndex,index); });
  }else updateSessionEditFinishControl(entryIndex,setIndex);
  refreshSessionEditProgress(entryIndex);
}
function saveSessionEdit(){
  var edit = S.sessionEdit;
  if(!edit || edit.saving) return;
  var date = edit.date, hoursText = String(edit.hours), minutesText = String(edit.minutes);
  var hours = Number(hoursText), minutes = Number(minutesText);
  var validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && iso(parseISO(date)) === date;
  if(!validDate){ toast('Elige una fecha válida'); return; }
  if(hoursText.trim() === '' || minutesText.trim() === '' || !Number.isInteger(hours) || hours < 0 || hours > 999 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59){
    toast('Indica horas y minutos válidos'); return;
  }
  if(!edit.session.entries.length){ toast('El entrenamiento debe conservar al menos un ejercicio'); return; }
  var validSets = edit.session.entries.every(function(entry){
    if(!entry.sets || !entry.sets.length) return false;
    return entry.sets.every(function(set){
      return Number.isFinite(set.w) && set.w >= 0 && Number.isInteger(set.r) && set.r > 0 &&
        (set.rir === null || set.rir === undefined || (Number.isFinite(set.rir) && set.rir >= 0 && set.rir <= 10));
    });
  });
  if(!validSets){ toast('Cada serie debe tener peso (0 para ejercicios con carga corporal), reps válidos y esfuerzo entre 0 y 10'); return; }
  var durationMs = (hours * 60 + minutes) * 60000;
  var updated = clone(edit.session);
  updated.entries.forEach(function(entry){
    entry.sets.forEach(function(set){ delete set.editorDone; });
  });
  Object.assign(updated, {date:date, durationMs:durationMs});
  var shiftToDate = function(timestamp){
    var original = new Date(timestamp), shifted = parseISO(date);
    shifted.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds());
    return shifted.getTime();
  };
  var legacyBase = Number.isFinite(edit.session.finishedAt)
    ? edit.session.finishedAt
    : (Number.isFinite(edit.session.ts) ? edit.session.ts : edit.session.startedAt);
  if(Number.isFinite(edit.session.startedAt) && !Number.isFinite(edit.session.finishedAt)){
    updated.startedAt = shiftToDate(edit.session.startedAt);
    updated.finishedAt = updated.startedAt + durationMs;
  } else if(Number.isFinite(edit.session.startedAt)){
    updated.startedAt = shiftToDate(edit.session.startedAt);
    updated.finishedAt = updated.startedAt + durationMs;
  } else if(Number.isFinite(legacyBase)){
    updated.finishedAt = shiftToDate(legacyBase);
    updated.startedAt = updated.finishedAt - durationMs;
  } else {
    var fallback = parseISO(date); fallback.setHours(12, 0, 0, 0);
    updated.finishedAt = fallback.getTime(); updated.startedAt = updated.finishedAt - durationMs;
  }
  updated.ts = updated.finishedAt;
  edit.saving = true; render();
  Store.updateSession(updated, {overwrite:!!edit.overwrite}).then(function(saved){
    saved=saved || updated;
    var index = S.sessions.findIndex(function(item){ return item.id === updated.id; });
    if(index >= 0) S.sessions[index] = saved;
    S.sessionEdit = null; render(); toast('Entrenamiento actualizado');
  }).catch(function(error){
    if(S.sessionEdit && S.sessionEdit.id === updated.id){
      S.sessionEdit.saving=false;
      if(error && error.code==='session-conflict'){
        S.sessionEdit.conflict={message:error.message, remoteSession:error.remoteSession, deleted:!!error.deleted};
      }
    }
    render();
  });
}
function volumeText(volume){ return new Intl.NumberFormat('es-CL', {maximumFractionDigits:0}).format(Math.round(volume)); }
function homeDashboard(){
  var start = new Date(), mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset); start.setHours(0, 0, 0, 0);
  var from = iso(start);
  var week = S.sessions.filter(function(session){ return session.date >= from; });
  var stats = week.reduce(function(total, session){
    var values = sessionStats(session);
    total.duration += Number(session.durationMs) || 0;
    if(Number(session.durationMs) > 0) total.hasDuration = true;
    total.volume += values.volume;
    return total;
  }, {duration:0, hasDuration:false, volume:0});
  var sorted = S.sessions.slice().sort(function(a,b){ return a.date === b.date ? (b.ts || 0) - (a.ts || 0) : (a.date < b.date ? 1 : -1); });
  var latest = sorted[0], out = '<section class="home-dashboard"><div class="home-heading"><div><span class="home-eyebrow">Tu semana de entrenamiento</span><h2>Resumen semanal</h2></div>' +
    '<span class="home-week">' + esc(dFmt(from, {day:'numeric', month:'short'})) + ' — hoy</span></div>' +
    '<div class="weekly-stats"><div class="weekly-stat"><strong>' + week.length + '</strong><span>entrenamientos</span></div>' +
    '<div class="weekly-stat"><strong>' + (stats.hasDuration ? humanDuration(stats.duration) : '—') + '</strong><span>duración</span></div>' +
    '<div class="weekly-stat"><strong>' + volumeText(stats.volume) + ' kg</strong><span>volumen · sin aprox.</span></div></div>' +
    '<button class="btn home-start" data-act="start"><span aria-hidden="true">▶</span> Nuevo entrenamiento</button>' +
    weeklyMuscleSummaryHtml(week);
  if(latest){
    var latestStats = sessionStats(latest);
    var exercises = latest.entries.slice(0, 6).map(function(entry){
      var name = exName(entry.exId), initials = name.split(/\s+/).slice(0, 2).map(function(part){ return part.charAt(0); }).join('').toUpperCase();
      var effective = entryEffectiveSets(entry);
      return '<div class="home-exercise"><span class="exercise-mark" aria-hidden="true">' + esc(initials) + '</span><span class="home-exercise-name">' + esc(name) + '</span><span class="home-exercise-meta">' + effective + ' series</span></div>';
    }).join('');
    out += '<section class="latest-workout"><div class="latest-head"><div><span class="home-eyebrow">Tu actividad reciente</span><h3>' + esc(latest.routineName || (latest.demo ? 'Entreno de ejemplo' : 'Entrenamiento')) + '</h3><span class="latest-date">' + esc(dFmt(latest.date, {weekday:'long', day:'numeric', month:'long'})) + '</span></div>' +
      '<button class="text-button" data-act="tab" data-tab="historial">Ver historial</button></div>' +
      '<div class="latest-stats"><span><strong>' + (Number(latest.durationMs) > 0 ? humanDuration(latest.durationMs) : '—') + '</strong> duración</span><span><strong>' + volumeText(latestStats.volume) + ' kg</strong> volumen sin aprox.</span><span><strong>' + latestStats.effectiveSets + '</strong> series efectivas</span></div>' +
      (exercises ? '<div class="home-exercises">' + exercises + (latest.entries.length > 6 ? '<span class="more-exercises">+' + (latest.entries.length - 6) + ' más</span>' : '') + '</div>' : '') +
      '</section>';
  } else {
    out += '<section class="latest-workout empty-latest"><span class="home-eyebrow">Tu actividad reciente</span><h3>Tu primer entreno empieza aquí</h3><p>Cuando registres una sesión, aquí verás su duración, volumen y ejercicios.</p></section>';
  }
  out += '</section>';
  if(!latest && !routineList().length) out += '<section class="card home-first"><div><p class="sec-title">Empieza en dos pasos</p><p>Prepara una rutina o registra un ejercicio ahora. La app irá sugiriendo cómo progresar en tus próximos entrenos.</p></div><div class="row"><button class="btn sm" data-act="library-open-section" data-section="rutinas">Crear rutina</button><button class="btn ghost sm" data-act="demo-load">Probar con ejemplo</button></div></section>';
  out += routineQuick() + suggestHtml();
  if(S.picker) out += pickerHtml('day');
  return out;
}
function viewHoy(){
  var out = savedHtml();
  if(!S.draft.entries.length) return out + homeDashboard();
  var done = workingDone();
  var rt = S.draft.routineId && S.profile.routines[S.draft.routineId];
  out += '<div class="head-row"><h2>Hoy</h2><div class="workout-meta">' +
    (S.draft.startedAt ? '<span class="workout-clock-label">Tiempo <strong class="num" id="workout-clock">' + formatDuration(Date.now() - S.draft.startedAt) + '</strong></span>' : '') +
    '<span class="num muted" id="done-count">' + done + ' serie' + (done === 1 ? '' : 's') + ' efectiva' + (done === 1 ? '' : 's') + '</span></div></div>';
  out += '<p class="draft-save-status" id="draft-save-status" data-state="' + esc(S.draftSaveState) + '">' +
    (S.draftSaveState==='synced'?'Guardado y sincronizado':S.draftSaveState==='localOnly'?'Guardado local · sincronización pendiente':S.draftSaveState==='saving'?'Guardando…':S.draftSaveState==='error'?'No se pudo guardar':'Guardado en este dispositivo') + '</p>';
  if(S.draft.entries.length) out += restTimerHtml();
  if(rt) out += '<p class="muted">Rutina: <strong>' + esc(rt.name) + '</strong></p>';
  if(!S.draft.entries.length && !S.picker) out += routineQuick();
  out += S.draft.entries.map(entryHtml).join('');
  if(S.picker) out += pickerHtml('day');
  else out += '<button class="btn ' + (S.draft.entries.length ? 'ghost' : '') + ' block" data-act="start">+ Añadir ejercicio</button>';
  if(!S.draft.entries.length && !S.picker) out += suggestHtml();
  if(S.draft.entries.length){
    if(S.confirm === 'finish-routine'){
      out += '<section class="card"><p class="sec-title">¿Actualizar la rutina?</p><p class="small">Cambiaste el orden o la configuración de este entreno. Puedes guardar esos cambios para la próxima vez o dejar la rutina como estaba antes de entrenar.</p>' +
        '<div class="row"><button class="btn" data-act="finish-update"' + (done && !S.finishSaving ? '' : ' disabled') + '>Actualizar rutina y terminar</button><button class="btn ghost" data-act="finish-keep"' + (done && !S.finishSaving ? '' : ' disabled') + '>Terminar sin cambiarla</button><button class="btn ghost" data-act="finish-cancel">Volver al entreno</button></div></section>';
    } else {
      out += '<div class="workout-finish"><div class="row"><button class="btn" id="finish" data-act="finish"' + (done && !S.finishSaving ? '' : ' disabled') + '>' + (S.finishSaving ? 'Guardando…' : 'Terminar entreno') + '</button>' +
        (S.confirm === 'discard'
          ? '<button class="btn danger" data-act="discard-ok">Confirmar descarte</button>'
          : '<button class="btn ghost" data-act="discard">Descartar</button>') + '</div></div>';
    }
  }
  return out;
}

/* ---------- rutinas ---------- */
function effInputVal(rir){ return fmt(S.profile.settings.mode === 'rpe' ? 10 - rir : rir); }
function newItem(exId){
  var ex = exById(exId), ef = [];
  for(var i=0;i<ex.sets;i++) ef.push(S.profile.settings.targetRir);
  return Object.assign({exId:exId, sets:ex.sets, warmupSets:Number(ex.warmupSets) || 0, min:ex.min, max:ex.max, inc:ex.inc, loadStep:exerciseLoadStep(ex), efforts:ef, unilateral:!!ex.unilateral}, warmupSettings(ex));
}
function viewRut(){
  if(S.pedit) return programEditor();
  if(S.redit) return routineEditor();
  if(S.selectedRoutine && S.profile.routines[S.selectedRoutine]) return routineLibraryDetail(S.profile.routines[S.selectedRoutine]);
  var rs = routineList(), programs = Object.keys(S.profile.programs || {}).map(function(id){ return S.profile.programs[id]; })
    .sort(function(a,b){ return a.name.localeCompare(b.name, 'es'); });
  var activeProgram = S.selectedProgram && S.profile.programs[S.selectedProgram];
  var title = activeProgram ? activeProgram.name : 'Tu biblioteca';
  var out = '<div class="library-heading"><div>' +
    (activeProgram ? '<button class="text-button library-back" data-act="program-back">‹ Biblioteca</button>' : '') +
    '<h2>' + esc(title) + '</h2></div>' +
    (S.librarySection === 'programas' && !activeProgram
      ? '<button class="library-add" data-act="program-new" aria-label="Crear programa">＋</button>'
      : S.librarySection === 'rutinas' || activeProgram
        ? '<button class="library-add" data-act="rut-new" aria-label="Crear rutina">＋</button>'
        : '') + '</div>';
  out += '<div class="library-filters" role="group" aria-label="Secciones de biblioteca">' +
    ['programas','rutinas','ejercicios'].map(function(section){
      var label = section.charAt(0).toUpperCase() + section.slice(1);
      return '<button class="library-filter' + (S.librarySection === section ? ' active' : '') + '"' +
        ' data-act="library-section" data-section="' + section + '">' + label + '</button>';
    }).join('') + '</div>';
  if(activeProgram || S.librarySection === 'programas'){
    if(activeProgram){
      var programRoutines = rs.filter(function(r){ return r.programId === activeProgram.id; });
      out += '<div class="library-sort"><span>Rutinas del programa</span><button class="text-button" data-act="program-edit" data-id="' + esc(activeProgram.id) + '">Editar programa</button></div>';
      out += programRoutines.length
        ? '<div class="library-list">' + programRoutines.map(libraryRoutineCard).join('') + '</div>'
        : '<section class="library-empty"><span>▤</span><h3>Este programa todavía no tiene rutinas</h3><p>Añade una rutina nueva y asígnala a este programa.</p><button class="btn" data-act="rut-new">Crear rutina</button></section>';
      if(S.confirm === 'delp:' + activeProgram.id) out += '<section class="card"><p>¿Borrar el programa? Las rutinas se conservarán sin asignación.</p><div class="row"><button class="btn danger sm" data-act="program-del-ok" data-id="' + esc(activeProgram.id) + '">Confirmar: borrar programa</button><button class="btn ghost sm" data-act="program-cancel-delete">Cancelar</button></div></section>';
    } else {
      out += '<div class="library-sort"><span>↕ Recientes</span><span class="muted">▦</span></div>';
      out += '<div class="library-list"><button class="library-card create-card" data-act="program-new"><span class="library-cover">＋</span><span><strong>Crear programa</strong><small>Organiza tus rutinas en un programa</small></span></button>' +
        (programs.length ? programs.map(function(program){
          var count = rs.filter(function(r){ return r.programId === program.id; }).length;
          return '<div class="library-card"><button class="library-open" data-act="program-open" data-id="' + esc(program.id) + '"><span class="library-cover program-cover">' + esc(program.name.slice(0,1).toUpperCase()) + '</span><span><strong>' + esc(program.name) + '</strong><small>' + count + ' rutina' + (count === 1 ? '' : 's') + '</small></span></button>' +
            '<button class="mini" data-act="program-del" data-id="' + esc(program.id) + '" aria-label="Borrar programa ' + esc(program.name) + '">⋮</button></div>';
        }).join('') : '<section class="library-empty"><span>▤</span><h3>Aún no tienes programas</h3><p>Crea un programa para agrupar rutinas, por ejemplo: Torso/Pierna o Full Body.</p></section>') + '</div>';
      if(S.confirm && S.confirm.indexOf('delp:') === 0){
        var deleteId = S.confirm.slice(5), deleteProgram = S.profile.programs[deleteId];
        if(deleteProgram) out += '<section class="card"><p>¿Borrar «' + esc(deleteProgram.name) + '»? Sus rutinas se conservarán en la biblioteca.</p><button class="btn danger sm" data-act="program-del-ok" data-id="' + esc(deleteId) + '">Confirmar: borrar programa</button><button class="btn ghost sm" data-act="program-cancel-delete">Cancelar</button></section>';
      }
    }
  } else if(S.librarySection === 'rutinas'){
    out += '<div class="library-sort"><span>↕ Recientes</span><span class="muted">' + rs.length + ' rutinas</span></div>';
    out += rs.length
      ? '<div class="library-list"><button class="library-card create-card" data-act="rut-new"><span class="library-cover">＋</span><span><strong>Crear rutina</strong><small>Diseña una sesión de entrenamiento</small></span></button>' + rs.map(libraryRoutineCard).join('') + '</div>'
      : '<section class="library-empty"><span>▤</span><h3>Aún no tienes rutinas</h3><p>Crea una rutina desde cero o abre un programa para añadirla ahí.</p><button class="btn" data-act="rut-new">Crear rutina</button></section>';
  } else {
    out += viewEj();
  }
  return out;
}
function libraryRoutineCard(routine){
  var count = routine.items.length, replacing = S.confirm === 'start:' + routine.id;
  return '<div class="library-card"><button class="library-open routine-open" data-act="rut-detail" data-id="' + esc(routine.id) + '"><span class="library-cover routine-cover">' + esc(routine.name.trim().charAt(0).toUpperCase() || 'R') + '</span><span><strong>' + esc(routine.name) + '</strong><small>' + count + ' ejercicio' + (count === 1 ? '' : 's') + '</small></span></button>' +
    '<div class="library-card-actions"><button class="btn sm" data-act="rut-start" data-id="' + esc(routine.id) + '">' + (replacing ? 'Reemplazar' : 'Entrenar') + '</button><button class="mini" data-act="rut-edit" data-id="' + esc(routine.id) + '" aria-label="Editar ' + esc(routine.name) + '">✎</button><button class="mini" data-act="rut-duplicate" data-id="' + esc(routine.id) + '" aria-label="Duplicar ' + esc(routine.name) + '">⧉</button>' +
    (S.confirm === 'delr:' + routine.id
      ? '<button class="mini danger" data-act="rut-del-ok" data-id="' + esc(routine.id) + '" aria-label="Confirmar borrar rutina">✓</button>'
      : '<button class="mini" data-act="rut-del" data-id="' + esc(routine.id) + '" aria-label="Borrar ' + esc(routine.name) + '">×</button>') + '</div></div>';
}
function programEditor(){
  var program = S.pedit, isNew = !program.id;
  return '<div class="library-heading"><button class="text-button" data-act="program-cancel">‹ Biblioteca</button></div><section class="card"><h2>' + (isNew ? 'Crear programa' : 'Editar programa') + '</h2>' +
    '<div class="field"><label class="lab" for="program-name">Nombre del programa</label><input id="program-name" class="txt" data-pf="name" value="' + esc(program.name) + '" placeholder="Ej. Torso/Pierna"></div>' +
    '<p class="small muted">Agrupa rutinas relacionadas para encontrarlas fácilmente en tu biblioteca.</p><div class="row"><button class="btn" data-act="program-save">Guardar programa</button><button class="btn ghost" data-act="program-cancel">Cancelar</button></div></section>';
}
function routineLibraryDetail(routine){
  var program = routine.programId && S.profile.programs[routine.programId];
  var exercises = routine.items.map(function(item){
    var warmups = Number(item.warmupSets) || 0;
    return '<div class="library-exercise-row"><span class="exercise-mark" aria-hidden="true">' + esc(exName(item.exId).trim().charAt(0).toUpperCase()) + '</span><span><strong>' + esc(exName(item.exId)) + '</strong><small>' +
      (warmups ? warmups + ' aprox. + ' : '') + item.sets + ' series · ' + item.min + '–' + item.max + ' reps' + (item.unilateral ? ' · por lado' : '') +
      (exById(item.exId) && exById(item.exId).archived ? ' · ejercicio archivado (se omitirá al entrenar)' : '') + '</small></span></div>';
  }).join('');
  return '<div class="library-heading"><div><button class="text-button library-back" data-act="routine-back">‹ ' + (program ? esc(program.name) : 'Biblioteca') + '</button><h2>' + esc(routine.name) + '</h2></div>' +
    '<button class="library-add" data-act="rut-edit" data-id="' + esc(routine.id) + '" aria-label="Editar rutina">✎</button></div>' +
    '<div class="library-routine-summary"><span>' + routine.items.length + ' ejercicio' + (routine.items.length === 1 ? '' : 's') + '</span>' +
    (program ? '<span>' + esc(program.name) + '</span>' : '') + '</div>' +
    '<div class="library-exercises">' + (exercises || '<p class="muted">Añade ejercicios a esta rutina desde Editar.</p>') + '</div>' +
    '<div class="row"><button class="btn home-start" data-act="rut-start" data-id="' + esc(routine.id) + '"><span aria-hidden="true">▶</span> Entrenar rutina</button><button class="btn ghost" data-act="rut-duplicate" data-id="' + esc(routine.id) + '">Duplicar rutina</button><button class="btn ghost" data-act="rut-export" data-id="' + esc(routine.id) + '">Compartir rutina</button></div>';
}
function routineItemsForEdit(routine){
  return clone(routine.items).map(function(item){
    item.loadStep = Number(item.loadStep) > 0 ? Number(item.loadStep) : exerciseLoadStep(exById(item.exId) || item);
    item.efforts = (item.efforts || []).slice();
    while(item.efforts.length < item.sets) item.efforts.push(item.efforts.length ? item.efforts[item.efforts.length-1] : S.profile.settings.targetRir);
    item.efforts = item.efforts.slice(0, item.sets);
    Object.assign(item, warmupSettings(item));
    return item;
  });
}
function duplicateRoutine(id){
  var routine = S.profile.routines[id];
  if(!routine) return;
  S.redit = {id:null, name:routine.name + ' (copia)', items:routineItemsForEdit(routine), pick:false, programId:routine.programId || ''};
  S.selectedRoutine = null; S.tab = 'rutinas'; S.librarySection = 'rutinas'; S.confirm = null; render(); window.scrollTo(0, 0);
}
function routineEditor(){
  var r = S.redit, lab = S.profile.settings.mode === 'rpe' ? 'RPE' : 'RIR';
  var out = '<div class="head-row"><h2>' + (r.id ? 'Editar rutina' : 'Nueva rutina') + '</h2></div>';
  out += '<section class="card"><div class="field"><label class="lab" for="r-name">Nombre de la rutina</label>' +
    '<input id="r-name" class="txt" type="text" data-rf="name" autocomplete="off" placeholder="Por ejemplo Empuje A" value="' + esc(r.name) + '"></div>' +
    '<div class="field"><label class="lab" for="r-program">Programa</label><select id="r-program" class="txt" data-routine-program><option value="">Sin programa</option>' +
    Object.keys(S.profile.programs || {}).map(function(id){ var program = S.profile.programs[id]; return '<option value="' + esc(id) + '"' + (r.programId === id ? ' selected' : '') + '>' + esc(program.name) + '</option>'; }).join('') +
    '</select></div>' +
    '<p class="hint">Los ajustes de cada ejercicio valen solo en esta rutina. Con mancuernas, el salto es por mancuerna: un salto de 2 kg lleva de 26 a 28 kg.</p></section>';
  r.items.forEach(function(it, i){
    var warmCfg = warmupSettings(it);
    var f = function(key, label, val){
      return '<div class="field"><label class="lab" for="it-' + key + '-' + i + '">' + label + '</label><input id="it-' + key + '-' + i + '" class="txt" inputmode="decimal" data-it="' + key + '" data-i="' + i + '" value="' + esc(String(val).replace('.', ',')) + '"></div>';
    };
    var ef = '';
    for(var k=0;k<it.sets;k++){
      var effort = it.efforts && it.efforts[k] !== undefined ? it.efforts[k] : S.profile.settings.targetRir;
      ef += '<div class="field"><label class="lab" for="ef-' + i + '-' + k + '">Serie ' + (k+1) + '</label><input id="ef-' + i + '-' + k + '" class="in" inputmode="decimal" data-ef="1" data-i="' + i + '" data-k="' + k + '" value="' + esc(effInputVal(effort)) + '"></div>';
    }
    out += '<section class="card"><div class="card-head"><h3>' + esc(exName(it.exId)) + '</h3><div class="it-tools">' +
      '<button class="mini" data-act="rut-up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir ejercicio">↑</button>' +
      '<button class="mini" data-act="rut-down" data-i="' + i + '"' + (i === r.items.length-1 ? ' disabled' : '') + ' aria-label="Bajar ejercicio">↓</button>' +
      '<button class="mini" data-act="rut-rm-item" data-i="' + i + '" aria-label="Quitar ejercicio">×</button></div></div>' +
      '<div class="fields">' + f('sets', 'Series de trabajo', it.sets) + f('warmupSets', 'Series de aproximación', Number(it.warmupSets) || 0) + f('min', 'Reps mín.', it.min) + f('max', 'Reps máx.', it.max) + f('inc', 'Salto de progresión (kg)', it.inc) + f('loadStep', 'Peso disponible cada (kg)', Number(it.loadStep) > 0 ? it.loadStep : exerciseLoadStep(exById(it.exId) || it)) +
      '<div class="field"><label class="lab" for="it-warmupMode-' + i + '">Peso de aproximación</label><select id="it-warmupMode-' + i + '" class="txt" data-it="warmupMode" data-i="' + i + '"><option value="auto"' + (warmCfg.warmupMode === 'auto' ? ' selected' : '') + '>Calcular automáticamente</option><option value="manual"' + (warmCfg.warmupMode === 'manual' ? ' selected' : '') + '>Anotar manualmente</option></select></div>' +
      f('warmupStep', 'Incremento para redondear (kg)', warmCfg.warmupStep) +
      '<div class="field"><label class="lab" for="it-unilateral-' + i + '">Ejecución</label><select id="it-unilateral-' + i + '" class="txt" data-it="unilateral" data-i="' + i + '"><option value="false"' + (it.unilateral ? '' : ' selected') + '>Bilateral</option><option value="true"' + (it.unilateral ? ' selected' : '') + '>Unilateral · ambos lados</option></select></div></div>' +
      ((Number(it.warmupSets) || 0) ? '<div class="field"><span class="lab">Porcentaje de cada aproximación</span><div class="efforts">' + warmCfg.warmupPercents.map(function(percent, index){
        return '<label class="field"><span class="lab">Serie ' + (index+1) + ' · %</span><input class="in" inputmode="decimal" data-it="warmupPercent" data-i="' + i + '" data-k="' + index + '" value="' + esc(String(percent).replace('.', ',')) + '"></label>';
      }).join('') + '</div></div>' : '') +
      '<div class="field"><span class="lab">Esfuerzo objetivo por serie (' + lab + ')</span><div class="efforts">' + ef + '</div></div>' +
      '<p class="small muted">' + ((Number(it.warmupSets) || 0) ? it.warmupSets + (it.warmupSets === 1 ? ' serie de aproximación + ' : ' series de aproximación + ') + (warmCfg.warmupMode === 'auto' ? ' calculada desde el peso de trabajo y redondeada hacia abajo en saltos de ' + fmt(warmCfg.warmupStep) + ' kg. ' : 'con peso manual. ') : '') + it.sets + ' series de trabajo × ' + it.min + '–' + it.max + ' reps. Subes ' + fmt(it.inc) + ' kg cuando todas las series de trabajo lleguen a ' + it.max + ' reps con el esfuerzo pedido.</p></section>';
  });
  if(r.pick) out += pickerHtml('routine');
  else out += '<button class="btn ghost block" data-act="rut-add">+ Añadir ejercicio</button>';
  out += '<div class="row"><button class="btn" data-act="rut-save">Guardar rutina</button><button class="btn ghost" data-act="rut-cancel">Cancelar</button></div>';
  return out;
}

function niceStep(raw){ var c = [0.5,1,2,2.5,5,10,20,25,50,100]; for(var i=0;i<c.length;i++){ if(c[i] >= raw) return c[i]; } return 100; }
function chartSvg(pts, unit){
  unit = unit || 'kg';
  if(pts.length < 2) return '<p class="muted small">Con dos entrenos aparece la curva de progreso.</p>';
  var W = Math.max(280, Math.min(600, document.documentElement.clientWidth - 64)), H = 190, L = 42, R = 16, T = 18, B = 26;
  var ys = pts.map(function(p){ return p.y; });
  var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
  var span = Math.max(hi - lo, 4); lo -= span*0.2; hi += span*0.2;
  var step = niceStep((hi - lo) / 4), t = Math.ceil(lo/step)*step, ticks = [];
  for(; t <= hi; t += step) ticks.push(Math.round(t*100)/100);
  var X = function(i){ return L + i*(W-L-R)/(pts.length-1); };
  var Y = function(v){ return T + (hi - v)/(hi - lo)*(H - T - B); };
  var g = '', i;
  ticks.forEach(function(v){
    g += '<line x1="' + L + '" x2="' + (W-R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<text class="ct" x="' + (L-6) + '" y="' + (Y(v)+4).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
  });
  var cnt = Math.min(pts.length, 4), idx = [];
  for(i=0;i<cnt;i++){ var k = Math.round(i*(pts.length-1)/(cnt-1)); if(idx.indexOf(k) === -1) idx.push(k); }
  idx.forEach(function(k){
    g += '<text class="ct" x="' + X(k).toFixed(1) + '" y="' + (H-8) + '" text-anchor="' + (k === 0 ? 'start' : (k === pts.length-1 ? 'end' : 'middle')) + '">' + esc(pts[k].label) + '</text>';
  });
  var d = pts.map(function(p, k){ return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
  g += '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>';
  pts.forEach(function(p, k){
    var lastPt = k === pts.length-1;
    g += '<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (lastPt ? 5 : 3.5) + '" fill="' + (lastPt ? 'var(--accent)' : 'var(--surface)') + '" stroke="var(--accent)" stroke-width="2"/>';
  });
  var lp = pts[pts.length-1];
  g += '<text class="cv" x="' + X(pts.length-1).toFixed(1) + '" y="' + (Y(lp.y) - 10).toFixed(1) + '" text-anchor="end">' + fmt1(lp.y) + (unit === 'kg' ? ' kg' : ' kg·reps') + '</text>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px" role="img" aria-label="Evolución del ejercicio por entreno">' + g + '</svg>';
}
function exDetail(ex){
  var hist = entriesFor(ex.id);
  var records = personalRecords(ex);
  var warmCfg = warmupSettings(ex);
  var recordHtml = records.weight || records.reps || (records.estimated && records.estimated.value !== null) ? '<div class="record-grid">' +
    (records.weight ? '<div><span>Mayor peso</span><strong>' + fmt(records.weight.value) + ' kg</strong><small>' + esc(dFmt(records.weight.date)) + '</small></div>' : '') +
    (records.reps ? '<div><span>Más reps en una serie</span><strong>' + records.reps.value + ' reps</strong><small>' + esc(dFmt(records.reps.date)) + '</small></div>' : '') +
    (records.estimated && records.estimated.value !== null ? '<div><span>Mejor serie estimada</span><strong>' + fmt1(records.estimated.value) + ' kg</strong><small>' + esc(dFmt(records.estimated.date)) + '</small></div>' : '') + '</div>' : '<p class="small muted">Los récords aparecerán después de registrar series normales.</p>';
  var pts = hist.map(function(h){
    var sets=effectiveSetsFor(ex,h.sets,h.date).filter(function(s){ return setType(s)==='normal' && Number(s.w)>0 && Number(s.r)>0; });
    var y=null;
    if(S.progressMetric==='weight') y=sets.length?Math.max.apply(null,sets.map(function(s){ return Number(s.w); })):null;
    if(S.progressMetric==='volume') y=sets.length?sets.reduce(function(total,s){ return total+Number(s.w)*Number(s.r); },0):null;
    if(S.progressMetric==='estimated') y=estimatedEx1rm(ex,sets);
    return y!==null ? {label:dFmt(h.date),y:y} : null;
  }).filter(Boolean);
  var metricLabels={weight:'Peso máximo',estimated:'1RM estimado',volume:'Volumen'};
  var chartControls='<div class="seg" role="group" aria-label="Métrica de progreso">'+
    ['weight','estimated','volume'].map(function(metric){ return '<button data-act="progress-metric" data-metric="'+metric+'" aria-pressed="'+(S.progressMetric===metric)+'">'+esc(metricLabels[metric])+'</button>'; }).join('')+'</div>';
  var rows = hist.slice(-5).reverse().map(function(h){
    return '<tr><td class="num">' + esc(dFmt(h.date)) + '</td><td>' + esc(setsText(h.sets, true)) + '</td></tr>';
  }).join('');
  var f = function(key, label, val, step){
    return '<div class="field"><label class="lab" for="cfg-' + key + '">' + label + '</label><input id="cfg-' + key + '" class="txt" inputmode="decimal" data-cfg="' + key + '" data-id="' + esc(ex.id) + '" value="' + esc(String(val).replace('.', ',')) + '"></div>';
  };
  return '<div class="list" style="gap:14px"><div><p class="sec-title" style="margin-bottom:6px">Récords personales</p>' + recordHtml + '</div><div><p class="sec-title" style="margin-bottom:6px">Progreso</p>' + chartControls + chartSvg(pts,S.progressMetric==='volume'?'kg·reps':'kg') +
    '<p class="muted small">Peso × (1 + (reps + RIR) ÷ 30), ' + (ex.unilateral ? 'mejor estimado del lado más débil por entreno.' : 'mejor serie de cada entreno.') + '</p></div>' +
    (rows ? '<div class="scroll-x"><table class="table"><thead><tr><th>Fecha</th><th>Series</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
    '<div><p class="sec-title" style="margin-bottom:8px">Reglas de este ejercicio</p><div class="fields">' +
      f('sets', 'Series', ex.sets) + f('warmupSets', 'Series de aproximación', Number(ex.warmupSets) || 0) + f('min', 'Reps mín.', ex.min) + f('max', 'Reps máx.', ex.max) + f('inc', 'Salto de progresión (kg)', ex.inc) + f('loadStep', 'Peso disponible cada (kg)', exerciseLoadStep(ex)) + f('warmupStep', 'Incremento para redondear (kg)', warmCfg.warmupStep) +
      '<div class="field"><label class="lab" for="cfg-warmupMode">Peso de aproximación</label><select id="cfg-warmupMode" class="txt" data-cfg="warmupMode" data-id="' + esc(ex.id) + '"><option value="auto"' + (warmCfg.warmupMode === 'auto' ? ' selected' : '') + '>Calcular automáticamente</option><option value="manual"' + (warmCfg.warmupMode === 'manual' ? ' selected' : '') + '>Anotar manualmente</option></select></div>' +
      '</div><div class="field"><label class="lab" for="cfg-muscle">Grupo muscular principal</label><select id="cfg-muscle" class="txt" data-cfg="muscle" data-id="' + esc(ex.id) + '">' + muscleOptions(ex.muscle) + '</select>' + (LEGACY_MUSCLE_IDS[ex.muscle] ? '<p class="small warn-text">Este ejercicio tenía un grupo general antiguo. Revisa y elige la porción muscular más exacta antes de usar el volumen.</p>' : '') + '</div>' +
      '<fieldset class="field"><legend class="lab">Músculos secundarios estimados</legend><p class="small muted">Aportan aproximadamente 0,5 serie efectiva. Puedes desmarcarlos si no participan en este ejercicio.</p><div class="secondary-muscle-grid">' + Object.keys(MUSCLES).filter(function(id){ return id !== 'unassigned'; }).map(function(id){
        var selected = normalizedSecondaryMuscles(ex).indexOf(id) >= 0;
        return '<label class="secondary-muscle-option"><input type="checkbox" data-cfg="secondary-muscle" data-id="' + esc(ex.id) + '" value="' + esc(id) + '"' + (selected ? ' checked' : '') + '> <span>' + esc(MUSCLES[id]) + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="field"><label class="lab" for="cfg-loadMode">Tipo de carga</label><select id="cfg-loadMode" class="txt" data-cfg="loadMode" data-id="' + esc(ex.id) + '"><option value="external"' + (ex.loadMode !== 'bodyweight' ? ' selected' : '') + '>Peso externo</option><option value="bodyweight"' + (ex.loadMode === 'bodyweight' ? ' selected' : '') + '>Peso corporal + carga añadida</option></select></div>' + (ex.loadMode === 'bodyweight' ? f('bodyweightPercent','Porcentaje del peso corporal que se desplaza',ex.bodyweightPercent === undefined ? 100 : ex.bodyweightPercent) + '<p class="small muted">Por ejemplo, usa cerca de 67 % para flexiones; puedes ajustarlo por ejercicio.</p>' : '') + ((Number(ex.warmupSets) || 0) ? '<div class="field"><span class="lab">Porcentaje de cada aproximación</span><div class="efforts">' + warmCfg.warmupPercents.map(function(percent, index){
        return '<label class="field"><span class="lab">Serie ' + (index+1) + ' · %</span><input class="in" inputmode="decimal" data-cfg="warmupPercent" data-id="' + esc(ex.id) + '" data-k="' + index + '" value="' + esc(String(percent).replace('.', ',')) + '"></label>';
      }).join('') + '</div></div>' : '') + '<div class="fields">' +
      '<div class="field"><label class="lab" for="cfg-unilateral">Ejecución</label><select id="cfg-unilateral" class="txt" data-cfg="unilateral" data-id="' + esc(ex.id) + '"><option value="false"' + (ex.unilateral ? '' : ' selected') + '>Bilateral</option><option value="true"' + (ex.unilateral ? ' selected' : '') + '>Unilateral · ambos lados</option></select></div></div></div>' +
    (S.confirm === 'arch:' + ex.id
      ? '<button class="btn danger sm" data-act="archive-ok" data-id="' + esc(ex.id) + '">Confirmar: archivar</button>'
      : '<button class="btn ghost sm" data-act="archive" data-id="' + esc(ex.id) + '">Archivar ejercicio</button>') + '</div>';
}
function viewEj(){
  var ids = Object.keys(S.profile.exercises).filter(function(k){ return !S.profile.exercises[k].archived; })
    .sort(function(a,b){ var da = lastDate(a), db = lastDate(b); return da === db ? exById(a).name.localeCompare(exById(b).name, 'es') : (da < db ? 1 : -1); });
  var out = '<div class="head-row"><h2>Ejercicios</h2><span class="num muted">' + ids.length + '</span></div>';
  if(!ids.length){
    return out + '<div class="card"><p>Aquí verás cada ejercicio con su estado de progresión. Registra un entreno en Hoy para empezar.</p><button class="btn" data-act="tab" data-tab="hoy">Ir a Hoy</button></div>';
  }
  return out + '<div class="list">' + ids.map(function(id){
    var ex = exById(id), p = planFor(ex), open = S.openEx === id;
    var goal = p.status === 'nuevo' ? 'Sin registros todavía' : 'Próximo: ' + (p.displayTarget || (fmt(p.nextW) + ' kg × ' + p.target.join(' · ')));
    return '<section class="card"><button class="exrow" data-act="toggle-ex" data-id="' + esc(id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<div class="top2"><h3>' + esc(ex.name) + '</h3>' + chip(p.status) + '</div>' +
      '<span class="small muted">' + esc(goal) + ' · ' + ex.sets + '×' + ex.min + '–' + ex.max + ' reps' + (ex.unilateral ? ' por lado' : '') + '</span>' +
      (p.status !== 'nuevo' ? barHtml(p, ex) : '') + '</button>' + (open ? exDetail(ex) : '') + '</section>';
  }).join('') + '</div>';
}
function viewHist(){
  var total=S.sessions.length;
  var ss=filteredHistorySessions();
  var out = '<div class="head-row"><h2>Historial</h2><span class="num muted" id="history-count">' + ss.length + ' de ' + total + ' entreno' + (total === 1 ? '' : 's') + '</span></div>';
  if(!total) return out + '<div class="card"><p>Cuando termines tu primer entreno aparecerá aquí.</p><button class="btn" data-act="tab" data-tab="hoy">Empezar un entreno</button></div>';
  return out + '<section class="card history-tools"><label class="field"><span class="lab">Buscar entreno, ejercicio o rutina</span><input class="txt" data-history-search type="search" autocomplete="off" placeholder="Ej. Press banca" value="' + esc(S.historyQuery) + '"></label>' +
    '<label class="field"><span class="lab">Periodo</span><select class="txt" data-history-range><option value="all"' + (S.historyRange==='all'?' selected':'') + '>Todo el historial</option><option value="30"' + (S.historyRange==='30'?' selected':'') + '>Últimos 30 días</option><option value="7"' + (S.historyRange==='7'?' selected':'') + '>Últimos 7 días</option></select></label></section>' +
    '<div class="list" id="history-list">' + (ss.length ? ss.map(historyCardHtml).join('') : '<div class="card"><p class="muted">No hay entrenos que coincidan. Prueba otro término o periodo.</p></div>') + '</div>';
}
function filteredHistorySessions(){
  var query=S.historyQuery.trim().toLocaleLowerCase('es');
  var minDate='';
  if(S.historyRange!=='all'){
    var days=Number(S.historyRange), from=new Date();
    from.setDate(from.getDate()-days+1);
    minDate=iso(from);
  }
  return S.sessions.filter(function(session){
    if(minDate && session.date<minDate) return false;
    if(!query) return true;
    var readableDate=dFmt(session.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var searchable=[session.date,readableDate,session.routineName||''].concat(session.entries.map(function(entry){ return exName(entry.exId); })).join(' ').toLocaleLowerCase('es');
    return searchable.indexOf(query)>=0;
  }).sort(function(a,b){ return a.date===b.date ? (b.ts||0)-(a.ts||0) : (a.date<b.date?1:-1); });
}
function historyCardHtml(s){
    var total = 0; s.entries.forEach(function(e){
      if(e.unilateral) total += Object.keys(e.sets.reduce(function(pairs, set){ if(set.pair !== undefined) pairs[set.pair] = true; return pairs; }, {})).length;
      else total += e.sets.length;
    });
    var body = s.entries.map(function(e){
      var rests=e.sets.map(function(set){ return set.restMs; }).filter(function(value){ return Number(value)>0; });
      var avg=rests.length ? Math.round(rests.reduce(function(sum,value){ return sum+Number(value); },0)/rests.length/1000) : 0;
      return '<div><strong>' + esc(exName(e.exId)) + '</strong><div class="small muted">' + esc(setsText(e.sets, true)) + (avg ? ' · descanso medio ' + humanDuration(avg*1000) : '') + '</div></div>';
    }).join('');
    var editing = S.sessionEdit && S.sessionEdit.id === s.id;
    var duration = Number(s.durationMs) > 0 ? humanDuration(s.durationMs) : 'Sin duración';
    return '<section class="card"><div class="card-head"><div><h3>' + esc(dFmt(s.date, {weekday:'long', day:'numeric', month:'long'})) + '</h3>' +
      '<p class="small muted">' + s.entries.length + ' ejercicio' + (s.entries.length === 1 ? '' : 's') + ' · ' + total + ' series · ' + duration + (s.routineName ? ' · ' + esc(s.routineName) : '') + (s.demo ? ' · ejemplo' : '') + '</p></div></div>' +
      '<div class="list" style="gap:8px">' + body + '</div>' +
      (editing ? sessionEditorHtml(s) : '<div class="row"><button class="btn ghost sm" data-act="session-edit" data-id="' + esc(s.id) + '">Editar entrenamiento</button>' +
        (S.confirm === 'sess:' + s.id
          ? '<button class="btn danger sm" data-act="del-sess-ok" data-id="' + esc(s.id) + '">Confirmar: borrar entreno</button>'
          : '<button class="btn ghost sm" data-act="del-sess" data-id="' + esc(s.id) + '">Borrar</button>') + '</div>') + '</section>';
}
function refreshHistoryResults(){
  var list=$('#history-list');
  if(!list) return;
  var matches=filteredHistorySessions();
  list.innerHTML=matches.length ? matches.map(historyCardHtml).join('') : '<div class="card"><p class="muted">No hay entrenos que coincidan. Prueba otro término o periodo.</p></div>';
  var count=$('#history-count');
  if(count) count.textContent=matches.length+' de '+S.sessions.length+' entreno'+(S.sessions.length===1?'':'s');
}
function goalProgress(goal){
  var current=Number(goal.current)||0;
  if(goal.type==='exercise-weight' && goal.exerciseId){
    var records=personalRecords(exById(goal.exerciseId)||{}); current=records.weight?Number(records.weight.value):0;
  } else if(goal.type==='sessions'){
    current=S.sessions.length;
  } else if(goal.type==='weekly'){
    var from=new Date(); from.setDate(from.getDate()-7); var threshold=iso(from);
    current=S.sessions.filter(function(s){ return s.date>=threshold; }).length;
  }
  var target=Number(goal.target)||0, start=Number(goal.start)||0;
  if(!target) return {current:current,percent:0};
  var span=target-start;
  var percent=span>0?Math.max(0,Math.min(100,Math.round((current-start)/span*100))):(current>=target?100:0);
  if(current>=target) percent=100;
  return {current:current,percent:percent};
}
function goalsHtml(){
  var goals=Object.keys(S.profile.goals||{}).map(function(id){ return S.profile.goals[id]; });
  var cards=goals.map(function(goal){
    var progress=goalProgress(goal); var unit=goal.unit||'';
    return '<div class="goal-card"><div class="goal-row"><strong>'+esc(goal.name)+'</strong><button class="mini" data-act="goal-delete" data-id="'+esc(goal.id)+'" aria-label="Eliminar objetivo">×</button></div><div class="goal-row"><span class="small muted">'+fmt(progress.current)+' '+esc(unit)+' de '+fmt(goal.target)+' '+esc(unit)+' · '+progress.percent+'%</span></div><div class="progress" role="progressbar" aria-label="Progreso de '+esc(goal.name)+'" aria-valuenow="'+progress.percent+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+progress.percent+'%"></span></div></div>';
  }).join('');
  var exerciseOptions=Object.keys(S.profile.exercises).map(function(id){var ex=S.profile.exercises[id]; return '<option value="'+esc(id)+'">'+esc(ex.name)+'</option>';}).join('');
  var form=S.goalNew ? '<div class="goal-form"><div class="fields"><div class="field"><label class="lab" for="goal-name">Nombre</label><input id="goal-name" class="txt" maxlength="60" placeholder="Ej. Alcanzar 80 kg en press banca"></div><div class="field"><label class="lab" for="goal-type">Tipo</label><select id="goal-type" class="txt"><option value="exercise-weight">Peso máximo en ejercicio</option><option value="sessions">Entrenos totales</option><option value="weekly">Entrenos en la última semana</option><option value="custom">Objetivo personalizado</option></select></div><div class="field"><label class="lab" for="goal-target">Meta</label><input id="goal-target" class="txt" inputmode="decimal"></div><div class="field"><label class="lab" for="goal-exercise">Ejercicio</label><select id="goal-exercise" class="txt"><option value="">Seleccionar ejercicio</option>'+exerciseOptions+'</select></div><div class="field"><label class="lab" for="goal-unit">Unidad</label><input id="goal-unit" class="txt" placeholder="kg, entrenos..."></div></div><div class="row"><button class="btn sm" data-act="goal-save">Guardar objetivo</button><button class="btn ghost sm" data-act="goal-cancel">Cancelar</button></div></div>' : '';
  return '<section class="card"><p class="sec-title">Objetivos</p>'+ (cards||'<p class="small muted">Todavía no tienes objetivos.</p>') + form + (S.goalNew?'':'<button class="btn ghost sm" data-act="goal-new">Añadir objetivo</button>')+'</section>';
}
function profileNav(){
  return '<div class="seg profile-nav" role="tablist" aria-label="Secciones de tu perfil">'+
    [['resumen','Resumen'],['ejercicios','Ejercicios'],['medidas','Medidas']].map(function(item){return '<button role="tab" aria-selected="'+(S.profileSection===item[0])+'" data-act="profile-section" data-section="'+item[0]+'">'+item[1]+'</button>';}).join('')+'</div>';
}
function profileSummary(){
  var totalVolume=0, totalDuration=0;
  S.sessions.forEach(function(session){ var stats=sessionStats(session); totalVolume+=stats.volume; totalDuration+=Number(session.durationMs)||0; });
  var sorted=S.sessions.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  var recent=sorted.filter(function(session){return session.date>=iso(new Date(Date.now()-7*86400000));});
  var latestWeight=S.profile.measurements.slice().filter(function(m){return m.values&&Number.isFinite(Number(m.values.weight));}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
  var effectiveSets=0; S.sessions.forEach(function(session){session.entries.forEach(function(entry){effectiveSets+=entryEffectiveSets(entry);});});
  var uniqueExercises={}; S.sessions.forEach(function(session){session.entries.forEach(function(entry){uniqueExercises[entry.exId]=(uniqueExercises[entry.exId]||0)+1;});});
  var start=new Date(); start.setDate(start.getDate()-((start.getDay()+6)%7)); start.setHours(0,0,0,0);
  var week=S.sessions.filter(function(session){return session.date>=iso(start);});
  return '<section class="card"><p class="sec-title">Resumen personal</p><div class="weekly-stats">'+
    '<div class="weekly-stat"><span>Entrenos</span><strong>'+S.sessions.length+'</strong><small>'+recent.length+' últimos 7 días</small></div>'+
    '<div class="weekly-stat"><span>Ejercicios usados</span><strong>'+Object.keys(uniqueExercises).length+'</strong><small>'+effectiveSets+' series efectivas totales</small></div>'+
    '<div class="weekly-stat"><span>Volumen total</span><strong>'+volumeText(totalVolume)+' kg</strong><small>'+humanDuration(totalDuration)+' acumulados</small></div>'+
    '<div class="weekly-stat"><span>Peso corporal</span><strong>'+ (latestWeight?fmt(latestWeight.values.weight)+' kg':'—')+'</strong><small>'+ (latestWeight?esc(dFmt(latestWeight.date)):'Sin medir')+'</small></div></div></section>'+weeklyMuscleSummaryHtml(week)+goalsHtml();
}
function profileExercises(){
  var counts={}, last={}, volumes={};
  S.sessions.forEach(function(session){session.entries.forEach(function(entry){
    counts[entry.exId]=(counts[entry.exId]||0)+1;
    if(!last[entry.exId]||session.date>last[entry.exId]) last[entry.exId]=session.date;
    entry.sets.forEach(function(set){if(validWeight(set.w)&&Number(set.r)>0&&countsForProgress(set)){ var ex=exById(entry.exId); volumes[entry.exId]=(volumes[entry.exId]||0)+effectiveWeight(ex||{},set,session.date)*Number(set.r); }});
  });});
  var ids=Object.keys(S.profile.exercises).filter(function(id){return !S.profile.exercises[id].archived;});
  ids.sort(function(a,b){var ea=exById(a), eb=exById(b);
    if(S.exerciseSort==='name') return ea.name.localeCompare(eb.name,'es');
    if(S.exerciseSort==='most') return (counts[b]||0)-(counts[a]||0)||(ea.name.localeCompare(eb.name,'es'));
    if(S.exerciseSort==='volume') return (volumes[b]||0)-(volumes[a]||0)||(ea.name.localeCompare(eb.name,'es'));
    return (last[b]||'').localeCompare(last[a]||'')||ea.name.localeCompare(eb.name,'es');
  });
  var sort='<label class="field"><span class="lab">Ordenar ejercicios</span><select class="txt" data-profile-exercise-sort><option value="recent"'+(S.exerciseSort==='recent'?' selected':'')+'>Reciente</option><option value="most"'+(S.exerciseSort==='most'?' selected':'')+'>Más realizado</option><option value="volume"'+(S.exerciseSort==='volume'?' selected':'')+'>Mayor volumen</option><option value="name"'+(S.exerciseSort==='name'?' selected':'')+'>Alfabético</option></select></label>';
  var cards=ids.length?ids.map(function(id){var ex=exById(id), lastDateText=last[id]?dFmt(last[id]):'Nunca realizado';
    return '<button class="card profile-exercise-card" data-act="profile-open-exercise" data-id="'+esc(id)+'"><span><strong>'+esc(ex.name)+'</strong><small>'+ (counts[id]||0)+' entrenos · Último: '+esc(lastDateText)+'</small></span><span class="num">'+esc(volumeText(volumes[id]||0))+' kg·reps</span></button>';}).join(''):'<div class="card"><p class="muted">Añade ejercicios desde la biblioteca para verlos aquí.</p></div>';
  return '<section class="card"><p class="sec-title">Tus ejercicios</p>'+sort+'</section><div class="list">'+cards+'</div>';
}
function measurementChart(field){
  var pts=S.profile.measurements.filter(function(m){return m.values[field]!==undefined&&m.values[field]!==null&&Number.isFinite(Number(m.values[field]));}).sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(m){return {label:dFmt(m.date),y:Number(m.values[field])};});
  if(pts.length<2) return '';
  var unit=field==='weight'?'kg':(field==='bodyFat'?'%':'cm');
  return chartSvg(pts,unit);
}
function profileMeasurements(){
  var latest=S.profile.measurements.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var form=S.measurementForm?'<section class="card"><p class="sec-title">Nueva medición</p><div class="fields"><div class="field"><label class="lab" for="measurement-date">Fecha</label><input id="measurement-date" class="txt" type="date" value="'+esc(iso(new Date()))+'"></div>'+Object.keys(MEASUREMENT_FIELDS).map(function(key){return '<div class="field"><label class="lab" for="measurement-'+key+'">'+esc(MEASUREMENT_FIELDS[key])+' '+((key==='weight'?'(kg)':(key==='bodyFat'?'(%)':'(cm)')))+'</label><input id="measurement-'+key+'" class="txt" inputmode="decimal" data-measurement-field="'+key+'"></div>';}).join('')+'</div><div class="field"><label class="lab" for="measurement-notes">Notas</label><textarea id="measurement-notes" class="txt" rows="3"></textarea></div><div class="row"><button class="btn sm" data-act="measurement-save">Guardar medición</button><button class="btn ghost sm" data-act="measurement-cancel">Cancelar</button></div></section>':'';
  var rows=latest.map(function(m){var values=Object.keys(m.values).map(function(key){return '<span>'+esc(MEASUREMENT_FIELDS[key]||key)+': <strong>'+fmt(m.values[key])+(key==='bodyFat'?' %':' '+(key==='weight'?'kg':'cm'))+'</strong></span>';}).join(' · ');
    return '<section class="card"><div class="row" style="justify-content:space-between"><p class="sec-title">'+esc(dFmt(m.date))+'</p><button class="icon" data-act="measurement-delete" data-id="'+esc(m.id)+'" aria-label="Eliminar medición">×</button></div><p class="small">'+(values||'Sin datos')+'</p>'+ (m.notes?'<p class="small muted">'+esc(m.notes)+'</p>':'')+'</section>';}).join('');
  var currentWeight=latest.filter(function(m){return m.values.weight!==undefined;})[0];
  var chart=currentWeight?measurementChart('weight'):'';
  return '<div class="head-row"><h2>Medidas corporales</h2><button class="btn sm" data-act="measurement-new">Añadir medida</button></div>'+form+(chart?'<section class="card"><p class="sec-title">Evolución del peso</p>'+chart+'</section>':'')+(rows||'<div class="card"><p class="muted">Todavía no tienes mediciones corporales.</p></div>');
}
function viewProfile(){
  var out='<div class="head-row"><h2>Yo</h2></div>'+profileNav();
  if(S.profileSection==='ejercicios') return out+profileExercises();
  if(S.profileSection==='medidas') return out+profileMeasurements();
  return out+profileSummary();
}
function viewSet(){
  var st = S.profile.settings, tr = st.targetRir;
  var hasDemo = S.sessions.some(function(s){ return s.demo; });
  var out = '<div class="head-row"><h2>Ajustes</h2></div>';
  out += '<section class="card"><p class="sec-title">Escala de esfuerzo</p><div class="seg" role="group" aria-label="Escala de esfuerzo">' +
    '<button data-act="set-mode" data-mode="rir" aria-pressed="' + (st.mode === 'rir') + '">RIR</button>' +
    '<button data-act="set-mode" data-mode="rpe" aria-pressed="' + (st.mode === 'rpe') + '">RPE</button></div>' +
    '<p class="small muted">RIR son las repeticiones que te sobraron al terminar la serie. RPE es el esfuerzo de 1 a 10. RPE 8 equivale a RIR 2.</p>' +
    '<p class="lab">Esfuerzo objetivo por defecto</p><div class="stepper"><button class="btn ghost sm" data-act="tr-minus" aria-label="Bajar esfuerzo objetivo">−</button>' +
    '<span class="v">' + (st.mode === 'rpe' ? 'RPE ' + fmt(10 - tr) : 'RIR ' + tr) + '</span><button class="btn ghost sm" data-act="tr-plus" aria-label="Subir RIR objetivo">+</button></div>' +
    '<p class="small muted">Se usa en ejercicios sueltos. En una rutina puedes fijar el esfuerzo de cada serie. Se sube de peso cuando todas las series llegan al tope sin quedar más de una repetición por debajo del esfuerzo pedido.</p></section>';
  out += '<section class="card"><p class="sec-title">Temporizador de descanso</p><div class="field"><label class="lab" for="rest-setting">Series efectivas y back-off</label><select id="rest-setting" class="txt" data-setting="restSeconds">' +
    [60,90,120,180,300].map(function(seconds){ return '<option value="' + seconds + '"' + (Number(st.restSeconds) === seconds ? ' selected' : '') + '>' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + ' min</option>'; }).join('') +
    '</select></div><div class="field"><label class="lab" for="warmup-rest-setting">Series de aproximación</label><select id="warmup-rest-setting" class="txt" data-setting="warmupRestSeconds">' +
    [0,15,30,45,60,90,120].map(function(seconds){ return '<option value="' + seconds + '"' + (Number(st.warmupRestSeconds) === seconds ? ' selected' : '') + '>' + (seconds ? seconds + ' s' : 'Sin temporizador') + '</option>'; }).join('') +
    '</select></div><p class="small muted">El descanso empieza al completar una serie (en unilateral, al completar ambos lados). Drop set y rest-pause no inician el temporizador automáticamente. También puedes iniciarlo manualmente.</p></section>';
  out += '<section class="card"><details class="how"><summary>Cómo decide la app</summary><ul class="small">' +
    '<li>Cada ejercicio tiene series y un rango de repeticiones, por ejemplo 3×8–12.</li>' +
    '<li>Mantienes el peso y sumas repeticiones hasta llegar al tope en todas las series.</li>' +
    '<li>Con el tope en todas las series y esfuerzo razonable, el siguiente entreno sube de peso y vuelves al mínimo de reps.</li>' +
    '<li>Si llegas al tope pero al límite, repites el peso para confirmar.</li>' +
    '<li>Si sobran muchas repeticiones (RIR alto), la app te sugiere subir antes.</li>' +
    '<li>Dos entrenos seguidos bajo el mínimo con el mismo peso sugieren bajar cerca de 10%.</li>' +
    '<li>Las series marcadas con C son calentamiento y no cuentan.</li></ul></details></section>';
  out += goalsHtml();
  var accountHtml='';
  if(Store.firebaseAuth){
    accountHtml=S.cloudUser
      ? '<section class="card"><p class="sec-title">Cuenta y sincronización</p><p class="small">Conectado como <strong>'+esc(S.cloudUser.email || S.cloudUser.displayName || 'usuario')+'</strong>.'+(S.syncUnavailable?' La nube no está disponible; los cambios se guardan en este navegador hasta que sincronices.':' Tus datos se sincronizan en todos tus dispositivos.')+'</p><div class="row"><span class="chip '+(S.syncUnavailable?'warn':'ok')+'">'+(S.syncUnavailable?'Guardado local':'Sincronización activa')+'</span><button class="btn ghost sm" data-act="cloud-sync"'+(S.cloudSyncing?' disabled':'')+'>'+(S.cloudSyncing?'Sincronizando…':'Sincronizar ahora')+'</button><button class="btn ghost sm" data-act="cloud-signout">Cerrar sesión</button></div></section>'
      : '<section class="card"><p class="sec-title">Cuenta y sincronización</p><p class="small">Inicia sesión con Google para mantener tus datos en varios dispositivos y recuperarlos si cambias de navegador.</p><div class="row"><button class="btn sm" data-act="cloud-signin">Continuar con Google</button></div></section>';
  }
  out += accountHtml;
  out += '<section class="card"><p class="sec-title">Tus datos</p><p class="small">' +
    (['db','cloud'].includes(S.kind) ? 'Se guardan en tu cuenta y solo tú los ves. Los abres desde cualquier dispositivo.' : S.syncUnavailable ? 'Se guardan en este navegador mientras la nube no esté disponible. Usa «Sincronizar ahora» cuando vuelva la conexión.' : 'Se guardan solo en este navegador. Inicia sesión arriba para sincronizarlos.') + '</p><div class="row">' +
    '<button class="btn ghost sm" data-act="auto-restore">Restaurar última copia automática' + esc(autoBackupLabel()) + '</button>' +
    '<button class="btn ghost sm" data-act="export">Descargar respaldo</button><button class="btn ghost sm" data-act="import">Restaurar respaldo</button>' +
    '<button class="btn ghost sm" data-act="export-csv">Exportar CSV</button><button class="btn ghost sm" data-act="import-csv">Importar CSV</button>' +
    '<button class="btn ghost sm" data-act="import-routine">Importar rutina</button>' +
    (hasDemo ? '<button class="btn ghost sm" data-act="demo-clear">Quitar datos de ejemplo</button>' : '<button class="btn ghost sm" data-act="demo-load">Cargar datos de ejemplo</button>') +
    (S.confirm === 'wipe' ? '<button class="btn danger sm" data-act="wipe-ok">Confirmar: borrar todo</button>' : '<button class="btn danger sm" data-act="wipe">Borrar todo</button>') +
    '</div><input id="backup-file" type="file" accept="application/json,.json" hidden><input id="csv-file" type="file" accept="text/csv,.csv" hidden><input id="routine-file" type="file" accept="application/json,.json" hidden>' +
    (S.pendingImport ? '<div class="restore-confirm"><p class="small">El respaldo contiene ' + Object.keys(S.pendingImport.profile.exercises).length + ' ejercicios, ' + Object.keys(S.pendingImport.profile.routines).length + ' rutinas y ' + S.pendingImport.sessions.length + ' entrenos. Restaurarlo reemplazará los datos actuales.</p><div class="row"><button class="btn danger sm" data-act="import-confirm">Confirmar restauración</button><button class="btn ghost sm" data-act="import-cancel">Cancelar</button></div></div>' : '') +
    '</section>';
  return out;
}

/* ---------- datos de ejemplo ---------- */
function buildDemo(){
  var ex = {
    demo_banca:{id:'demo_banca', name:'Press banca', sets:3, min:6, max:10, inc:2.5, demo:true},
    demo_sent:{id:'demo_sent', name:'Sentadilla', sets:3, min:6, max:10, inc:2.5, demo:true},
    demo_remo:{id:'demo_remo', name:'Remo con barra', sets:3, min:8, max:12, inc:2.5, demo:true}
  };
  var days = [28,25,21,18,14,11,7,3];
  var banca = [[60,[8,7,7],[2,2,1]],[60,[8,8,7],[2,2,1]],[60,[9,8,8],[2,1,1]],[60,[10,9,8],[2,2,1]],[60,[10,10,9],[2,2,1]],[60,[10,10,10],[2,2,2]],[62.5,[7,6,6],[2,2,1]],[62.5,[8,7,7],[2,2,1]]];
  var sent = [[77.5,[8,8,7],[2,2,1]],[77.5,[9,8,8],[2,2,1]],[77.5,[10,9,9],[2,2,1]],[77.5,[10,10,10],[2,2,1]],[80,[8,7,7],[2,2,1]],[80,[9,8,8],[2,2,1]],[80,[10,9,9],[2,2,1]],[80,[10,10,10],[2,2,1]]];
  var remo = [[50,[10,10,9],[2,2,1]],[50,[11,10,10],[2,2,1]],[50,[12,11,10],[2,2,1]],[50,[12,12,11],[2,2,1]],[50,[12,12,12],[2,2,1]],[52.5,[10,9,9],[2,2,1]],[52.5,[11,11,10],[2,2,1]],[52.5,[12,12,12],[1,0,0]]];
  var mk = function(row){ return row[1].map(function(r, k){ return {w:row[0], r:r, rir:row[2][k], warm:false}; }); };
  var sessions = days.map(function(dAgo, i){
    var d = new Date(); d.setDate(d.getDate() - dAgo);
    var date = iso(d);
    return {id:'demo_'+(i+1), date:date, ts:parseISO(date).getTime() + 18*3600*1000, demo:true, entries:[
      {exId:'demo_banca', sets:[{w:40, r:8, rir:null, warm:true}].concat(mk(banca[i]))},
      {exId:'demo_sent', sets:mk(sent[i])},
      {exId:'demo_remo', sets:mk(remo[i])}
    ]};
  });
  var routines = {demo_r1:{id:'demo_r1', name:'Cuerpo completo (ejemplo)', demo:true, items:[
    {exId:'demo_banca', sets:3, min:6, max:10, inc:2.5, efforts:[2,1,0]},
    {exId:'demo_sent', sets:3, min:6, max:10, inc:2.5, efforts:[2,1,0]},
    {exId:'demo_remo', sets:3, min:8, max:12, inc:2.5, efforts:[2,2,1]}
  ]}};
  return {ex:ex, sessions:sessions, routines:routines};
}
function loadDemo(){
  var previousProfile=clone(S.profile), previousSessions=clone(S.sessions);
  var previousSessionsById={};
  previousSessions.forEach(function(session){ previousSessionsById[session.id]=session; });
  var d = buildDemo();
  Object.keys(d.ex).forEach(function(k){ S.profile.exercises[k] = d.ex[k]; });
  Object.keys(d.routines).forEach(function(k){ S.profile.routines[k] = d.routines[k]; });
  d.sessions.forEach(function(s){ S.sessions = S.sessions.filter(function(x){ return x.id !== s.id; }); S.sessions.push(s); });
  var persistSessions=function(){
    if(!['db','cloud'].includes(S.kind)) return Promise.resolve();
    return d.sessions.reduce(function(queue,session){
      return queue.then(function(){ return Store.saveSession(session); });
    },Promise.resolve());
  };
  return Store.saveProfileNow().then(persistSessions).then(function(){
    S.tab='hoy'; render();
    toast('Datos de ejemplo cargados. Quítalos cuando quieras en Ajustes.');
    return true;
  }).catch(function(error){
    console.error('No se pudieron guardar los datos de ejemplo',error);
    S.profile=previousProfile; S.sessions=previousSessions;
    var cleanup=['db','cloud'].includes(S.kind)
      ? Promise.all(d.sessions.map(function(session){
          var previous=previousSessionsById[session.id];
          var rollback=previous ? Store.saveSession(previous) : Store.deleteSessions([session.id]);
          return rollback.catch(function(rollbackError){
            console.error('No se pudo revertir el entreno de ejemplo '+session.id,rollbackError);
          });
        }))
      : Promise.resolve();
    return cleanup.then(function(){
      return Store.saveProfileNow().catch(function(rollbackError){
        console.error('No se pudo restaurar el perfil previo a los datos de ejemplo',rollbackError);
      });
    }).then(function(){
      render(); toast('No se pudieron guardar los datos de ejemplo');
      return false;
    });
  });
}
function clearDemo(){
  var ids = S.sessions.filter(function(s){ return s.demo; }).map(function(s){ return s.id; });
  return Store.deleteSessions(ids).then(function(){
    S.sessions = S.sessions.filter(function(s){ return !s.demo; });
    Object.keys(S.profile.exercises).forEach(function(k){
      var e = S.profile.exercises[k];
      if(e.demo && !S.sessions.some(function(s){ return s.entries.some(function(x){ return x.exId === k; }); })) delete S.profile.exercises[k];
    });
    Object.keys(S.profile.routines).forEach(function(k){ if(S.profile.routines[k].demo) delete S.profile.routines[k]; });
    S.draft.entries = S.draft.entries.filter(function(en){ return !!exById(en.exId); }); saveDraft();
    return Store.saveProfileNow();
  }).then(function(){
    render(); toast('Datos de ejemplo eliminados'); return true;
  }).catch(function(error){
    console.error('No se pudieron eliminar todos los datos de ejemplo',error);
    render(); return false;
  });
}
function deleteSession(id){
  return Store.deleteSessions([id]).then(function(){
    var previous=S.sessions;
    S.sessions=S.sessions.filter(function(session){ return session.id!==id; });
    if(!['db','cloud'].includes(S.kind) && !Store.saveLocal()){
      S.sessions=previous;
      return false;
    }
    return true;
  });
}

/* ---------- render ---------- */
function render(){
  var y = window.scrollY;
  var views = {hoy:viewHoy, rutinas:viewRut, ejercicios:viewRut, historial:viewHist, yo:viewProfile, ajustes:viewSet};
  try {
    syncCollapsedEntries();
    $('#view').innerHTML = S.ready ? (views[S.tab] || viewHoy)() : loadingView();
  } catch(error){
    console.error('Error al mostrar la interfaz', error);
    var errorDetails=error && (error.stack || error.message) ? error.stack || error.message : String(error);
    $('#view').innerHTML='<section class="card"><p class="sec-title">No se pudo mostrar esta sección</p><p class="small muted">Los datos siguen guardados. Recarga la página o vuelve a Inicio.</p><details class="render-error-details"><summary>Detalles técnicos</summary><pre>' + esc(errorDetails) + '</pre></details><div class="row"><button class="btn" data-act="tab" data-tab="hoy">Volver a Inicio</button></div></section>';
    if(typeof toast==='function') toast('Esta sección tuvo un problema; tus datos siguen guardados');
    return;
  }
  document.querySelectorAll('.tab').forEach(function(b){
    var selected=b.dataset.tab === S.tab;
    b.setAttribute('aria-selected', selected ? 'true' : 'false');
    if(selected) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#today').textContent = dFmt(iso(new Date()), {weekday:'long', day:'numeric', month:'short'});
  window.scrollTo(0, y);
}
function refreshLive(ei){
  var el = $('#live-' + ei); if(el) el.innerHTML = liveHtml(ei);
  var done = workingDone();
  var c = $('#done-count'); if(c) c.textContent = done + ' serie' + (done === 1 ? '' : 's') + ' efectiva' + (done === 1 ? '' : 's');
  var f = $('#finish'); if(f) f.disabled = !done;
  refreshDraftSaveStatus();
}

/* ---------- acciones ---------- */
function ensureExercise(target){
  var id = target.dataset.id;
  if(!id && target.dataset.lib){
    var name = target.dataset.lib;
    var found = Object.keys(S.profile.exercises).filter(function(k){ return S.profile.exercises[k].name.toLowerCase() === name.toLowerCase(); })[0];
    if(found){ S.profile.exercises[found].archived = false; id = found; }
    else {
      var l = LIB.filter(function(x){ return x.name === name; })[0];
      id = uid('e_');
      S.profile.exercises[id] = {id:id, name:l.name, sets:l.sets, min:l.min, max:l.max, inc:l.inc};
    }
    Store.saveProfile();
  }
  return id;
}
function createBase(name){
  var id = uid('e_');
  S.profile.exercises[id] = {id:id, name:name, sets:3, min:8, max:12, inc:2.5};
  Store.saveProfile();
  return id;
}
function pickExercise(target){
  var id = ensureExercise(target);
  S.picker = false; addEntry(id); S.tab = 'hoy'; render();
}
function createExercise(name){
  var id = createBase(name);
  S.picker = false; addEntry(id); render();
}
function startRoutine(id){
  var r = S.profile.routines[id]; if(!r) return;
  var entries = [], skipped = false;
  r.items.forEach(function(it, index){
    if(!exById(it.exId)) return;
    if(exById(it.exId).archived){ skipped = true; return; }
    var cfg = Object.assign({sets:it.sets, warmupSets:Number(it.warmupSets) || 0, min:it.min, max:it.max, inc:it.inc, loadStep:Number(it.loadStep) > 0 ? it.loadStep : exerciseLoadStep(exById(it.exId)), efforts:(it.efforts || []).slice(), unilateral:!!it.unilateral}, warmupSettings(it));
    while(cfg.efforts.length < cfg.sets) cfg.efforts.push(cfg.efforts.length ? cfg.efforts[cfg.efforts.length-1] : S.profile.settings.targetRir);
    cfg.efforts = cfg.efforts.slice(0, cfg.sets);
    var p = planFor(Object.assign({}, exById(it.exId), cfg)), rows = [];
    for(var j=0;j<cfg.warmupSets;j++){
      var warm = newRow(cfg.warmupMode === 'manual' ? '' : p.nextW, cfg.unilateral);
      warm.type = 'warmup'; rows.push(warm);
    }
    for(var i=0;i<cfg.sets;i++) rows.push(plannedRow(p, cfg.unilateral, p.nextW));
    syncAutoWarmupWeights({rows:rows}, Object.assign({}, exById(it.exId), cfg));
    entries.push({uiId:uid('entry_'), exId:it.exId, cfg:cfg, routineItemIndex:index, routineCfg:clone(cfg), rows:rows});
  });
  if(!entries.length){ toast(skipped ? 'La rutina solo tiene ejercicios archivados' : 'La rutina no tiene ejercicios'); return; }
  S.draft = {date:iso(new Date()), startedAt:Date.now(), routineId:id, entries:entries, collapsedEntryIds:[]};
  S.collapsedEntries.clear();
  saveDraft();
  S.restEndsAt = null; saveRestEnd();
  S.confirm = null; S.picker = false; S.justSaved = null; S.tab = 'hoy'; render(); window.scrollTo(0, 0);
  if(skipped) toast('Se omitieron los ejercicios archivados de la rutina');
}
function saveRoutine(){
  var r = S.redit, name = r.name.trim();
  if(!name){ toast('Ponle un nombre a la rutina'); return; }
  if(!r.items.length){ toast('Añade al menos un ejercicio'); return; }
  var id = r.id || uid('r_');
  var prev = S.profile.routines[id] || {};
  S.profile.routines[id] = {id:id, name:name, demo:prev.demo, programId:r.programId && S.profile.programs[r.programId] ? r.programId : null, items:clone(r.items)};
  if(!prev.demo) delete S.profile.routines[id].demo;
  S.selectedRoutine = id; S.librarySection = 'rutinas';
  Store.saveProfile(); S.redit = null; render(); window.scrollTo(0, 0);
  toast('Rutina guardada. Se usa en tu próximo entreno.');
}
function saveProgram(){
  var program = S.pedit, name = program && program.name.trim();
  if(!name){ toast('Ponle un nombre al programa'); return; }
  var id = program.id || uid('p_');
  S.profile.programs[id] = {id:id, name:name};
  S.pedit = null; S.librarySection = 'programas'; S.selectedProgram = id;
  Store.saveProfile(); render(); toast('Programa guardado');
}
function draftRoutineItems(){
  var routine = S.profile.routines[S.draft.routineId];
  if(!routine) return null;
  var seen = {}, items = [];
  for(var i=0;i<S.draft.entries.length;i++){
    var entry = S.draft.entries[i], ex = exById(entry.exId);
    if(!ex) continue;
    var original = Number.isInteger(entry.routineItemIndex) ? routine.items[entry.routineItemIndex] : null;
    var base = Object.assign({}, ex, entry.cfg || {});
    var item;
    if(original && original.exId === entry.exId && !seen[entry.routineItemIndex]){
      item = clone(original);
      Object.assign(item, entry.cfg || {});
      seen[entry.routineItemIndex] = true;
    } else {
      item = {
        exId:entry.exId, sets:Number(base.sets) || 3, min:Number(base.min) || 8,
        max:Number(base.max) || 12, inc:Number(base.inc) || 2.5,
        loadStep:Number(base.loadStep) > 0 ? Number(base.loadStep) : exerciseLoadStep(ex),
        unilateral:!!base.unilateral
      };
      if(Number(base.warmupSets) > 0) item.warmupSets = Number(base.warmupSets);
      Object.assign(item, entry.cfg || {});
      item.exId = entry.exId;
    }
    items.push(item);
  }
  return items;
}
function routineNeedsUpdate(){
  if(!S.draft.routineId) return false;
  var routine = S.profile.routines[S.draft.routineId];
  var desired = draftRoutineItems();
  if(!routine || !desired) return false;
  return JSON.stringify(routine.items) !== JSON.stringify(desired);
}
function updateRoutineFromDraft(){
  var routine = S.profile.routines[S.draft.routineId];
  var items = draftRoutineItems();
  if(!routine || !items) return false;
  routine.items = items;
  Store.saveProfile();
  return true;
}
function finish(updateRoutine){
  if(!workingDone()){ toast('Registra al menos una serie efectiva completa'); return; }
  if(S.finishSaving) return;
  if(updateRoutine === undefined && routineNeedsUpdate()){
    S.confirm = 'finish-routine'; render(); return;
  }
  if(updateRoutine && !updateRoutineFromDraft()){ toast('No se encontró la rutina para actualizar'); return; }
  S.finishSaving = true; render();
  var entries = [], saved = [];
  S.draft.entries.forEach(function(en){
    var ex = effEx(en);
    var sets = rowsToSets(en.rows, ex.unilateral).filter(function(s){ return validWeight(s.w) && s.r > 0; })
      .map(function(s){
        var set = {w:s.w, r:s.r, rir:s.rir, type:setType(s)};
        if(s.restMs > 0){ set.restMs = Math.round(s.restMs); }
        if(ex.unilateral){ set.side = s.side; set.pair = s.pair; }
        return set;
      });
    if(sets.length){ entries.push({exId:en.exId, sets:sets, unilateral:!!ex.unilateral, cfg:en.cfg || null}); saved.push({exId:en.exId, cfg:en.cfg || null}); }
  });
  var finishedAt = Date.now();
  var session = {
    id:uid('s_'), date:S.draft.date || iso(new Date()), ts:finishedAt,
    startedAt:S.draft.startedAt || finishedAt,
    finishedAt:finishedAt,
    durationMs:Math.max(0, finishedAt - (S.draft.startedAt || finishedAt)),
    entries:entries
  };
  var rt = S.draft.routineId && S.profile.routines[S.draft.routineId];
  if(rt){ session.routineId = rt.id; session.routineName = rt.name; }
  Store.saveSession(session).then(function(){
    S.finishSaving = false;
    S.sessions.push(session);
    S.justSaved = {session:session, next:saved};
    S.draft = blankDraft(); saveDraft(); S.restEndsAt = null; saveRestEnd(); S.confirm = null;
    render(); window.scrollTo(0, 0);
  }).catch(function(){
    S.finishSaving = false;
    render();
    toast('No se guardó el entreno; conserva la pantalla abierta y vuelve a intentarlo');
  });
}
function onClick(ev){
  var t = ev.target.closest('[data-act]'); if(!t) return;
  var act = t.dataset.act, ei = t.dataset.ei !== undefined ? +t.dataset.ei : null, ri = t.dataset.ri !== undefined ? +t.dataset.ri : null;
  var st = S.profile.settings;
  switch(act){
    case 'cloud-signin':
      Store.signIn().catch(function(error){ toast('No se pudo iniciar sesión' + (error && error.message ? ': ' + error.message : '')); });
      break;
    case 'cloud-signout':
      Store.signOut();
      break;
    case 'cloud-sync':
      if(S.cloudSyncing) break;
      S.cloudSyncing=true; render();
      Promise.resolve().then(function(){ return Store.syncToCloud(); }).then(function(){
        S.cloudSyncing=false;
        if(S.ready) render();
        toast('Sincronización completada');
      }).catch(function(error){
        console.error('No se pudo completar la sincronización',error);
        S.cloudSyncing=false; render();
        toast(error && error.message ? error.message : 'No se pudo completar la sincronización; tus datos locales se conservaron');
      });
      break;
    case 'tab': S.tab = t.dataset.tab; if(S.tab === 'ejercicios') S.librarySection = 'ejercicios'; S.confirm = null; try { localStorage.setItem(TK, S.tab); } catch(e){} render(); window.scrollTo(0, 0); if($('#view')) $('#view').focus({preventScroll:true}); break;
    case 'profile-section': S.profileSection=t.dataset.section; render(); break;
    case 'profile-open-exercise': S.tab='ejercicios'; S.librarySection='ejercicios'; S.openEx=t.dataset.id; try{localStorage.setItem(TK,S.tab);}catch(e){} render(); window.scrollTo(0,0); break;
    case 'measurement-new': S.measurementForm=true; render(); break;
    case 'measurement-cancel': S.measurementForm=false; render(); break;
    case 'measurement-delete': S.profile.measurements=S.profile.measurements.filter(function(m){return m.id!==t.dataset.id;}); Store.saveProfile(); render(); toast('Medición eliminada'); break;
    case 'measurement-save':
      var measurementDate=$('#measurement-date')&&$('#measurement-date').value;
      var measurementValues={}, measurementValid=true;
      Object.keys(MEASUREMENT_FIELDS).forEach(function(key){var input=$('#measurement-'+key), value=input&&num(input.value); if(input&&input.value.trim()!==''){if(value===null||value<0||!Number.isFinite(value)){measurementValid=false;}else measurementValues[key]=value;}});
      var validMeasurementDate=/^\d{4}-\d{2}-\d{2}$/.test(measurementDate||'')&&iso(parseISO(measurementDate))===measurementDate;
      if(!validMeasurementDate){toast('Elige una fecha válida');break;}
      if(!measurementValid){toast('Revisa los valores de las medidas');break;}
      if(!Object.keys(measurementValues).length){toast('Añade al menos una medida');break;}
      S.profile.measurements.push({id:uid('measure'),date:measurementDate,values:measurementValues,notes:$('#measurement-notes')?$('#measurement-notes').value.trim():''});
      S.measurementForm=false; Store.saveProfile(); render(); toast('Medición guardada'); break;
    case 'library-open-section': S.tab = 'rutinas'; S.librarySection = t.dataset.section; S.selectedProgram = null; S.selectedRoutine = null; S.confirm = null; try { localStorage.setItem(TK, S.tab); } catch(e){} render(); break;
    case 'library-section': S.librarySection = t.dataset.section; S.selectedProgram = null; S.selectedRoutine = null; S.confirm = null; render(); break;
    case 'program-new': S.pedit = {id:null, name:''}; S.selectedProgram = null; render(); break;
    case 'program-edit':
      var programEdit = S.profile.programs[t.dataset.id];
      if(programEdit) S.pedit = {id:programEdit.id, name:programEdit.name};
      render(); break;
    case 'program-save': saveProgram(); break;
    case 'program-cancel': S.pedit = null; render(); break;
    case 'program-open': S.selectedProgram = t.dataset.id; S.librarySection = 'programas'; S.selectedRoutine = null; render(); break;
    case 'program-back': S.selectedProgram = null; render(); break;
    case 'program-del': S.confirm = 'delp:' + t.dataset.id; render(); break;
    case 'program-cancel-delete': S.confirm = null; render(); break;
    case 'program-del-ok':
      Object.keys(S.profile.routines).forEach(function(id){ if(S.profile.routines[id].programId === t.dataset.id) delete S.profile.routines[id].programId; });
      delete S.profile.programs[t.dataset.id]; S.selectedProgram = null; S.confirm = null; Store.saveProfile(); render(); toast('Programa borrado; sus rutinas siguen en la biblioteca'); break;
    case 'rut-detail': S.selectedRoutine = t.dataset.id; render(); break;
    case 'routine-back': S.selectedRoutine = null; render(); break;
    case 'start': S.picker = true; render(); var q = $('#pk-q'); if(q){ q.focus(); q.scrollIntoView({block:'center'}); } break;
    case 'picker-close': S.picker = false; if(S.redit) S.redit.pick = false; render(); break;
    case 'pick': pickExercise(t); break;
    case 'create': createExercise(t.dataset.name); break;
    case 'rut-new': S.selectedRoutine = null; S.redit = {id:null, name:'', items:[], pick:false, programId:S.selectedProgram || ''}; S.tab = 'rutinas'; render(); window.scrollTo(0, 0); break;
    case 'rut-edit':
      var rr = S.profile.routines[t.dataset.id];
      var editItems = routineItemsForEdit(rr);
      S.selectedRoutine = null; S.redit = {id:rr.id, name:rr.name, items:editItems, pick:false, programId:rr.programId || ''}; render(); window.scrollTo(0, 0); break;
    case 'rut-duplicate': duplicateRoutine(t.dataset.id); break;
    case 'rut-cancel': S.redit = null; render(); break;
    case 'rut-save': saveRoutine(); break;
    case 'rut-add': S.redit.pick = true; render(); var q2 = $('#pk-q'); if(q2){ q2.focus(); q2.scrollIntoView({block:'center'}); } break;
    case 'rpick': S.redit.items.push(newItem(ensureExercise(t))); S.redit.pick = false; render(); break;
    case 'rcreate': S.redit.items.push(newItem(createBase(t.dataset.name))); S.redit.pick = false; render(); break;
    case 'rut-rm-item': S.redit.items.splice(+t.dataset.i, 1); render(); break;
    case 'rut-up': case 'rut-down':
      var ii = +t.dataset.i, jj = act === 'rut-up' ? ii - 1 : ii + 1, its = S.redit.items;
      if(jj >= 0 && jj < its.length){ var tmp = its[ii]; its[ii] = its[jj]; its[jj] = tmp; render(); }
      break;
    case 'rut-start':
      if(S.draft.entries.length && S.confirm !== 'start:' + t.dataset.id){ S.confirm = 'start:' + t.dataset.id; render(); }
      else startRoutine(t.dataset.id);
      break;
    case 'rut-del': S.confirm = 'delr:' + t.dataset.id; render(); break;
    case 'rut-del-ok': delete S.profile.routines[t.dataset.id]; S.selectedRoutine = null; Store.saveProfile(); S.confirm = null; render(); toast('Rutina borrada'); break;
    case 'move-exercise':
      var moveFrom = ei, moveTo = ei + Number(t.dataset.direction);
      if(!Number.isInteger(moveTo) || moveTo < 0 || moveTo >= S.draft.entries.length) break;
      var movedEntry = S.draft.entries.splice(moveFrom, 1)[0];
      S.draft.entries.splice(moveTo, 0, movedEntry);
      saveDraft(); render(); break;
    case 'toggle-entry':
      var toggledEntry = S.draft.entries[ei];
      if(!toggledEntry) break;
      if(S.collapsedEntries.has(toggledEntry.uiId)) S.collapsedEntries.delete(toggledEntry.uiId);
      else S.collapsedEntries.add(toggledEntry.uiId);
      S.draft.collapsedEntryIds=Array.from(S.collapsedEntries);
      saveDraft();
      render(); break;
    case 'rm-ex':
      var removedEntry = S.draft.entries[ei], entryIndex = ei, draftAtRemoval = S.draft;
      if(!removedEntry) break;
      var removedEntryRestState=restStateForRows(removedEntry.rows);
      var removedEntryCollapsed=S.collapsedEntries.has(removedEntry.uiId);
      removedEntry.rows.forEach(cancelRestForRow);
      S.collapsedEntries.delete(removedEntry.uiId);
      S.draft.collapsedEntryIds=Array.from(S.collapsedEntries);
      S.draft.entries.splice(ei, 1); saveDraft(); render();
      toast('Ejercicio quitado del entreno', 'Deshacer', function(){
        if(S.draft !== draftAtRemoval || S.draft.entries.indexOf(removedEntry) >= 0) return;
        S.draft.entries.splice(Math.min(entryIndex, S.draft.entries.length), 0, removedEntry);
        if(removedEntryCollapsed) S.collapsedEntries.add(removedEntry.uiId);
        S.draft.collapsedEntryIds=Array.from(S.collapsedEntries);
        restoreRestAfterUndo(removedEntry.rows, removedEntryRestState);
        saveDraft(); render();
      });
      break;
    case 'toggle-cfg': var xid = S.draft.entries[ei].exId; S.openCfg = S.openCfg === xid ? null : xid; render(); break;
    case 'add-set':
      var rows = S.draft.entries[ei].rows, lr = rows[rows.length-1];
      var entryEx = effEx(S.draft.entries[ei]);
      rows.push(nextRow(lr, entryEx.unilateral)); saveDraft(); render(); break;
    case 'finish-set':
      var finishEntry = S.draft.entries[ei], finishExercise = finishEntry && effEx(finishEntry);
      var finishRow = finishEntry && finishEntry.rows[ri];
      if(!finishRow || !finishExercise || !rowComplete(finishRow, finishExercise.unilateral)){
        toast(finishExercise && finishExercise.unilateral
          ? 'Completa peso y repeticiones de ambos lados'
          : 'Completa peso y repeticiones para terminar la serie');
        break;
      }
      if(finishRow.restTriggered) break;
      var finishedAt = Date.now(), previousFinishedRow = ri > 0 && finishEntry.rows[ri-1];
      if(previousFinishedRow && previousFinishedRow.restCompletedAt){
        finishRow.restMs = Math.max(0, finishedAt - previousFinishedRow.restCompletedAt);
      }
      finishRow.restTriggered = true;
      finishRow.restCompletedAt = finishedAt;
      finishRow.restToken = uid('rest_');
      var finishRestSeconds = restSecondsFor(finishRow);
      if(autoRestEligible(finishRow) && finishRestSeconds > 0){
        startRest(finishRestSeconds, finishRow.restToken);
      }
      saveDraft();
      render();
      break;
    case 'undo-finish-set':
      var undoEntry=S.draft.entries[ei], undoRow=undoEntry&&undoEntry.rows[ri];
      if(!undoRow || !undoRow.restTriggered) break;
      cancelRestForRow(undoRow);
      delete undoRow.restTriggered;
      delete undoRow.restCompletedAt;
      delete undoRow.restMs;
      delete undoRow.restToken;
      saveDraft(); render(); break;
    case 'repeat-set':
      var repeatEntry=S.draft.entries[ei], repeatExercise=repeatEntry&&effEx(repeatEntry);
      if(!repeatEntry||!repeatExercise) break;
      var previousRow=repeatEntry.rows.slice().reverse().find(function(row){
        return setType(row)!=='warmup' && rowComplete(row,repeatExercise.unilateral);
      });
      if(!previousRow){ toast('Completa una serie para poder copiarla'); break; }
      var copiedRow=nextRow(previousRow,repeatExercise.unilateral);
      var targetRow=repeatEntry.rows.find(function(row){
        if(setType(row)!=='normal') return false;
        var sides=repeatExercise.unilateral ? [row.right||{},row.left||{}] : [row];
        return sides.every(function(side){ return [side.w,side.r,side.rir].every(function(value){ return String(value===undefined?'':value).trim()===''; }); });
      });
      if(targetRow){
        copiedRow=targetRow;
        if(repeatExercise.unilateral) ensureRowMode(copiedRow,true);
        copiedRow.type='normal';
      }else repeatEntry.rows.push(copiedRow);
      if(repeatExercise.unilateral){
        ['right','left'].forEach(function(side){
          copiedRow[side].w=previousRow[side].w;
          copiedRow[side].r=previousRow[side].r;
          copiedRow[side].rir=previousRow[side].rir;
        });
      }else{
        copiedRow.w=previousRow.w;
        copiedRow.r=previousRow.r;
        copiedRow.rir=previousRow.rir;
      }
      delete copiedRow.restTriggered; delete copiedRow.restCompletedAt; delete copiedRow.restMs;
      delete copiedRow.restToken;
      saveDraft(); render(); toast('Serie copiada; ajusta reps o esfuerzo si hace falta'); break;
    case 'rm-set':
      var removeFrom = S.draft.entries[ei], removedRow = removeFrom && removeFrom.rows[ri], rowIndex = ri, draftForRow = S.draft;
      if(!removedRow) break;
      var removedSetRestState=restStateForRows([removedRow]);
      cancelRestForRow(removedRow);
      removeFrom.rows.splice(ri, 1); saveDraft(); render();
      toast('Serie quitada del entreno', 'Deshacer', function(){
        if(S.draft !== draftForRow || S.draft.entries.indexOf(removeFrom) < 0 || removeFrom.rows.indexOf(removedRow) >= 0) return;
        removeFrom.rows.splice(Math.min(rowIndex, removeFrom.rows.length), 0, removedRow);
        restoreRestAfterUndo([removedRow], removedSetRestState);
        saveDraft(); render();
      });
      break;
    case 'finish': finish(); break;
    case 'finish-update': finish(true); break;
    case 'finish-keep': finish(false); break;
    case 'finish-cancel': S.confirm = null; render(); break;
    case 'rest-start': startRest(Number(S.profile.settings.restSeconds) || 90); render(); break;
    case 'rest-add':
      if(S.restEndsAt) S.restEndsAt += 30000;
      else { S.restEndsAt = Date.now() + ((Number(S.profile.settings.restSeconds) || 90) + 30) * 1000; S.restOwner=null; }
      saveRestEnd(); updateRestTimer(); render(); break;
    case 'rest-stop': S.restEndsAt = null; S.restOwner=null; saveRestEnd(); render(); break;
    case 'discard': S.confirm = 'discard'; render(); break;
    case 'discard-ok': S.draft = blankDraft(); saveDraft(); S.restEndsAt = null; S.restOwner=null; saveRestEnd(); S.confirm = null; render(); break;
    case 'dismiss-saved': S.justSaved = null; render(); break;
    case 'toggle-ex': S.openEx = S.openEx === t.dataset.id ? null : t.dataset.id; S.confirm = null; render(); break;
    case 'progress-metric': if(['weight','estimated','volume'].includes(t.dataset.metric)){ S.progressMetric=t.dataset.metric; render(); } break;
    case 'archive': S.confirm = 'arch:' + t.dataset.id; render(); break;
    case 'archive-ok': S.profile.exercises[t.dataset.id].archived = true; S.draft.entries = S.draft.entries.filter(function(en){ return en.exId !== t.dataset.id; }); saveDraft(); Store.saveProfile(); S.confirm = null; S.openEx = null; render(); break;
    case 'del-sess': S.confirm = 'sess:' + t.dataset.id; render(); break;
    case 'del-sess-ok':
      var deleteId=t.dataset.id;
      deleteSession(deleteId).then(function(deleted){
        if(!deleted){ render(); return; }
        if(S.sessionEdit && S.sessionEdit.id===deleteId) S.sessionEdit=null;
        S.confirm=null; render(); toast('Entreno borrado');
      }).catch(function(error){ console.error('No se pudo borrar el entreno',error); render(); });
      break;
    case 'session-edit':
      var editSession = S.sessions.find(function(s){ return s.id === t.dataset.id; });
      if(editSession){
        var editDuration = Math.max(0, Math.floor((Number(editSession.durationMs) || 0) / 60000));
        var editableSession=prepareSessionForEdit(editSession);
        S.sessionEdit = {id:editSession.id, session:editableSession, date:editSession.date, hours:String(Math.floor(editDuration / 60)), minutes:String(editDuration % 60), saving:false, addPicker:false, confirmEntry:null, collapsedEntries:new Set()};
        S.confirm = null; render();
      }
      break;
    case 'session-toggle-entry':
      if(S.sessionEdit){
        var toggleEntry=S.sessionEdit.session.entries[+t.dataset.entry];
        if(toggleEntry){
          if(S.sessionEdit.collapsedEntries.has(toggleEntry)) S.sessionEdit.collapsedEntries.delete(toggleEntry);
          else S.sessionEdit.collapsedEntries.add(toggleEntry);
          render();
        }
      }
      break;
    case 'session-finish-set':
    case 'session-undo-finish-set':
      if(S.sessionEdit && !S.sessionEdit.saving){
        var finishEditEntry=S.sessionEdit.session.entries[+t.dataset.entry];
        var finishEditSet=finishEditEntry && finishEditEntry.sets[+t.dataset.set];
        var finishEditExercise=finishEditEntry && S.profile.exercises[finishEditEntry.exId];
        if(finishEditSet){
          var markDone=act==='session-finish-set';
          if((markDone && sessionEditSetCanFinish(finishEditEntry,finishEditSet,finishEditExercise)) || !markDone){
            setSessionEditDone(finishEditEntry,finishEditSet,markDone,finishEditExercise);
            render();
          }
        }
      }
      break;
    case 'session-edit-save': saveSessionEdit(); break;
    case 'session-edit-cancel': S.sessionEdit = null; render(); break;
    case 'session-conflict-reload':
      if(S.sessionEdit && S.sessionEdit.conflict){
        var remote=S.sessionEdit.conflict.remoteSession || S.sessions.find(function(s){ return s.id===S.sessionEdit.id; });
        if(!remote){ toast('El entrenamiento ya no existe en la nube'); S.sessionEdit=null; render(); break; }
        var remoteDuration=Math.max(0,Math.floor((Number(remote.durationMs)||0)/60000));
        S.sessionEdit.session=prepareSessionForEdit(remote); S.sessionEdit.date=remote.date; S.sessionEdit.hours=String(Math.floor(remoteDuration/60)); S.sessionEdit.minutes=String(remoteDuration%60); S.sessionEdit.collapsedEntries=new Set(); S.sessionEdit.conflict=null; S.sessionEdit.overwrite=false; render();
      }
      break;
    case 'session-conflict-overwrite': if(S.sessionEdit){ S.sessionEdit.overwrite=true; S.sessionEdit.conflict=null; saveSessionEdit(); } break;
    case 'session-move-exercise': if(S.sessionEdit){
      var sessionMoveFrom=+t.dataset.entry, sessionMoveTo=sessionMoveFrom+Number(t.dataset.direction), sessionEntries=S.sessionEdit.session.entries;
      if(sessionMoveTo>=0 && sessionMoveTo<sessionEntries.length){
        var sessionMoved=sessionEntries.splice(sessionMoveFrom,1)[0]; sessionEntries.splice(sessionMoveTo,0,sessionMoved); render();
      }
    } break;
    case 'session-add-exercise-picker': if(S.sessionEdit){ S.sessionEdit.addPicker=true; render(); } break;
    case 'session-add-exercise-cancel': if(S.sessionEdit){ S.sessionEdit.addPicker=false; render(); } break;
    case 'session-remove-exercise': if(S.sessionEdit){ S.sessionEdit.confirmEntry=+t.dataset.entry; render(); } break;
    case 'session-remove-exercise-cancel': if(S.sessionEdit){ S.sessionEdit.confirmEntry=null; render(); } break;
    case 'session-remove-exercise-ok': if(S.sessionEdit){ S.sessionEdit.session.entries.splice(+t.dataset.entry,1); S.sessionEdit.confirmEntry=null; render(); } break;
    case 'session-add-set': if(S.sessionEdit){
      var addEntry=S.sessionEdit.session.entries[+t.dataset.entry];
      if(addEntry){
        var exerciseForEntry=S.profile.exercises[addEntry.exId];
        if(exerciseForEntry && exerciseForEntry.unilateral){
          var pairIndex=addEntry.sets.reduce(function(max,set){return Math.max(max,Number.isFinite(set.pair)?set.pair+1:0);},0);
          addEntry.sets.push({w:null,r:null,rir:null,type:'normal',pair:pairIndex,side:'left',editorDone:false});
          addEntry.sets.push({w:null,r:null,rir:null,type:'normal',pair:pairIndex,side:'right',editorDone:false});
        }else addEntry.sets.push({w:null,r:null,rir:null,type:'normal',editorDone:false});
        render();
      }
    } break;
    case 'session-remove-set': if(S.sessionEdit){
      var removeEntry=S.sessionEdit.session.entries[+t.dataset.entry]; if(removeEntry){
        var removedPair=removeEntry.sets[+t.dataset.set]&&removeEntry.sets[+t.dataset.set].pair;
        removeEntry.sets.splice(+t.dataset.set,1);
        if(removedPair!==undefined) removeEntry.sets=removeEntry.sets.filter(function(set){return set.pair!==removedPair;});
        render();
      }
    } break;
    case 'set-mode': st.mode = t.dataset.mode; Store.saveProfile(); render(); break;
    case 'tr-minus': st.targetRir = Math.max(0, st.targetRir - 1); Store.saveProfile(); render(); break;
    case 'tr-plus': st.targetRir = Math.min(4, st.targetRir + 1); Store.saveProfile(); render(); break;
    case 'goal-new': S.goalNew=true; render(); break;
    case 'goal-cancel': S.goalNew=false; render(); break;
    case 'goal-save':
      var goalName=$('#goal-name')&&$('#goal-name').value.trim(), goalTarget=$('#goal-target')?num($('#goal-target').value):null;
      if(!goalName || !(goalTarget>0)){ toast('Completa el nombre y una meta válida'); break; }
      var goalType=$('#goal-type').value, exerciseId=$('#goal-exercise')?$('#goal-exercise').value:'';
      if(goalType==='exercise-weight' && !exerciseId){ toast('Selecciona un ejercicio para este objetivo'); break; }
      var records=exerciseId && personalRecords(exById(exerciseId)||{});
      var goal={id:uid('goal'),name:goalName,type:goalType,target:goalTarget,start:records&&records.weight?Number(records.weight.value):0,current:0,unit:$('#goal-unit').value.trim(),exerciseId:exerciseId||null};
      S.profile.goals=S.profile.goals||{}; S.profile.goals[goal.id]=goal; S.goalNew=false; Store.saveProfile(); render(); toast('Objetivo añadido'); break;
    case 'goal-delete': delete S.profile.goals[t.dataset.id]; Store.saveProfile(); render(); toast('Objetivo eliminado'); break;
    case 'demo-load': loadDemo(); break;
    case 'demo-clear': clearDemo(); break;
    case 'wipe': S.confirm = 'wipe'; render(); break;
    case 'wipe-ok':
      var ids = S.sessions.map(function(s){ return s.id; });
      Store.deleteSessions(ids).then(function(){
        S.sessions = []; S.profile.exercises = {}; S.profile.routines = {}; S.profile.programs = {}; S.profile.goals = {}; S.redit = null; S.pedit = null; S.draft = blankDraft(); saveDraft();
        S.restEndsAt = null; saveRestEnd();
        return Store.saveProfileNow();
      }).then(function(){
        S.confirm = null; S.justSaved = null; render(); toast('Datos borrados');
      }).catch(function(error){
        console.error('No se pudieron borrar todos los datos',error);
        S.confirm=null; render(); toast('No se pudo completar el borrado de datos');
      });
      break;
    case 'auto-restore': restoreAutoBackup(); break;
    case 'export': downloadBackup(); break;
    case 'import': $('#backup-file').click(); break;
    case 'export-csv': downloadSessionsCsv(); break;
    case 'import-csv': $('#csv-file').click(); break;
    case 'import-routine': $('#routine-file').click(); break;
    case 'rut-export':
      var sharedRoutine=S.profile.routines[t.dataset.id]; if(sharedRoutine) exportRoutine(sharedRoutine); break;
    case 'import-confirm': restoreBackup(); break;
    case 'import-cancel': S.pendingImport = null; render(); break;
  }
}
function onInput(ev){
  var t = ev.target;
  if(t.dataset.historySearch!==undefined){
    S.historyQuery=t.value;
    refreshHistoryResults();
    return;
  }
  if(t.dataset.sessionMeta){
    if(!S.sessionEdit || S.sessionEdit.saving) return;
    S.sessionEdit[t.dataset.sessionMeta] = t.value;
    return;
  }
  if(t.dataset.sessionEdit){
    var edit = S.sessionEdit;
    if(!edit || edit.saving) return;
    var entry = edit.session.entries[+t.dataset.entry], set = entry && entry.sets[+t.dataset.set];
    if(!set) return;
    if(t.dataset.sessionEdit === 'weight') set.w = num(t.value);
    if(t.dataset.sessionEdit === 'reps') set.r = num(t.value);
    if(t.dataset.sessionEdit === 'effort'){
      var value = t.value.trim() === '' ? null : num(t.value);
      set.rir = value === null ? null : (S.profile.settings.mode === 'rpe' ? 10 - value : value);
    }
    if(t.dataset.sessionEdit === 'rest'){ set.restMs = t.value.trim() === '' ? undefined : Math.max(0, Number(t.value))*1000; }
    setSessionEditDone(entry,set,false,S.profile.exercises[entry.exId]);
    updateSessionEditFinishControls(+t.dataset.entry,+t.dataset.set);
    return;
  }
  if(t.id === 'pk-q'){ $('#pk-list').innerHTML = pickerList(t.value, S.redit && S.redit.pick ? 'routine' : 'day'); return; }
  if(t.dataset.rf === 'name' && S.redit){ S.redit.name = t.value; return; }
  if(t.dataset.pf === 'name' && S.pedit){ S.pedit.name = t.value; return; }
  var f = t.dataset.f; if(!f) return;
  var ei = +t.dataset.ei, ri = +t.dataset.ri;
  var row = S.draft.entries[ei] && S.draft.entries[ei].rows[ri]; if(!row) return;
  var target = t.dataset.side ? (ensureRowMode(row, true)[t.dataset.side]) : row;
  if(f === 'w') target.w = t.value;
  else if(f === 'r') target.r = t.value;
  else if(f === 'e'){
    var v = num(t.value);
    target.rir = (t.value.trim() === '' || v === null) ? '' : String(S.profile.settings.mode === 'rpe' ? 10 - v : v);
  }
  var entry = S.draft.entries[ei], exercise = effEx(entry);
  if(f === 'w' && setType(row) === 'normal') refreshAutoWarmupInputs(ei, entry, exercise);
  var finishControl = $('.set-finish[data-ei="' + ei + '"][data-ri="' + ri + '"]');
  if(finishControl){
    if(row.restTriggered){
      if(finishControl.dataset.act !== 'undo-finish-set'){
        finishControl.outerHTML = '<button class="set-finish set-finish-done" data-act="undo-finish-set" data-ei="' + ei + '" data-ri="' + ri + '" aria-label="Deshacer fin de la serie ' + (ri+1) + '"><span aria-hidden="true">✓</span> Hecha · deshacer</button>';
      }
    }else if(finishControl.tagName === 'BUTTON'){
      finishControl.disabled = !rowComplete(row, exercise.unilateral);
    }else{
      var finishButton = document.createElement('button');
      finishButton.className = 'btn ghost sm set-finish';
      finishButton.dataset.act = 'finish-set';
      finishButton.dataset.ei = String(ei);
      finishButton.dataset.ri = String(ri);
      finishButton.disabled = !rowComplete(row, exercise.unilateral);
      finishButton.textContent = 'Terminar serie';
      finishControl.replaceWith(finishButton);
    }
  }
  var progress = $('.workout-progress', $('section.card[data-ei="' + ei + '"]'));
  if(progress) progress.textContent = completedWorkSets(entry, exercise) + '/' + Math.max(1, Number(exercise.sets) || 1) + ' series';
  saveDraft(); refreshLive(ei);
}
function onChange(ev){
  var t = ev.target;
  if(t.dataset.historyRange!==undefined){
    if(['all','7','30'].includes(t.value)){ S.historyRange=t.value; refreshHistoryResults(); }
    return;
  }
  if(t.dataset.profileExerciseSort!==undefined){S.exerciseSort=t.value;render();return;}
  if(t.dataset.sessionReplaceExercise!==undefined){
    var replaceEntry=S.sessionEdit&&S.sessionEdit.session.entries[+t.dataset.entry], replacement=S.profile.exercises[t.value];
    if(replaceEntry && replacement){
      var replacementSets;
      replaceEntry.exId=t.value;
      if(replacement.unilateral){
        replacementSets=replaceEntry.sets.filter(function(set){return set.side==='left' || set.pair===undefined;});
        if(!replacementSets.length) replacementSets=replaceEntry.sets.slice();
        var unilateralSets=[];
        replacementSets.forEach(function(set,pair){ unilateralSets.push(Object.assign({},set,{pair:pair,side:'left'})); unilateralSets.push(Object.assign({},set,{pair:pair,side:'right'})); });
        replaceEntry.sets=unilateralSets;
      }else{
        replacementSets=replaceEntry.sets.filter(function(set){return set.side!=='right';});
        replacementSets.forEach(function(set){ delete set.pair; delete set.side; });
        replaceEntry.sets=replacementSets;
      }
      replaceEntry.unilateral=!!replacement.unilateral;
      replaceEntry.cfg=null;
      render();
    }
    return;
  }
  if(t.dataset.sessionAddExercise!==undefined){
    var editExId=t.value, sessionEdit=S.sessionEdit;
    if(!sessionEdit || !editExId || !S.profile.exercises[editExId]) return;
    var exercise=S.profile.exercises[editExId], setCount=Math.max(1,Math.min(20,Number(exercise.sets)||3)), newSets=[];
    if(exercise.unilateral){
      for(var pair=0;pair<setCount;pair++){
        newSets.push({w:null,r:null,rir:null,type:'normal',pair:pair,side:'left',editorDone:false});
        newSets.push({w:null,r:null,rir:null,type:'normal',pair:pair,side:'right',editorDone:false});
      }
    }else{
      for(var i=0;i<setCount;i++) newSets.push({w:null,r:null,rir:null,type:'normal',editorDone:false});
    }
    sessionEdit.session.entries.push({exId:editExId,sets:newSets,unilateral:!!exercise.unilateral});
    sessionEdit.addPicker=false;
    render();
    return;
  }
  if(t.dataset.sessionEdit === 'type'){
    var edit = S.sessionEdit, entry = edit && edit.session.entries[+t.dataset.entry], set = entry && entry.sets[+t.dataset.set];
    if(!set || !Object.prototype.hasOwnProperty.call(SET_TYPES, t.value)) return;
    set.type = t.value;
    if(sessionEntryIsUnilateral(entry,S.profile.exercises[entry.exId]) && set.pair !== undefined){
      entry.sets.forEach(function(other){
        if(other.pair === set.pair) other.type = t.value;
      });
    }
    refreshSessionEditProgress(+t.dataset.entry);
    return;
  }
  if(t.dataset.routineProgram !== undefined && S.redit){
    S.redit.programId = t.value;
    return;
  }
  if(t.dataset.hc === 'warmupMode'){
    if(t.value !== 'auto' && t.value !== 'manual'){ render(); return; }
    applyEntryCfg(+t.dataset.ei, 'warmupMode', t.value);
    return;
  }
  if(t.dataset.it === 'warmupMode' && S.redit){
    var modeItem = S.redit.items[+t.dataset.i];
    if(!modeItem || (t.value !== 'auto' && t.value !== 'manual')){ render(); return; }
    modeItem.warmupMode = t.value;
    render(); return;
  }
  if(t.dataset.it === 'warmupPercent' && S.redit){
    var percentItem = S.redit.items[+t.dataset.i], routinePercent = num(t.value);
    if(!percentItem || routinePercent === null || routinePercent < 1 || routinePercent > 100){ render(); return; }
    if(!Array.isArray(percentItem.warmupPercents)) percentItem.warmupPercents = warmupSettings(percentItem).warmupPercents;
    percentItem.warmupPercents[+t.dataset.k] = routinePercent;
    render(); return;
  }
  if(t.id === 'routine-file'){
    var routineFile=t.files&&t.files[0]; if(!routineFile)return;
    var routineReader=new FileReader(); routineReader.onload=function(){ try{ importRoutine(JSON.parse(String(routineReader.result))); }catch(e){toast('El archivo no contiene una rutina válida de Sobrecarga');} t.value=''; }; routineReader.readAsText(routineFile); return;
  }
  if(t.id === 'csv-file'){
    var csvFile = t.files && t.files[0];
    if(!csvFile) return;
    var csvReader = new FileReader();
    csvReader.onload = function(){
      try{
        Promise.resolve(importSessionsCsv(String(csvReader.result))).catch(function(error){
          console.error('No se pudo procesar el archivo CSV',error);
          toast('No se pudo importar el CSV');
        });
      }catch(error){
        console.error('No se pudo procesar el archivo CSV',error);
        toast('El archivo CSV no tiene un formato válido');
      }
      t.value='';
    };
    csvReader.onerror = function(){ toast('No se pudo leer el CSV'); t.value=''; };
    csvReader.readAsText(csvFile); return;
  }
  if(t.id === 'backup-file'){
    var file = t.files && t.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var parsed = JSON.parse(String(reader.result));
        var data = SobrecargaBackup.migrateBackup(parsed);
        if(!data || !validBackup(data)) throw new Error('invalid backup');
        S.pendingImport = data; render();
        toast('Respaldo listo para restaurar');
      } catch(e){ toast('El archivo no es un respaldo válido de Sobrecarga'); }
      t.value = '';
    };
    reader.onerror = function(){ toast('No se pudo leer el archivo'); t.value = ''; };
    reader.readAsText(file);
    return;
  }
  if(t.dataset.setting === 'restSeconds'){
    var seconds = Number(t.value);
    if(![60,90,120,180,300].includes(seconds)){ render(); return; }
    S.profile.settings.restSeconds = seconds; Store.saveProfile(); render(); return;
  }
  if(t.dataset.setting === 'warmupRestSeconds'){
    var warmupSeconds = Number(t.value);
    if(![0,15,30,45,60,90,120].includes(warmupSeconds)){ render(); return; }
    S.profile.settings.warmupRestSeconds = warmupSeconds; Store.saveProfile(); render(); return;
  }
  if(t.dataset.f === 'r' || t.dataset.f === 'w'){
    var autoEntry = S.draft.entries[+t.dataset.ei], autoRi=+t.dataset.ri;
    if(autoRi > 0 && autoEntry){
      var previousRestRow=autoEntry.rows[autoRi-1], currentRestRow=autoEntry.rows[autoRi];
      if(previousRestRow && currentRestRow && previousRestRow.restCompletedAt && !currentRestRow.restMs){
        currentRestRow.restMs=Math.max(0,Date.now()-previousRestRow.restCompletedAt);
        saveDraft();
      }
    }
  }
  if(t.dataset.it === 'unilateral'){
    var routineItem = S.redit && S.redit.items[+t.dataset.i];
    if(!routineItem || (t.value !== 'true' && t.value !== 'false')){ render(); return; }
    routineItem.unilateral = t.value === 'true'; render(); return;
  }
  if(t.dataset.hc === 'warmupPercent'){
    var percentValue = num(t.value);
    if(percentValue === null || percentValue < 1 || percentValue > 100){ render(); return; }
    applyEntryCfg(+t.dataset.ei, 'warmupPercent', percentValue, +t.dataset.k);
    return;
  }
  if(t.dataset.cfg === 'warmupMode'){
    if(t.value !== 'auto' && t.value !== 'manual'){ render(); return; }
    var modeExercise = exById(t.dataset.id);
    if(!modeExercise) return;
    modeExercise.warmupMode = t.value; Store.saveProfile(); render(); return;
  }
  if(t.dataset.cfg === 'warmupPercent'){
    var exercisePercent = num(t.value), percentExercise = exById(t.dataset.id);
    if(!percentExercise || exercisePercent === null || exercisePercent < 1 || exercisePercent > 100){ render(); return; }
    percentExercise.warmupPercents = warmupSettings(percentExercise).warmupPercents;
    percentExercise.warmupPercents[+t.dataset.k] = exercisePercent;
    Store.saveProfile(); render(); return;
  }
  if(t.dataset.setType !== undefined){
    var setRow = S.draft.entries[+t.dataset.ei] && S.draft.entries[+t.dataset.ei].rows[+t.dataset.ri];
    if(!setRow || !Object.prototype.hasOwnProperty.call(SET_TYPES, t.value)){ render(); return; }
    cancelRestForRow(setRow);
    setRow.type = t.value; delete setRow.warm;
    delete setRow.restTriggered; delete setRow.restCompletedAt; delete setRow.restMs;
    delete setRow.restToken;
    saveDraft(); render(); return;
  }
  if(t.dataset.hc || t.dataset.hef !== undefined){
    if(t.dataset.hc === 'unilateral'){
      var cfgEntry = S.draft.entries[+t.dataset.ei];
      var hasLeftValues = cfgEntry && cfgEntry.rows.some(function(row){
        return row.left && [row.left.w, row.left.r, row.left.rir].some(function(value){ return String(value || '').trim() !== ''; });
      });
      applyEntryCfg(+t.dataset.ei, 'unilateral', t.value === 'true');
      if(t.value === 'false' && hasLeftValues) toast('En modo bilateral se usa el lado derecho; el detalle por lado se conserva durante este entreno.');
      return;
    }
    var hv = num(t.value);
    if(hv === null){ render(); return; }
    if(t.dataset.hc) applyEntryCfg(+t.dataset.ei, t.dataset.hc, hv);
    else applyEntryCfg(+t.dataset.ei, 'ef', hv, +t.dataset.k);
    return;
  }
  if(S.redit && t.dataset.it){
    var it = S.redit.items[+t.dataset.i], k = t.dataset.it, v0 = num(t.value);
    if(!it || v0 === null){ render(); return; }
    if(k === 'sets'){
      var ns = Math.min(10, Math.max(1, Math.round(v0))), ef = [];
      for(var j=0;j<ns;j++) ef.push(it.efforts[j] !== undefined ? it.efforts[j] : (it.efforts.length ? it.efforts[it.efforts.length-1] : S.profile.settings.targetRir));
      it.sets = ns; it.efforts = ef;
    }
    if(k === 'warmupSets'){
      it.warmupSets = Math.min(10, Math.max(0, Math.round(v0)));
      it.warmupPercents = warmupSettings(it).warmupPercents;
    }
    if(k === 'warmupStep') it.warmupStep = Math.min(100, Math.max(0.05, v0));
    if(k === 'min'){ it.min = Math.min(50, Math.max(1, Math.round(v0))); if(it.max <= it.min) it.max = it.min + 1; }
    if(k === 'max'){ it.max = Math.min(60, Math.max(2, Math.round(v0))); if(it.min >= it.max) it.min = it.max - 1; }
    if(k === 'inc') it.inc = Math.min(25, Math.max(0.25, v0));
    if(k === 'loadStep') it.loadStep = Math.min(100, Math.max(0.05, v0));
    render(); return;
  }
  if(S.redit && t.dataset.ef !== undefined){
    var it2 = S.redit.items[+t.dataset.i], v1 = num(t.value);
    if(!it2 || v1 === null){ render(); return; }
    var rir = S.profile.settings.mode === 'rpe' ? 10 - v1 : v1;
    it2.efforts[+t.dataset.k] = Math.min(6, Math.max(0, rir));
    render(); return;
  }
  var key = t.dataset.cfg; if(!key && t.dataset.cfg !== 'secondary-muscle') return;
  var ex = exById(t.dataset.id); if(!ex) return;
  if(key === 'secondary-muscle' || t.dataset.cfg === 'secondary-muscle'){
    var container=t.closest('.secondary-muscle-grid');
    ex.secondaryMuscles=container ? Array.from(container.querySelectorAll('input[data-cfg="secondary-muscle"]:checked')).map(function(input){ return input.value; }).filter(function(id){ return id !== muscleId(ex) && MUSCLES[id]; }) : [];
    Store.saveProfile(); render(); return;
  }
  if(key === 'loadMode'){
    if(!['external','bodyweight'].includes(t.value)){ render(); return; }
    ex.loadMode = t.value; Store.saveProfile(); render(); return;
  }
  if(key === 'bodyweightPercent'){
    var bodyweightPercent=num(t.value);
    if(bodyweightPercent===null || bodyweightPercent<0 || bodyweightPercent>100){ render(); return; }
    ex.bodyweightPercent=bodyweightPercent; Store.saveProfile(); render(); return;
  }
  if(key === 'unilateral'){
    if(t.value !== 'true' && t.value !== 'false'){ render(); return; }
    var hadSideData = ex.unilateral && t.value === 'false' && S.draft.entries.some(function(en){
      return en.exId === ex.id && en.rows.some(function(row){
        return row.left && [row.left.w, row.left.r, row.left.rir].some(function(value){ return String(value || '').trim() !== ''; });
      });
    });
    ex.unilateral = t.value === 'true';
    S.draft.entries.forEach(function(en){ if(en.exId === ex.id) en.rows.forEach(function(row){ ensureRowMode(row, ex.unilateral); }); });
    Store.saveProfile(); saveDraft(); render();
    if(hadSideData) toast('En modo bilateral se usa el lado derecho; el detalle por lado se conserva durante este entreno.');
    return;
  }
  if(key === 'muscle'){
    if(!Object.prototype.hasOwnProperty.call(MUSCLES, t.value)){ render(); return; }
    ex.muscle = t.value;
    if(Array.isArray(ex.secondaryMuscles)) ex.secondaryMuscles = ex.secondaryMuscles.filter(function(id){ return id !== t.value; });
    Store.saveProfile(); render(); return;
  }
  var v = num(t.value);
  if(v === null){ render(); return; }
  if(key === 'sets') ex.sets = Math.min(10, Math.max(1, Math.round(v)));
  if(key === 'min'){ ex.min = Math.min(50, Math.max(1, Math.round(v))); if(ex.max <= ex.min) ex.max = ex.min + 1; }
  if(key === 'max'){ ex.max = Math.min(60, Math.max(2, Math.round(v))); if(ex.min >= ex.max) ex.min = ex.max - 1; }
  if(key === 'inc') ex.inc = Math.min(25, Math.max(0.25, v));
  if(key === 'loadStep') ex.loadStep = Math.min(100, Math.max(0.05, v));
  if(key === 'warmupStep') ex.warmupStep = Math.min(100, Math.max(0.05, v));
  if(key === 'warmupSets'){
    ex.warmupSets = Math.min(10, Math.max(0, Math.round(v)));
    ex.warmupPercents = warmupSettings(ex).warmupPercents;
  }
  Store.saveProfile(); render();
}
function onWorkoutKeydown(ev){
  if(ev.key!=='Enter' || !ev.target.matches('input[data-f]')) return;
  var card=ev.target.closest('section.card[data-ei]');
  if(!card) return;
  var inputs=Array.from(card.querySelectorAll('input[data-f]'));
  var index=inputs.indexOf(ev.target);
  if(index>=0 && inputs[index+1]){
    ev.preventDefault();
    inputs[index+1].focus();
    if(inputs[index+1].select) inputs[index+1].select();
  }
}

var AUTO_BACKUP_KEY='sobrecarga:auto-backup:v1';
function createAutoBackup(){
  if(!S.ready) return;
  try { localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({savedAt:Date.now(),profile:S.profile,sessions:S.sessions,draft:S.draft})); } catch(e){ toast('No se pudo crear la copia automática'); }
}
function autoBackupLabel(){
  try { var backup=JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY)); if(!backup || !backup.savedAt) return ''; return ' · última copia: '+new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(backup.savedAt)); } catch(e){ return ''; }
}
function restoreAutoBackup(){
  try {
    var backup=JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY));
    var data=SobrecargaBackup.migrateBackup({format:'sobrecarga-backup',version:1,profile:backup&&backup.profile,sessions:backup&&backup.sessions});
    if(!backup || !data || !validBackup(data)) throw new Error('invalid');
    Store.replaceAll(normProfile(data.profile),data.sessions).then(function(){
      S.sessions=data.sessions; S.profile=normProfile(data.profile);
      if(backup.draft && Array.isArray(backup.draft.entries)) { S.draft=Object.assign(blankDraft(),backup.draft); saveDraft(); }
      render(); toast('Copia automática restaurada');
    }).catch(function(){ toast('No se pudo restaurar la copia automática'); });
  } catch(e){ toast('No hay una copia automática válida'); }
}
function anomalyWarnings(){
  if(!S.ready || !S.draft.entries.length) return;
  var suspicious=[];
  S.draft.entries.forEach(function(entry){
    var exercise=exById(entry.exId), exerciseName=exercise ? exercise.name : 'Ejercicio';
    var historyWeights=[];
    S.sessions.forEach(function(session){session.entries.forEach(function(oldEntry){if(oldEntry.exId===entry.exId) oldEntry.sets.forEach(function(set){if(validWeight(set.w)&&set.w>0)historyWeights.push(Number(set.w));});});});
    var historyMax=historyWeights.length?Math.max.apply(null,historyWeights):null;
    entry.rows&&entry.rows.forEach(function(row, rowIndex){
      var sets=[];
      if(row.right||row.left){sets=[{w:row.right&&row.right.w,r:row.right&&row.right.r,label:'derecho'},{w:row.left&&row.left.w,r:row.left&&row.left.r,label:'izquierdo'}];}
      else sets=[{w:row.w,r:row.r,label:'serie '+(rowIndex+1)}];
      sets.forEach(function(set){
        var weight=num(set.w), reps=num(set.r), reasons=[];
        if(weight!==null&&(weight>500||weight<0)) reasons.push('peso fuera de rango');
        if(reps!==null&&(reps>100||reps<0)) reasons.push('repeticiones fuera de rango');
        if(historyMax!==null&&weight!==null&&weight>0&&weight>historyMax*1.5) reasons.push('peso más de 50 % sobre tu récord');
        if(reasons.length) suspicious.push(exerciseName+' · serie '+(rowIndex+1)+' '+set.label+': '+reasons.join(', '));
      });
    });
  });
  var signature=suspicious.join('|');
  if(signature && signature!==S.anomalySignature){S.anomalySignature=signature; toast('Anomalías: '+suspicious.slice(0,2).join('. ')+(suspicious.length>2?' · Revisa '+suspicious.length+' valores':'')+' antes de guardar');}
  if(!signature) S.anomalySignature='';
}
window.addEventListener('beforeunload', function(event){ if(S.draft.entries.length && !S.justSaved){ event.preventDefault(); event.returnValue=''; } });

document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
document.addEventListener('keydown', onWorkoutKeydown);
setInterval(updateWorkoutClock, 1000);
setInterval(updateRestTimer, 250);
setInterval(createAutoBackup, 6*60*60*1000);
setInterval(anomalyWarnings, 30000);
var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz = setTimeout(function(){ if(S.ready && S.tab === 'ejercicios' && S.openEx) render(); }, 200); });

render();
Store.init();
})();
