/**
 * Authentication fixtures for E2E testing.
 *
 * Provides utilities for creating authenticated test contexts.
 */
import { test as base, expect } from '@playwright/test';

export const TEST_USER = {
  phone: process.env.E2E_TEST_USER_PHONE || '',
  password: process.env.E2E_TEST_USER_PASSWORD || '',
  name: process.env.E2E_TEST_USER_NAME || 'Test User',
};

export const STORAGE_STATE_PATH = 'e2e/.auth/user.json';

export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  authenticatedPage: async ({ page }, provide) => {
    if (!TEST_USER.phone || !TEST_USER.password) {
      await provide(page);
      return;
    }

    await page.goto('/login');

    await page.fill('input[name="phone"], input[type="tel"]', TEST_USER.phone);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|tours)/, { timeout: 10000 }).catch(() => {
      console.warn('Login redirect timeout - backend may not be available');
    });

    await provide(page);
  },
});

export async function globalAuthSetup(page: ReturnType<typeof base.extend>['page']) {
  if (!TEST_USER.phone || !TEST_USER.password) {
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    return;
  }

  await page.goto('/login');

  await page.fill('input[name="phone"], input[type="tel"]', TEST_USER.phone);
  await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|tours)/);

  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

export async function isAuthenticated(page: ReturnType<typeof base.extend>['page']): Promise<boolean> {
  const token = await page.evaluate(() => {
    return (
      localStorage.getItem('auth_token') ||
      localStorage.getItem('supabase.auth.token') ||
      sessionStorage.getItem('auth_token')
    );
  });
  return !!token;
}

export async function waitForAuth(page: ReturnType<typeof base.extend>['page'], timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await isAuthenticated(page)) {
      return true;
    }
    await page.waitForTimeout(100);
  }
  return false;
}

export { expect };
