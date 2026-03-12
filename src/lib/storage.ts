const VERSION = 'aimap:v1'

function userKey(userLogin: string, key: string): string {
  return `${VERSION}:${userLogin}:${key}`
}

export function getStoredJSON<T>(userLogin: string, key: string): T | null {
  try {
    const raw = localStorage.getItem(userKey(userLogin, key))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setStoredJSON<T>(userLogin: string, key: string, value: T): void {
  localStorage.setItem(userKey(userLogin, key), JSON.stringify(value))
}

export function removeStored(userLogin: string, key: string): void {
  localStorage.removeItem(userKey(userLogin, key))
}

// Session storage (not user-keyed)
const SESSION_PREFIX = 'aimap:session'

function sessionKey(key: string): string {
  return `${SESSION_PREFIX}:${key}`
}

export function getSessionJSON<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(key))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setSessionJSON<T>(key: string, value: T): void {
  sessionStorage.setItem(sessionKey(key), JSON.stringify(value))
}

export function removeSession(key: string): void {
  sessionStorage.removeItem(sessionKey(key))
}

// Auth storage (flat prefix, not user-keyed)
const AUTH_PREFIX = 'aimap:auth'

export function getAuthItem(key: string): string | null {
  return localStorage.getItem(`${AUTH_PREFIX}:${key}`)
}

export function setAuthItem(key: string, value: string): void {
  localStorage.setItem(`${AUTH_PREFIX}:${key}`, value)
}

export function getAuthJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${AUTH_PREFIX}:${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setAuthJSON<T>(key: string, value: T): void {
  localStorage.setItem(`${AUTH_PREFIX}:${key}`, JSON.stringify(value))
}

export function clearAuth(): void {
  localStorage.removeItem(`${AUTH_PREFIX}:token`)
  localStorage.removeItem(`${AUTH_PREFIX}:user`)
}
