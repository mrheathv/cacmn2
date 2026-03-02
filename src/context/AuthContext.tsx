import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { setAccessToken, api } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isPM: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to restore session via refresh token cookie
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { accessToken: string }
          setAccessToken(data.accessToken)
          const me = await api.get<User>('/auth/me')
          setUser(me)
        }
      } catch { /* no session */ }
      finally { setLoading(false) }
    }
    restore()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>('/auth/login', { username, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {}).catch(() => {})
    setAccessToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isPM = user?.role === 'admin' || user?.role === 'pm'
  const canEdit = user?.role === 'admin' || user?.role === 'pm' || user?.role === 'estimator'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isPM, canEdit }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
