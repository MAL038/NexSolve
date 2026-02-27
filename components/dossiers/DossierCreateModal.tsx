'use client'

import { useState, useRef, useEffect } from 'react'
import { DossierType, DOSSIER_TYPE_LABELS, DossierWithDetails } from '@/types/dossier'
import type { Customer } from '@/types'

interface Props {
  projectId?: string
  customerId?: string
  onCreated: (dossier: DossierWithDetails) => void
  onCancel: () => void
}

export function DossierCreateModal({ projectId, customerId, onCreated, onCancel }: Props) {
  const [title, setTitle]             = useState('')
  const [type, setType]               = useState<DossierType>('document')
  const [description, setDescription] = useState('')
  const [file, setFile]               = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Optionele klant-koppeling (alleen zichtbaar als we vanuit een project werken)
  const [customers, setCustomers]           = useState<Customer[]>([])
  const [linkToCustomer, setLinkToCustomer] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  useEffect(() => {
    if (projectId && !customerId) {
      fetch('/api/customers')
        .then(r => r.ok ? r.json() : [])
        .then(data => setCustomers(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [projectId, customerId])

  async function handleSubmit() {
    if (!title.trim()) { setError('Titel is verplicht'); return }
    setIsSubmitting(true)
    setError(null)

    try {
      let fileData: { file_url?: string; file_name?: string; file_size?: number } = {}

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/dossiers/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) { const err = await uploadRes.json(); throw new Error(err.error ?? 'Upload mislukt') }
        fileData = await uploadRes.json()
      }

      const finalCustomerId =
        customerId ??
        (projectId && linkToCustomer && selectedCustomerId ? selectedCustomerId : undefined)

      const res = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), type,
          description: description.trim() || undefined,
          project_id: projectId,
          customer_id: finalCustomerId,
          ...fileData,
        }),
      })

      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Opslaan mislukt') }
      const { data } = await res.json()
      onCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nieuw dossier</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Bijv. Offerte Q1 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as DossierType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(DOSSIER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Optionele toelichting..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bijlage (optioneel)</label>
            {file ? (
              <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-gray-400 text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-6 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-1">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Klik om bestand te selecteren (max 10MB)
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Klant-koppeling — alleen vanuit projectcontext */}
          {projectId && !customerId && customers.length > 0 && (
            <div className="pt-1 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={linkToCustomer}
                  onChange={e => { setLinkToCustomer(e.target.checked); if (!e.target.checked) setSelectedCustomerId('') }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">Ook koppelen aan een klant</span>
              </label>
              {linkToCustomer && (
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecteer een klant...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuleren</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
            {isSubmitting ? 'Opslaan...' : 'Dossier aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}
