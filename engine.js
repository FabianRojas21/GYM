(function(root, factory){
  var engine = factory();
  if(typeof module === 'object' && module.exports) module.exports = engine;
  else root.SobrecargaEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function fmt(value){ return (Math.round(value * 100) / 100).toString().replace('.', ','); }
  function fmt1(value){ return (Math.round(value * 10) / 10).toString().replace('.', ','); }
  function mean(values){ return values.reduce(function(sum, value){ return sum + value; }, 0) / values.length; }
  function countsForProgress(set){ return !set.type || set.type === 'normal'; }
  function isEffectiveSet(set){
    if(!set || set.type === 'warmup' || !Number.isFinite(Number(set.w)) || Number(set.w) < 0 || !(Number(set.r) > 0)) return false;
    if(set.rir === null || set.rir === undefined || set.rir === '') return true;
    var rir=Number(set.rir);
    return Number.isFinite(rir) && rir <= 4;
  }
  function countEffectiveSets(sets, unilateral){
    var effective=sets.filter(isEffectiveSet);
    if(!unilateral) return effective.length;
    var pairs={};
    effective.forEach(function(set){
      if(set.pair===undefined || (set.side!=='right' && set.side!=='left')) return;
      var key=String(set.pair);
      if(!pairs[key]) pairs[key]={};
      pairs[key][set.side]=true;
    });
    return Object.keys(pairs).filter(function(key){ return pairs[key].right && pairs[key].left; }).length;
  }
  function entryVolume(sets, unilateral){
    var working=sets.filter(function(set){
      return set && set.type!=='warmup' && Number.isFinite(Number(set.w)) && Number(set.w)>=0 && Number(set.r)>0;
    });
    if(!unilateral) return working.reduce(function(total,set){ return total+Number(set.w)*Number(set.r); },0);
    var pairs={};
    working.forEach(function(set){
      if(set.pair===undefined || (set.side!=='right' && set.side!=='left')) return;
      var key=String(set.pair);
      if(!pairs[key]) pairs[key]={};
      pairs[key][set.side]=set;
    });
    return Object.keys(pairs).reduce(function(total,key){
      var pair=pairs[key];
      return pair.right && pair.left
        ? total+Number(pair.right.w)*Number(pair.right.r)+Number(pair.left.w)*Number(pair.left.r)
        : total;
    },0);
  }
  function isUnilateralEntry(entry, exercise){
    return !!(entry && entry.unilateral) || !!(exercise && exercise.unilateral) ||
      !!(entry && Array.isArray(entry.sets) && entry.sets.some(function(set){
        return set.pair!==undefined || set.side==='right' || set.side==='left';
      }));
  }
  function inferSecondaryMuscles(primary, exerciseName){
    var name=String(exerciseName||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
    var matches=function(words){ return words.some(function(word){ return name.includes(word); }); };
    var isolation=['extension','extensiones','curl','elevacion','elevaciones','apertura','aperturas','pajaro','laterales','lateral','maquina femoral'];
    if(isolation.some(function(word){ return name.includes(word); }) &&
      !matches(['sentadilla','press','remo','jalon','dominada','peso muerto','hip thrust','prensa'])) return [];
    if(primary.indexOf('chest')===0){
      return matches(['press','fondos'])
        ? ['tricepsLateral','tricepsMedial','shoulderAnterior']
        : [];
    }
    if(['lats','upperBack','traps','lowerBack'].indexOf(primary)>=0){
      return matches(['remo','jalon','dominada','pull','row'])
        ? ['bicepsShort','brachialis']
        : matches(['peso muerto']) ? ['glutesMax','lowerBack'] : [];
    }
    if(primary.indexOf('shoulder')===0){
      return matches(['press','militar']) ? ['tricepsLateral','tricepsMedial'] : [];
    }
    if(primary.indexOf('biceps')===0 || primary==='brachialis') return [];
    if(primary.indexOf('triceps')===0) return [];
    if(primary==='quads' && matches(['sentadilla','prensa'])) return ['glutesMax','adductors'];
    if(primary==='hamstrings' && matches(['peso muerto','rumano'])) return ['glutesMax','lowerBack'];
    if(primary==='glutesMax' && matches(['peso muerto','sentadilla','hip thrust'])) return ['hamstrings'];
    return [];
  }
  function muscleAssignments(primary, secondaryMuscles){
    var ids=[primary].concat(secondaryMuscles||[]);
    return ids.filter(function(id,index){ return id && ids.indexOf(id)===index; }).map(function(id,index){
      return {id:id,factor:index===0?1:0.5};
    });
  }
  function muscleGroupId(id){
    if(id.indexOf('chest')===0) return 'chest';
    if(id.indexOf('shoulder')===0) return 'shoulder';
    if(['lats','upperBack','lowerBack','traps','serratus'].indexOf(id)>=0) return 'back';
    if(id.indexOf('biceps')===0 || id==='brachialis') return 'biceps';
    if(id==='forearms') return 'forearms';
    if(id.indexOf('triceps')===0) return 'triceps';
    if(id==='quads') return 'quads';
    if(id==='hamstrings') return 'hamstrings';
    if(id.indexOf('glutes')===0) return 'glutes';
    if(id.indexOf('calves')===0 || id==='tibialis') return 'calves';
    if(['rectusAbdominis','obliques','transverseCore'].indexOf(id)>=0) return 'core';
    return 'other';
  }
  function effectiveBodyweight(bodyweight, addedWeight, percentage){
    var body=Number(bodyweight), added=Number(addedWeight), share=Number(percentage);
    if(!Number.isFinite(body) || body<0 || !Number.isFinite(added) || added<0) return added;
    if(!Number.isFinite(share) || share<0 || share>100) return body+added;
    return body*share/100+added;
  }
  function comparableWeekRange(today, weeksAgo){
    var parts=String(today).split('-').map(Number);
    var date=new Date(parts[0],parts[1]-1,parts[2]);
    var dayOffset=(date.getDay()+6)%7;
    var monday=new Date(date); monday.setDate(date.getDate()-dayOffset-7*weeksAgo);
    var end=new Date(monday); end.setDate(monday.getDate()+dayOffset);
    var key=function(value){ return value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0'); };
    return {start:key(monday),end:key(end)};
  }
  function compareWeeklyTrend(current, previousValues){
    var values=(previousValues||[]).filter(function(value){ return Number.isFinite(Number(value)) && Number(value)>=0; }).map(Number);
    if(!values.length) return current ? 'Carga nueva' : 'Sin cambios';
    var previous=mean(values);
    if(previous===0) return current ? 'Carga nueva' : 'Sin cambios';
    return current>previous*1.15 ? 'Carga al alza' : current<previous*0.85 ? 'Carga a la baja' : 'Carga estable';
  }
  function effortTarget(ex, index, settings){
    var efforts = ex.efforts;
    return efforts && efforts[index] !== undefined && efforts[index] !== null ? efforts[index] : settings.targetRir;
  }
  function effTxt(rir, settings){
    if(rir === null || rir === undefined) return '';
    return settings.mode === 'rpe' ? 'RPE ' + fmt1(10 - rir) : 'RIR ' + fmt1(rir);
  }
  function targetText(ex, settings){
    var targets = [];
    for(var i = 0; i < ex.sets; i++) targets.push(effortTarget(ex, i, settings));
    var same = targets.every(function(value){ return value === targets[0]; });
    return same ? effTxt(targets[0], settings) : targets.map(function(value){ return effTxt(value, settings); }).join(' / ');
  }
  function roundTo(value, step){ return Math.round(value / step) * step; }
  function availableWeight(value, step, direction){
    if(!(Number(step) > 0)) return value;
    var units = value / step;
    var snapped = (direction === 'down' ? Math.floor(units + 1e-9) : Math.ceil(units - 1e-9)) * step;
    return Math.round(snapped * 100) / 100;
  }

  function analyzeCore(ex, sets, prevSets, settings){
    var wk = sets.filter(function(set){ return countsForProgress(set) && Number.isFinite(Number(set.w)) && set.w >= 0 && set.r > 0; });
    if(!wk.length) return null;
    var weight = Math.max.apply(null, wk.map(function(set){ return set.w; }));
    var at = wk.filter(function(set){ return set.w === weight; }).slice(0, ex.sets);
    var reps = at.map(function(set){ return set.r; });
    var rirs = at.map(function(set){ return set.rir; }).filter(function(value){ return value !== null && value !== undefined; });
    var avgRir = rirs.length ? mean(rirs) : null;
    var diffs = [];
    at.forEach(function(set, index){
      if(set.rir !== null && set.rir !== undefined) diffs.push(set.rir - effortTarget(ex, index, settings));
    });
    var avgDiff = diffs.length ? mean(diffs) : null;
    var n = at.length, need = ex.sets, increment = ex.inc;
    var avgReps = mean(reps);
    var allTop = n >= need && reps.every(function(value){ return value >= ex.max; });
    var okEffort = avgDiff === null || avgDiff >= -1;
    var easy = avgDiff !== null && avgDiff >= 2 && n >= need && reps.every(function(value){ return value >= ex.min; });
    var span = Math.max(1, ex.max - ex.min), progress = 0;
    for(var i = 0; i < need; i++){
      progress += Math.min(1, Math.max(0, ((reps[i] !== undefined ? reps[i] : ex.min) - ex.min) / span));
    }
    progress /= need;
    var repsFalt = 0;
    for(var j = 0; j < need; j++){
      if(reps[j] !== undefined) repsFalt += Math.max(0, ex.max - reps[j]);
    }
    var serFalt = Math.max(0, need - n);
    var result = {W:weight, nextW:weight, progressTarget:availableWeight(weight + increment, ex.loadStep || increment, 'up'), reps:reps, avgRir:avgRir, n:n, progress:progress, repsFalt:repsFalt, serFalt:serFalt, target:[]};
    var fill = function(value){ return Array.apply(null, Array(need)).map(function(){ return value; }); };

    if((allTop && okEffort) || easy){
      result.status = 'sube'; result.nextW = result.progressTarget; result.target = fill(ex.min); result.progress = 1;
      result.headline = 'Sube a ' + fmt(result.nextW) + ' kg';
      result.detail = allTop
        ? 'Cumpliste ' + need + '×' + ex.max + (avgRir !== null ? ' con ' + effTxt(avgRir, settings) : '') + '. Próximo entreno: ' + fmt(result.nextW) + ' kg y apunta a ' + ex.min + ' reps en cada serie.'
        : 'Te sobraron repeticiones (' + effTxt(avgRir, settings) + ' frente a ' + targetText(ex, settings) + '). Sube a ' + fmt(result.nextW) + ' kg y apunta a ' + ex.min + ' reps en cada serie.';
    } else if(allTop){
      result.status = 'confirma'; result.target = fill(ex.max); result.progress = 1;
      result.headline = 'Repite ' + fmt(weight) + ' kg';
      result.detail = 'Llegaste a ' + ex.max + ' reps pero más al límite de lo pedido (' + effTxt(avgRir, settings) + '). Repite con ' + targetText(ex, settings) + ' para confirmar la subida.';
    } else if(avgReps < ex.min){
      var previousLow = false;
      if(prevSets){
        var previous = prevSets.filter(function(set){ return countsForProgress(set) && Number.isFinite(Number(set.w)) && set.w >= 0 && set.r > 0; });
        if(previous.length){
          var previousWeight = Math.max.apply(null, previous.map(function(set){ return set.w; }));
          var previousReps = previous.filter(function(set){ return set.w === previousWeight; }).map(function(set){ return set.r; });
          previousLow = previousWeight === weight && mean(previousReps) < ex.min;
        }
      }
      if(previousLow && weight>0){
        var downWeight = Math.max(increment, roundTo(weight * 0.9, increment));
        if(downWeight >= weight) downWeight = Math.max(0, weight - increment);
        downWeight = availableWeight(downWeight, ex.loadStep || increment, 'down');
        if(downWeight <= 0 || downWeight >= weight){
          result.status='mantener'; result.nextW=weight; result.target=fill(ex.min);
          result.headline='Mantén ' + fmt(weight) + ' kg';
          result.detail='No hay un peso inferior disponible y seguro para bajar con el incremento configurado. Mantén el peso y vuelve a buscar ' + ex.min + ' reps.';
        } else {
          result.status = 'bajar'; result.nextW = downWeight; result.target = fill(ex.min);
          result.headline = 'Baja a ' + fmt(downWeight) + ' kg';
          result.detail = 'Dos entrenos seguidos bajo ' + ex.min + ' reps con ' + fmt(weight) + ' kg. Baja un poco y vuelve a construir desde ' + ex.min + ' reps.';
        }
      } else {
        result.status = 'mantener'; result.target = fill(ex.min);
        result.headline = 'Mantén ' + fmt(weight) + ' kg';
        result.detail = 'Promedio de ' + fmt1(avgReps) + ' reps, bajo el mínimo de ' + ex.min + '. Busca ' + ex.min + ' reps en todas las series antes de subir.';
      }
    } else {
      result.status = 'reps';
      var last = reps[reps.length - 1];
      for(var k = 0; k < need; k++){
        var current = reps[k] !== undefined ? reps[k] : last;
        result.target.push(okEffort ? Math.min(ex.max, current + 1) : current);
      }
      result.headline = fmt(weight) + ' kg, suma reps';
      result.detail = 'Objetivo: ' + result.target.join(', ') + ' reps. Te faltan ' + repsFalt + ' rep' + (repsFalt === 1 ? '' : 's') + (serFalt ? ' y ' + serFalt + ' serie' + (serFalt > 1 ? 's' : '') : '') + ' para subir a ' + fmt(result.progressTarget) + ' kg.' + (okEffort ? '' : ' El esfuerzo fue mayor al pedido (' + effTxt(avgRir, settings) + ' frente a ' + targetText(ex, settings) + '), así que mantén las reps.');
    }
    return result;
  }

  function completeUnilateralSets(sets){
    var pairs = {};
    sets.forEach(function(set){
      if(set.pair === undefined || (set.side !== 'right' && set.side !== 'left')) return;
      var key = String(set.pair);
      if(!pairs[key]) pairs[key] = {};
      pairs[key][set.side] = set;
    });
    var complete = {};
    Object.keys(pairs).forEach(function(key){
      var pair = pairs[key], right = pair.right, left = pair.left;
      if(right && left && countsForProgress(right) && countsForProgress(left) &&
        Number.isFinite(Number(right.w)) && right.w >= 0 && right.r > 0 &&
        Number.isFinite(Number(left.w)) && left.w >= 0 && left.r > 0) complete[key] = true;
    });
    return sets.filter(function(set){ return complete[String(set.pair)]; });
  }

  function analyze(ex, sets, prevSets, settings){
    if(!ex.unilateral) return analyzeCore(ex, sets, prevSets, settings);
    var current = completeUnilateralSets(sets);
    if(!current.length) return null;
    var previous = prevSets ? completeUnilateralSets(prevSets) : null;
    var coreEx = Object.assign({}, ex, {unilateral:false});
    var right = analyzeCore(coreEx, current.filter(function(set){ return set.side === 'right'; }), previous && previous.filter(function(set){ return set.side === 'right'; }), settings);
    var left = analyzeCore(coreEx, current.filter(function(set){ return set.side === 'left'; }), previous && previous.filter(function(set){ return set.side === 'left'; }), settings);
    if(!right || !left) return null;
    var rank = {sube:0, reps:1, confirma:2, mantener:3, bajar:4};
    var weaker = rank[right.status] >= rank[left.status] ? right : left;
    var sideTarget = function(name, result){ return name + ': ' + fmt(result.nextW) + ' kg × ' + result.target.join(', ') + ' reps'; };
    return Object.assign({}, weaker, {
      W:Math.min(right.W, left.W), nextW:Math.min(right.nextW, left.nextW), progressTarget:Math.min(right.progressTarget, left.progressTarget), progress:Math.min(right.progress, left.progress),
      sidePlans:{right:right, left:left},
      displayTarget:sideTarget('Der.', right) + ' · ' + sideTarget('Izq.', left),
      headline:(weaker === right ? 'Derecho: ' : 'Izquierdo: ') + weaker.headline,
      detail:'Derecho: ' + right.detail + ' Izquierdo: ' + left.detail
    });
  }

  return {
    analyze:analyze, analyzeCore:analyzeCore, effortTarget:effortTarget, effTxt:effTxt, targetText:targetText,
    countsForProgress:countsForProgress, isEffectiveSet:isEffectiveSet, countEffectiveSets:countEffectiveSets,
    entryVolume:entryVolume, isUnilateralEntry:isUnilateralEntry,
    inferSecondaryMuscles:inferSecondaryMuscles, muscleAssignments:muscleAssignments,
    muscleGroupId:muscleGroupId, effectiveBodyweight:effectiveBodyweight,
    comparableWeekRange:comparableWeekRange, compareWeeklyTrend:compareWeeklyTrend
  };
});
