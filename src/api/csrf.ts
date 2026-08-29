export const CSRF_COOKIE = 'csrf_token'

/** Read the not-HttpOnly CSRF cookie (SPEC.md §3.2). Never reads session_id. */
export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}
