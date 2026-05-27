import { useState, useEffect } from 'react'
import {
  getUsers, createUser, updateUser, deleteUser,
  getAuditLogs, getConversations,
} from '../api'
import { roleBadgeClass, auditActionClass } from '../utils/helpers'
import { AUDIT_ACTIONS } from '../utils/constants'

export default function AdminModal({ onClose }) {
  const [tab, setTab] = useState('users')

  return (
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center pt-14 overflow-y-auto"
      style={{ background: 'rgba(10,12,16,0.95)' }}
    >
      <div
        className="rounded-2xl px-8 py-7 w-[680px] mb-10"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        {/* Head */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Admin Panel</h2>
          <button onClick={onClose} className="text-text3 hover:text-text2 text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {['users', 'audit', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-mono border transition-all capitalize ${
                tab === t
                  ? 'bg-surface2 text-accent border-border2'
                  : 'border-transparent text-text3 hover:border-border2 hover:text-text2'
              }`}
            >
              {t === 'history' ? 'Chat History' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'users'   && <UsersTab />}
        {tab === 'audit'   && <AuditTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [msg,   setMsg]   = useState({ text: '', ok: true })
  const [form,  setForm]  = useState({ username: '', password: '', role: 'employee', department: '' })

  const load = async () => {
    try { setUsers(await getUsers()) } catch { /* silent */ }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createUser(form)
      setMsg({ text: `✓ User "${form.username}" created`, ok: true })
      setForm({ username: '', password: '', role: 'employee', department: '' })
      load()
    } catch (e) {
      setMsg({ text: `✗ ${e.response?.data?.detail || e.message}`, ok: false })
    }
  }

  const handleToggle = async (username, newActive) => {
    await updateUser(username, { is_active: newActive })
    load()
  }

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await deleteUser(username)
      setMsg({ text: `✓ User "${username}" deleted`, ok: true })
      load()
    } catch (e) {
      setMsg({ text: `✗ ${e.response?.data?.detail || e.message}`, ok: false })
    }
  }

  const inputCls = 'flex-1 min-w-[110px] px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none'
  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)' }

  return (
    <div>
      <div className={`text-[11px] font-mono min-h-[14px] mb-2.5 ${msg.ok ? 'text-green' : 'text-red-400'}`}>
        {msg.text}
      </div>

      {/* Create user form */}
      <div className="flex gap-2 flex-wrap mb-4">
        <input
          className={inputCls} style={inputStyle}
          placeholder="username" value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
        />
        <input
          className={inputCls} style={inputStyle} type="password"
          placeholder="password" value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <select
          className={inputCls} style={{ ...inputStyle, flex: 'none', width: 'auto' }}
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        >
          {['employee', 'manager', 'guest', 'admin'].map((r) => (
            <option key={r} value={r} style={{ background: 'var(--surface2)' }}>{r}</option>
          ))}
        </select>
        <input
          className={inputCls} style={inputStyle}
          placeholder="department (e.g. Engineering)" value={form.department}
          onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
        />
        <button
          onClick={handleCreate}
          className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-white"
          style={{ background: 'var(--accent)', border: 'none' }}
        >
          Add User
        </button>
      </div>

      {/* Users table */}
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr>
            {['Username', 'Role', 'Department', 'Active', 'Action'].map((h) => (
              <th key={h} className="text-left text-[10px] uppercase tracking-widest text-text3 px-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.username}>
              <td className="px-2.5 py-2 text-text2" style={{ borderBottom: '1px solid var(--border)' }}>{u.username}</td>
              <td className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${roleBadgeClass(u.role)}`}>{u.role}</span>
              </td>
              <td className="px-2.5 py-2 text-text2" style={{ borderBottom: '1px solid var(--border)' }}>{u.department || '—'}</td>
              <td className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--border)', color: u.is_active ? 'var(--green)' : 'var(--red)' }}>
                {u.is_active ? 'yes' : 'no'}
              </td>
              <td className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                {u.username !== 'admin' ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(u.username, !u.is_active)}
                      className="px-2 py-0.5 rounded text-text3 text-[10px]"
                      style={{ border: '1px solid var(--border2)' }}
                    >
                      {u.is_active ? 'deactivate' : 'activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(u.username)}
                      className="px-2 py-0.5 rounded text-red-400 text-[10px]"
                      style={{ border: '1px solid rgba(239,68,68,.3)' }}
                    >
                      delete
                    </button>
                  </div>
                ) : (
                  <span className="text-text3 text-[10px]">protected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs,   setLogs]   = useState([])
  const [action, setAction] = useState('')

  const load = async () => {
    try { setLogs(await getAuditLogs(100, action)) } catch { /* silent */ }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex gap-2 mb-3 items-center">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
        >
          {AUDIT_ACTIONS.map((a) => (
            <option key={a.value} value={a.value} style={{ background: 'var(--surface2)' }}>{a.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg text-xs font-mono text-white"
          style={{ background: 'var(--accent)' }}
        >
          Filter
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-text3 text-[11px] py-3">No logs found.</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="py-2 text-[11px] font-mono" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-text3 text-[10px]">{l.created_at?.slice(0, 19)}</span>
              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] mx-1.5 ${auditActionClass(l.action)}`}>
                {l.action}
              </span>
              <strong>{l.username}</strong> — {l.detail}
              {(l.sources_used || []).length > 0 && (
                <span className="text-text3"> · {l.sources_used.join(', ')}</span>
              )}
              {l.ip && <span className="text-text3"> · {l.ip}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [convs,      setConvs]      = useState([])
  const [userFilter, setUserFilter] = useState('')

  const load = async () => {
    try { setConvs(await getConversations(50, userFilter)) } catch { /* silent */ }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="filter by username (leave blank = all)"
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)' }}
        />
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg text-xs font-mono text-white"
          style={{ background: 'var(--accent)' }}
        >
          Load
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto text-xs font-mono">
        {convs.length === 0 ? (
          <div className="text-text3 py-3">No conversations found.</div>
        ) : (
          convs.map((c, i) => (
            <div key={i} className="py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-text3 text-[10px]">{c.created_at?.slice(0, 19)} · {c.username}</div>
              <div className="text-accent mt-1"><strong>Q:</strong> {c.question}</div>
              <div className="text-text2">
                <strong>A:</strong> {c.answer?.slice(0, 200)}{c.answer?.length > 200 ? '…' : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
