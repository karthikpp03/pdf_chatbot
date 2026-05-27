import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center" style={{ background: 'var(--bg)' }}>
      <div className="text-6xl font-mono text-text3">404</div>
      <div className="text-text2 text-sm">Page not found</div>
      <Link to="/" className="text-xs font-mono text-accent hover:underline mt-2">← Back to chat</Link>
    </div>
  )
}
