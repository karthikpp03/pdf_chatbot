import { useState, useEffect, useRef } from 'react'
import { getStatus } from '../api'

export function usePolling(enabled = true, interval = 5000) {
  const [status, setStatus] = useState({
    online:         false,
    active_model:   '',
    total_chunks:   0,
    embedder_loaded: false,
    reranker_loaded: false,
  })

  const timerRef = useRef(null)

  const poll = async () => {
    try {
      const s = await getStatus()
      setStatus({ online: true, ...s })
    } catch {
      setStatus((prev) => ({ ...prev, online: false }))
    }
  }

  useEffect(() => {
    if (!enabled) return
    poll()
    timerRef.current = setInterval(poll, interval)
    return () => clearInterval(timerRef.current)
  }, [enabled])

  return status
}
