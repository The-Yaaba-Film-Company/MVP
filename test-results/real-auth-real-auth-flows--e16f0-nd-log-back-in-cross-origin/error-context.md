# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real/auth.spec.ts >> real auth flows >> register, logout, and log back in cross-origin
- Location: e2e/real/auth.spec.ts:7:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('projects-page')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('projects-page')

```

```yaml
- main:
    - heading "Create account" [level=1]
    - text: Display name
    - textbox "Display name": Alice E2E
    - text: Email
    - textbox "Email": e2e-1788102144051-882884@example.com
    - text: Password
    - textbox "Password": password123
    - alert: Registration failed. Please try again.
    - button "Create account"
- button "Open TanStack Devtools"
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { registerViaUi, uniqueEmail } from './helpers'
  3  |
  4  | const PASSWORD = 'password123'
  5  |
  6  | test.describe('real auth flows', () => {
  7  |   test('register, logout, and log back in cross-origin', async ({ page }) => {
  8  |     const email = uniqueEmail()
  9  |     await registerViaUi(page, { email, name: 'Alice E2E' })
  10 |
  11 |     // Registration set the session via Set-Cookie across the origin boundary;
  12 |     // the app should land signed-in on the projects page.
> 13 |     await expect(page.getByTestId('projects-page')).toBeVisible()
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  14 |     await expect(page.getByTestId('app-shell-user')).toContainText('Alice E2E')
  15 |
  16 |     // Logout clears the session server-side and the cookies client-side.
  17 |     await page.getByTestId('logout-button').click()
  18 |     await expect(page.getByTestId('login-form')).toBeVisible()
  19 |
  20 |     // Login with the same credentials re-establishes the session.
  21 |     await page.getByTestId('login-email').fill(email)
  22 |     await page.getByTestId('login-password').fill(PASSWORD)
  23 |     await page.getByTestId('login-submit').click()
  24 |     await expect(page.getByTestId('projects-page')).toBeVisible()
  25 |
  26 |     // Session cookie persists across a full page reload.
  27 |     await page.reload()
  28 |     await expect(page.getByTestId('projects-page')).toBeVisible()
  29 |   })
  30 |
  31 |   test('wrong password surfaces the login error', async ({ page }) => {
  32 |     const email = uniqueEmail()
  33 |     await registerViaUi(page, { email })
  34 |     await page.getByTestId('logout-button').click()
  35 |     await expect(page.getByTestId('login-form')).toBeVisible()
  36 |
  37 |     await page.getByTestId('login-email').fill(email)
  38 |     await page.getByTestId('login-password').fill('wrong-password')
  39 |     await page.getByTestId('login-submit').click()
  40 |
  41 |     await expect(page.getByTestId('login-error')).toBeVisible()
  42 |   })
  43 | })
```
