(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaHistory=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function iso(date){
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }

  function parseISO(value){
    var parts=value.split('-').map(Number);
    return new Date(parts[0],parts[1]-1,parts[2]);
  }

  function windowBounds(days,today){
    var currentEnd=parseISO(today); currentEnd.setHours(0,0,0,0);
    var currentStart=new Date(currentEnd); currentStart.setDate(currentStart.getDate()-days+1);
    var previousEnd=new Date(currentStart); previousEnd.setDate(previousEnd.getDate()-1);
    var previousStart=new Date(previousEnd); previousStart.setDate(previousStart.getDate()-days+1);
    return {start:iso(currentStart),end:iso(currentEnd),previousStart:iso(previousStart),previousEnd:iso(previousEnd)};
  }

  function aggregate(sessions,statsFor){
    return sessions.reduce(function(total,session){
      var stats=statsFor(session);
      total.volume+=stats.volume;
      total.effectiveSets+=stats.effectiveSets;
      total.duration+=Number(session.durationMs)||0;
      return total;
    },{sessions:sessions.length,volume:0,effectiveSets:0,duration:0});
  }

  function trend(current,previous){
    if(previous===0) return current===0?'Sin cambios previos':'Nuevo periodo';
    var difference=current-previous;
    if(!difference) return 'Sin cambios';
    return (difference>0?'↑ ':'↓ ')+Math.round(Math.abs(difference)/previous*100)+'% vs periodo anterior';
  }

  return {windowBounds:windowBounds,aggregate:aggregate,trend:trend};
});
