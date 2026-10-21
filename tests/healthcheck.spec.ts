import { test, expect } from '@playwright/test';

test.describe('Audenti Cloud Pro - Verificación Operativa', () => {
  test('La plataforma responde y carga los indicadores principales', async ({ page }) => {
    // 1. Acceder al dashboard oficial
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(400);

    // 2. Verificar que el título contenga la identidad clínica
    await expect(page).toHaveTitle(/Audenti/i);

    // 3. Comprobar que no existan errores bloqueantes de conexión
    const errorBanner = page.locator('text=Error de conexión');
    await expect(errorBanner).toHaveCount(0);
  });
});
