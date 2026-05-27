import { shortModel } from '../utils/helpers'

export default function StatusBar({ status }) {
  const dotColor = status.online ? 'bg-green' : 'bg-red'

  return (
    <div className="flex flex-col gap-1.5 text-[11px] font-mono">
      <div className="flex items-center justify-between">
        <span className="text-text3">BACKEND</span>
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span>{status.online ? 'online' : 'offline'}</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text3">MODEL</span>
        <span className="text-text2">{shortModel(status.active_model) || '—'}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text3">CHUNKS</span>
        <span className="text-text2">{status.total_chunks ?? 0}</span>
      </div>
    </div>
  )
}
