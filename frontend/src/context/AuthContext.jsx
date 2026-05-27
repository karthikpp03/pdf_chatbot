import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, getMe } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { username, role, department }
  const [loading, setLoading] = useState(true)   // true while restoring session

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('docmind_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('docmind_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    localStorage.setItem('docmind_token', data.access_token)
    setUser({ username: data.username, role: data.role, department: data.department })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('docmind_token')
    setUser(null)
  }, [])

  const isAdmin   = user?.role === 'admin'
  const isManager = user?.role === 'manager'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
