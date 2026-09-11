# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real/auth.spec.ts >> real auth flows >> wrong password surfaces the login error
- Location: e2e/real/auth.spec.ts:31:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('logout-button')

```

# Page snapshot

```yaml
- generic [ref=e1]:
    - main [ref=e2]:
        - heading "Create account" [level=1] [ref=e3]
        - generic [ref=e4]:
            - generic [ref=e5]:
                - text: Display name
                - textbox "Display name" [ref=e6]: E2E User
            - generic [ref=e7]:
                - text: Email
                - textbox "Email" [ref=e8]: e2e-1788102156917-424462@example.com
            - generic [ref=e9]:
                - text: Password
                - textbox "Password" [ref=e10]: password123
            - alert [ref=e11]: Registration failed. Please try again.
            - button "Create account" [active] [ref=e12]
    - button "Open TanStack Devtools" [ref=e13] [cursor=pointer]
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
  13 |     await expect(page.getByTestId('projects-page')).toBeVisible()
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
> 34 |     await page.getByTestId('logout-button').click()
     |                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
