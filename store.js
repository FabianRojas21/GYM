(function(root, factory){
  var store = factory();
  if(typeof module === 'object' && module.exports) module.exports = store;
  else root.SobrecargaStore = store;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function createCloudDataStore(options){
    options=options||{};
    var storage=options.storage, ref=options.ref, col=options.col;
    var localKey=options.localKey||'sobrecarga:data:v1', writeTimeoutMs=Number(options.writeTimeoutMs)||15000;
    var logger=options.logger||console;
    var clone=options.clone||function(value){return JSON.parse(JSON.stringify(value));};
    var stampSession=options.stampSession||function(value){return clone(value);};
    var userId=String(options.userId||'');
    function readNumber(key){
      try { return Number(storage.getItem(key))||0; }
      catch(error){ logger.warn('No se pudo leer el estado de sincronización local',error); return 0; }
    }
    function writeNumber(key,value){
      try { storage.setItem(key,String(value)); }
      catch(error){ logger.warn('No se pudo guardar el estado de sincronización local',error); }
    }
    function migrateLocalDataOnce(localData){
      var migratedKey='sobrecarga:migrated:'+userId, alreadyMigrated=false;
      try { alreadyMigrated=storage.getItem(migratedKey)==='1'; }
      catch(error){ logger.warn('No se pudo comprobar el estado de migración local',error); }
      var migration=Promise.resolve();
      if(!alreadyMigrated && localData && (localData.profile || (localData.sessions && localData.sessions.length))){
        migration=Promise.all([
          ref.get({source:'server'}),
          col.get({source:'server'})
        ]).then(function(remoteData){
          var remoteProfile=remoteData[0], remoteSessions=remoteData[1];
          var migrateSessions=!remoteProfile.exists && remoteSessions.empty;
          var writes=[];
          if(!remoteProfile.exists && localData.profile) writes.push(ref.set(clone(localData.profile)));
          return Promise.all(writes).then(function(){
            if(!migrateSessions) return;
            return (localData.sessions||[]).reduce(function(queue,session){
              return queue.then(function(){
                if(!session||!session.id) return;
                return col.doc(session.id).set(clone(stampSession(session)));
              });
            },Promise.resolve());
          });
        });
      }
      return migration.then(function(){
        if(!alreadyMigrated) writeNumber(migratedKey,1);
      });
    }
    function uploadPendingLocalSessions(localData, remoteSessions){
      var key='sobrecarga:last-cloud-sync:'+userId, lastSync=readNumber(key);
      var remoteById=Object.create(null), pendingById=Object.create(null);
      (remoteSessions||[]).forEach(function(session){if(session&&session.id) remoteById[session.id]=session;});
      ((localData&&localData.sessions)||[]).forEach(function(session){
        if(!session||!session.id) return;
        var changedAt=Number(session.updatedAt)||Number(session.ts)||Number(session.finishedAt)||0;
        if(changedAt<=lastSync) return;
        var remote=remoteById[session.id];
        var remoteChangedAt=remote
          ? Number(remote.updatedAt)||Number(remote.ts)||Number(remote.finishedAt)||0
          : 0;
        if(remote && changedAt<=remoteChangedAt) return;
        var previous=pendingById[session.id];
        if(!previous||changedAt>(Number(previous.updatedAt)||Number(previous.ts)||Number(previous.finishedAt)||0)){
          pendingById[session.id]=session;
        }
      });
      var pending=Object.keys(pendingById).map(function(id){return pendingById[id];});
      var uploaded=[];
      return pending.reduce(function(queue,session){
        return queue.then(function(){
          var stamped=clone(stampSession(session));
          return col.doc(session.id).set(clone(stamped)).then(function(){uploaded.push(stamped);});
        });
      },Promise.resolve()).then(function(){
        writeNumber(key,Date.now());
        return {count:uploaded.length,sessions:uploaded};
      });
    }
    function saveSession(session, profile, sessions){
      var current=Array.isArray(sessions)?sessions:[];
      var next=current.filter(function(item){return item&&item.id!==session.id;}).concat([clone(session)]);
      try { storage.setItem(localKey,JSON.stringify({profile:profile,sessions:next})); }
      catch(error){ return Promise.reject(error); }
      return new Promise(function(resolve){
        var settled=false;
        var timer=setTimeout(function(){
          if(settled) return;
          settled=true;
          logger.warn('La sincronización del entreno tardó demasiado; se conservó en este dispositivo');
          resolve({session:session,synced:false,sessions:next});
        },writeTimeoutMs);
        col.doc(session.id).set(clone(session)).then(function(){
          if(settled) return;
          settled=true; clearTimeout(timer);
          resolve({session:session,synced:true,sessions:next});
        },function(error){
          if(settled) return;
          settled=true; clearTimeout(timer);
          logger.warn('No se pudo subir un entreno; se conservó en este dispositivo',error);
          resolve({session:session,synced:false,sessions:next});
        });
      });
    }
    return {
      migrateLocalDataOnce:migrateLocalDataOnce,
      uploadPendingLocalSessions:uploadPendingLocalSessions,
      saveSession:saveSession
    };
  }

  function storageKeyForUser(baseKey, userId){
    var key=String(baseKey||'');
    return userId ? key+':account:'+encodeURIComponent(String(userId)) : key;
  }

  function mergeCloudSessions(remoteSessions, pendingSessions){
    var merged=Object.create(null);
    (remoteSessions||[]).forEach(function(session){if(session&&session.id) merged[session.id]=session;});
    (pendingSessions||[]).forEach(function(session){
      if(!session||!session.id) return;
      var remote=merged[session.id];
      var localChangedAt=Number(session.updatedAt)||Number(session.ts)||Number(session.finishedAt)||0;
      var remoteChangedAt=remote
        ? Number(remote.updatedAt)||Number(remote.ts)||Number(remote.finishedAt)||0
        : 0;
      if(!remote||localChangedAt>remoteChangedAt) merged[session.id]=session;
    });
    return Object.keys(merged).map(function(id){return merged[id];});
  }

  return {createCloudDataStore:createCloudDataStore,mergeCloudSessions:mergeCloudSessions,storageKeyForUser:storageKeyForUser};
});
