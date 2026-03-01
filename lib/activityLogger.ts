/**
 * lib/activityLogger.ts
 *
 * Centrale helper voor het loggen van activiteiten.
 * Fire-and-forget — gooit nooit een fout die een request blokkeert.
 *
 * Gebruik:
 *   import { logActivity } from '@/lib/activityLogger'
 *   await logActivity(supabase, {
 *     actorId: user.id,
 *     action: 'project.created',
 *     entityType: 'project',
 *     entityId: project.id,
 *     entityName: project.name,
 *     projectId: project.id,
 *   })
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityAction =
  // Projects
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'project.deleted'
  // Customers
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  // Dossiers
  | 'dossier.created'
  | 'dossier.deleted'
  // Subprocesses
  | 'subprocess.created'
  | 'subprocess.status_changed'
  | 'subprocess.updated'
  | 'subprocess.deleted'
  // Members
  | 'member.added'
  | 'member.removed'
  // Intakes
  | 'intake.created'
  | 'intake.sent'

export type EntityType = 'project' | 'customer' | 'dossier' | 'subprocess' | 'member' | 'intake'

export interface ActivityPayload {
  actorId:     string
  action:      ActivityAction
  entityType:  EntityType
  entityId:    string
  entityName?: string
  projectId?:  string | null
  customerId?: string | null
  metadata?:   Record<string, unknown>
}

export async function logActivity(
  supabase: SupabaseClient,
  payload: ActivityPayload,
): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      actor_id:    payload.actorId,
      action:      payload.action,
      entity_type: payload.entityType,
      entity_id:   payload.entityId,
      entity_name: payload.entityName ?? null,
      project_id:  payload.projectId  ?? null,
      customer_id: payload.customerId ?? null,
      metadata:    payload.metadata   ?? null,
    })
  } catch (err) {
    // Nooit crashen — activiteitenlog is best-effort
    console.error('[activityLogger] Failed to log activity:', err)
  }
}

// ─── Label helpers voor de UI ─────────────────────────────────

export const ACTION_LABELS: Record<ActivityAction, string> = {
  'project.created':         'Project aangemaakt',
  'project.updated':         'Project bijgewerkt',
  'project.status_changed':  'Projectstatus gewijzigd',
  'project.deleted':         'Project verwijderd',
  'customer.created':        'Klant aangemaakt',
  'customer.updated':        'Klant bijgewerkt',
  'customer.deleted':        'Klant verwijderd',
  'dossier.created':         'Dossier toegevoegd',
  'dossier.deleted':         'Dossier verwijderd',
  'subprocess.created':      'Deeltaak aangemaakt',
  'subprocess.status_changed': 'Deeltaakstatus gewijzigd',
  'subprocess.updated':      'Deeltaak bijgewerkt',
  'subprocess.deleted':      'Deeltaak verwijderd',
  'member.added':            'Teamlid toegevoegd',
  'member.removed':          'Teamlid verwijderd',
  'intake.created':          'Intake aangemaakt',
  'intake.sent':             'Intake verstuurd',
}

export const ACTION_ICONS: Record<ActivityAction, string> = {
  'project.created':           '📁',
  'project.updated':           '✏️',
  'project.status_changed':    '🔄',
  'project.deleted':           '🗑️',
  'customer.created':          '🏢',
  'customer.updated':          '✏️',
  'customer.deleted':          '🗑️',
  'dossier.created':           '📎',
  'dossier.deleted':           '🗑️',
  'subprocess.created':        '✅',
  'subprocess.status_changed': '🔄',
  'subprocess.updated':        '✏️',
  'subprocess.deleted':        '🗑️',
  'member.added':              '👤',
  'member.removed':            '👤',
  'intake.created':            '📋',
  'intake.sent':               '📨',
}

export const ACTION_COLORS: Record<ActivityAction, string> = {
  'project.created':           'bg-brand-50 text-brand-600',
  'project.updated':           'bg-slate-50 text-slate-500',
  'project.status_changed':    'bg-amber-50 text-amber-600',
  'project.deleted':           'bg-red-50 text-red-500',
  'customer.created':          'bg-violet-50 text-violet-600',
  'customer.updated':          'bg-slate-50 text-slate-500',
  'customer.deleted':          'bg-red-50 text-red-500',
  'dossier.created':           'bg-blue-50 text-blue-600',
  'dossier.deleted':           'bg-red-50 text-red-500',
  'subprocess.created':        'bg-emerald-50 text-emerald-600',
  'subprocess.status_changed': 'bg-amber-50 text-amber-600',
  'subprocess.updated':        'bg-slate-50 text-slate-500',
  'subprocess.deleted':        'bg-red-50 text-red-500',
  'member.added':              'bg-indigo-50 text-indigo-600',
  'member.removed':            'bg-slate-50 text-slate-500',
  'intake.created':            'bg-teal-50 text-teal-600',
  'intake.sent':               'bg-blue-50 text-blue-600',
}
