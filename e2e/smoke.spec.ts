import { expect, test } from '@playwright/test'

/**
 * Whole-app smoke on the mocked stack. The browser MSW worker signs the app
 * in (seeded GET /auth/me) and backs every /api/* call, so no FastAPI is
 * required. Exercises project → screenplay → writer and read-only scene.
 */
test('boots signed-in, opens a screenplay, and mounts the writer editor', async ({
  page,
}) => {
  await page.goto('/')

  // Projects page renders the seeded project (already signed in).
  const project = page.getByTestId('project-card-project-1')
  await expect(project).toBeVisible()

  // Open the project → screenplays.
  await project.click()
  await page.getByTestId('screenplays-page').waitFor()
  await page.getByTestId('screenplay-card-screenplay-1').click()

  // Writer editor mounts and is editable.
  const editor = page.getByTestId('scene-editor')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveAttribute('contenteditable', 'true')
  await expect(page.getByTestId('scene-navigator')).toBeVisible()
})

test('scene view mounts read-only with the validation panel', async ({
  page,
}) => {
  await page.goto('/projects/project-1/screenplays/screenplay-1/scene')

  const editor = page.getByTestId('scene-editor')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveAttribute('contenteditable', 'false')
  await expect(page.getByTestId('validation-panel')).toBeVisible()
})
