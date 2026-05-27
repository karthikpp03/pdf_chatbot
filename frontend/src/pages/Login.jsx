import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError('Enter username and password'); return }
    setLoading(true); setError('')
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-colors'
  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border2)',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1000]"
      style={{ background: 'rgba(10,12,16,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="rounded-2xl px-10 py-9 w-[360px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className="text-[17px] font-semibold">DocMind</div>
            <div className="text-[11px] text-text3 font-mono mt-0.5">Enterprise RAG · Sign in</div>
          </div>
        </div>

        {/* Fields */}
        <div className="mb-3.5">
          <label className="block text-[11px] text-text3 font-mono uppercase tracking-[.05em] mb-1.5">
            Username
          </label>
          <input
            type="text"
            className={inputCls}
            style={inputStyle}
            placeholder="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="mb-3.5">
          <label className="block text-[11px] text-text3 font-mono uppercase tracking-[.05em] mb-1.5">
            Password
          </label>
          <input
            type="password"
            className={inputCls}
            style={inputStyle}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-[13px] font-medium text-white mt-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading ? 'var(--accent-dim)' : 'var(--accent)', fontFamily: 'var(--sans)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-3 min-h-[16px] text-xs text-red-400 font-mono text-center">
          {error}
        </div>

        <div className="mt-3.5 text-[10px] text-text3 font-mono text-center leading-relaxed">
          Default admin: <strong>admin</strong> / <strong>admin123</strong>
          <br />Change password after first login.
        </div>
      </div>
    </div>
  )
}
