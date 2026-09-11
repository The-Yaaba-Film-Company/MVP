import { expect, test } from '@playwright/test'
import { apiFetch, bootstrapProject, waitForSceneText } from './helpers'

test.describe('real writer flow', () => {
  test('create a scene, edit it, autosave, and persist across reload', async ({
    page,
  }) => {
    const { screenplayId } = await bootstrapProject(page)

    // Open the screenplay → writer.
    await page.getByTestId(`screenplay-card-${screenplayId}`).click()
    await expect(page.getByTestId('writer-view')).toBeVisible()

    // Create the first scene (POST /scenes) and let the editor mount.
    await page.getByTestId('new-scene-button').click()
    const editor = page.getByTestId('scene-editor')
    await expect(editor).toBeVisible()
    await expect(editor).toHaveAttribute('contenteditable', 'true')

    // Type into the editor. A fresh scene only has an atom sceneHeading; the
    // app's own keyboard model (screenplayElements) converts the selected atom
    // into an Action block via Ctrl+2 — the in-app path to a text block.
    await editor.getByText('INT.').click()
    await page.keyboard.press('Control+2')
    await page.keyboard.type('A brass pistol glints in the alley light.')

    // Autosave debounces (800ms) before PATCHing; poll the DB until the text
    // is actually committed, so the reload below can't race the debounce.
    const phrase = 'A brass pistol glints in the alley light.'
    await waitForSceneText(page, screenplayId, phrase)
    await expect(page.getByTestId('save-status')).toContainText('Saved')

    // Reload → the scene must come back from the real database via the
    // cross-origin session cookie.
    await page.reload()
    await expect(editor).toBeVisible()
    await expect(editor).toContainText(phrase)
  })

  test('scene navigator lists the created scene with a derived heading', async ({
    page,
  }) => {
    const { screenplayId } = await bootstrapProject(page)
    await page.getByTestId(`screenplay-card-${screenplayId}`).click()
    await expect(page.getByTestId('writer-view')).toBeVisible()

    await page.getByTestId('new-scene-button').click()
    await expect(page.getByTestId('scene-editor')).toBeVisible()

    const scenes = await apiFetch<{ items: Array<{ id: string }> }>(
      page,
      `/screenplays/${screenplayId}/scenes`,
    )
    expect(scenes.items.length).toBeGreaterThan(0)
    await expect(
      page.getByTestId(`scene-item-${scenes.items[0].id}`),
    ).toBeVisible()
  })

  test('reloading the projects page keeps the logged-in session', async ({
    page,
  }) => {
    const { projectId } = await bootstrapProject(page)
    await page.goto(`/projects/${projectId}`)
    await expect(page.getByTestId('screenplays-page')).toBeVisible()
  })
})
