import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Cross-origin API helper that runs fetch inside the page, so it exercises the
 *  exact same CORS + credential + CSRF path as the app itself. */
export async function apiFetch<T>(
  page: Page,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  return page.evaluate(async (args) => {
    const { path: p, method, body } = args
    const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1]
    const res = await fetch(`http://localhost:8001/api${p}`, {
      method: method ?? 'GET',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(method && method !== 'GET' && csrf
          ? { 'X-CSRF-Token': decodeURIComponent(csrf) }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      throw new Error(
        `${method ?? 'GET'} ${p} -> ${res.status}: ${await res.text()}`,
      )
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }, { path, method: init.method, body: init.body })
}

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

/** Retry an apiFetch until `predicate` matches, or fail after timeoutMs. */
async function pollApi<T>(
  page: Page,
  path: string,
  predicate: (data: T) => boolean,
  timeoutMs = 15_000,
  everyMs = 300,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let last: T | undefined
  while (Date.now() < deadline) {
    try {
      last = await apiFetch<T>(page, path)
      if (predicate(last)) return last
    } catch {
      last = undefined
    }
    await page.waitForTimeout(everyMs)
  }
  throw new Error(
    `timed out after ${timeoutMs}ms waiting for ${path} (last: ${JSON.stringify(
      last,
    ).slice(0, 200)})`,
  )
}

/**
 * Wait until a scene's content containing `phrase` is persisted to the real DB.
 * Autosave debounces (800ms) and the UI's "Saved" default status is not proof
 * a PATCH completed — this polls the scenes endpoint instead, so reload/search
 * steps below never race the debounce.
 */
export async function waitForSceneText(
  page: Page,
  screenplayId: string,
  phrase: string,
): Promise<void> {
  await pollApi<{ items: Array<{ id: string; content: unknown }> }>(
    page,
    `/screenplays/${screenplayId}/scenes`,
    (res) =>
      res.items.some((s) =>
        JSON.stringify(s.content).includes(phrase),
      ),
  )
}

export async function registerViaUi(
  page: Page,
  opts: { email: string; password?: string; name?: string },
): Promise<void> {
  await page.goto('/register')
  // The register page is server-rendered; React hydrates shortly after load.
  // Submitting before the onSubmit handler is attached falls back to a native
  // form GET (no POST to /api/auth/register), so wait for the bundle to settle.
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('register-form')).toBeVisible()
  await page.getByTestId('register-name').fill(opts.name ?? 'E2E User')
  await page.getByTestId('register-email').fill(opts.email)
  await page.getByTestId('register-password').fill(opts.password ?? 'password123')
  await page.getByTestId('register-submit').click()
}

/** Register + create project + screenplay, returning both ids. */
export async function bootstrapProject(page: Page, title = 'E2E Film') {
  await registerViaUi(page, { email: uniqueEmail() })
  await expect(page.getByTestId('projects-page')).toBeVisible()

  // The create POST and this GET race; poll until the project is committed.
  await page.getByTestId('new-project-button').click()
  await page.getByTestId('project-title').fill(title)
  await page.getByTestId('project-create-submit').click()
  const projects = await pollApi<Array<{ id: string; title: string }>>(
    page,
    '/projects',
    (list) => list.some((p) => p.title === title),
  )
  const project = projects.find((p) => p.title === title)
  if (!project) throw new Error(`project ${title} not created`)
  await page.getByTestId(`project-card-${project.id}`).click()

  await expect(page.getByTestId('screenplays-page')).toBeVisible()
  await page.getByTestId('new-screenplay-button').click()
  await page.getByTestId('screenplay-title').fill('E2E Script')
  await page.getByTestId('screenplay-create-submit').click()
  const screenplays = await pollApi<
    Array<{ id: string; title: string }>
  >(
    page,
    `/projects/${project.id}/screenplays`,
    (list) => list.some((s) => s.title === 'E2E Script'),
  )
  const screenplay = screenplays.find((s) => s.title === 'E2E Script')
  if (!screenplay) throw new Error('screenplay not created')

  return { projectId: project.id, screenplayId: screenplay.id }
}