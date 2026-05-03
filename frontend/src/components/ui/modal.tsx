import { cn } from '@/lib/cn'
import { Button } from './button'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, children, icon, actions, className }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-2xl border border-[var(--color-border)] transition-transform duration-200',
          className,
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && <div className="shrink-0">{icon}</div>}
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-[var(--color-muted)] mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors p-1 rounded-lg hover:bg-[var(--color-btn-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-6">{children}</div>

        {actions && <div className="flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/* ===== Pre-built variants ===== */

interface ValidationErrorsModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  errors: Array<{ field: string; message: string }>
}

export function ValidationErrorsModal({
  open,
  onClose,
  title = 'Campos pendentes',
  description = 'Preencha os campos abaixo antes de continuar:',
  errors,
}: ValidationErrorsModalProps) {
  if (!open || errors.length === 0) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={
        <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center">
          <span className="text-[var(--color-danger)] text-lg font-bold">!</span>
        </div>
      }
      actions={
        <Button variant="primary" onClick={onClose}>
          Corrigir agora
        </Button>
      }
    >
      <ul className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        {errors.map((err, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/10"
          >
            <span className="text-[var(--color-danger)] mt-0.5 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <div className="min-w-0">
              <span className="font-medium text-[var(--color-text)] block truncate">{err.field}</span>
              <span className="text-[var(--color-muted)] text-xs">{err.message}</span>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
