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
    return actualUpdatedAt>expected || (actual.updatedAt!==undefined && actual.updatedBy!==writer && actualUpdatedAt===expected);
  }
  function parseBackup(text){
    try { return migrateBackup(JSON.parse(String(text))); }
    catch(e){ return null; }
  }
  return {migrateBackup:migrateBackup, serializeBackup:serializeBackup, parseBackup:parseBackup, stampSession:stampSession, hasSessionConflict:hasSessionConflict};
});
