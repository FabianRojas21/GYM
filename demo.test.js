'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {buildDemo}=require('./demo.js');

test('buildDemo creates consistent example training data',()=>{
  const demo=buildDemo(new Date(2026,10,7,12));

  assert.deepEqual(Object.keys(demo.ex),['demo_banca','demo_sent','demo_remo']);
  assert.equal(demo.sessions.length,8);
  assert.deepEqual(demo.sessions.map(session=>session.id),Array.from({length:8},(_,index)=>'demo_'+(index+1)));
  assert.equal(demo.sessions[0].date,'2026-10-10');
  assert.equal(demo.sessions[0].entries[0].sets.length,4);
  assert.equal(demo.sessions[0].entries[0].sets[0].warm,true);
  assert.equal(demo.sessions[0].entries[1].sets.length,3);
  assert.deepEqual(Object.keys(demo.routines),['demo_r1']);
  assert.deepEqual(demo.routines.demo_r1.items.map(item=>item.exId),['demo_banca','demo_sent','demo_remo']);
});
