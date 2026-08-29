import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility smoke on the mocked stack (same boot path as smoke.spec.ts:
 * browser MSW worker signs in and backs /api/*). Runs an axe scan of the core
 * pages against the WCAG 2.0/2.1 A+AA success-criteria tags and fails on any
 * violation, so an accessibility regression turns CI red at the PR that
 * introduced it.
 *
 * The scan runs only after the page has hydrated to its interactive state
 * (target element visible), since axe inspects the live DOM.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags([...WCAG_AA_TAGS]).analyze()
}

test('projects page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('project-card-project-1')).toBeVisible()

  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('screenplays page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('project-card-project-1').click()
  await expect(page.getByTestId('screenplay-card-screenplay-1')).toBeVisible()

  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('writer page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/projects/project-1/screenplays/screenplay-1/writer')
  await expect(page.getByTestId('scene-editor')).toBeVisible()

  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('scene page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/projects/project-1/screenplays/screenplay-1/scene')
  await expect(page.getByTestId('validation-panel')).toBeVisible()

  const results = await scan(page)
  expect(results.violations).toEqual([])
})
