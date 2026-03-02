let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      accessToken = null
      return null
    }
    const data = await res.json() as { accessToken: string }
    accessToken = data.accessToken
    return accessToken
  } catch {
    accessToken = null
    return null
  }
}

async function getValidToken(): Promise<string | null> {
  if (accessToken) return accessToken
  // Only one refresh request at a time
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401) {
    // Try refresh once
    const newToken = await doRefresh()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      const retry = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' })
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: retry.statusText })) as { error?: string }
        throw new ApiError(retry.status, err?.error ?? retry.statusText)
      }
      if (retry.status === 204) return undefined as T
      return retry.json() as Promise<T>
    }
    // Redirect to login
    accessToken = null
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new ApiError(res.status, err?.error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Typed helpers
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
