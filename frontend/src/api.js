import axios from 'axios'
import { API_BASE } from './utils/constants'

const api = axios.create({ baseURL: API_BASE })

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('docmind_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username, password) {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('password', password)
  const { data } = await api.post('/auth/login', fd)
  return data // { access_token, username, role, department }
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data // { username, role, department, is_active }
}

// ── Status ────────────────────────────────────────────────────────────────────

export async function getStatus() {
  const { data } = await api.get('/status', {
    signal: AbortSignal.timeout(4000),
  })
  return data // { active_model, total_chunks, embedder_loaded, reranker_loaded }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function sendQuery(question) {
  const { data } = await api.post('/chat/query', { question })
  return data // { answer, sources, latency_ms, chunks_used, retrieval_count, model_used }
}

export async function getConversations(limit = 10, username = '') {
  const params = { limit }
  if (username) params.username = username
  const { data } = await api.get('/chat/conversations', { params })
  return data // array of { id, username, question, answer, chunks_used, created_at }
}

export async function clearMyConversations() {
  const { data } = await api.delete('/chat/conversations/me')
  return data
}

// ── Admin – Documents ─────────────────────────────────────────────────────────

export async function getDocuments() {
  const { data } = await api.get('/admin/documents')
  return data.documents || []
}

export async function uploadDocument(file, department, allowedRole, onProgress) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post(
    `/admin/upload?department=${encodeURIComponent(department)}&allowed_roles=${encodeURIComponent(allowedRole)}`,
    fd,
    {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 85))
        }
      },
    }
  )
  return data // { chunks, ... }
}

export async function deleteDocument(filename) {
  const { data } = await api.delete(`/admin/documents/${encodeURIComponent(filename)}`)
  return data
}

export async function resetAllDocuments() {
  const { data } = await api.delete('/admin/reset')
  return data
}

// ── Admin – Users ─────────────────────────────────────────────────────────────

export async function getUsers() {
  const { data } = await api.get('/admin/users')
  return data // array of users
}

export async function createUser(payload) {
  // payload: { username, password, role, department }
  const { data } = await api.post('/admin/users', payload)
  return data
}

export async function updateUser(username, payload) {
  // payload: { is_active?, role?, department? }
  const { data } = await api.patch(`/admin/users/${username}`, payload)
  return data
}

export async function deleteUser(username) {
  const { data } = await api.delete(`/admin/users/${username}`)
  return data
}

// ── Admin – Audit ─────────────────────────────────────────────────────────────

export async function getAuditLogs(limit = 100, action = '') {
  const params = { limit }
  if (action) params.action = action
  const { data } = await api.get('/admin/audit', { params })
  return data // array of audit log entries
}

export default api
