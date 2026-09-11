# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> projects page has no WCAG A/AA violations
- Location: e2e/a11y.spec.ts:22:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('project-card-project-1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('project-card-project-1')

```

```yaml
- main:
    - heading "Sign in" [level=1]
    - text: Email
    - textbox "Email"
    - text: Password
    - textbox "Password"
    - button "Sign in"
- button "Open TanStack Devtools"
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test'
  2  | import { expect, test } from '@playwright/test'
  3  | import AxeBuilder from '@axe-core/playwright'
  4  |
  5  | /**
  6  |  * Accessibility smoke on the mocked stack (same boot path as smoke.spec.ts:
  7  |  * browser MSW worker signs in and backs /api/*). Runs an axe scan of the core
  8  |  * pages against the WCAG 2.0/2.1 A+AA success-criteria tags and fails on any
  9  |  * violation, so an accessibility regression turns CI red at the PR that
  10 |  * introduced it.
  11 |  *
  12 |  * The scan runs only after the page has hydrated to its interactive state
  13 |  * (target element visible), since axe inspects the live DOM.
  14 |  */
  15 |
  16 | const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const
  17 |
  18 | async function scan(page: Page) {
  19 |   return new AxeBuilder({ page }).withTags([...WCAG_AA_TAGS]).analyze()
  20 | }
  21 |
  22 | test('projects page has no WCAG A/AA violations', async ({ page }) => {
  23 |   await page.goto('/')
> 24 |   await expect(page.getByTestId('project-card-project-1')).toBeVisible()
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  25 |
  26 |   const results = await scan(page)
  27 |   expect(results.violations).toEqual([])
  28 | })
  29 |
  30 | test('screenplays page has no WCAG A/AA violations', async ({ page }) => {
  31 |   await page.goto('/')
  32 |   await page.getByTestId('project-card-project-1').click()
  33 |   await expect(page.getByTestId('screenplay-card-screenplay-1')).toBeVisible()
  34 |
  35 |   const results = await scan(page)
  36 |   expect(results.violations).toEqual([])
  37 | })
  38 |
  39 | test('writer page has no WCAG A/AA violations', async ({ page }) => {
  40 |   await page.goto('/projects/project-1/screenplays/screenplay-1/writer')
  41 |   await expect(page.getByTestId('scene-editor')).toBeVisible()
  42 |
  43 |   const results = await scan(page)
  44 |   expect(results.violations).toEqual([])
  45 | })
  46 |
  47 | test('scene page has no WCAG A/AA violations', async ({ page }) => {
  48 |   await page.goto('/projects/project-1/screenplays/screenplay-1/scene')
  49 |   await expect(page.getByTestId('validation-panel')).toBeVisible()
  50 |
  51 |   const results = await scan(page)
  52 |   expect(results.violations).toEqual([])
  53 | })
  54 |
```
