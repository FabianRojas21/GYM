'use strict';

(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaBackup=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  function clone(value){
    if(typeof structuredClone==='function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  function isObject(value){ return value!==null && typeof value==='object' && !Array.isArray(value); }
  function parseNumber(value){
    if(value===null || value===undefined || String(value).trim()==='') return null;
    var raw=String(value).trim();
    if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) return null;
    var number=Number(raw.replace(',','.'));
    return Number.isFinite(number) ? number : null;
  }
  function migrateBackup(data){
    if(!isObject(data)) return null;
    var version=Number(data.version || 1);
    if(!Number.isFinite(version)) return null;
    if(version>1) return null;
    var migrated=clone(data);
    migrated.format=migrated.format || 'sobrecarga-backup';
    migrated.version=1;
    migrated.profile=migrated.profile || {};
    migrated.profile.settings=migrated.profile.settings || {};
    migrated.profile.exercises=migrated.profile.exercises || {};
    migrated.profile.routines=migrated.profile.routines || {};
    migrated.profile.programs=migrated.profile.programs || {};
    migrated.profile.goals=migrated.profile.goals || {};
    migrated.profile.measurements=migrated.profile.measurements || [];
    migrated.sessions=Array.isArray(migrated.sessions) ? migrated.sessions : [];
    migrated.sessions.forEach(function(session){
      session.updatedAt=typeof session.updatedAt==='number' ? session.updatedAt : Number(session.ts || session.finishedAt || Date.now());
      session.updatedBy=session.updatedBy || 'backup';
    });
    return migrated;
  }
  function serializeBackup(data, indent){
    var migrated=migrateBackup(data);
    if(!migrated) throw new Error('Respaldo inválido');
    return JSON.stringify(migrated, null, indent || 0);
  }
  function stampSession(session, writer, now){
    var stamped=clone(session || {});
    stamped.updatedAt=Math.max(Number(stamped.updatedAt)||0, Number(stamped.ts)||0, Number(now)||Date.now());
    stamped.updatedBy=writer;
    return stamped;
  }
  function hasSessionConflict(actual, expectedUpdatedAt, writer, exists){
    if(exists===false) return true;
    if(!actual) return exists===undefined ? true : false;
    var actualUpdatedAt=Number(actual.updatedAt)||0;
    var expected=Number(expectedUpdatedAt)||0;
    return actualUpdatedAt>expected;
  }
  function csvSetType(value){
    var setTypes={normal:true,warmup:true,backoff:true,dropset:true,restpause:true};
    var aliases={drop:'dropset','drop set':'dropset','back-off':'backoff','rest-pause':'restpause','rest pause':'restpause',aproximacion:'warmup','warm-up':'warmup',failure:'normal'};
    var raw=String(value||'normal').trim().toLowerCase();
    raw=raw.normalize ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : raw;
    if(Object.prototype.hasOwnProperty.call(setTypes,raw)) return raw;
    return Object.prototype.hasOwnProperty.call(aliases,raw) ? aliases[raw] : 'normal';
  }
  function csvSessionSignature(entries){
    return JSON.stringify((entries||[]).map(function(entry){
      var sets=(entry.sets||[]);
      return {
        exId:entry.exId,
        unilateral:!!entry.unilateral || sets.some(function(set){ return set.side==='right' || set.side==='left' || set.pair!==undefined; }),
        sets:sets.map(function(set){
          return [set.w,set.r,set.rir===undefined ? null : set.rir,set.type||'normal',set.side||'',set.pair===undefined ? null : set.pair];
        }).sort(function(a,b){ return JSON.stringify(a).localeCompare(JSON.stringify(b)); })
      };
    }).sort(function(a,b){ return JSON.stringify(a).localeCompare(JSON.stringify(b)); }));
  }
  function parseBackup(text){
    try { return migrateBackup(JSON.parse(String(text))); }
    catch(e){ return null; }
  }
  return {migrateBackup:migrateBackup, serializeBackup:serializeBackup, parseBackup:parseBackup, stampSession:stampSession, hasSessionConflict:hasSessionConflict, csvSetType:csvSetType, csvSessionSignature:csvSessionSignature, parseNumber:parseNumber};
});
