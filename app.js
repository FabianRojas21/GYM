(function(){
'use strict';

/* ---------- utilidades ---------- */
var $ = function(s, el){ return (el||document).querySelector(s); };
var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var fmt = function(n){ return (Math.round(n*100)/100).toString().replace('.', ','); };
var fmt1 = function(n){ return (Math.round(n*10)/10).toString().replace('.', ','); };
var num = function(v){ if(v===null||v===undefined) return null; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
var clone = function(o){ return JSON.parse(JSON.stringify(o)); };
var roundTo = function(x, step){ return Math.round(x/step)*step; };
var iso = function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
var parseISO = function(s){ var p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); };
var dFmt = function(s, o){ return new Intl.DateTimeFormat('es-CL', o || {day:'numeric', month:'short'}).format(parseISO(s)); };
var use = function(n){ try { return (window.claude && window.claude.use) ? window.claude.use(n) : Promise.resolve(null); } catch(e){ return Promise.resolve(null); } };
var uid = function(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2,5); };

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
  unassigned:'Sin asignar', chest:'Pecho', back:'Espalda', shoulders:'Hombros',
  biceps:'Bíceps', triceps:'Tríceps', quads:'Cuádriceps', hamstrings:'Isquiotibiales',
  glutes:'Glúteos', calves:'Pantorrillas', core:'Core', other:'Otro'
};

