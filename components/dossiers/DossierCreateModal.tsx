'use client'

import { useState, useRef, useEffect } from 'react'
import { X, FileText, Upload } from 'lucide-react'
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Nieuw dossier</h2>
          <button onClick={onCancel} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <div>
            <label className="label">Titel <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Bijv. Offerte Q1 2025"
              className="input"
            />
          </div>

          <div>
            <label className="label">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as DossierType)}
              className="input"
            >
              {Object.entries(DOSSIER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Omschrijving</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optionele toelichting..."
              className="input resize-none"
            />
          </div>

          <div>
            <label className="label">Bijlage (optioneel)</label>
            {file ? (
              <div className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText size={16} className="text-brand-500 shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-slate-400 text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-6 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500
                           hover:border-brand-400 hover:text-brand-600 transition-colors flex flex-col items-center gap-1.5">
                <Upload size={20} className="text-slate-300" />
                Klik om bestand te selecteren (max 10MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                if (f && f.size > 10 * 1024 * 1024) {
                  setError('Bestand is te groot. Maximum bestandsgrootte is 10 MB.')
                  e.target.value = ''
                  return
                }
                setError(null)
                setFile(f)
              }}
            />
          </div>

          {/* Klant-koppeling — alleen vanuit projectcontext */}
          {projectId && !customerId && customers.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={linkToCustomer}
                  onChange={e => { setLinkToCustomer(e.target.checked); if (!e.target.checked) setSelectedCustomerId('') }}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-slate-700">Ook koppelen aan een klant</span>
              </label>
              {linkToCustomer && (
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                  className="mt-2 input">
                  <option value="">Selecteer een klant...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onCancel} className="btn-outline">Annuleren</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} className="btn-primary">
            {isSubmitting ? 'Opslaan...' : 'Dossier aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}
