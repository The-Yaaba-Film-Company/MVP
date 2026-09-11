# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> boots signed-in, opens a screenplay, and mounts the writer editor
- Location: e2e/smoke.spec.ts:8:1

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
  1  | import { expect, test } from '@playwright/test'
  2  |
  3  | /**
  4  |  * Whole-app smoke on the mocked stack. The browser MSW worker signs the app
  5  |  * in (seeded GET /auth/me) and backs every /api/* call, so no FastAPI is
  6  |  * required. Exercises project → screenplay → writer and read-only scene.
  7  |  */
  8  | test('boots signed-in, opens a screenplay, and mounts the writer editor', async ({
  9  |   page,
  10 | }) => {
  11 |   await page.goto('/')
  12 |
  13 |   // Projects page renders the seeded project (already signed in).
  14 |   const project = page.getByTestId('project-card-project-1')
> 15 |   await expect(project).toBeVisible()
     |                         ^ Error: expect(locator).toBeVisible() failed
  16 |
  17 |   // Open the project → screenplays.
  18 |   await project.click()
  19 |   await page.getByTestId('screenplays-page').waitFor()
  20 |   await page.getByTestId('screenplay-card-screenplay-1').click()
  21 |
  22 |   // Writer editor mounts and is editable.
  23 |   const editor = page.getByTestId('scene-editor')
  24 |   await expect(editor).toBeVisible()
  25 |   await expect(editor).toHaveAttribute('contenteditable', 'true')
  26 |   await expect(page.getByTestId('scene-navigator')).toBeVisible()
  27 | })
  28 |
  29 | test('scene view mounts read-only with the validation panel', async ({
  30 |   page,
  31 | }) => {
  32 |   await page.goto('/projects/project-1/screenplays/screenplay-1/scene')
  33 |
  34 |   const editor = page.getByTestId('scene-editor')
  35 |   await expect(editor).toBeVisible()
  36 |   await expect(editor).toHaveAttribute('contenteditable', 'false')
  37 |   await expect(page.getByTestId('validation-panel')).toBeVisible()
  38 | })
  39 |
```
