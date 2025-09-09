import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, endpoints, setAuthToken } from '@/api'

type User = { id: number; email: string }

type AuthState = {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
}

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null, loading: true, error: null })

  // Best-effort load from web localStorage (no native dependency needed)
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('auth') : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setAuthToken(parsed.token)
        setState({ token: parsed.token, user: parsed.user, loading: false, error: null })
        return
      }
    } catch {}
    setState((s) => ({ ...s, loading: false }))
  }, [])

  const persist = useCallback((token: string | null, user: User | null) => {
    try {
      if (typeof window !== 'undefined') {
        if (token) window.localStorage.setItem('auth', JSON.stringify({ token, user }))
        else window.localStorage.removeItem('auth')
      }
    } catch {}
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      // Devise inside a namespace maps scope to :api_v1_user
      // Send both keys to be safe across environments
      const res = await api.post(endpoints.login, {
        api_v1_user: { email, password },
        user: { email, password },
      })
      // Devise JWT returns Authorization header; our interceptor already captured it
      const authHeader = (res.headers as any)?.authorization || (res.headers as any)?.Authorization
      const token = authHeader ?? null
      const user = (res.data?.data as any) || null
      setAuthToken(token)
      setState({ token, user, loading: false, error: null })
      persist(token, user)
      return true
    } catch (e: any) {
      const msg = e?.response?.data?.status?.message || e?.message || 'Erreur de connexion'
      setState({ token: null, user: null, loading: false, error: msg })
      return false
    }
  }, [persist])

  const signOut = useCallback(() => {
    setAuthToken(null)
    setState({ token: null, user: null, loading: false, error: null })
    persist(null, null)
  }, [persist])

  const value = useMemo<AuthContextType>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
