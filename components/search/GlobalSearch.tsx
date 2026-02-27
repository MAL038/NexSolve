'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderKanban, Building2, FileText, Users, X, ArrowRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Avatar from '@/components/ui/Avatar'

// ─── Types ────────────────────────────────────────────────────

interface SearchResults {
  projects:  Array<{ id: string; name: string; status: string; customer?: { name: string } }>
  customers: Array<{ id: string; name: string; code?: string; status: string; email?: string }>
  dossiers:  Array<{ id: string; title: string; type: string; project_name?: string; customer_name?: string }>
  members:   Array<{ id: string; full_name: string; email: string; role: string; avatar_url?: string }>
}

const STATUS_LABEL: Record<string, string> = {
  active:       'Actief',
  'in-progress':'In uitvoering',
  archived:     'Gearchiveerd',
}

// ─── Debounce hook ────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Component ────────────────────────────────────────────────

export function GlobalSearch() {
  const router = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)

  const [query,      setQuery]     = useState('')
  const [open,       setOpen]      = useState(false)
  const [loading,    setLoading]   = useState(false)
  const [results,    setResults]   = useState<SearchResults | null>(null)
  const [activeIdx,  setActiveIdx] = useState(0)

  const debouncedQuery = useDebounce(query, 250)

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Klik buiten sluit panel
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Fetch bij query change
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => { setResults(data); setActiveIdx(0) })
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Flatten alle resultaten voor keyboard nav
  const flatItems = results ? [
    ...results.projects.map(p  => ({ type: 'project',  id: p.id,  href: `/projects/${p.id}`,  label: p.name,       sub: p.customer?.name ?? STATUS_LABEL[p.status] ?? p.status })),
    ...results.customers.map(c => ({ type: 'customer', id: c.id,  href: `/customers/${c.id}`, label: c.name,       sub: c.code ? `#${c.code}` : c.email ?? '' })),
    ...results.dossiers.map(d  => ({ type: 'dossier',  id: d.id,  href: null,                 label: d.title,      sub: d.project_name ?? d.customer_name ?? d.type })),
    ...results.members.map(m   => ({ type: 'member',   id: m.id,  href: `/team`,              label: m.full_name,  sub: m.email, avatar_url: (m as any).avatar_url })),
  ] : []

  function navigate(href: string | null) {
    if (!href) return
    router.push(href)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || flatItems.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flatItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); navigate(flatItems[activeIdx]?.href ?? null) }
  }

  const hasResults = results && (
    results.projects.length + results.customers.length +
    results.dossiers.length + results.members.length > 0
  )

  const iconFor = (type: string) => {
    if (type === 'project')  return <FolderKanban size={14} className="text-brand-500" />
    if (type === 'customer') return <Building2    size={14} className="text-violet-500" />
    if (type === 'dossier')  return <FileText     size={14} className="text-blue-500" />
    if (type === 'member')   return <Users        size={14} className="text-emerald-500" />
  }

  return (
    <div ref={panelRef} className="relative w-full">
      {/* Search trigger */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className={clsx(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
          open
            ? 'border-brand-400 ring-2 ring-brand-100 bg-white'
            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white'
        )}
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 text-left text-xs">Zoeken...</span>
        <kbd className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono hidden lg:block">
          ⌘K
        </kbd>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onKeyDown={onKeyDown}
              placeholder="Zoek projecten, klanten, dossiers..."
              className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
              autoComplete="off"
            />
            {loading && <Loader2 size={13} className="animate-spin text-slate-400 shrink-0" />}
            {query && !loading && (
              <button onClick={() => { setQuery(''); setResults(null) }} className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto">
            {query.length < 2 && (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Typ minimaal 2 tekens om te zoeken
              </div>
            )}

            {query.length >= 2 && !loading && !hasResults && (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Geen resultaten voor <span className="font-medium text-slate-600">"{query}"</span>
              </div>
            )}

            {hasResults && (
              <div className="py-1.5">
                {/* Projecten */}
                {results!.projects.length > 0 && (
                  <Section title="Projecten">
                    {results!.projects.map(p => {
                      const fi = flatItems.findIndex(f => f.type === 'project' && f.id === p.id)
                      return (
                        <ResultRow
                          key={p.id}
                          icon={iconFor('project')}
                          label={p.name}
                          sub={p.customer?.name ?? STATUS_LABEL[p.status] ?? p.status}
                          badge={STATUS_LABEL[p.status]}
                          badgeColor={p.status === 'active' ? 'bg-brand-50 text-brand-600' : p.status === 'in-progress' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}
                          active={fi === activeIdx}
                          onClick={() => navigate(`/projects/${p.id}`)}
                        />
                      )
                    })}
                  </Section>
                )}

                {/* Klanten */}
                {results!.customers.length > 0 && (
                  <Section title="Klanten">
                    {results!.customers.map(c => {
                      const fi = flatItems.findIndex(f => f.type === 'customer' && f.id === c.id)
                      return (
                        <ResultRow
                          key={c.id}
                          icon={iconFor('customer')}
                          label={c.name}
                          sub={c.code ? `#${c.code}` : (c.email ?? '')}
                          active={fi === activeIdx}
                          onClick={() => navigate(`/customers/${c.id}`)}
                        />
                      )
                    })}
                  </Section>
                )}

                {/* Dossiers */}
                {results!.dossiers.length > 0 && (
                  <Section title="Dossiers">
                    {results!.dossiers.map(d => {
                      const fi = flatItems.findIndex(f => f.type === 'dossier' && f.id === d.id)
                      return (
                        <ResultRow
                          key={d.id}
                          icon={iconFor('dossier')}
                          label={d.title}
                          sub={d.project_name ?? d.customer_name ?? d.type}
                          active={fi === activeIdx}
                          onClick={() => {}} // dossiers hebben geen eigen pagina
                        />
                      )
                    })}
                  </Section>
                )}

                {/* Teamleden */}
                {results!.members.length > 0 && (
                  <Section title="Teamleden">
                    {results!.members.map(m => {
                      const fi = flatItems.findIndex(f => f.type === 'member' && f.id === m.id)
                      return (
                        <ResultRow
                          key={m.id}
                          icon={<Avatar name={m.full_name} url={m.avatar_url} size="xs" />}
                          label={m.full_name}
                          sub={m.email}
                          active={fi === activeIdx}
                          onClick={() => navigate('/team')}
                        />
                      )
                    })}
                  </Section>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-3 py-2 flex items-center gap-3 text-[10px] text-slate-400">
            <span>↑↓ navigeren</span>
            <span>↵ openen</span>
            <span>Esc sluiten</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon, label, sub, badge, badgeColor, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  badge?: string
  badgeColor?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors group',
        active ? 'bg-brand-50' : 'hover:bg-slate-50'
      )}
    >
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', active ? 'text-brand-700' : 'text-slate-700')}>
          {label}
        </p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
      {badge && (
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-lg font-medium shrink-0', badgeColor)}>
          {badge}
        </span>
      )}
      <ArrowRight size={12} className={clsx('shrink-0 transition-opacity', active ? 'opacity-100 text-brand-500' : 'opacity-0 group-hover:opacity-50')} />
    </button>
  )
}
