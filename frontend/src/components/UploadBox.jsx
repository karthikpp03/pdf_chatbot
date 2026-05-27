import { useRef, useState } from 'react'
import { uploadDocument, getDocuments } from '../api'
import { DEPARTMENTS, MIN_ROLES } from '../utils/constants'

export default function UploadBox({ onUploaded }) {
  const fileRef   = useRef()
  const [dragging, setDragging] = useState(false)
  const [dept,     setDept]     = useState('public')
  const [minRole,  setMinRole]  = useState('guest')
  const [toast,    setToast]    = useState(null) // { text, progress, error }

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      await doUpload(file)
    }
    onUploaded?.()
  }

  const doUpload = async (file) => {
    setToast({ text: `Indexing ${file.name}…`, progress: 20, error: false })
    try {
      const data = await uploadDocument(file, dept, minRole, (p) =>
        setToast((t) => ({ ...t, progress: p }))
      )
      setToast({ text: `✓ ${file.name} — ${data.chunks} chunks [${dept} / min:${minRole}]`, progress: 100, error: false })
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Upload failed'
      setToast({ text: `✗ ${msg}`, progress: 100, error: true })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="text-[10px] font-mono text-text3 uppercase tracking-widest mb-2.5">
          Upload Document
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border border-dashed rounded-xl py-5 px-4 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-accent bg-accent/10'
              : 'border-border2 hover:border-accent hover:bg-accent/10'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.bmp,.tiff,.webp"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
            style={{ background: 'var(--surface2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="text-xs text-text2 leading-relaxed">
            Drop file to index
            <span className="block text-[10px] text-text3 mt-0.5 font-mono">
              PDF · DOCX · TXT · PNG · JPG
            </span>
          </div>
        </div>

        {/* Department select */}
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="w-full mt-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value} style={{ background: 'var(--surface2)' }}>
              {d.label}
            </option>
          ))}
        </select>

        {/* Min role select */}
        <select
          value={minRole}
          onChange={(e) => setMinRole(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
        >
          {MIN_ROLES.map((r) => (
            <option key={r.value} value={r.value} style={{ background: 'var(--surface2)' }}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Upload toast */}
      {toast && (
        <div
          className="mx-5 mb-3 px-3 py-2.5 rounded-lg text-xs"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
        >
          <div style={{ color: toast.error ? 'var(--red)' : 'var(--text)' }}>{toast.text}</div>
          <div className="h-[3px] rounded-full mt-2 overflow-hidden" style={{ background: 'var(--border2)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${toast.progress}%`,
                background: toast.error ? 'var(--red)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
