'use strict';

const {test,expect}=require('@playwright/test');

test('registra y termina un entrenamiento desde el flujo móvil',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');

  const start=page.locator('[data-home-start]');
  await expect(start).toBeVisible();
  await expect(start).toContainText('Empezar primer entreno');
  const startPosition=await start.evaluate(element=>element.getBoundingClientRect().top);
  const statsPosition=await page.locator('.weekly-stats').evaluate(element=>element.getBoundingClientRect().top);
  expect(startPosition).toBeLessThan(statsPosition);
  await start.click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();

  const weight=page.locator('[data-f="w"][data-ei="0"][data-ri="0"]');
  const reps=page.locator('[data-f="r"][data-ei="0"][data-ri="0"]');
  await expect(weight).toBeVisible();
  await expect(page.locator('[data-act="screen-awake-toggle"]')).toBeVisible();
  await weight.fill('40');
  await reps.fill('8');
  await page.getByRole('button',{name:'Terminar serie'}).first().click();
  await expect(page.locator('.set[data-ri="1"]')).toHaveAttribute('data-current-set','true');
  await expect(page.locator('.set[data-ri="0"]')).toHaveClass(/is-complete/);
  await expect(page.locator('.set-finish-done')).toBeVisible();
  await expect(page.getByRole('button',{name:'Terminar entreno'})).toBeEnabled();
  await page.getByRole('button',{name:'Terminar entreno'}).click();

  await expect(page.getByRole('heading',{name:'Resumen del entreno'})).toBeVisible();
  await expect(page.locator('.workout-summary .suggest .nm').first()).toHaveText('Press banca');
  await expect(page.locator('.workout-summary')).toContainText('1 serie efectiva');
  await page.locator('.tab[data-tab="historial"]').click();
  const savedWorkout=page.locator('[data-history-session]').first();
  await expect(page.locator('.history-month-heading')).toBeVisible();
  await expect(savedWorkout).not.toHaveAttribute('open','');
  await savedWorkout.locator('summary').click();
  await expect(savedWorkout).toContainText('Press banca');
  const viewport=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('recupera el borrador de entrenamiento después de recargar',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('[data-home-start]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();

  const weight=page.locator('[data-f="w"][data-ei="0"][data-ri="0"]');
  const reps=page.locator('[data-f="r"][data-ei="0"][data-ri="0"]');
  await weight.fill('42,5');
  await reps.fill('9');
  await expect(page.locator('#draft-save-status')).toContainText('Guardado en este dispositivo');
  await page.reload();

  await expect(page.locator('[data-f="w"][data-ei="0"][data-ri="0"]')).toHaveValue('42,5');
  await expect(page.locator('[data-f="r"][data-ei="0"][data-ri="0"]')).toHaveValue('9');
});

test('resalta la siguiente serie y pliega el ejercicio al completarlo',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('[data-home-start]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();

  for(let ri=0;ri<3;ri++){
    await page.locator(`[data-f="w"][data-ei="0"][data-ri="${ri}"]`).fill('40');
    await page.locator(`[data-f="r"][data-ei="0"][data-ri="${ri}"]`).fill('8');
  }
  for(let ri=0;ri<3;ri++){
    await page.locator(`.set[data-ri="${ri}"] [data-act="finish-set"]`).click();
    if(ri<2) await expect(page.locator(`.set[data-ri="${ri+1}"]`)).toHaveAttribute('data-current-set','true');
  }
  const exerciseCard=page.locator('.workout-card[data-ei="0"]');
  await expect(exerciseCard).toHaveClass(/is-collapsed/);
  await expect(exerciseCard.locator('.workout-progress')).toHaveText('3/3 series');
  await page.locator('[data-act="focus-next-set"]').click();
  await expect(page.locator('[data-act="finish"]')).toBeFocused();
});

test('mantiene la pantalla activa o comunica la limitación del navegador',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('[data-home-start]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();
  test.skip(!(await page.evaluate(()=>Boolean(navigator.wakeLock))),'Wake Lock no está disponible en este navegador');

  const toggle=page.locator('[data-act="screen-awake-toggle"]');
  await toggle.click();
  await expect.poll(async()=>await toggle.getAttribute('aria-pressed')==='true'||await page.locator('#toast').isVisible()).toBe(true);
  if(await toggle.getAttribute('aria-pressed')==='true'){
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed','false');
  }else{
    await expect(page.locator('#toast')).not.toBeEmpty();
  }
});

test('muestra la recomendación de progresión del ejercicio guardado',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('[data-home-start]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();
  await page.locator('[data-f="w"][data-ei="0"][data-ri="0"]').fill('40');
  await page.locator('[data-f="r"][data-ei="0"][data-ri="0"]').fill('8');
  await page.getByRole('button',{name:'Terminar serie'}).first().click();
  await page.getByRole('button',{name:'Terminar entreno'}).click();
  await expect(page.getByRole('heading',{name:'Resumen del entreno'})).toBeVisible();
  await page.locator('.tab[data-tab="rutinas"]').click();
  await page.locator('[data-act="library-section"][data-section="ejercicios"]').click();
  await page.locator('[data-act="toggle-ex"]').filter({hasText:'Press banca'}).click();
  await expect(page.locator('.exercise-progress-card').filter({hasText:'Press banca'})).toContainText('Próximo:');
  await expect(page.locator('.exercise-progress-card').filter({hasText:'Press banca'})).toContainText('Sumar reps');
});

test('crea y abre una rutina desde la biblioteca',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('.tab[data-tab="rutinas"]').click();
  await page.locator('[data-act="library-section"][data-section="rutinas"]').click();
  await page.locator('[data-act="rut-new"]').first().click();

  await expect(page.getByRole('heading',{name:'Nueva rutina'})).toBeVisible();
  await page.locator('[data-rf="name"]').fill('Rutina E2E');
  await page.locator('[data-act="rut-add"]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="rpick"][data-lib="Press banca"]').click();
  await page.locator('[data-act="rut-save"]').click();

  await expect(page.getByRole('heading',{name:'Rutina E2E'})).toBeVisible();
  await expect(page.locator('.library-exercise-row')).toContainText('Press banca');
  await page.locator('[data-act="rut-edit"]').click();
  await expect(page.getByRole('heading',{name:'Editar rutina'})).toBeVisible();
  await page.locator('[data-act="rut-cancel"]').click();
  const search=page.locator('[data-library-search]');
  await expect(search).toBeVisible();
  await search.fill('Rutina E2E');
  await expect(page.locator('.library-card').filter({hasText:'Rutina E2E'})).toBeVisible();
});

