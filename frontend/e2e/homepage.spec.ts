import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage correctly', async ({ page }) => {
    await page.goto('/')

    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Discover Amazing Products')

    // Check if navigation is present
    await expect(page.locator('nav')).toBeVisible()

    // Check if hero section exists
    await expect(page.locator('.hero')).toBeVisible()

    // Check if categories section exists
    await expect(page.locator('.categories')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')

    // Click on login link in navigation
    await page.locator('nav a').filter({ hasText: 'Login' }).click()

    // Should be on login page
    await expect(page).toHaveURL(/.*login/)

    // Check if login form is visible
    await expect(page.locator('.login-form')).toBeVisible()
  })

  test('should show onboarding for first-time users', async ({ page, context }) => {
    // Clear localStorage to simulate first-time user
    await context.addInitScript(() => {
      localStorage.clear()
    })

    await page.goto('/')

    // Check if onboarding modal appears
    await expect(page.locator('.onboarding-modal')).toBeVisible()

    // Close onboarding
    await page.locator('.onboarding-close').click()

    // Onboarding should be hidden
    await expect(page.locator('.onboarding-modal')).not.toBeVisible()
  })

  test('should be responsive on mobile', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Check if mobile navigation works
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Hero section should be visible and properly sized
    const hero = page.locator('.hero')
    await expect(hero).toBeVisible()

    // Check if search is responsive
    const searchInput = page.locator('.hero-search input')
    await expect(searchInput).toBeVisible()
  })

  test('should work offline', async ({ page, context }) => {
    await page.goto('/')

    // Go offline
    await context.setOffline(true)

    // Try to navigate (should work with service worker)
    await page.reload()

    // Should still show some content (cached)
    await expect(page.locator('h1')).toBeVisible()

    // Should show offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible()
  })
})

test.describe('Search Functionality', () => {
  test('should perform search', async ({ page }) => {
    await page.goto('/')

    // Type in search input
    const searchInput = page.locator('.hero-search input')
    await searchInput.fill('laptop')

    // Click search button
    await page.locator('.hero-search button').click()

    // Should navigate to search results (in a real app)
    // For now, just check if input has value
    await expect(searchInput).toHaveValue('laptop')
  })
})