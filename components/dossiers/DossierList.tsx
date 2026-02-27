'use client'

import { useState, useEffect, useCallback } from 'react'
import { DossierWithDetails, DOSSIER_TYPE_LABELS } from '@/types/dossier'
import { DossierCreateModal } from './DossierCreateModal'
import { DossierDetailModal } from './DossierDetailModal'

interface Props {
  projectId?: string
  customerId?: string
}

export function DossierList({ projectId, customerId }: Props) {
  const [dossiers, setDossiers] = useState<DossierWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDossier, setSelectedDossier] = useState<DossierWithDetails | null>(null)

  const fetchDossiers = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (customerId) params.set('customer_id', customerId)
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`/api/dossiers?${params}`)
    const json = await res.json()

    if (cursor) {
      setDossiers(prev => [...prev, ...json.data])
    } else {
      setDossiers(json.data ?? [])
    }
    setNextCursor(json.nextCursor)
    setIsLoading(false)
  }, [projectId, customerId])

  useEffect(() => {
    fetchDossiers()
  }, [fetchDossiers])

  function handleCreated(newDossier: DossierWithDetails) {
    setDossiers(prev => [newDossier, ...prev])
    setShowCreate(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Dossiers ({dossiers.length})
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuw dossier
        </button>
      </div>

      {/* Lege staat */}
      {dossiers.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-400">Nog geen dossiers</p>
        </div>
      )}

      {/* Tabel */}
      {dossiers.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instuurder</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ingestuurd op</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Gekoppeld aan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dossiers.map(dossier => (
                <tr
                  key={dossier.id}
                  onClick={() => setSelectedDossier(dossier)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {dossier.file_url && (
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                      <span className="font-medium text-gray-900">{dossier.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {DOSSIER_TYPE_LABELS[dossier.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{dossier.submitted_by_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(dossier.submitted_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {dossier.project_name && (
                        <span className="text-xs text-blue-600">📁 {dossier.project_name}</span>
                      )}
                      {dossier.customer_name && (
                        <span className="text-xs text-green-600">👤 {dossier.customer_name}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Load more */}
          {nextCursor && (
            <div className="p-3 border-t border-gray-100 text-center">
              <button
                onClick={() => fetchDossiers(nextCursor)}
                className="text-sm text-blue-600 hover:underline"
              >
                Meer laden
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <DossierCreateModal
          projectId={projectId}
          customerId={customerId}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          onClose={() => setSelectedDossier(null)}
          onDeleted={(id) => {
            setDossiers(prev => prev.filter(d => d.id !== id))
            setSelectedDossier(null)
          }}
        />
      )}
    </div>
  )
}