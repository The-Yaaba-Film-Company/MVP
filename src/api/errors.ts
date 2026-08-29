export type ApiErrorCode =
  | 'NETWORK'
  | 'UNAUTHENTICATED'
  | 'CSRF_FAILED'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly detail: unknown

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  401: 'UNAUTHENTICATED',
  403: 'CSRF_FAILED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
}

/** Event fired on window when any request returns 401 (route guards redirect). */
export const AUTH_EXPIRED_EVENT = 'auth:session-expired'

async function parseBody(
  res: Response,
): Promise<{ detail?: unknown; message?: string }> {
  try {
    return (await res.json()) as { detail?: unknown; message?: string }
  } catch {
    return {}
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  const body = await parseBody(res)
  const code = CODE_BY_STATUS[res.status] ?? 'SERVER'
  const message =
    typeof body.detail === 'string'
      ? body.detail
      : typeof body.message === 'string'
        ? body.message
        : `Request failed with status ${res.status}`
  const detail = body.detail ?? res.status

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
  }

  if (res.status === 409) {
    return new ApiError(
      res.status,
      'CONFLICT',
      'This scene changed on the server. Reloading your changes.',
      detail,
    )
  }

  return new ApiError(res.status, code, message, detail)
}

export function toNetworkError(cause: unknown): ApiError {
  return new ApiError(
    0,
    'NETWORK',
    'Network error. Check your connection and try again.',
    cause,
  )
}
