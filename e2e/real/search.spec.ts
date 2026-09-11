import { expect, test } from '@playwright/test'
import { bootstrapProject, waitForSceneText } from './helpers'

test.describe('real project search', () => {
  test('typed scene text is found by the project search', async ({ page }) => {
    const { screenplayId } = await bootstrapProject(page)

    // Add a scene and type a distinctive term so it lands in a text block
    // (action paragraph) that the search endpoint matches on.
    await page.getByTestId(`screenplay-card-${screenplayId}`).click()
    await expect(page.getByTestId('writer-view')).toBeVisible()
    await page.getByTestId('new-scene-button').click()
    const editor = page.getByTestId('scene-editor')
    await expect(editor).toBeVisible()

    // A fresh scene only has an atom sceneHeading; convert it to an Action block
    // (Ctrl+2, the app's screenplayElements shortcut) then type.
    await editor.getByText('INT.').click()
    await page.keyboard.press('Control+2')
    await page.keyboard.type('The ZAPHOD beacon hums in the rain.')

    // Wait for the autosave PATCH to commit so the search (which reads the
    // scene content straight from the DB) can't run before the text lands.
    await waitForSceneText(page, screenplayId, 'ZAPHOD')

    // Search the project from the screenplay header (real GET /search).
    const search = page.getByTestId('project-search-input')
    await search.fill('ZAPHOD')
    await expect(page.getByTestId('project-search-results')).toBeVisible()
    const result = page.locator('[data-testid^="search-result-"]')
    await expect(result.first()).toContainText('ZAPHOD')
  })
})
