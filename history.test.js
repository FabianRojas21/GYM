'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {windowBounds,aggregate,trend}=require('./history.js');

test('history window bounds compare equal, consecutive date ranges',()=>{
  assert.deepEqual(windowBounds(7,'2026-10-31'),{
    start:'2026-10-25',
    end:'2026-10-31',
    previousStart:'2026-10-18',
    previousEnd:'2026-10-24'
  });
});

test('history aggregate totals session volume, sets, and duration',()=>{
  assert.deepEqual(aggregate([
    {durationMs:60000,stats:{volume:120,effectiveSets:3}},
    {durationMs:120000,stats:{volume:80,effectiveSets:2}}
  ],session=>session.stats),{
    sessions:2,
    volume:200,
    effectiveSets:5,
    duration:180000
  });
});

test('history trend handles new, unchanged, increased, and decreased periods',()=>{
  assert.equal(trend(6,4),'↑ 50% vs periodo anterior');
  assert.equal(trend(2,4),'↓ 50% vs periodo anterior');
  assert.equal(trend(4,4),'Sin cambios');
  assert.equal(trend(0,0),'Sin cambios previos');
  assert.equal(trend(1,0),'Nuevo periodo');
});
