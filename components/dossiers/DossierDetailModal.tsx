'use client'

import { useState } from 'react'
import { DossierWithDetails, DOSSIER_TYPE_LABELS } from '@/types/dossier'

interface Props {
  dossier: DossierWithDetails
  onClose: () => void
  onDeleted: (id: string) => void
}

export function DossierDetailModal({ dossier, onClose, onDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Verwijderen mislukt')
      }
      onDeleted(dossier.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
      setIsDeleting(false)
    }
  }

  const fileSizeLabel = dossier.file_size
    ? dossier.file_size > 1024 * 1024
      ? `${(dossier.file_size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(dossier.file_size / 1024)} KB`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs mb-2">
              {DOSSIER_TYPE_LABELS[dossier.type]}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 truncate">{dossier.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {dossier.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Omschrijving</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{dossier.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ingediend door</p>
              <p className="text-sm text-gray-700">{dossier.submitted_by_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Datum</p>
              <p className="text-sm text-gray-700">
                {new Date(dossier.submitted_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {(dossier.project_name || dossier.customer_name) && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gekoppeld aan</p>
              <div className="flex flex-col gap-1">
                {dossier.project_name && (
                  <span className="text-sm text-blue-600">📁 {dossier.project_name}</span>
                )}
                {dossier.customer_name && (
                  <span className="text-sm text-green-600">👤 {dossier.customer_name}</span>
                )}
              </div>
            </div>
          )}

          {dossier.file_url && (
            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{dossier.file_name}</p>
                  {fileSizeLabel && <p className="text-xs text-gray-400">{fileSizeLabel}</p>}
                </div>
              </div>
              <a
                href={dossier.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm text-blue-600 hover:underline font-medium"
              >
                Downloaden
              </a>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Verwijderen
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Zeker weten?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
              >
                {isDeleting ? 'Bezig...' : 'Ja, verwijder'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Annuleren
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
