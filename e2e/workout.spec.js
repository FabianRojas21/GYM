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
