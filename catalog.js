(function(root, factory){
  var catalog = factory();
  if(typeof module === 'object' && module.exports) module.exports = catalog;
  else root.SobrecargaCatalog = catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

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
    unassigned:'Sin asignar',
    chestUpper:'Pecho superior', chestMid:'Pecho medio', chestLower:'Pecho inferior',
    shoulderAnterior:'Hombro anterior', shoulderLateral:'Hombro lateral', shoulderPosterior:'Hombro posterior',
    lats:'Dorsales', upperBack:'Espalda alta / romboides', lowerBack:'Lumbar', traps:'Trapecio', serratus:'Serrato anterior',
    bicepsLong:'Bíceps · porción larga', bicepsShort:'Bíceps · porción corta', brachialis:'Braquial', forearms:'Antebrazos',
    tricepsLong:'Tríceps · porción larga', tricepsLateral:'Tríceps · porción lateral', tricepsMedial:'Tríceps · porción medial',
    quads:'Cuádriceps', adductors:'Aductores', hamstrings:'Isquiotibiales', glutesMax:'Glúteo mayor', glutesMed:'Glúteo medio',
    calvesGastro:'Pantorrilla · gastrocnemio', calvesSoleus:'Pantorrilla · sóleo', tibialis:'Tibial anterior', hipFlexors:'Flexores de cadera',
    rectusAbdominis:'Abdominal recto', obliques:'Oblicuos', transverseCore:'Transverso / core profundo', neck:'Cuello', other:'Otro'
  };
  var LEGACY_MUSCLE_IDS={shoulders:'shoulderLateral',back:'lats',chest:'chestMid',biceps:'bicepsShort',triceps:'tricepsLong',glutes:'glutesMax',calves:'calvesGastro',core:'rectusAbdominis'};
  var MUSCLE_GROUPS={chest:'Pecho',shoulder:'Hombros',back:'Espalda',biceps:'Bíceps',triceps:'Tríceps',forearms:'Antebrazos',quads:'Cuádriceps',adductors:'Aductores',hipFlexors:'Flexores de cadera',hamstrings:'Isquiotibiales',glutes:'Glúteos',calves:'Pantorrillas',core:'Core',neck:'Cuello',unassigned:'Sin asignar',other:'Otro'};
  var EQUIPMENT_TYPES={barbell:'Barra',dumbbell:'Mancuernas',machine:'Máquina',cable:'Polea',bodyweight:'Peso corporal',other:'Otro / no indicado'};
  var MEASUREMENT_FIELDS={
    weight:'Peso corporal', height:'Altura', chest:'Pecho', waist:'Cintura', abdomen:'Abdomen', hips:'Cadera', neck:'Cuello',
    armLeft:'Brazo izquierdo', armRight:'Brazo derecho', thighLeft:'Muslo izquierdo', thighRight:'Muslo derecho', calfLeft:'Pantorrilla izquierda', calfRight:'Pantorrilla derecha', bodyFat:'Grasa corporal'
  };

  return {
    LIB:LIB,
    MUSCLES:MUSCLES,
    LEGACY_MUSCLE_IDS:LEGACY_MUSCLE_IDS,
    MUSCLE_GROUPS:MUSCLE_GROUPS,
    EQUIPMENT_TYPES:EQUIPMENT_TYPES,
    MEASUREMENT_FIELDS:MEASUREMENT_FIELDS
  };
});
