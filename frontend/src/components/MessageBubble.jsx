import LoadingDots from './LoadingDots'
import SourcePanel from './SourcePanel'
import { shortModel } from '../utils/helpers'

function Avatar({ role, initial }) {
  const base = 'w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold font-mono'
  if (role === 'user')
    return <div className={`${base} bg-surface2 text-text2`}>{initial}</div>
  return <div className={`${base} text-accent`} style={{ background: 'var(--accent-dim)' }}>AI</div>
}

export default function MessageBubble({ message, userInitial }) {
  const { role, text, data } = message

  if (role === 'thinking') {
    return (
      <div className="flex gap-3 max-w-[860px]">
        <Avatar role="assistant" />
        <div className="flex-1 min-w-0">
          <LoadingDots />
        </div>
      </div>
    )
  }

  if (role === 'user') {
    return (
      <div className="flex gap-3 flex-row-reverse self-end max-w-[860px]">
        <Avatar role="user" initial={userInitial} />
        <div className="flex-1 min-w-0">
          <div
            className="px-4 py-3 rounded-xl text-[13px] leading-relaxed text-white"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,.3)' }}
          >
            {text}
          </div>
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="flex gap-3 max-w-[860px]">
      <Avatar role="assistant" />
      <div className="flex-1 min-w-0">
        <div
          className="px-4 py-3 rounded-xl text-[13px] leading-relaxed"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          {text}
        </div>
        {data && (
          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-text3">
            {data.latency_ms !== '—' && <span>{data.latency_ms}ms</span>}
            <span>{data.chunks_used}/{data.retrieval_count} chunks</span>
            {data.model_used && <span>{shortModel(data.model_used)}</span>}
            <SourcePanel sources={data.sources} />
          </div>
        )}
      </div>
    </div>
  )
}
