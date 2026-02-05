import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, setUnauthorizedHandler } from '../api.js'
import { STORAGE_KEYS } from '../constants.js'
import { getUserLabel } from '../utils.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.authToken))
  const [adminStatus, setAdminStatus] = useState(
    localStorage.getItem(STORAGE_KEYS.adminStatus) === 'true',
  )

  const persistSession = useCallback((nextToken, nextAdminStatus) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_KEYS.authToken, nextToken)
    } else {
      localStorage.removeItem(STORAGE_KEYS.authToken)
    }
    localStorage.setItem(STORAGE_KEYS.adminStatus, String(Boolean(nextAdminStatus)))
  }, [])

  const clearSession = useCallback(() => {
    setToken(null)
    setAdminStatus(false)
    localStorage.removeItem(STORAGE_KEYS.authToken)
    localStorage.removeItem(STORAGE_KEYS.adminStatus)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
    })
  }, [clearSession])

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.authToken, token)
    } else {
      localStorage.removeItem(STORAGE_KEYS.authToken)
    }
  }, [token])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.adminStatus, String(adminStatus))
  }, [adminStatus])

  const login = useCallback(async ({ usernameOrEmail, password }) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    })
    persistSession(data.token, data.adminStatus)
    setToken(data.token)
    setAdminStatus(Boolean(data.adminStatus))
  }, [])

  const register = useCallback(async ({ username, email, password, adminStatus: isAdmin }) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, adminStatus: isAdmin }),
    })
    persistSession(data.token, data.adminStatus)
    setToken(data.token)
    setAdminStatus(Boolean(data.adminStatus))
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const userLabel = useMemo(() => getUserLabel(token), [token])

  const value = useMemo(
    () => ({
      token,
      adminStatus,
      userLabel,
      login,
      register,
      logout,
      setToken,
      setAdminStatus,
    }),
    [token, adminStatus, userLabel, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