/* ---------- estado ---------- */
var DK = 'sobrecarga:draft:v1';
var LK = 'sobrecarga:data:v1';
var TK = 'sobrecarga:tab';
var RTK = 'sobrecarga:rest-timer:v1';
function defaultProfile(){ return {v:2, settings:{mode:'rir', targetRir:2, restSeconds:90, warmupRestSeconds:45}, exercises:{}, routines:{}, programs:{}, goals:{}}; }
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
  return d;
}
function exerciseLoadStep(ex){ return Number(ex.loadStep) > 0 ? Number(ex.loadStep) : (Number(ex.inc) > 0 ? Number(ex.inc) : 2.5); }
function muscleId(ex){ return Object.prototype.hasOwnProperty.call(MUSCLES, ex.muscle) ? ex.muscle : 'unassigned'; }
function muscleOptions(selected){
  return Object.keys(MUSCLES).map(function(id){
    return '<option value="' + id + '"' + (muscleId({muscle:selected}) === id ? ' selected' : '') + '>' + MUSCLES[id] + '</option>';
  }).join('');
}
function blankDraft(){ return {date:null, startedAt:null, routineId:null, entries:[]}; }
function loadDraft(){
  try { var d = JSON.parse(localStorage.getItem(DK)); if(d && Array.isArray(d.entries)) return Object.assign(blankDraft(), d); } catch(e){}
  return blankDraft();
}
function loadRestEnd(){
  try { var value = Number(localStorage.getItem(RTK)); return isFinite(value) && value > Date.now() ? value : null; } catch(e){ return null; }
}
var S = {
  ready:false, kind:'local', canDownload:false,
  profile:defaultProfile(), sessions:[], draft:loadDraft(),
  tab:'hoy', picker:false, pkMode:'day', openEx:null, openCfg:null, confirm:null, justSaved:null, redit:null,
  librarySection:'programas', selectedProgram:null, selectedRoutine:null, pedit:null,
  restEndsAt:loadRestEnd(), pendingImport:null, pendingRoutine:null, sessionEdit:null, finishSaving:false, goalNew:false
};
try { var t0 = localStorage.getItem(TK); if(t0) S.tab = t0; } catch(e){}
if(S.tab === 'ejercicios') S.tab = 'rutinas';
function saveDraft(){
  try {
    localStorage.setItem(DK, JSON.stringify(S.draft));
    draftSaveWarningShown = false;
    return true;
  } catch(e){
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
function saveRestEnd(){
  try {
    if(S.restEndsAt) localStorage.setItem(RTK, String(S.restEndsAt));
    else localStorage.removeItem(RTK);
  } catch(e){ toast('No se pudo guardar el temporizador'); }
}
function startRest(seconds){
  S.restEndsAt = Date.now() + seconds * 1000;
  saveRestEnd();
  refreshRestTimerSection();
}
function restTimerHtml(){
  if(!S.draft.entries.length) return '';
  var restSeconds = Number(S.profile.settings.restSeconds) || 90;
  return '<section class="rest-timer" id="rest-timer" aria-live="polite"><div><span class="lab">Descanso</span><strong class="num" id="rest-clock">' +
    (S.restEndsAt ? '00:00' : 'Listo') + '</strong></div><div class="row">' +
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
    S.restEndsAt = null; saveRestEnd();
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
var Store = {
  ref:null, col:null,
  init:function(){
    return Promise.all([use('user'), use('db')]).then(function(r){
      var user = r[0], db = r[1];
      if(!user || !db) return null;
      return user.id().then(function(id){ return id ? {db:db, id:id} : null; });
    }).catch(function(){ return null; }).then(function(ok){
      use('downloads').then(function(d){ S.canDownload = !!d; if(S.ready) render(); }).catch(function(){});
      if(ok) Store.startDb(ok.db, ok.id); else Store.startLocal();
    });
  },
  startLocal:function(){
    S.kind = 'local';
    try {
      var d = JSON.parse(localStorage.getItem(LK));
      if(d){ S.profile = normProfile(d.profile); S.sessions = d.sessions || []; }
    } catch(e){}
    S.ready = true; render();
  },
  startDb:function(db, id){
    S.kind = 'db';
    Store.ref = db.doc('data/users/'+id+'/profile');
    Store.col = Store.ref.collection('sessions');
    var gotP = false, gotS = false;
    var done = function(){ if(gotP && gotS){ S.ready = true; render(); } };
    var fail = function(){ toast('No se pudo conectar con tu cuenta. Uso este navegador.'); Store.startLocal(); };
    Store.ref.onSnapshot(function(snap){
      if(!(profDirty || profBusy)) S.profile = normProfile(snap.exists ? snap.data() : null);
      gotP = true; done();
    }, fail);
    Store.col.limit(1000).onSnapshot(function(snap){
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
    if(S.kind !== 'db'){ Store.saveLocal(); return; }
    profDirty = true; clearTimeout(profTimer); profTimer = setTimeout(Store.flush, 350);
  },
  flush:function(){
    if(profBusy){ profTimer = setTimeout(Store.flush, 200); return; }
    if(!profDirty) return;
    profDirty = false; profBusy = true;
    Store.ref.set(clone(S.profile)).then(function(){
      profBusy = false;
      if(profDirty) profTimer = setTimeout(Store.flush, 200);
    }).catch(function(){
      profBusy = false;
      profDirty = true;
      toast('No se pudieron guardar los cambios; se reintentará');
      profTimer = setTimeout(Store.flush, 5000);
    });
  },
  saveSession:function(s){
    if(S.kind !== 'db'){
      var exists = S.sessions.some(function(item){ return item.id === s.id; });
      var sessions = exists ? S.sessions.map(function(item){ return item.id === s.id ? s : item; }) : S.sessions.concat([s]);
      try {
        localStorage.setItem(LK, JSON.stringify({profile:S.profile, sessions:sessions}));
        return Promise.resolve();
      } catch(e){
        toast('No se pudo guardar el entreno en este navegador');
        return Promise.reject(e);
      }
    }
    return Store.col.doc(s.id).set(clone(s)).catch(function(error){
      toast('No se pudo guardar el entreno');
      throw error;
    });
  },
  updateSession:function(session){
    if(S.kind === 'db'){
      return Store.col.doc(session.id).set(clone(session)).catch(function(error){
        toast('No se pudo guardar los cambios del entreno');
        throw error;
      });
    }
    try {
      var sessions = S.sessions.map(function(item){ return item.id === session.id ? session : item; });
      localStorage.setItem(LK, JSON.stringify({profile:S.profile, sessions:sessions}));
      return Promise.resolve();
    } catch(error){
      toast('No se pudo guardar los cambios del entreno');
      return Promise.reject(error);
    }
  },
  deleteSessions:function(ids){
    if(S.kind !== 'db'){ Store.saveLocal(); return Promise.resolve(); }
    return ids.reduce(function(p, id){ return p.then(function(){ return Store.col.doc(id).delete(); }); }, Promise.resolve())
      .catch(function(){ toast('No se pudo borrar'); });
  },
  replaceAll:function(profile, sessions){
    if(S.kind !== 'db'){
      try { localStorage.setItem(LK, JSON.stringify({profile:profile, sessions:sessions})); }
      catch(e){ return Promise.reject(e); }
      S.profile = profile; S.sessions = sessions;
      return Promise.resolve();
    }
    var incomingIds = {};
    sessions.forEach(function(session){ incomingIds[session.id] = true; });
    var oldIds = S.sessions.map(function(session){ return session.id; }).filter(function(id){ return !incomingIds[id]; });
    profDirty = false; clearTimeout(profTimer);
    return sessions.reduce(function(p, session){
      return p.then(function(){ return Store.col.doc(session.id).set(clone(session)); });
    }, Promise.resolve()).then(function(){
      return Store.ref.set(clone(profile));
    }).then(function(){
      return oldIds.reduce(function(p, id){
        return p.then(function(){ return Store.col.doc(id).delete(); });
      }, Promise.resolve());
    }).then(function(){
      S.profile = profile; S.sessions = sessions;
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
    return ['right','left'].every(function(side){ return num(sides[side].w) > 0 && num(sides[side].r) > 0; });
  }
  return num(row.w) > 0 && num(row.r) > 0;
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
  var a = analyze(ex, last.sets, prev ? prev.sets : null, S.profile.settings);
  if(!a) return {status:'nuevo'};
  a.last = last;
  return a;
}
function e1rm(set){
  var tr = S.profile.settings.targetRir;
  return set.w * (1 + (set.r + (set.rir === null || set.rir === undefined ? tr : set.rir)) / 30);
}
function estimatedEx1rm(ex, sets){
  var working = sets.filter(function(s){ return countsForProgress(s) && s.w > 0 && s.r > 0; });
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
      entry.sets.filter(function(set){ return countsForProgress(set) && Number(set.w) > 0 && Number(set.r) > 0; }).forEach(function(set){
        var weight = Number(set.w), reps = Number(set.r);
        if(!records.weight || weight > records.weight.value) records.weight = {value:weight, date:session.date};
        if(!records.reps || reps > records.reps.value) records.reps = {value:reps, date:session.date};
      });
      var estimated = estimatedEx1rm(ex, entry.sets);
      if(estimated !== null && (!records.estimated || estimated > records.estimated.value)) records.estimated = {value:estimated, date:session.date};
    });
  });
  return records;
}
function isObject(value){ return value !== null && typeof value === 'object' && !Array.isArray(value); }
function validBackup(data){
  if(!isObject(data) || !isObject(data.profile) || !Array.isArray(data.sessions)) return false;
  var profile = data.profile;
  if((profile.settings !== undefined && !isObject(profile.settings)) || !isObject(profile.exercises || {}) ||
    !isObject(profile.routines || {}) || !isObject(profile.programs || {})) return false;
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
      (item.muscle === undefined || Object.prototype.hasOwnProperty.call(MUSCLES, item.muscle));
  };
  var exerciseIds = Object.keys(profile.exercises || {});
  for(var i=0;i<exerciseIds.length;i++){
    var ex = profile.exercises[exerciseIds[i]];
    if(!isObject(ex) || typeof ex.name !== 'string' || !validNumber(ex.sets) || !validNumber(ex.min) || !validNumber(ex.max) || !validNumber(ex.inc) ||
      (ex.warmupSets !== undefined && !validNumber(ex.warmupSets)) || !validWarmupConfig(ex)) return false;
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
            (set.type === undefined || Object.prototype.hasOwnProperty.call(SET_TYPES, set.type));
        });
    });
  });
}
function downloadBackup(){
  var payload = JSON.stringify({format:'sobrecarga-backup', version:1, profile:S.profile, sessions:S.sessions}, null, 2);
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
  Store.replaceAll(normProfile(data.profile), data.sessions).then(function(){
    S.draft = blankDraft(); saveDraft(); S.restEndsAt = null; saveRestEnd();
    S.pendingImport = null; S.confirm = null; S.justSaved = null;
    render(); toast('Respaldo restaurado');
  }).catch(function(){ toast('No se pudo restaurar el respaldo'); });
}
function csvCell(value){
  var text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
function downloadSessionsCsv(){
  var rows = [['fecha','ejercicio','tipo','peso_kg','repeticiones','esfuerzo','serie']];
  S.sessions.slice().sort(function(a,b){ return a.date.localeCompare(b.date) || a.ts-b.ts; }).forEach(function(session){
    session.entries.forEach(function(entry){
      var exercise = exById(entry.exId);
      entry.sets.forEach(function(set, index){
        rows.push([session.date, exercise ? exercise.name : entry.exId, set.type || 'normal', set.w, set.r, set.rir, index+1]);
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
  var records=parseCsv(text), grouped={};
  records.forEach(function(r){
    var date=(r.fecha||r.date||'').trim(), name=(r.ejercicio||r.exercise||'').trim();
    var weight=num(r.peso_kg||r.peso||r.weight), reps=num(r.repeticiones||r.reps);
    if(!validDate(date) || !name || !(weight>0) || !(reps>0)) return;
    var effort=num(r.esfuerzo||r.rir||r.effort);
    if(!grouped[date]) grouped[date]={};
    if(!grouped[date][name]) grouped[date][name]=[];
    grouped[date][name].push({w:weight,r:reps,rir:effort, type:['warmup','normal','drop','failure','restpause'].includes(r.tipo||r.type)?(r.tipo||r.type||'normal'):'normal'});
  });
  var imported=0;
  Object.keys(grouped).forEach(function(date){
    var entries=[];
    Object.keys(grouped[date]).forEach(function(name){
      var exercise=Object.keys(S.profile.exercises).map(function(id){ return S.profile.exercises[id]; }).find(function(e){ return e.name.toLowerCase()===name.toLowerCase(); });
      if(!exercise){ exercise={id:uid('ex'),name:name,sets:3,min:1,max:20,inc:2.5,muscle:'unassigned'}; S.profile.exercises[exercise.id]=exercise; }
      entries.push({exId:exercise.id,sets:grouped[date][name]});
    });
    S.sessions.push({id:uid('ses'),date:date,ts:new Date(date+'T12:00:00').getTime(),startedAt:new Date(date+'T12:00:00').getTime(),finishedAt:new Date(date+'T13:00:00').getTime(),durationMs:3600000,entries:entries,csvImport:true}); imported++;
  });
  if(!imported){ toast('No se encontraron entrenos válidos'); return; }
  Store.saveProfile(); S.sessions.forEach(function(s){ Store.saveSession(s); }); render(); toast(imported+' entreno'+(imported===1?'':'s')+' importado'+(imported===1?'':'s')+' desde CSV');
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
        all.push({w:num(values.w), r:num(values.r), rir:effort, type:setType(r), side:side, pair:i});
      });
    } else {
      var rir = String(r.rir).trim() === '' ? null : num(r.rir);
      all.push({w:num(r.w), r:num(r.r), rir:rir, type:setType(r)});
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
  S.draft.entries.push({exId:exId, rows:rows});
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
  var a = analyze(ex, sets, last ? last.sets : null, S.profile.settings);
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
    var normalSets = sets.filter(function(set){ return setType(set) === 'normal' && set.w > 0 && set.r > 0; });
    return normalSets[workIndex] || null;
  }
  var pairs = {};
  sets.forEach(function(set){
    if(set.pair === undefined || setType(set) !== 'normal' || !(set.w > 0 && set.r > 0)) return;
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
    } else rowsToSets(en.rows, false).forEach(function(s){ if(countsForProgress(s) && s.w > 0 && s.r > 0) c++; });
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
    '<p class="muted small">Última vez, ' + dFmt(p.last.date) + ': ' + esc(setsText(p.last.sets)) + '</p>' + barHtml(p, ex) +
    '<p class="small">' + esc(p.detail) + '</p>' + plan + '</div>';
}
function entryHtml(en, ei){
  if(!exById(en.exId)) return '';
  var ex = effEx(en);
  var mode = S.profile.settings.mode;
  var effLab = mode === 'rpe' ? 'RPE' : 'RIR';
  var p = planFor(ex);
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
      (type === 'normal' ? previousReferenceHtml(en.exId, wi, ex.unilateral) : '') + '</div>';
  }).join('');
  var head = ex.unilateral
    ? '<div class="set head unilateral-head"><span>#</span><span class="side-type-head">Lado · kg · reps · ' + effLab + '</span></div>'
    : '<div class="set head"><span>#</span><span>kg</span><span>Reps</span><span>' + effLab + '</span><span></span><span class="set-type-head">Tipo de serie</span></div>';
  var orderControls = S.draft.entries.length > 1
    ? '<div class="workout-card-tools"><button class="mini" data-act="move-exercise" data-ei="' + ei + '" data-direction="-1"' + (ei === 0 ? ' disabled' : '') + ' aria-label="Mover ' + esc(ex.name) + ' arriba" title="Mover arriba">↑</button>' +
      '<button class="mini" data-act="move-exercise" data-ei="' + ei + '" data-direction="1"' + (ei === S.draft.entries.length - 1 ? ' disabled' : '') + ' aria-label="Mover ' + esc(ex.name) + ' abajo" title="Mover abajo">↓</button></div>'
    : '';
  return '<section class="card" data-ei="' + ei + '">' +
    '<div class="card-head workout-card-head"><h3>' + esc(ex.name) + '</h3><div class="workout-card-actions">' + orderControls + '<button class="icon" data-act="rm-ex" data-ei="' + ei + '" aria-label="Quitar ' + esc(ex.name) + ' de hoy">×</button></div></div>' +
    goalHtml(ex) +
    '<div class="sets">' + head + rows + '</div>' +
    '<p class="hint">' + (ex.unilateral
      ? 'Cada ronda registra ambos lados. Cuenta como una serie cuando completaste derecho e izquierdo; la progresión espera que ambos lados cumplan el objetivo. '
      : 'Solo las series normales cuentan para la sobrecarga. ') +
      'Registra cada tramo de drop set o rest-pause en una fila aparte; todos los tipos quedan en el historial.</p>' +
    '<div class="row"><button class="btn ghost sm" data-act="add-set" data-ei="' + ei + '">+ Serie</button>' +
    '<button class="btn ghost sm" data-act="toggle-cfg" data-ei="' + ei + '" aria-expanded="' + (S.openCfg === en.exId ? 'true' : 'false') + '">Ajustar series, reps y salto</button></div>' +
    (S.openCfg === en.exId ? cfgPanel(en, ei) : '') +
    '<div class="live" id="live-' + ei + '">' + liveHtml(ei) + '</div></section>';
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
  return '<div class="card"><p class="sec-title">Cargando tu registro</p><div class="bar"><i style="width:35%"></i></div></div>';
}
function savedHtml(){
  if(!S.justSaved) return '';
  var session = S.justSaved.session, stats = sessionStats(session);
  var exercises = session.entries.map(function(entry){
    var ex = exById(entry.exId);
    if(!ex) return '';
    var effective = entry.unilateral
      ? Object.keys(entry.sets.reduce(function(pairs, set){
          if(set.pair !== undefined && countsForProgress(set) && set.w > 0 && set.r > 0){
            if(!pairs[set.pair]) pairs[set.pair] = {};
            pairs[set.pair][set.side] = true;
          }
          return pairs;
        }, {})).filter(function(pair){
          var sides = entry.sets.filter(function(set){ return String(set.pair) === pair && countsForProgress(set) && set.w > 0 && set.r > 0; });
          return sides.some(function(set){ return set.side === 'right'; }) && sides.some(function(set){ return set.side === 'left'; });
        }).length
      : entry.sets.filter(function(set){ return countsForProgress(set) && set.w > 0 && set.r > 0; }).length;
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
      if(setType(set) !== 'warmup' && set.w > 0 && set.r > 0) stats.reps += set.r;
    });
    stats.volume += entryVolume(entry);
  });
  return stats;
}
function entryVolume(entry){
  if(!entry.unilateral){
    return entry.sets.reduce(function(total, set){
      return total + (setType(set) !== 'warmup' && set.w > 0 && set.r > 0 ? set.w * set.r : 0);
    }, 0);
  }
  var pairs = {}, volume = 0;
  entry.sets.forEach(function(set){
    var type = setType(set);
    if(type === 'warmup') return;
    if(type !== 'normal'){
      if(set.w > 0 && set.r > 0) volume += set.w * set.r;
      return;
    }
    if(set.pair === undefined) return;
    var key = String(set.pair);
    if(!pairs[key]) pairs[key] = {};
    pairs[key][set.side] = set;
  });
  return Object.keys(pairs).reduce(function(total, key){
    var pair = pairs[key], right = pair.right, left = pair.left;
    return right && left && right.w > 0 && right.r > 0 && left.w > 0 && left.r > 0
      ? total + right.w * right.r + left.w * left.r
      : total;
  }, volume);
}
function entryEffectiveSets(entry){
  if(!entry.unilateral) return entry.sets.filter(function(set){ return countsForProgress(set) && set.w > 0 && set.r > 0; }).length;
  var pairs = {};
  entry.sets.forEach(function(set){
    if(set.pair === undefined || !countsForProgress(set) || !(set.w > 0 && set.r > 0)) return;
    var key = String(set.pair);
    if(!pairs[key]) pairs[key] = {};
    pairs[key][set.side] = true;
  });
  return Object.keys(pairs).filter(function(key){ return pairs[key].right && pairs[key].left; }).length;
}
function weeklyMuscleSummaryHtml(week){
  var counts = {};
  week.forEach(function(session){
    session.entries.forEach(function(entry){
      var count = entryEffectiveSets(entry);
      if(!count) return;
      var exercise = exById(entry.exId), id = muscleId(exercise || {});
      counts[id] = (counts[id] || 0) + count;
    });
  });
  var groups = Object.keys(counts).sort(function(a,b){ return counts[b] - counts[a] || MUSCLES[a].localeCompare(MUSCLES[b], 'es'); });
  var content = groups.length
    ? '<div class="weekly-muscle-list">' + groups.map(function(id){
        return '<div class="weekly-muscle-row"><span>' + esc(MUSCLES[id]) + '</span><strong>' + counts[id] + '</strong></div>';
      }).join('') + '</div>'
    : '<p class="home-weekly-note">Aún no hay series efectivas registradas esta semana.</p>';
  return '<section class="weekly-muscles"><div><h3>Series efectivas por músculo</h3><p>Cuenta series normales completas; no incluye aproximaciones ni técnicas especiales.</p></div>' +
    content + (counts.unassigned ? '<p class="home-weekly-note">Asigna un grupo muscular desde Biblioteca → Ejercicios para organizar «Sin asignar».</p>' : '') + '</section>';
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
    var rows = entry.sets.map(function(set, setIndex){
      var side = set.side === 'right' ? ' · Der.' : (set.side === 'left' ? ' · Izq.' : '');
      var effort = set.rir === null || set.rir === undefined ? '' : fmt(S.profile.settings.mode === 'rpe' ? 10 - set.rir : set.rir);
      var input = function(field, label, value, mode){
        return '<label class="field session-set-field"><span class="lab">' + label + '</span><input class="in" data-session-edit="' + field + '" data-entry="' + entryIndex + '" data-set="' + setIndex + '" inputmode="' + mode + '" value="' + esc(value === null || value === undefined ? '' : value) + '"' + (edit.saving ? ' disabled' : '') + '></label>';
      };
      var options = Object.keys(SET_TYPES).map(function(key){
        return '<option value="' + key + '"' + (setType(set) === key ? ' selected' : '') + '>' + SET_TYPES[key] + '</option>';
      }).join('');
      return '<div class="session-set-edit"><strong>Serie ' + (set.pair !== undefined ? set.pair + 1 : setIndex + 1) + esc(side) + '</strong>' +
        input('weight', 'Kg', set.w, 'decimal') + input('reps', 'Reps', set.r, 'numeric') + input('effort', S.profile.settings.mode === 'rpe' ? 'RPE' : 'RIR', effort, 'decimal') +
        '<select class="txt session-set-type" data-session-edit="type" data-entry="' + entryIndex + '" data-set="' + setIndex + '" aria-label="Tipo de serie"' + (edit.saving ? ' disabled' : '') + '>' + options + '</select></div>';
    }).join('');
    return '<div class="session-entry-edit"><p class="sec-title">' + esc(exercise) + '</p>' + rows + '</div>';
  }).join('');
  return '<section class="card"><p class="sec-title">Editar entrenamiento</p>' +
    '<div class="fields"><div class="field"><label class="lab" for="session-edit-date">Día del entrenamiento</label><input class="txt" id="session-edit-date" data-session-meta="date" type="date" required value="' + esc(date) + '"' + (edit.saving ? ' disabled' : '') + '></div>' +
    '<div class="field"><label class="lab" for="session-edit-hours">Horas</label><input class="txt" id="session-edit-hours" data-session-meta="hours" type="number" min="0" max="999" step="1" inputmode="numeric" required value="' + esc(editHours) + '"' + (edit.saving ? ' disabled' : '') + '></div>' +
    '<div class="field"><label class="lab" for="session-edit-minutes">Minutos</label><input class="txt" id="session-edit-minutes" data-session-meta="minutes" type="number" min="0" max="59" step="1" inputmode="numeric" required value="' + esc(editMinutes) + '"' + (edit.saving ? ' disabled' : '') + '></div></div>' +
    '<p class="small muted">La duración se guarda con precisión de minutos. Corrige aquí peso, reps o esfuerzo de cada serie; también puedes cambiar el tipo. La fecha corregida actualiza el resumen semanal.</p>' +
    setsHtml +
    '<div class="row"><button class="btn sm" data-act="session-edit-save"' + (edit.saving ? ' disabled' : '') + '>Guardar cambios</button><button class="btn ghost sm" data-act="session-edit-cancel"' + (edit.saving ? ' disabled' : '') + '>Cancelar</button></div></section>';
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
  var validSets = edit.session.entries.every(function(entry){
    return entry.sets.every(function(set){
      return Number.isFinite(set.w) && set.w > 0 && Number.isInteger(set.r) && set.r > 0 &&
        (set.rir === null || set.rir === undefined || (Number.isFinite(set.rir) && set.rir >= 0 && set.rir <= 10));
    });
  });
  if(!validSets){ toast('Cada serie debe tener peso y reps válidos; el esfuerzo debe estar entre 0 y 10'); return; }
  var durationMs = (hours * 60 + minutes) * 60000;
  var updated = Object.assign({}, edit.session, {date:date, durationMs:durationMs});
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
  Store.updateSession(updated).then(function(){
    var index = S.sessions.findIndex(function(item){ return item.id === updated.id; });
    if(index >= 0) S.sessions[index] = updated;
    S.sessionEdit = null; render(); toast('Entrenamiento actualizado');
  }).catch(function(){
    if(S.sessionEdit && S.sessionEdit.id === updated.id) S.sessionEdit.saving = false;
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
  out += '<button class="btn home-start" data-act="start"><span aria-hidden="true">▶</span> Nuevo entrenamiento</button></section>';
  if(!latest && !routineList().length) out += '<section class="card home-first"><p>Registra ejercicios, series, peso y esfuerzo. Te ayudaremos a seguir tu progresión.</p><div class="row"><button class="btn ghost sm" data-act="demo-load">Probar con datos de ejemplo</button><button class="btn ghost sm" data-act="library-open-section" data-section="rutinas">Crear rutina</button></div></section>';
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
      out += '<div class="row"><button class="btn" id="finish" data-act="finish"' + (done && !S.finishSaving ? '' : ' disabled') + '>' + (S.finishSaving ? 'Guardando…' : 'Terminar entreno') + '</button>' +
        (S.confirm === 'discard'
          ? '<button class="btn danger" data-act="discard-ok">Confirmar descarte</button>'
          : '<button class="btn ghost" data-act="discard">Descartar</button>') + '</div>';
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
function chartSvg(pts){
  if(pts.length < 2) return '<p class="muted small">Con dos entrenos aparece la curva de tu 1RM estimado.</p>';
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
  g += '<text class="cv" x="' + X(pts.length-1).toFixed(1) + '" y="' + (Y(lp.y) - 10).toFixed(1) + '" text-anchor="end">' + fmt1(lp.y) + ' kg</text>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px" role="img" aria-label="1RM estimado por entreno">' + g + '</svg>';
}
function exDetail(ex){
  var hist = entriesFor(ex.id);
  var records = personalRecords(ex);
  var warmCfg = warmupSettings(ex);
  var recordHtml = records.weight ? '<div class="record-grid">' +
    '<div><span>Mayor peso</span><strong>' + fmt(records.weight.value) + ' kg</strong><small>' + esc(dFmt(records.weight.date)) + '</small></div>' +
    '<div><span>Más reps en una serie</span><strong>' + records.reps.value + ' reps</strong><small>' + esc(dFmt(records.reps.date)) + '</small></div>' +
    '<div><span>Mejor serie estimada</span><strong>' + fmt1(records.estimated.value) + ' kg</strong><small>' + esc(dFmt(records.estimated.date)) + '</small></div></div>' : '<p class="small muted">Los récords aparecerán después de registrar series normales.</p>';
  var pts = hist.map(function(h){
    var estimated = estimatedEx1rm(ex, h.sets);
    return estimated !== null ? {label:dFmt(h.date), y:estimated} : null;
  }).filter(Boolean);
  var rows = hist.slice(-5).reverse().map(function(h){
    return '<tr><td class="num">' + esc(dFmt(h.date)) + '</td><td>' + esc(setsText(h.sets, true)) + '</td></tr>';
  }).join('');
  var f = function(key, label, val, step){
    return '<div class="field"><label class="lab" for="cfg-' + key + '">' + label + '</label><input id="cfg-' + key + '" class="txt" inputmode="decimal" data-cfg="' + key + '" data-id="' + esc(ex.id) + '" value="' + esc(String(val).replace('.', ',')) + '"></div>';
  };
  return '<div class="list" style="gap:14px"><div><p class="sec-title" style="margin-bottom:6px">Récords personales</p>' + recordHtml + '</div><div><p class="sec-title" style="margin-bottom:6px">1RM estimado</p>' + chartSvg(pts) +
    '<p class="muted small">Peso × (1 + (reps + RIR) ÷ 30), ' + (ex.unilateral ? 'mejor estimado del lado más débil por entreno.' : 'mejor serie de cada entreno.') + '</p></div>' +
    (rows ? '<div class="scroll-x"><table class="table"><thead><tr><th>Fecha</th><th>Series</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
    '<div><p class="sec-title" style="margin-bottom:8px">Reglas de este ejercicio</p><div class="fields">' +
      f('sets', 'Series', ex.sets) + f('warmupSets', 'Series de aproximación', Number(ex.warmupSets) || 0) + f('min', 'Reps mín.', ex.min) + f('max', 'Reps máx.', ex.max) + f('inc', 'Salto de progresión (kg)', ex.inc) + f('loadStep', 'Peso disponible cada (kg)', exerciseLoadStep(ex)) + f('warmupStep', 'Incremento para redondear (kg)', warmCfg.warmupStep) +
      '<div class="field"><label class="lab" for="cfg-warmupMode">Peso de aproximación</label><select id="cfg-warmupMode" class="txt" data-cfg="warmupMode" data-id="' + esc(ex.id) + '"><option value="auto"' + (warmCfg.warmupMode === 'auto' ? ' selected' : '') + '>Calcular automáticamente</option><option value="manual"' + (warmCfg.warmupMode === 'manual' ? ' selected' : '') + '>Anotar manualmente</option></select></div>' +
      '</div><div class="field"><label class="lab" for="cfg-muscle">Grupo muscular principal</label><select id="cfg-muscle" class="txt" data-cfg="muscle" data-id="' + esc(ex.id) + '">' + muscleOptions(ex.muscle) + '</select></div>' + ((Number(ex.warmupSets) || 0) ? '<div class="field"><span class="lab">Porcentaje de cada aproximación</span><div class="efforts">' + warmCfg.warmupPercents.map(function(percent, index){
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
  var ss = S.sessions.slice().sort(function(a,b){ return a.date === b.date ? (b.ts||0)-(a.ts||0) : (a.date < b.date ? 1 : -1); });
  var out = '<div class="head-row"><h2>Historial</h2><span class="num muted">' + ss.length + ' entreno' + (ss.length === 1 ? '' : 's') + '</span></div>';
  if(!ss.length) return out + '<div class="card"><p>Cuando termines tu primer entreno aparecerá aquí.</p></div>';
  return out + '<div class="list">' + ss.map(function(s){
    var total = 0; s.entries.forEach(function(e){
      if(e.unilateral) total += Object.keys(e.sets.reduce(function(pairs, set){ if(set.pair !== undefined) pairs[set.pair] = true; return pairs; }, {})).length;
      else total += e.sets.length;
    });
    var body = s.entries.map(function(e){
      return '<div><strong>' + esc(exName(e.exId)) + '</strong><div class="small muted">' + esc(setsText(e.sets, true)) + '</div></div>';
    }).join('');
    var editing = S.sessionEdit && S.sessionEdit.id === s.id;
    var duration = Number(s.durationMs) > 0 ? humanDuration(s.durationMs) : 'Sin duración';
    return '<section class="card"><div class="card-head"><div><h3>' + esc(dFmt(s.date, {weekday:'long', day:'numeric', month:'long'})) + '</h3>' +
      '<p class="small muted">' + s.entries.length + ' ejercicio' + (s.entries.length === 1 ? '' : 's') + ' · ' + total + ' series · ' + duration + (s.routineName ? ' · ' + esc(s.routineName) : '') + (s.demo ? ' · ejemplo' : '') + '</p></div></div>' +
      '<div class="list" style="gap:8px">' + body + '</div>' +
      (editing ? sessionEditorHtml(s) : '<div class="row"><button class="btn ghost sm" data-act="session-edit" data-id="' + esc(s.id) + '">Editar fecha y duración</button>' +
        (S.confirm === 'sess:' + s.id
          ? '<button class="btn danger sm" data-act="del-sess-ok" data-id="' + esc(s.id) + '">Confirmar: borrar entreno</button>'
          : '<button class="btn ghost sm" data-act="del-sess" data-id="' + esc(s.id) + '">Borrar</button>') + '</div>') + '</section>';
  }).join('') + '</div>';
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
  var percent=Math.max(0,Math.min(100,Math.round((current-start)/(target-start)*100)));
  if(current>=target) percent=100;
  return {current:current,percent:percent};
}
function goalsHtml(){
  var goals=Object.keys(S.profile.goals||{}).map(function(id){ return S.profile.goals[id]; });
  var cards=goals.map(function(goal){
    var progress=goalProgress(goal); var unit=goal.unit||'';
    return '<div class="goal-card"><div class="goal-row"><strong>'+esc(goal.name)+'</strong><button class="mini" data-act="goal-delete" data-id="'+esc(goal.id)+'" aria-label="Eliminar objetivo">×</button></div><div class="goal-row"><span class="small muted">'+fmt(progress.current)+' '+esc(unit)+' de '+fmt(goal.target)+' '+esc(unit)+' · '+progress.percent+'%</span></div><div class="progress" role="progressbar" aria-label="Progreso de '+esc(goal.name)+'" aria-valuenow="'+progress.percent+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+progress.percent+'%"></span></div></div>';
  }).join('');
  var form=S.goalNew ? '<div class="goal-form"><div class="fields"><div class="field"><label class="lab" for="goal-name">Nombre</label><input id="goal-name" class="txt" maxlength="60" placeholder="Ej. Alcanzar 80 kg en press banca"></div><div class="field"><label class="lab" for="goal-type">Tipo</label><select id="goal-type" class="txt"><option value="exercise-weight">Peso máximo en ejercicio</option><option value="sessions">Entrenos totales</option><option value="weekly">Entrenos en la última semana</option><option value="custom">Objetivo personalizado</option></select></div><div class="field"><label class="lab" for="goal-target">Meta</label><input id="goal-target" class="txt" inputmode="decimal"></div><div class="field"><label class="lab" for="goal-unit">Unidad</label><input id="goal-unit" class="txt" placeholder="kg, entrenos..."></div></div><div class="row"><button class="btn sm" data-act="goal-save">Guardar objetivo</button><button class="btn ghost sm" data-act="goal-cancel">Cancelar</button></div></div>' : '';
  return '<section class="card"><p class="sec-title">Objetivos</p>'+ (cards||'<p class="small muted">Todavía no tienes objetivos.</p>') + form + (S.goalNew?'':'<button class="btn ghost sm" data-act="goal-new">Añadir objetivo</button>')+'</section>';
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
  out += '<section class="card"><p class="sec-title">Tus datos</p><p class="small">' +
    (S.kind === 'db' ? 'Se guardan en tu cuenta y solo tú los ves. Los abres desde cualquier dispositivo.' : 'Se guardan solo en este navegador. Abre la app con tu sesión de Claude para tenerlos en todos tus dispositivos.') + '</p><div class="row">' +
    '<button class="btn ghost sm" data-act="auto-restore">Restaurar última copia automática</button>' +
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
  var d = buildDemo();
  Object.keys(d.ex).forEach(function(k){ S.profile.exercises[k] = d.ex[k]; });
  Object.keys(d.routines).forEach(function(k){ S.profile.routines[k] = d.routines[k]; });
  d.sessions.forEach(function(s){ S.sessions = S.sessions.filter(function(x){ return x.id !== s.id; }); S.sessions.push(s); });
  Store.saveProfile();
  if(S.kind === 'db'){ d.sessions.reduce(function(p, s){ return p.then(function(){ return Store.saveSession(s); }); }, Promise.resolve()); }
  else Store.saveLocal();
  S.tab = 'hoy'; render();
  toast('Datos de ejemplo cargados. Quítalos cuando quieras en Ajustes.');
}
function clearDemo(){
  var ids = S.sessions.filter(function(s){ return s.demo; }).map(function(s){ return s.id; });
  S.sessions = S.sessions.filter(function(s){ return !s.demo; });
  Object.keys(S.profile.exercises).forEach(function(k){
    var e = S.profile.exercises[k];
    if(e.demo && !S.sessions.some(function(s){ return s.entries.some(function(x){ return x.exId === k; }); })) delete S.profile.exercises[k];
  });
  Object.keys(S.profile.routines).forEach(function(k){ if(S.profile.routines[k].demo) delete S.profile.routines[k]; });
  S.draft.entries = S.draft.entries.filter(function(en){ return !!exById(en.exId); }); saveDraft();
  Store.saveProfile(); Store.deleteSessions(ids);
  render(); toast('Datos de ejemplo eliminados');
}

/* ---------- render ---------- */
function render(){
  var y = window.scrollY;
  var views = {hoy:viewHoy, rutinas:viewRut, ejercicios:viewRut, historial:viewHist, ajustes:viewSet};
  $('#view').innerHTML = S.ready ? (views[S.tab] || viewHoy)() : loadingView();
  document.querySelectorAll('.tab').forEach(function(b){
    if(b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#today').textContent = dFmt(iso(new Date()), {weekday:'long', day:'numeric', month:'short'});
  window.scrollTo(0, y);
}
function refreshLive(ei){
  var el = $('#live-' + ei); if(el) el.innerHTML = liveHtml(ei);
  var done = workingDone();
  var c = $('#done-count'); if(c) c.textContent = done + ' serie' + (done === 1 ? '' : 's') + ' efectiva' + (done === 1 ? '' : 's');
  var f = $('#finish'); if(f) f.disabled = !done;
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
    entries.push({exId:it.exId, cfg:cfg, routineItemIndex:index, routineCfg:clone(cfg), rows:rows});
  });
  if(!entries.length){ toast(skipped ? 'La rutina solo tiene ejercicios archivados' : 'La rutina no tiene ejercicios'); return; }
  S.draft = {date:iso(new Date()), startedAt:Date.now(), routineId:id, entries:entries}; saveDraft();
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
    var sets = rowsToSets(en.rows, ex.unilateral).filter(function(s){ return s.w > 0 && s.r > 0; })
      .map(function(s){
        var set = {w:s.w, r:s.r, rir:s.rir, type:setType(s)};
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
    case 'tab': S.tab = t.dataset.tab; if(S.tab === 'ejercicios') S.librarySection = 'ejercicios'; S.confirm = null; try { localStorage.setItem(TK, S.tab); } catch(e){} render(); window.scrollTo(0, 0); break;
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
    case 'rm-ex':
      var removedEntry = S.draft.entries[ei], entryIndex = ei, draftAtRemoval = S.draft;
      if(!removedEntry) break;
      S.draft.entries.splice(ei, 1); saveDraft(); render();
      toast('Ejercicio quitado del entreno', 'Deshacer', function(){
        if(S.draft !== draftAtRemoval || S.draft.entries.indexOf(removedEntry) >= 0) return;
        S.draft.entries.splice(Math.min(entryIndex, S.draft.entries.length), 0, removedEntry);
        saveDraft(); render();
      });
      break;
    case 'toggle-cfg': var xid = S.draft.entries[ei].exId; S.openCfg = S.openCfg === xid ? null : xid; render(); break;
    case 'add-set':
      var rows = S.draft.entries[ei].rows, lr = rows[rows.length-1];
      var entryEx = effEx(S.draft.entries[ei]);
      rows.push(nextRow(lr, entryEx.unilateral)); saveDraft(); render(); break;
    case 'rm-set':
      var removeFrom = S.draft.entries[ei], removedRow = removeFrom && removeFrom.rows[ri], rowIndex = ri, draftForRow = S.draft;
      if(!removedRow) break;
      removeFrom.rows.splice(ri, 1); saveDraft(); render();
      toast('Serie quitada del entreno', 'Deshacer', function(){
        if(S.draft !== draftForRow || S.draft.entries.indexOf(removeFrom) < 0 || removeFrom.rows.indexOf(removedRow) >= 0) return;
        removeFrom.rows.splice(Math.min(rowIndex, removeFrom.rows.length), 0, removedRow);
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
      else S.restEndsAt = Date.now() + ((Number(S.profile.settings.restSeconds) || 90) + 30) * 1000;
      saveRestEnd(); updateRestTimer(); render(); break;
    case 'rest-stop': S.restEndsAt = null; saveRestEnd(); render(); break;
    case 'discard': S.confirm = 'discard'; render(); break;
    case 'discard-ok': S.draft = blankDraft(); saveDraft(); S.restEndsAt = null; saveRestEnd(); S.confirm = null; render(); break;
    case 'dismiss-saved': S.justSaved = null; render(); break;
    case 'toggle-ex': S.openEx = S.openEx === t.dataset.id ? null : t.dataset.id; S.confirm = null; render(); break;
    case 'archive': S.confirm = 'arch:' + t.dataset.id; render(); break;
    case 'archive-ok': S.profile.exercises[t.dataset.id].archived = true; S.draft.entries = S.draft.entries.filter(function(en){ return en.exId !== t.dataset.id; }); saveDraft(); Store.saveProfile(); S.confirm = null; S.openEx = null; render(); break;
    case 'del-sess': S.confirm = 'sess:' + t.dataset.id; render(); break;
    case 'del-sess-ok': S.sessions = S.sessions.filter(function(s){ return s.id !== t.dataset.id; }); Store.deleteSessions([t.dataset.id]); if(S.sessionEdit && S.sessionEdit.id === t.dataset.id) S.sessionEdit = null; S.confirm = null; render(); toast('Entreno borrado'); break;
    case 'session-edit':
      var editSession = S.sessions.find(function(s){ return s.id === t.dataset.id; });
      if(editSession){
        var editDuration = Math.max(0, Math.floor((Number(editSession.durationMs) || 0) / 60000));
        S.sessionEdit = {id:editSession.id, session:clone(editSession), date:editSession.date, hours:String(Math.floor(editDuration / 60)), minutes:String(editDuration % 60), saving:false};
        S.confirm = null; render();
      }
      break;
    case 'session-edit-save': saveSessionEdit(); break;
    case 'session-edit-cancel': S.sessionEdit = null; render(); break;
    case 'set-mode': st.mode = t.dataset.mode; Store.saveProfile(); render(); break;
    case 'tr-minus': st.targetRir = Math.max(0, st.targetRir - 1); Store.saveProfile(); render(); break;
    case 'tr-plus': st.targetRir = Math.min(4, st.targetRir + 1); Store.saveProfile(); render(); break;
    case 'goal-new': S.goalNew=true; render(); break;
    case 'goal-cancel': S.goalNew=false; render(); break;
    case 'goal-save':
      var goalName=$('#goal-name')&&$('#goal-name').value.trim(), goalTarget=$('#goal-target')?num($('#goal-target').value):null;
      if(!goalName || !(goalTarget>0)){ toast('Completa el nombre y una meta válida'); break; }
      var goal={id:uid('goal'),name:goalName,type:$('#goal-type').value,target:goalTarget,start:0,current:0,unit:$('#goal-unit').value.trim()};
      S.profile.goals=S.profile.goals||{}; S.profile.goals[goal.id]=goal; S.goalNew=false; Store.saveProfile(); render(); toast('Objetivo añadido'); break;
    case 'goal-delete': delete S.profile.goals[t.dataset.id]; Store.saveProfile(); render(); toast('Objetivo eliminado'); break;
    case 'demo-load': loadDemo(); break;
    case 'demo-clear': clearDemo(); break;
    case 'wipe': S.confirm = 'wipe'; render(); break;
    case 'wipe-ok':
      var ids = S.sessions.map(function(s){ return s.id; });
      S.sessions = []; S.profile.exercises = {}; S.profile.routines = {}; S.profile.programs = {}; S.profile.goals = {}; S.redit = null; S.pedit = null; S.draft = blankDraft(); saveDraft();
      S.restEndsAt = null; saveRestEnd(); Store.saveProfile(); Store.deleteSessions(ids); S.confirm = null; S.justSaved = null; render(); toast('Datos borrados'); break;
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
  if(!rowComplete(row, effEx(S.draft.entries[ei]).unilateral)) delete row.restTriggered;
  saveDraft(); refreshLive(ei);
}
function onChange(ev){
  var t = ev.target;
  if(t.dataset.sessionEdit === 'type'){
    var edit = S.sessionEdit, entry = edit && edit.session.entries[+t.dataset.entry], set = entry && entry.sets[+t.dataset.set];
    if(!set || !Object.prototype.hasOwnProperty.call(SET_TYPES, t.value)) return;
    set.type = t.value;
    if(entry.unilateral && set.pair !== undefined){
      entry.sets.forEach(function(other){
        if(other.pair === set.pair) other.type = t.value;
      });
    }
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
    csvReader.onload = function(){ importSessionsCsv(String(csvReader.result)); t.value=''; };
    csvReader.onerror = function(){ toast('No se pudo leer el CSV'); t.value=''; };
    csvReader.readAsText(csvFile); return;
  }
  if(t.id === 'backup-file'){
    var file = t.files && t.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var data = JSON.parse(String(reader.result));
        if(!validBackup(data)) throw new Error('invalid backup');
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
    var autoEntry = S.draft.entries[+t.dataset.ei], autoRow = autoEntry && autoEntry.rows[+t.dataset.ri];
    var autoEx = autoEntry && effEx(autoEntry);
    if(autoRow && autoEx && autoRestEligible(autoRow) && rowComplete(autoRow, autoEx.unilateral) && !autoRow.restTriggered){
      autoRow.restTriggered = true;
      var duration = restSecondsFor(autoRow);
      if(duration){ startRest(duration); saveDraft(); }
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
    setRow.type = t.value; delete setRow.warm; saveDraft(); render(); return;
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
  var key = t.dataset.cfg; if(!key) return;
  var ex = exById(t.dataset.id); if(!ex) return;
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
    ex.muscle = t.value; Store.saveProfile(); render(); return;
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

var AUTO_BACKUP_KEY='sobrecarga:auto-backup:v1';
function createAutoBackup(){
  try { localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({savedAt:Date.now(),profile:S.profile,sessions:S.sessions})); } catch(e){ toast('No se pudo crear la copia automática'); }
}
function restoreAutoBackup(){
  try {
    var backup=JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY));
    if(!backup || !validBackup({format:'sobrecarga-backup',version:1,profile:backup.profile,sessions:backup.sessions})) throw new Error('invalid');
    Store.replaceAll(normProfile(backup.profile),backup.sessions).then(function(){ S.sessions=backup.sessions; S.profile=normProfile(backup.profile); render(); toast('Copia automática restaurada'); }).catch(function(){ toast('No se pudo restaurar la copia automática'); });
  } catch(e){ toast('No hay una copia automática válida'); }
}
function anomalyWarnings(){
  if(!S.ready || !S.draft.entries.length) return;
  var suspicious=[];
  S.draft.entries.forEach(function(entry){ entry.rows&&entry.rows.forEach(function(row){ Object.keys(row.right||{}).forEach(function(){ }); var sets=[row]; if(row.left||row.right){ sets=[]; if(row.left)sets.push(row.left); if(row.right)sets.push(row.right); } sets.forEach(function(set){ if(num(set.w)>500 || num(set.r)>100 || num(set.w)<0 || num(set.r)<0) suspicious.push(true); }); }); });
  if(suspicious.length) toast('Revisa pesos o repeticiones inusuales antes de guardar');
}
window.addEventListener('beforeunload', function(event){ if(S.draft.entries.length && !S.justSaved){ event.preventValue=''; event.returnValue=''; } });

document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
setInterval(updateWorkoutClock, 1000);
setInterval(updateRestTimer, 250);
setInterval(createAutoBackup, 6*60*60*1000);
setInterval(anomalyWarnings, 30000);
createAutoBackup();
var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz = setTimeout(function(){ if(S.ready && S.tab === 'ejercicios' && S.openEx) render(); }, 200); });

render();
Store.init();
})();
