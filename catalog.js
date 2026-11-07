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
  var EXERCISE_CATALOG = [
    {id:'press-banca', name:'Press banca', aliases:['bench press','press plano','press de banca','press banca'], equipment:'barbell', primaryMuscle:'chestMid', secondaryMuscles:['tricepsLateral','tricepsMedial','shoulderAnterior']},
    {id:'sentadilla', name:'Sentadilla', aliases:['squat','back squat','front squat','sentadilla frontal'], equipment:'barbell', primaryMuscle:'quads', secondaryMuscles:['glutesMax','adductors']},
    {id:'peso-muerto', name:'Peso muerto', aliases:['deadlift','dead lift','peso muerto convencional'], equipment:'barbell', primaryMuscle:'glutesMax', secondaryMuscles:['hamstrings','lowerBack']},
    {id:'press-militar', name:'Press militar', aliases:['shoulder press','press hombro','press de hombros','military press'], equipment:'barbell', primaryMuscle:'shoulderAnterior', secondaryMuscles:['tricepsLateral','tricepsMedial']},
    {id:'remo-barra', name:'Remo con barra', aliases:['barbell row','row con barra','remo barra','remo con barra'], equipment:'barbell', primaryMuscle:'upperBack', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'dominadas', name:'Dominadas lastradas', aliases:['pull up','pullups','dominada','dominadas','dominada lastrada','dominadas con peso'], equipment:'bodyweight', primaryMuscle:'lats', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'press-inclinado', name:'Press inclinado con mancuernas', aliases:['incline dumbbell press','press inclinado','press inclinado mancuernas'], equipment:'dumbbell', primaryMuscle:'chestUpper', secondaryMuscles:['tricepsLateral','tricepsMedial','shoulderAnterior']},
    {id:'peso-muerto-rumano', name:'Peso muerto rumano', aliases:['romanian deadlift','rdl','deadlift rumano'], equipment:'barbell', primaryMuscle:'hamstrings', secondaryMuscles:['glutesMax','lowerBack']},
    {id:'prensa-piernas', name:'Prensa de piernas', aliases:['leg press','prensa piernas'], equipment:'machine', primaryMuscle:'quads', secondaryMuscles:['glutesMax','adductors']},
    {id:'hip-thrust', name:'Hip thrust', aliases:['hip thrust','puente gluteo'], equipment:'barbell', primaryMuscle:'glutesMax', secondaryMuscles:[]},
    {id:'jalon-pecho', name:'Jalón al pecho', aliases:['lat pulldown','pulldown','jalon al pecho','jalón al pecho'], equipment:'cable', primaryMuscle:'lats', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'curl-biceps', name:'Curl de bíceps', aliases:['biceps curl','curl biceps','curl de biceps'], equipment:'dumbbell', primaryMuscle:'bicepsShort', secondaryMuscles:[]},
    {id:'extension-triceps', name:'Extensión de tríceps en polea', aliases:['triceps extension','triceps pressdown','extension triceps'], equipment:'cable', primaryMuscle:'tricepsLong', secondaryMuscles:[]},
    {id:'elevaciones-laterales', name:'Elevaciones laterales', aliases:['lateral raises','elevaciones laterales','rear delt raises'], equipment:'dumbbell', primaryMuscle:'shoulderLateral', secondaryMuscles:[]},
    {id:'remo-mancuerna', name:'Remo con mancuernas', aliases:['dumbbell row','remo mancuernas','row mancuernas'], equipment:'dumbbell', primaryMuscle:'upperBack', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'fondos', name:'Fondos', aliases:['dip','dips','fondos en paralelas'], equipment:'bodyweight', primaryMuscle:'chestMid', secondaryMuscles:['tricepsLateral','shoulderAnterior']},
    {id:'zancadas', name:'Zancadas', aliases:['lunges','zancada','zancadas'], equipment:'barbell', primaryMuscle:'quads', secondaryMuscles:['glutesMax','hamstrings']},
    {id:'curl-polea', name:'Curl de bíceps en polea', aliases:['cable curl','curl polea','curl de polea'], equipment:'cable', primaryMuscle:'bicepsShort', secondaryMuscles:['brachialis']},
    {id:'press-mancuernas', name:'Press plano con mancuernas', aliases:['dumbbell bench press','press banca mancuernas','press plano mancuernas'], equipment:'dumbbell', primaryMuscle:'chestMid', secondaryMuscles:['tricepsLateral','tricepsMedial','shoulderAnterior']},
    {id:'aperturas-maquina', name:'Aperturas en máquina', aliases:['pec deck','machine chest fly','contractora'], equipment:'machine', primaryMuscle:'chestMid', secondaryMuscles:[]},
    {id:'cruce-poleas', name:'Cruce de poleas', aliases:['cable crossover','cable fly','aperturas en polea'], equipment:'cable', primaryMuscle:'chestMid', secondaryMuscles:[]},
    {id:'remo-polea', name:'Remo sentado en polea', aliases:['seated cable row','remo bajo polea','remo en polea'], equipment:'cable', primaryMuscle:'upperBack', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'remo-pecho-apoyado', name:'Remo con pecho apoyado', aliases:['chest supported row','incline bench row'], equipment:'machine', primaryMuscle:'upperBack', secondaryMuscles:['bicepsShort','brachialis']},
    {id:'face-pull', name:'Face pull', aliases:['face pulls','jalon a la cara'], equipment:'cable', primaryMuscle:'shoulderPosterior', secondaryMuscles:['upperBack']},
    {id:'pajaros-mancuerna', name:'Pájaros con mancuernas', aliases:['reverse fly','rear delt fly','elevaciones posteriores'], equipment:'dumbbell', primaryMuscle:'shoulderPosterior', secondaryMuscles:[]},
    {id:'encogimientos', name:'Encogimientos', aliases:['shrug','shrugs','encogimientos de hombros'], equipment:'dumbbell', primaryMuscle:'traps', secondaryMuscles:[]},
    {id:'extension-cuadriceps', name:'Extensión de cuádriceps', aliases:['leg extension','extensiones de cuadriceps'], equipment:'machine', primaryMuscle:'quads', secondaryMuscles:[]},
    {id:'curl-femoral', name:'Curl femoral tumbado', aliases:['lying leg curl','leg curl','curl de isquiotibiales'], equipment:'machine', primaryMuscle:'hamstrings', secondaryMuscles:[]},
    {id:'curl-femoral-sentado', name:'Curl femoral sentado', aliases:['seated leg curl'], equipment:'machine', primaryMuscle:'hamstrings', secondaryMuscles:[]},
    {id:'sentadilla-bulgara', name:'Sentadilla búlgara', aliases:['bulgarian split squat','split squat bulgaro'], equipment:'dumbbell', primaryMuscle:'quads', secondaryMuscles:['glutesMax','adductors']},
    {id:'extension-pantorrilla', name:'Elevación de pantorrillas de pie', aliases:['standing calf raise','calf raises'], equipment:'machine', primaryMuscle:'calvesGastro', secondaryMuscles:[]},
    {id:'extension-pantorrilla-sentado', name:'Elevación de pantorrillas sentado', aliases:['seated calf raise'], equipment:'machine', primaryMuscle:'calvesSoleus', secondaryMuscles:[]},
    {id:'puente-gluteos', name:'Puente de glúteos', aliases:['glute bridge','glute bridges'], equipment:'bodyweight', primaryMuscle:'glutesMax', secondaryMuscles:[]},
    {id:'extension-cadera', name:'Extensión de cadera en polea', aliases:['cable kickback','patada de gluteo en polea'], equipment:'cable', primaryMuscle:'glutesMax', secondaryMuscles:[]},
    {id:'curl-martillo', name:'Curl martillo', aliases:['hammer curl','curl con agarre neutro'], equipment:'dumbbell', primaryMuscle:'brachialis', secondaryMuscles:['bicepsShort','forearms']},
    {id:'curl-predicador', name:'Curl predicador', aliases:['preacher curl','curl scott'], equipment:'machine', primaryMuscle:'bicepsShort', secondaryMuscles:[]},
    {id:'extension-triceps-overhead', name:'Extensión de tríceps sobre la cabeza', aliases:['overhead triceps extension','extension triceps por encima de la cabeza'], equipment:'cable', primaryMuscle:'tricepsLong', secondaryMuscles:[]},
    {id:'press-frances', name:'Press francés', aliases:['skull crusher','skullcrushers','extension tumbado de triceps'], equipment:'barbell', primaryMuscle:'tricepsLong', secondaryMuscles:[]},
    {id:'crunch-polea', name:'Crunch en polea', aliases:['cable crunch','abdominales en polea'], equipment:'cable', primaryMuscle:'rectusAbdominis', secondaryMuscles:['obliques']},
    {id:'plancha', name:'Plancha', aliases:['plank','front plank'], equipment:'bodyweight', primaryMuscle:'transverseCore', secondaryMuscles:['rectusAbdominis','obliques']},
    {id:'extension-lumbar', name:'Extensión lumbar', aliases:['back extension','hyperextension','hiperextensiones'], equipment:'machine', primaryMuscle:'lowerBack', secondaryMuscles:['glutesMax','hamstrings']}
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
    EXERCISE_CATALOG:EXERCISE_CATALOG,
    MUSCLES:MUSCLES,
    LEGACY_MUSCLE_IDS:LEGACY_MUSCLE_IDS,
    MUSCLE_GROUPS:MUSCLE_GROUPS,
    EQUIPMENT_TYPES:EQUIPMENT_TYPES,
    MEASUREMENT_FIELDS:MEASUREMENT_FIELDS
  };
});
