/**
 * Escape HTML special characters to prevent XSS in dangerouslySetInnerHTML contexts.
 * In React JSX, text content is escaped automatically – use this only when
 * building raw HTML strings.
 */
export function esc(s = '') {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  )
}

/**
 * Return role badge colour classes.
 */
export function roleBadgeClass(role) {
  switch (role) {
    case 'admin':    return 'bg-red-500/15 text-red-400'
    case 'manager':  return 'bg-amber-500/15 text-amber-400'
    case 'employee': return 'bg-blue-500/15 text-accent'
    default:         return 'bg-surface2 text-text3'
  }
}

/**
 * Audit action badge colour classes.
 */
export function auditActionClass(action) {
  switch (action) {
    case 'login':  return 'bg-green/10 text-green'
    case 'query':  return 'bg-accent/10 text-accent'
    case 'upload': return 'bg-amber/10 text-amber'
    case 'denied': return 'bg-red/10 text-red'
    case 'admin':  return 'bg-amber/10 text-amber'
    default:       return 'bg-surface2 text-text3'
  }
}

/**
 * Shorten a model name to just the final path segment.
 */
export function shortModel(name = '') {
  return name.split('/').pop() || name
}
