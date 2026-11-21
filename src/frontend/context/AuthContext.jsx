import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService.js'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../services/httpClient.js'

const STORAGE_KEY = 'splitnest.session'
const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeStoredUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Storage can be unavailable in private browsing; state still works.
  }
}

function removeStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing else to do.
  }
}

function readInitialSession() {
  const hasToken = Boolean(getStoredToken())
  return {
    hasToken,
    user: hasToken ? readStoredUser() : null,
  }
}

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.displayName,
    displayName: user.displayName,
    email: user.email,
    memberSince: user.memberSince,
    bankDetails: user.bankDetails ?? null,
  }
}

export function AuthProvider({ children }) {
  const [initial] = useState(readInitialSession)
  const [user, setUser] = useState(initial.user)
  // The snapshot in localStorage makes a refresh instant. The API call below
  // still refreshes it and ends the session if the token has expired.
  const [isBootstrapping, setIsBootstrapping] = useState(
    initial.hasToken && !initial.user,
  )

  const clearSession = useCallback(() => {
    clearStoredToken()
    removeStoredUser()
    setUser(null)
    setIsBootstrapping(false)
  }, [])

  const applySession = useCallback((session, persist = true) => {
    setStoredToken(session.token, persist)
    const nextUser = toSessionUser(session.user)
    setUser(nextUser)
    writeStoredUser(nextUser)
    setIsBootstrapping(false)
    return nextUser
  }, [])

  const updateUser = useCallback((nextUser) => {
    const mapped = toSessionUser(nextUser)
    setUser(mapped)
    writeStoredUser(mapped)
    return mapped
  }, [])

  useEffect(() => {
    if (!getStoredToken()) {
      removeStoredUser()
      setIsBootstrapping(false)
      return undefined
    }

    let active = true
    authService
      .me()
      .then((payload) => {
        if (active) updateUser(payload.user)
      })
      .catch((error) => {
        // A network outage should not throw away a usable local snapshot; an
        // expired or revoked token should.
        if (active && error.status === 401) clearSession()
      })
      .finally(() => {
        if (active) setIsBootstrapping(false)
      })

    return () => {
      active = false
    }
  }, [clearSession, updateUser])

  const login = useCallback(
    async ({ email, password, remember = true }) => {
      const session = await authService.login({ email, password })
      return applySession(session, remember)
    },
    [applySession],
  )

  const register = useCallback(
    async ({ displayName, email, password }) => {
      const session = await authService.register({ displayName, email, password })
      return applySession(session, true)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const token = getStoredToken()
    clearSession()
    if (!token) return
    try {
      await authService.logout(token)
    } catch {
      // The local session is already gone; the token expires on its own.
    }
  }, [clearSession])

  const saveBankDetails = useCallback(
    async (bankDetails) => {
      const payload = await authService.saveBankDetails(bankDetails)
      return updateUser(payload.user)
    },
    [updateUser],
  )

  const removeBankDetails = useCallback(async () => {
    const payload = await authService.removeBankDetails()
    return updateUser(payload.user)
  }, [updateUser])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      saveBankDetails,
      removeBankDetails,
    }),
    [
      user,
      isBootstrapping,
      login,
      register,
      logout,
      saveBankDetails,
      removeBankDetails,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
