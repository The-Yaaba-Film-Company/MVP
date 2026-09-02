import { expect, test } from '@playwright/test'
import { apiFetch, bootstrapProject } from './helpers'

// A dialogue node with no preceding character violates the validation rule
// "Dialogue has no associated Character." Seeding it via the API (inside the
// page, same CORS/CSRF path as the app) keeps the E2E focused on the real
// computed-on-read validation endpoint rather than fighting the Tiptap UI.
const BAD_SCENE = {
  type: 'doc' as const,
  content: [
    {
      type: 'sceneHeading',
      attrs: { intExt: 'INT', location: 'BACK ALLEY', timeOfDay: 'NIGHT' },
    },
    {
      type: 'dialogue',
      attrs: { id: 'orphan-d1' },
      text: 'You were never supposed to be here.',
    },
  ],
}

test.describe('real validation flow', () => {
  test('read-only scene view reports dialogue without a character', async ({
    page,
  }) => {
    const { projectId, screenplayId } = await bootstrapProject(page)

    const scene = await apiFetch<{ id: string }>(
      page,
      `/screenplays/${screenplayId}/scenes`,
      { method: 'POST', body: { content: BAD_SCENE } },
    )

    // The panel is fed by GET /scenes/{id}/validation — computed on read.
    const validation = await apiFetch<{
      items: Array<{ id: string; message: string }>
    }>(page, `/scenes/${scene.id}/validation`)
    const orphan = validation.items.find((issue) =>
      issue.message.includes('Dialogue has no associated Character.'),
    )
    expect(orphan).toBeTruthy()

    await page.goto(
      `/projects/${projectId}/screenplays/${screenplayId}/scene`,
    )
    await expect(page.getByTestId('validation-panel')).toBeVisible()
    await expect(page.getByTestId('scene-editor')).toHaveAttribute(
      'contenteditable',
      'false',
    )
    // The backend regenerates issue ids on every read (validation is never
    // persisted), so the panel's ids differ from the ones fetched above.
    // Assert on the stable message text + prefix instead of a specific id.
    await expect(page.getByTestId('validation-panel')).toContainText(
      'Dialogue has no associated Character.',
    )
    const issues = page.locator('[data-testid^="validation-issue-"]')
    await expect(issues.first()).toContainText(
      'Dialogue has no associated Character.',
    )
  })
})