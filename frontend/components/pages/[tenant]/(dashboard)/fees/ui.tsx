'use client'

// Tiny shared UI bits for the fees module.

import type { ReactNode } from 'react'

export const inputCls =
  'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export const labelCls = 'block text-sm font-medium text-foreground/80 mb-1'

export function FeeModal({ title, onClose, children, wide }: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-card rounded-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6 max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function ModalActions({ onClose, submitting, submitLabel }: {
  onClose: () => void
  submitting: boolean
  submitLabel: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
        Cancel
      </button>
      <button type="submit" disabled={submitting} className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
