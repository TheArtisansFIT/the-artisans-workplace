const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'splitnest.token'

export class ApiError extends Error {
  constructor(message, status = 0, code = 'request_failed', fields = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

function read(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

function remove(storage, key) {
  try {
    storage.removeItem(key)
  } catch {
    // Nothing else to do.
  }
}

export function getStoredToken() {
  return (
    read(globalThis.localStorage, TOKEN_KEY) ||
    read(globalThis.sessionStorage, TOKEN_KEY)
  )
}

export function setStoredToken(token, persist = true) {
  clearStoredToken()
  write(persist ? globalThis.localStorage : globalThis.sessionStorage, TOKEN_KEY, token)
}

export function clearStoredToken() {
  remove(globalThis.localStorage, TOKEN_KEY)
  remove(globalThis.sessionStorage, TOKEN_KEY)
}

async function request(path, { method = 'GET', body, token, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const sessionToken = token ?? (auth ? getStoredToken() : null)
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Cannot reach the SplitNest server. Check that the backend is running.',
      0,
      'network_error',
    )
  }

  const text = response.status === 204 ? '' : await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const error = payload?.error ?? {}
    throw new ApiError(
      error.message || `The request failed (HTTP ${response.status}).`,
      response.status,
      error.code || 'request_failed',
      error.fields || {},
    )
  }

  return payload
}

export const api = {
  register: (body) =>
    request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  me: () => request('/auth/me'),
  saveBankDetails: (body) =>
    request('/users/me/bank-details', { method: 'PUT', body }),
  removeBankDetails: () =>
    request('/users/me/bank-details', { method: 'DELETE' }),
}
