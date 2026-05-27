import { useState, useCallback } from 'react'
import { sendQuery, getConversations, clearMyConversations } from '../api'

export function useChat() {
  const [messages,  setMessages]  = useState([])   // { id, role, text, data? }
  const [loading,   setLoading]   = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Load this user's recent conversations (up to 10) for session restore
  const loadHistory = useCallback(async () => {
    if (historyLoaded) return
    try {
      const convs = await getConversations(10)
      if (!convs.length) return
      const restored = []
      convs.slice().reverse().forEach((c, i) => {
        restored.push({
          id:   `hist-user-${i}`,
          role: 'user',
          text: c.question,
        })
        restored.push({
          id:   `hist-ai-${i}`,
          role: 'assistant',
          text: c.answer,
          data: {
            answer:           c.answer,
            sources:          [],
            latency_ms:       '—',
            chunks_used:      c.chunks_used,
            retrieval_count:  '—',
            model_used:       '',
          },
        })
      })
      setMessages(restored)
      setHistoryLoaded(true)
    } catch {
      /* silent – just show welcome screen */
    }
  }, [historyLoaded])

  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || loading) return

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: question }
    const thinkId = `think-${Date.now()}`
    setMessages((prev) => [...prev, userMsg, { id: thinkId, role: 'thinking' }])
    setLoading(true)

    try {
      const data = await sendQuery(question)
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({
            id:   `a-${Date.now()}`,
            role: 'assistant',
            text: data.answer,
            data,
          })
      )
    } catch (e) {
      const msg =
        e.response?.status === 429
          ? 'Rate limit: 20 queries/minute'
          : e.message || 'Request failed'
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({ id: `err-${Date.now()}`, role: 'assistant', text: `⚠ ${msg}`, data: null })
      )
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clearHistory = useCallback(async () => {
    await clearMyConversations()
    setMessages([])
    setHistoryLoaded(false)
  }, [])

  const clearLocal = useCallback(() => {
    setMessages([])
    setHistoryLoaded(false)
  }, [])

  return { messages, loading, historyLoaded, loadHistory, sendMessage, clearHistory, clearLocal }
}
