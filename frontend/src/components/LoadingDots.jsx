export default function LoadingDots() {
  return (
    <div className="flex items-center gap-2 text-xs text-text3 font-mono">
      <div className="flex gap-1">
        <span className="think-dot" />
        <span className="think-dot" />
        <span className="think-dot" />
      </div>
      Retrieving · RBAC filtering · generating…
    </div>
  )
}
