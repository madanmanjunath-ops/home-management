import type { ReactNode } from 'react'
import { initials } from '../lib/format'
import type { Staff } from '../types'

export function Avatar({ staff, symbol }: { staff?: Staff; symbol?: string }) {
  if (symbol) return <div className="avatar green">{symbol}</div>
  if (!staff) return <div className="avatar">?</div>
  return <div className={`avatar ${staff.color}`}>{initials(staff.name)}</div>
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="header-row">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function StatusPill({
  label,
  tone = 'green',
}: {
  label: string
  tone?: 'green' | 'pending' | 'late' | 'neutral'
}) {
  return <span className={`status ${tone}`}>{label}</span>
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>
}

export function Modal({
  title,
  onClose,
  children,
  onSubmit,
  submitLabel = 'Save',
  notice,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  onSubmit?: (e: React.FormEvent) => void
  submitLabel?: string
  notice?: ReactNode
}) {
  return (
    <div className="modal" onClick={onClose}>
      <form
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.(e)
        }}
      >
        <div className="header-row">
          <h2>{title}</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
        {notice && <Notice>{notice}</Notice>}
        <div className="form">
          {children}
          <footer>
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="button" type="submit">
              {submitLabel}
            </button>
          </footer>
        </div>
      </form>
    </div>
  )
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={full ? 'full' : ''}>
      {label}
      {children}
    </label>
  )
}
