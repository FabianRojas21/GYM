'use strict';

const {test,expect}=require('@playwright/test');

test('registra y termina un entrenamiento desde el flujo móvil',async({page})=>{
  await page.route('https://www.gstatic.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');

  const start=page.locator('[data-home-start]');
  await expect(start).toBeVisible();
  await start.click();
  await page.getByLabel('Añadir ejercicio').fill('Press banca');
  await page.locator('[data-act="pick"][data-lib="Press banca"]').click();

  const weight=page.locator('[data-f="w"][data-ei="0"][data-ri="0"]');
  const reps=page.locator('[data-f="r"][data-ei="0"][data-ri="0"]');
  await expect(weight).toBeVisible();
  await weight.fill('40');
  await reps.fill('8');
  await page.getByRole('button',{name:'Terminar serie'}).first().click();
  await expect(page.locator('.set-finish-done')).toBeVisible();
  await expect(page.getByRole('button',{name:'Terminar entreno'})).toBeEnabled();
  await page.getByRole('button',{name:'Terminar entreno'}).click();

  await expect(page.getByRole('heading',{name:'Resumen del entreno'})).toBeVisible();
  await expect(page.locator('.workout-summary .suggest .nm').first()).toHaveText('Press banca');
  await expect(page.locator('.workout-summary')).toContainText('1 serie efectiva');
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
});
