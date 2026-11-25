import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { displayNameFromEmail } from '../utils/format.js'

const STORAGE_KEY = 'splitnest.session'
const AuthContext = createContext(null)

function readStoredSession() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // This is a frontend-only session placeholder. It will be replaced by the
  // Flask authentication endpoints in the integration stage.
  const [user, setUser] = useState(readStoredSession)

  const login = useCallback(({ email, name }) => {
    const nextUser = {
      id: 'minh',
      name: name || displayNameFromEmail(email),
      email: email.trim(),
    }
    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // Storage can be unavailable in private browsing; the session still works.
    }
    return nextUser
  }, [])

  const register = useCallback(
    ({ displayName, email }) => login({ email, name: displayName }),
    [login],
  )

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing else to do.
    }
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
