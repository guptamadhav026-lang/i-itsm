import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/endpoints'
import { getToken, setToken, setUnauthorizedHandler } from '../api/client'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  /** true while we check a saved token on page load */
  initializing: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  /** re-load the current user (e.g. after a technician changes availability) */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Remembers who is logged in. The JWT token is kept in localStorage so a page reload keeps you logged in;
 * the token itself is checked by the backend on every request.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(() => getToken() !== null)
  const queryClient = useQueryClient()

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return
    authApi.me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setInitializing(false))
  }, [logout])

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password)
    setToken(result.token)
    queryClient.clear()
    setUser(result.user)
    return result.user
  }, [queryClient])

  const refresh = useCallback(async () => {
    setUser(await authApi.me())
  }, [])

  const value = useMemo(() => ({ user, initializing, login, logout, refresh }), [user, initializing, login, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** The logged-in user; only use inside pages that require login. */
export function useUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No user logged in')
  return user
}
