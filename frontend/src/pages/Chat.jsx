import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../hooks/useChat'
import { usePolling } from '../hooks/usePolling'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MessageBubble from '../components/MessageBubble'
import AdminModal from '../components/AdminModal'
import { SAMPLE_QUESTIONS } from '../utils/constants'

export default function Chat() {
  const { user } = useAuth()
  const { messages, loading, loadHistory, sendMessage, clearHistory, clearLocal } = useChat()
  const status = usePolling(!!user)

  const [query,      setQuery]      = useState('')
  const [adminOpen,  setAdminOpen]  = useState(false)
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Load session history once user is set
  useEffect(() => {
    if (user) loadHistory()
  }, [user])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Status refresh event from upload
  useEffect(() => {
    const handler = () => {} // polling handles it automatically
    window.addEventListener('docmind:status-refresh', handler)
    return () => window.removeEventListener('docmind:status-refresh', handler)
  }, [])

  const handleSend = () => {
    if (!query.trim() || loading) return
    sendMessage(query.trim())
    setQuery('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleClearChat = async () => {
    if (!window.confirm('Delete your entire chat history? This cannot be undone.')) return
    try {
      await clearHistory()
    } catch (e) {
      alert(`✗ ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e) => {
    setQuery(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const showWelcome = messages.length === 0

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{ gridTemplateColumns: '280px 1fr', gridTemplateRows: '100vh' }}
    >
      <Sidebar
        status={status}
        onOpenAdmin={() => setAdminOpen(true)}
        onClearChat={handleClearChat}
      />

      <main className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Header status={status} />

        {/* Chat area */}
        <div
          id="chat-area"
          className="flex-1 overflow-y-auto px-7 py-7 flex flex-col gap-5"
        >
          {showWelcome ? (
            <WelcomeScreen onQuery={(q) => { setQuery(q); textareaRef.current?.focus() }} />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  userInitial={user?.username?.[0]?.toUpperCase() || 'U'}
                />
              ))}
              {/* Session separator shown after history restore */}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="px-7 py-5 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="flex items-end gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e)  => e.currentTarget.style.borderColor = 'var(--border2)'}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents…"
              className="flex-1 bg-transparent border-none outline-none text-[13px] resize-none leading-relaxed pt-0.5"
              style={{ fontFamily: 'var(--sans)', color: 'var(--text)', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!query.trim() || loading}
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', border: 'none', cursor: query.trim() && !loading ? 'pointer' : 'not-allowed' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className="text-[10px] font-mono text-text3 text-center mt-2">
            Answers grounded in indexed documents · RBAC filtered · rate limited
          </div>
        </div>
      </main>

      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
    </div>
  )
}

function WelcomeScreen({ onQuery }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
        style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      </div>
      <h2 className="text-xl font-medium tracking-[-0.3px]">Ask your documents anything</h2>
      <p className="text-[13px] text-text3 max-w-[360px] leading-relaxed">
        Upload PDFs or scanned images. DocMind uses PaddleOCR, BGE embeddings, and Qwen to answer
        questions grounded strictly in your documents.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-1">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onQuery(q)}
            className="px-3.5 py-1.5 rounded-full text-xs border transition-all"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'none' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-glow)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--text2)'
              e.currentTarget.style.background = 'none'
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
