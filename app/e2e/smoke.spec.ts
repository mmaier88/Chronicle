import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')

    // Check for main heading
    await expect(page.locator('h1')).toBeVisible()

    // Check for CTA button
    const ctaButton = page.getByRole('link', { name: /create|story|start/i })
    await expect(ctaButton).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')

    // Check for Chronicle branding
    await expect(page.getByText('Chronicle')).toBeVisible()

    // Check for sign in text
    await expect(page.getByText(/sign in/i)).toBeVisible()

    // Check for Google OAuth button
    const googleButton = page.getByRole('button', { name: /google/i })
    await expect(googleButton).toBeVisible()

    // Check for magic link form
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')

    // Check for Chronicle branding
    await expect(page.getByText('Chronicle')).toBeVisible()

    // Check for signup elements
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('legal page loads', async ({ page }) => {
    await page.goto('/legal')
    await expect(page.getByText(/terms|privacy|legal/i)).toBeVisible()
  })

  test('imprint page loads', async ({ page }) => {
    await page.goto('/imprint')
    await expect(page).toHaveURL('/imprint')
  })
})

test.describe('Create Flow (Unauthenticated)', () => {
  test('redirects to login when accessing create', async ({ page }) => {
    await page.goto('/create')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects to login when accessing create/new', async ({ page }) => {
    await page.goto('/create/new')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Navigation', () => {
  test('can navigate from landing to login', async ({ page }) => {
    await page.goto('/')

    // Click any CTA that leads to create/login
    const ctaLink = page.getByRole('link', { name: /create|start|sign/i }).first()
    if (await ctaLink.isVisible()) {
      await ctaLink.click()
      // Should end up at login or create page
      await expect(page).toHaveURL(/\/(login|create)/)
    }
  })

  test('login page has signup link', async ({ page }) => {
    await page.goto('/login')

    const signupLink = page.getByRole('link', { name: /sign up/i })
    await expect(signupLink).toBeVisible()
    await signupLink.click()

    await expect(page).toHaveURL('/signup')
  })

  test('signup page has login link', async ({ page }) => {
    await page.goto('/signup')

    const loginLink = page.getByRole('link', { name: /sign in|log in/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()

    await expect(page).toHaveURL('/login')
  })
})
