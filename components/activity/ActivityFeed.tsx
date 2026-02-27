'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock, ChevronDown } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { relativeTime } from '@/lib/time'
import { ACTION_LABELS, ACTION_ICONS, ACTION_COLORS, type ActivityAction } from '@/lib/activityLogger'
import type { ActivityLogEntry } from '@/types'

interface Props {
  projectId?:  string
  customerId?: string
  actorId?:    string
  limit?:      number
  /** Compacte weergave voor in sidepanels */
  compact?:    boolean
  /** Titel bovenaan het panel */
  title?:      string
}

export function ActivityFeed({
  projectId,
  customerId,
  actorId,
  limit = 20,
  compact = false,
  title = 'Recente activiteit',
}: Props) {
  const [entries,    setEntries]    = useState<ActivityLogEntry[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const buildUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams()
    if (projectId)  params.set('project_id',  projectId)
    if (customerId) params.set('customer_id', customerId)
    if (actorId)    params.set('actor_id',    actorId)
    params.set('limit', String(limit))
    if (cursor)     params.set('cursor', cursor)
    return `/api/activity?${params}`
  }, [projectId, customerId, actorId, limit])

  const fetchEntries = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const res  = await fetch(buildUrl())
      const json = await res.json()
      setEntries(json.data ?? [])
      setNextCursor(json.nextCursor ?? null)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [buildUrl])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    const res  = await fetch(buildUrl(nextCursor))
    const json = await res.json()
    setEntries(prev => [...prev, ...(json.data ?? [])])
    setNextCursor(json.nextCursor ?? null)
    setLoadingMore(false)
  }

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ─── Helpers ────────────────────────────────────────────────

  function getLabel(entry: ActivityLogEntry) {
    return ACTION_LABELS[entry.action as ActivityAction] ?? entry.action
  }

  function getIcon(entry: ActivityLogEntry) {
    return ACTION_ICONS[entry.action as ActivityAction] ?? '📌'
  }

  function getColor(entry: ActivityLogEntry) {
    return ACTION_COLORS[entry.action as ActivityAction] ?? 'bg-slate-50 text-slate-500'
  }

  function getDescription(entry: ActivityLogEntry): string {
    const meta = entry.metadata as Record<string, string> | null
    switch (entry.action as ActivityAction) {
      case 'project.status_changed':
      case 'subprocess.status_changed': {
        const statusMap: Record<string, string> = {
          'active':      'Actief',
          'in-progress': 'In uitvoering',
          'archived':    'Gearchiveerd',
          'todo':        'Te doen',
          'done':        'Gereed',
          'blocked':     'Geblokkeerd',
        }
        const from = statusMap[meta?.from ?? ''] ?? meta?.from ?? ''
        const to   = statusMap[meta?.to   ?? ''] ?? meta?.to   ?? ''
        return from && to ? `${from} → ${to}` : ''
      }
      case 'member.added':
        return meta?.role ? `Rol: ${meta.role}` : ''
      default:
        return entry.entity_name ?? ''
    }
  }

  // ─── Render ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={compact ? 'p-4' : 'card p-6'}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-brand-500" />
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'card p-6'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-brand-500" />
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          {entries.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
              {entries.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchEntries(true)}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Vernieuwen"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-slate-400">Nog geen activiteit</p>
        </div>
      ) : (
        <>
          {/* Feed */}
          <div className="relative">
            {/* Verticale lijn */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />

            <div className="space-y-1">
              {entries.map((entry, idx) => {
                const description = getDescription(entry)
                const isLast = idx === entries.length - 1
                return (
                  <div
                    key={entry.id}
                    className={`relative flex items-start gap-3 ${compact ? 'py-2.5' : 'py-3'} ${!isLast ? 'border-b border-slate-50' : ''}`}
                  >
                    {/* Actor avatar met actie-icoon */}
                    <div className="relative shrink-0 z-10">
                      <Avatar
                        name={entry.actor?.full_name ?? '?'}
                        url={entry.actor?.avatar_url ?? null}
                        size="sm"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center ${getColor(entry)}`}
                        title={getLabel(entry)}
                      >
                        {getIcon(entry)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-slate-700 leading-snug">
                        <span className="font-medium">{entry.actor?.full_name ?? 'Onbekend'}</span>
                        {' '}
                        <span className="text-slate-500">{getLabel(entry).toLowerCase()}</span>
                        {entry.entity_name && entry.action !== 'subprocess.status_changed' && entry.action !== 'project.status_changed' && (
                          <span className="font-medium text-slate-700"> "{entry.entity_name}"</span>
                        )}
                      </p>
                      {description && (
                        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                      )}
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {relativeTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Load more */}
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 py-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronDown size={13} />
              {loadingMore ? 'Laden...' : 'Meer laden'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
