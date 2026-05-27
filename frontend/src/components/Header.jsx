export default function Header({ status }) {
  return (
    <div
      className="px-7 py-4 flex items-center justify-between flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-sm font-medium text-text2">Document QA</span>
      <div className="flex gap-1.5">
        <Badge label="BGE Embeddings" active={status?.embedder_loaded} />
        <Badge label="BGE Reranker"   active={status?.reranker_loaded} />
        <Badge label="FAISS"          active />
      </div>
    </div>
  )
}

function Badge({ label, active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
        active
          ? 'border-green/30 text-green bg-green/10'
          : 'border-border2 text-text3'
      }`}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-green" />}
      {label}
    </span>
  )
}
