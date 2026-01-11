import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check form elements are visible
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Check for validation errors (HTML5 or custom)
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/login');

      // Enter invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Email input should be invalid
      const emailInput = page.getByLabel(/email/i);
      const isInvalid = await emailInput.evaluate((el) => !el.validity.valid);
      expect(isInvalid).toBe(true);
    });

    test('should have link to register page', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
      await expect(registerLink).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Register', () => {
    test('should display register form', async ({ page }) => {
      await page.goto('/register');

      // Check form elements are visible
      await expect(page.getByLabel(/name|full name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up|register|create/i })).toBeVisible();
    });

    test('should show validation for password requirements', async ({ page }) => {
      await page.goto('/register');

      // Enter weak password
      await page.getByLabel(/name|full name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).first().fill('123');

      // Submit form
      await page.getByRole('button', { name: /sign up|register|create/i }).click();

      // Password should fail validation (minLength)
      // This checks that form was not submitted (we're still on register page)
      await expect(page).toHaveURL(/register/);
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: /login|sign in|already have/i });
      await expect(loginLink).toBeVisible();
    });
  });
});
