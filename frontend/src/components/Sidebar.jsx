import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDocuments, deleteDocument, resetAllDocuments } from '../api'
import StatusBar from './StatusBar'
import UploadBox from './UploadBox'

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function Sidebar({ status, onOpenAdmin, onClearChat }) {
  const { user, logout, isAdmin } = useAuth()
  const [docs, setDocs] = useState([])

  const loadDocs = useCallback(async () => {
    try {
      const d = await getDocuments()
      setDocs(d)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (user) loadDocs()
  }, [user, loadDocs])

  // Re-expose loadDocs via custom event so UploadBox can trigger it
  useEffect(() => {
    const handler = () => loadDocs()
    window.addEventListener('docmind:docs-refresh', handler)
    return () => window.removeEventListener('docmind:docs-refresh', handler)
  }, [loadDocs])

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete "${filename}" and all its chunks? This cannot be undone.`)) return
    try {
      await deleteDocument(filename)
      loadDocs()
    } catch (e) {
      alert(`✗ ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Clear ALL indexed documents? This cannot be undone.')) return
    try {
      await resetAllDocuments()
      setDocs([])
      onClearChat?.()
    } catch (e) {
      alert(`✗ ${e.response?.data?.detail || e.message}`)
    }
  }

  const roleBadgeCls =
    user?.role === 'admin'   ? 'bg-red-500/15 text-red-400' :
    user?.role === 'manager' ? 'bg-amber-500/15 text-amber-400' :
    'bg-blue-500/15 text-accent'

  return (
    <aside
      className="flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Head: logo + status ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold leading-tight tracking-[-0.3px]">DocMind</div>
            <div className="text-[10px] text-text3 font-mono tracking-[.05em] mt-0.5">Enterprise RAG</div>
          </div>
        </div>
        <StatusBar status={status} />
      </div>

      {/* ── User bar ── */}
      {user && (
        <div
          className="flex items-center justify-between px-5 py-2.5 text-[11px] font-mono"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[10px] font-semibold text-accent"
              style={{ background: 'var(--accent-dim)' }}
            >
              {user.username[0]?.toUpperCase()}
            </div>
            <span className="text-text2">{user.username}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${roleBadgeCls}`}>
              {user.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-[10px] text-text3 hover:text-text2 px-1.5 py-0.5 rounded border border-transparent hover:border-border2 transition-all"
          >
            logout
          </button>
        </div>
      )}

      {/* ── Upload (admin only) ── */}
      {isAdmin && (
        <UploadBox onUploaded={() => { loadDocs(); window.dispatchEvent(new Event('docmind:status-refresh')) }} />
      )}

      {/* ── Docs list ── */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {docs.length === 0 ? (
          <div className="text-[11px] text-text3 text-center py-5 font-mono">
            No accessible documents
          </div>
        ) : (
          docs.map((d) => (
            <div
              key={d.source}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border mb-1.5 transition-colors"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-dim)' }}
              >
                <DocIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" title={d.source}>{d.source}</div>
                <div className="text-[10px] text-text3 font-mono">
                  {d.chunks} chunks · {d.department} · min:{d.allowed_roles || 'guest'}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(d.source)}
                  className="text-[13px] text-text3 hover:text-red-400 flex-shrink-0 px-1 py-0.5 rounded transition-colors leading-none"
                  title="Delete document"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Footer buttons ── */}
      <div className="px-5 pb-4 pt-2 flex flex-col gap-2">
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="py-1.5 rounded-lg border text-[11px] font-mono text-text3 hover:text-amber-400 hover:border-amber-400/50 transition-all"
            style={{ borderColor: 'var(--border2)' }}
          >
            ⚙ Admin Panel
          </button>
        )}
        {user && (
          <button
            onClick={onClearChat}
            className="py-1.5 rounded-lg border text-[11px] font-mono text-text3 hover:text-accent hover:border-accent/50 transition-all"
            style={{ borderColor: 'var(--border2)' }}
          >
            ✕ Clear my chat history
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleReset}
            className="py-1.5 rounded-lg border text-[11px] font-mono text-text3 transition-all hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5"
            style={{ borderColor: 'var(--border2)' }}
          >
            ↺ Clear all documents
          </button>
        )}
      </div>
    </aside>
  )
}