test('guarda las series adicionales en una rutina y las carga al entrenar',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('.tab[data-tab="rutinas"]').click();
  await page.locator('[data-act="library-section"][data-section="rutinas"]').click();
  await page.locator('[data-act="rut-new"]').first().click();
  await page.locator('[data-rf="name"]').fill('Rutina con back-off');
  await page.locator('[data-act="rut-add"]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="rpick"][data-lib="Press banca"]').click();

  await page.locator('[data-act="rut-special-add"][data-i="0"]').click();
  await page.locator('[data-it="specialSetType"][data-i="0"][data-k="0"]').selectOption('backoff');
  await page.locator('[data-act="rut-save"]').click();
  await expect(page.getByRole('heading',{name:'Rutina con back-off'})).toBeVisible();
  await expect(page.locator('.library-exercise-row')).toContainText('Back-off');
  await page.locator('[data-act="rut-start"]').click();

  const setTypes=page.locator('.workout-card[data-ei="0"] .set-type');
  await expect(setTypes).toHaveCount(4);
  await expect(setTypes.nth(0)).toHaveValue('normal');
  await expect(setTypes.nth(1)).toHaveValue('normal');
  await expect(setTypes.nth(2)).toHaveValue('normal');
  await expect(setTypes.nth(3)).toHaveValue('backoff');
});

test('guarda series especiales en las reglas del ejercicio',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('[data-home-start]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();
  await page.locator('.tab[data-tab="rutinas"]').click();
  await page.locator('[data-act="library-section"][data-section="ejercicios"]').click();
  await page.locator('[data-act="toggle-ex"]').filter({hasText:'Press banca'}).click();

  await page.locator('[data-act="ex-special-add"]').click();
  await page.locator('[data-cfg="specialSetType"]').selectOption('dropset');
  await page.locator('.tab[data-tab="hoy"]').click();
  await page.locator('.workout-card[data-ei="0"] [data-act="rm-ex"]').click();
  await page.locator('[data-act="start"]').click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"]').filter({hasText:'Press banca'}).first().click();

  const setTypes=page.locator('.workout-card[data-ei="0"] .set-type');
  await expect(setTypes).toHaveCount(4);
  await expect(setTypes.nth(3)).toHaveValue('dropset');
});

test('navega por las categorías de Ajustes y vuelve al menú',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('.tab[data-tab="ajustes"]').click();

  await expect(page.getByRole('heading',{name:'Ajustes'})).toBeVisible();
  await page.locator('[data-act="settings-section"][data-section="training"]').click();
  await expect(page.getByRole('heading',{name:'Entrenamiento'})).toBeVisible();
  await expect(page.locator('[data-setting="weightUnit"]')).toBeVisible();
  await page.locator('[data-act="settings-home"]').click();

  await expect(page.getByRole('heading',{name:'Ajustes'})).toBeVisible();
  await page.locator('[data-act="settings-section"][data-section="rest"]').click();
  await expect(page.getByRole('heading',{name:'Descanso y recordatorios'})).toBeVisible();
  await expect(page.locator('[data-setting="reminderEnabled"]')).toBeVisible();
  await page.locator('[data-act="settings-home"]').click();
  await expect(page.locator('.settings-category-card')).toHaveCount(6);
});
