'use strict';

const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
}=require('@firebase/rules-unit-testing');
const {deleteDoc,doc,getDoc,setDoc,updateDoc}=require('firebase/firestore');

const projectId='demo-sobrecarga-tests';
let environment;

test.before(async()=>{
  environment=await initializeTestEnvironment({
    projectId,
    firestore:{
      host:'127.0.0.1',
      port:8080,
      rules:fs.readFileSync(path.join(__dirname,'firestore.rules'),'utf8')
    }
  });
});

test.after(async()=>{
  if(environment) await environment.cleanup();
});

test.beforeEach(async()=>{
  await environment.clearFirestore();
});

function profile(){
  return {
    v:2,
    settings:{
      mode:'rir',
      targetRir:2,
      loadingTools:[],
      plateProfiles:[]
    },
    exercises:{},
    routines:{},
    programs:{},
    activeProgramId:null,
    activeRoutineId:null,
    goals:{},
    measurements:[],
    recoveryRatings:{}
  };
}

function draft(){
  return {
    date:null,
    startedAt:null,
    routineId:null,
    programId:null,
    entries:[],
    collapsedEntryIds:[],
    updatedAt:Date.now(),
    restEndsAt:null,
    restOwner:null
  };
}

function session(id='session-1'){
  const now=Date.now();
  return {
    id,
    date:'2026-11-07',
    ts:now,
    startedAt:now,
    finishedAt:now,
    durationMs:0,
    entries:[{
      exId:'bench',
      unilateral:false,
      cfg:null,
      sets:[{w:40,r:8,rir:2,type:'normal'}]
    }],
    updatedAt:now,
    updatedBy:'test-device'
  };
}

test('acepta los documentos actuales de perfil, borrador y entreno',async()=>{
  const db=environment.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(db,'users/owner/app/state'),profile()));
  await assertSucceeds(setDoc(doc(db,'users/owner/app/draft'),draft()));
  await assertSucceeds(setDoc(doc(db,'users/owner/sessions/session-1'),session()));
});

test('limita el acceso a la cuenta autenticada y no autoriza rutas desconocidas',async()=>{
  const owner=environment.authenticatedContext('owner').firestore();
  const other=environment.authenticatedContext('other').firestore();
  const anonymous=environment.unauthenticatedContext().firestore();
  const profileRef=doc(owner,'users/owner/app/state');
  await assertSucceeds(setDoc(profileRef,profile()));
  await assertSucceeds(getDoc(profileRef));
  await assertFails(getDoc(doc(other,'users/owner/app/state')));
  await assertFails(setDoc(doc(other,'users/owner/app/state'),profile()));
  await assertFails(getDoc(doc(anonymous,'users/owner/app/state')));
  await assertFails(setDoc(doc(owner,'users/owner/app/unknown'),profile()));
  await assertFails(setDoc(doc(owner,'data/users/owner/profile'),profile()));
});

test('rechaza formas inválidas, campos inesperados y límites excedidos',async()=>{
  const db=environment.authenticatedContext('owner').firestore();
  const profileRef=doc(db,'users/owner/app/state');
  const invalidProfile=Object.assign(profile(),{unexpected:true});
  await assertFails(setDoc(profileRef,invalidProfile));
  await assertFails(setDoc(profileRef,Object.assign(profile(),{v:99})));
  await assertFails(setDoc(profileRef,Object.assign(profile(),{exercises:Object.fromEntries(
    Array.from({length:301},(_,index)=>['exercise-'+index,{}])
  )})));

  const invalidDraft=Object.assign(draft(),{entries:'not-an-array'});
  await assertFails(setDoc(doc(db,'users/owner/app/draft'),invalidDraft));
  const invalidDraftDate=Object.assign(draft(),{date:'2026-04-31'});
  await assertFails(setDoc(doc(db,'users/owner/app/draft'),invalidDraftDate));

  const invalidSession=session();
  invalidSession.date='not-a-date';
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),invalidSession));
  const impossibleDate=session();
  impossibleDate.date='2026-02-31';
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),impossibleDate));
  const nonLeapDay=session();
  nonLeapDay.date='2025-02-29';
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),nonLeapDay));
  const leapDay=session();
  leapDay.date='2024-02-29';
  await assertSucceeds(setDoc(doc(db,'users/owner/sessions/session-1'),leapDay));
  const reversedTimestamps=session();
  reversedTimestamps.finishedAt=reversedTimestamps.startedAt-1;
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),reversedTimestamps));
  await assertFails(setDoc(doc(db,'users/owner/sessions/wrong-id'),session('session-1')));
  const tooManyEntries=session();
  tooManyEntries.entries=Array.from({length:251},()=>({exId:'bench',sets:[]}));
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),tooManyEntries));

  const invalidSet=session();
  invalidSet.entries[0].sets[0].type='unsupported';
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),invalidSet));

  const invalidSetField=session();
  invalidSetField.entries[0].sets[0].unexpected=true;
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),invalidSetField));

  const invalidEntry=session();
  invalidEntry.entries[0].sets[0].r=101;
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),invalidEntry));

  const invalidEntryShape=session();
  invalidEntryShape.entries[0].sets='not-an-array';
  await assertFails(setDoc(doc(db,'users/owner/sessions/session-1'),invalidEntryShape));
});

test('permite editar y borrar documentos propios válidos',async()=>{
  const db=environment.authenticatedContext('owner').firestore();
  const reference=doc(db,'users/owner/sessions/session-1');
  await assertSucceeds(setDoc(reference,session()));
  await assertSucceeds(updateDoc(reference,{routineName:'Torso A'}));
  await assertSucceeds(deleteDoc(reference));
});
