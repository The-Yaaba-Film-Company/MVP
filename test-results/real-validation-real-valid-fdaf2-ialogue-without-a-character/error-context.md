# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real/validation.spec.ts >> real validation flow >> read-only scene view reports dialogue without a character
- Location: e2e/real/validation.spec.ts:24:3

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
  - textbox "Display name": E2E User
  - text: Email
  - textbox "Email": e2e-1788102215992-933341@example.com
  - text: Password
  - textbox "Password": password123
  - alert: Registration failed. Please try again.
  - button "Create account"
- button "Open TanStack Devtools"
```

# Test source

```ts
  6   | export async function apiFetch<T>(
  7   |   page: Page,
  8   |   path: string,
  9   |   init: { method?: string; body?: unknown } = {},
  10  | ): Promise<T> {
  11  |   return page.evaluate(async (args) => {
  12  |     const { path: p, method, body } = args
  13  |     const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1]
  14  |     const res = await fetch(`http://localhost:8001/api${p}`, {
  15  |       method: method ?? 'GET',
  16  |       credentials: 'include',
  17  |       headers: {
  18  |         accept: 'application/json',
  19  |         ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
  20  |         ...(method && method !== 'GET' && csrf
  21  |           ? { 'X-CSRF-Token': decodeURIComponent(csrf) }
  22  |           : {}),
  23  |       },
  24  |       ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  25  |     })
  26  |     if (!res.ok) {
  27  |       throw new Error(
  28  |         `${method ?? 'GET'} ${p} -> ${res.status}: ${await res.text()}`,
  29  |       )
  30  |     }
  31  |     if (res.status === 204) return undefined as T
  32  |     return (await res.json()) as T
  33  |   }, { path, method: init.method, body: init.body })
  34  | }
  35  | 
  36  | export function uniqueEmail(): string {
  37  |   return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  38  | }
  39  | 
  40  | /** Retry an apiFetch until `predicate` matches, or fail after timeoutMs. */
  41  | async function pollApi<T>(
  42  |   page: Page,
  43  |   path: string,
  44  |   predicate: (data: T) => boolean,
  45  |   timeoutMs = 15_000,
  46  |   everyMs = 300,
  47  | ): Promise<T> {
  48  |   const deadline = Date.now() + timeoutMs
  49  |   let last: T | undefined
  50  |   while (Date.now() < deadline) {
  51  |     try {
  52  |       last = await apiFetch<T>(page, path)
  53  |       if (predicate(last)) return last
  54  |     } catch {
  55  |       last = undefined
  56  |     }
  57  |     await page.waitForTimeout(everyMs)
  58  |   }
  59  |   throw new Error(
  60  |     `timed out after ${timeoutMs}ms waiting for ${path} (last: ${JSON.stringify(
  61  |       last,
  62  |     ).slice(0, 200)})`,
  63  |   )
  64  | }
  65  | 
  66  | /**
  67  |  * Wait until a scene's content containing `phrase` is persisted to the real DB.
  68  |  * Autosave debounces (800ms) and the UI's "Saved" default status is not proof
  69  |  * a PATCH completed — this polls the scenes endpoint instead, so reload/search
  70  |  * steps below never race the debounce.
  71  |  */
  72  | export async function waitForSceneText(
  73  |   page: Page,
  74  |   screenplayId: string,
  75  |   phrase: string,
  76  | ): Promise<void> {
  77  |   await pollApi<{ items: Array<{ id: string; content: unknown }> }>(
  78  |     page,
  79  |     `/screenplays/${screenplayId}/scenes`,
  80  |     (res) =>
  81  |       res.items.some((s) =>
  82  |         JSON.stringify(s.content).includes(phrase),
  83  |       ),
  84  |   )
  85  | }
  86  | 
  87  | export async function registerViaUi(
  88  |   page: Page,
  89  |   opts: { email: string; password?: string; name?: string },
  90  | ): Promise<void> {
  91  |   await page.goto('/register')
  92  |   // The register page is server-rendered; React hydrates shortly after load.
  93  |   // Submitting before the onSubmit handler is attached falls back to a native
  94  |   // form GET (no POST to /api/auth/register), so wait for the bundle to settle.
  95  |   await page.waitForLoadState('networkidle')
  96  |   await expect(page.getByTestId('register-form')).toBeVisible()
  97  |   await page.getByTestId('register-name').fill(opts.name ?? 'E2E User')
  98  |   await page.getByTestId('register-email').fill(opts.email)
  99  |   await page.getByTestId('register-password').fill(opts.password ?? 'password123')
  100 |   await page.getByTestId('register-submit').click()
  101 | }
  102 | 
  103 | /** Register + create project + screenplay, returning both ids. */
  104 | export async function bootstrapProject(page: Page, title = 'E2E Film') {
  105 |   await registerViaUi(page, { email: uniqueEmail() })
> 106 |   await expect(page.getByTestId('projects-page')).toBeVisible()
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  107 | 
  108 |   // The create POST and this GET race; poll until the project is committed.
  109 |   await page.getByTestId('new-project-button').click()
  110 |   await page.getByTestId('project-title').fill(title)
  111 |   await page.getByTestId('project-create-submit').click()
  112 |   const projects = await pollApi<Array<{ id: string; title: string }>>(
  113 |     page,
  114 |     '/projects',
  115 |     (list) => list.some((p) => p.title === title),
  116 |   )
  117 |   const project = projects.find((p) => p.title === title)
  118 |   if (!project) throw new Error(`project ${title} not created`)
  119 |   await page.getByTestId(`project-card-${project.id}`).click()
  120 | 
  121 |   await expect(page.getByTestId('screenplays-page')).toBeVisible()
  122 |   await page.getByTestId('new-screenplay-button').click()
  123 |   await page.getByTestId('screenplay-title').fill('E2E Script')
  124 |   await page.getByTestId('screenplay-create-submit').click()
  125 |   const screenplays = await pollApi<
  126 |     Array<{ id: string; title: string }>
  127 |   >(
  128 |     page,
  129 |     `/projects/${project.id}/screenplays`,
  130 |     (list) => list.some((s) => s.title === 'E2E Script'),
  131 |   )
  132 |   const screenplay = screenplays.find((s) => s.title === 'E2E Script')
  133 |   if (!screenplay) throw new Error('screenplay not created')
  134 | 
  135 |   return { projectId: project.id, screenplayId: screenplay.id }
  136 | }
```