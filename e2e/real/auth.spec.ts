import { expect, test } from '@playwright/test'
import { registerViaUi, uniqueEmail } from './helpers'

const PASSWORD = 'password123'

test.describe('real auth flows', () => {
  test('register, logout, and log back in cross-origin', async ({ page }) => {
    const email = uniqueEmail()
    await registerViaUi(page, { email, name: 'Alice E2E' })

    // Registration set the session via Set-Cookie across the origin boundary;
    // the app should land signed-in on the projects page.
    await expect(page.getByTestId('projects-page')).toBeVisible()
    await expect(page.getByTestId('app-shell-user')).toContainText('Alice E2E')

    // Logout clears the session server-side and the cookies client-side.
    await page.getByTestId('logout-button').click()
    await expect(page.getByTestId('login-form')).toBeVisible()

    // Login with the same credentials re-establishes the session.
    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill(PASSWORD)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('projects-page')).toBeVisible()

    // Session cookie persists across a full page reload.
    await page.reload()
    await expect(page.getByTestId('projects-page')).toBeVisible()
  })

  test('wrong password surfaces the login error', async ({ page }) => {
    const email = uniqueEmail()
    await registerViaUi(page, { email })
    await page.getByTestId('logout-button').click()
    await expect(page.getByTestId('login-form')).toBeVisible()

    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill('wrong-password')
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error')).toBeVisible()
  })
})