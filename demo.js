(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.SobrecargaDemo=api;
})(typeof window!=='undefined' ? window : globalThis, function(){
  'use strict';

  function iso(date){
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }

  function parseISO(value){
    var parts=value.split('-').map(Number);
    return new Date(parts[0],parts[1]-1,parts[2]);
  }

  function buildDemo(now){
    var ex = {
      demo_banca:{id:'demo_banca', name:'Press banca', sets:3, min:6, max:10, inc:2.5, demo:true},
      demo_sent:{id:'demo_sent', name:'Sentadilla', sets:3, min:6, max:10, inc:2.5, demo:true},
      demo_remo:{id:'demo_remo', name:'Remo con barra', sets:3, min:8, max:12, inc:2.5, demo:true}
    };
    var days = [28,25,21,18,14,11,7,3];
    var banca = [[60,[8,7,7],[2,2,1]],[60,[8,8,7],[2,2,1]],[60,[9,8,8],[2,1,1]],[60,[10,9,8],[2,2,1]],[60,[10,10,9],[2,2,1]],[60,[10,10,10],[2,2,2]],[62.5,[7,6,6],[2,2,1]],[62.5,[8,7,7],[2,2,1]]];
    var sent = [[77.5,[8,8,7],[2,2,1]],[77.5,[9,8,8],[2,2,1]],[77.5,[10,9,9],[2,2,1]],[77.5,[10,10,10],[2,2,1]],[80,[8,7,7],[2,2,1]],[80,[9,8,8],[2,2,1]],[80,[10,9,9],[2,2,1]],[80,[10,10,10],[2,2,1]]];
    var remo = [[50,[10,10,9],[2,2,1]],[50,[11,10,10],[2,2,1]],[50,[12,11,10],[2,2,1]],[50,[12,12,11],[2,2,1]],[50,[12,12,12],[2,2,1]],[52.5,[10,9,9],[2,2,1]],[52.5,[11,11,10],[2,2,1]],[52.5,[12,12,12],[1,0,0]]];
    var mk = function(row){ return row[1].map(function(reps, index){ return {w:row[0], r:reps, rir:row[2][index], warm:false}; }); };
    var sessions = days.map(function(daysAgo, index){
      var dateValue=new Date((now instanceof Date ? now : new Date()).getTime());
      dateValue.setDate(dateValue.getDate()-daysAgo);
      var date=iso(dateValue);
      return {id:'demo_'+(index+1), date:date, ts:parseISO(date).getTime()+18*3600*1000, demo:true, entries:[
        {exId:'demo_banca', sets:[{w:40, r:8, rir:null, warm:true}].concat(mk(banca[index]))},
        {exId:'demo_sent', sets:mk(sent[index])},
        {exId:'demo_remo', sets:mk(remo[index])}
      ]};
    });
    var routines = {demo_r1:{id:'demo_r1', name:'Cuerpo completo (ejemplo)', demo:true, items:[
      {exId:'demo_banca', sets:3, min:6, max:10, inc:2.5, efforts:[2,1,0]},
      {exId:'demo_sent', sets:3, min:6, max:10, inc:2.5, efforts:[2,1,0]},
      {exId:'demo_remo', sets:3, min:8, max:12, inc:2.5, efforts:[2,2,1]}
    ]}};
    return {ex:ex, sessions:sessions, routines:routines};
  }

  return {buildDemo:buildDemo};
});
