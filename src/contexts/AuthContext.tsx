import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { extractOAuthCallback, exchangeCodeForToken, fetchGitHubUser, redirectToGitHub } from '@/lib/oauth'
import { getAuthItem, setAuthItem, getAuthJSON, setAuthJSON, clearAuth } from '@/lib/storage'
import type { GitHubUser } from '@/types'

interface AuthState {
  token: string | null
  user: GitHubUser | null
  loading: boolean
  error: string | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const callback = extractOAuthCallback()

    if (callback) {
      // Clean OAuth params from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      window.history.replaceState({}, '', url.pathname)

      exchangeCodeForToken(callback.code)
        .then(async (accessToken) => {
          setToken(accessToken)
          setAuthItem('token', accessToken)
          const ghUser = await fetchGitHubUser(accessToken)
          setUser(ghUser)
          setAuthJSON('user', ghUser)
        })
        .catch((err) => {
          setError(err.message)
        })
        .finally(() => {
          setLoading(false)
        })
      return
    }

    // Try restoring from localStorage
    const storedToken = getAuthItem('token')
    const storedUser = getAuthJSON<GitHubUser>('user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
      setLoading(false)

      // Background validate the stored token
      fetchGitHubUser(storedToken).catch(() => {
        // Token expired or invalid — sign out
        setToken(null)
        setUser(null)
        clearAuth()
      })
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(() => redirectToGitHub(), [])
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    clearAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
