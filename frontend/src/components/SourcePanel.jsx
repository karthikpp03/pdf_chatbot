import { useState } from 'react'

export default function SourcePanel({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-[10px] font-mono text-text3 hover:text-text2 transition-colors mt-2 ${open ? 'sources-toggle-open' : ''}`}
      >
        Sources
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 mt-2">
          {sources.map((s, i) => (
            <div
              key={i}
              className="px-3 py-2 rounded-[8px] border text-[11px]"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-accent text-[10px]">
                  {s.source} [{s.department}]
                </span>
                <span className="font-mono text-green text-[10px]">score: {s.rerank_score}</span>
              </div>
              <div
                className="text-text3 leading-relaxed overflow-hidden"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              >
                {s.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
