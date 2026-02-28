'use client'

import { useState } from 'react'
import {
  FileDown, FileSpreadsheet, X, Loader2, Check,
  Calendar, FolderKanban, Building2, Clock, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────

type Format = 'pdf' | 'excel'
type Scope  = 'all' | 'projects' | 'customers' | 'hours'

interface Props {
  /** Triggerknop variant */
  variant?: 'button' | 'sidebar' | 'icon'
  /** Initiële scope */
  defaultScope?: Scope
}

// ─── Helpers ─────────────────────────────────────────────────

const STATUS_NL: Record<string, string> = {
  active:       'Actief',
  'in-progress':'In uitvoering',
  archived:     'Gearchiveerd',
}
const CSTATUS_NL: Record<string, string> = { active: 'Actief', inactive: 'Inactief' }

// ─── PDF generator (client-side via jsPDF) ───────────────────

async function generatePDF(data: any) {
  const { jsPDF } = await import('jspdf')
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = 210
  const M    = 16
  const COL  = W - M * 2
  let   y    = M

  function newPage() { doc.addPage(); y = M }
  function check(h = 10) { if (y + h > 282) newPage() }

  // ── Branding header ─────────────────────────────────────
  doc.setFillColor(10, 102, 69)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('NEXSOLVE', M, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Export rapport', M, 16)
  const ts = new Date(data.exported_at).toLocaleString('nl-NL')
  doc.text(ts, W - M, 13, { align: 'right' })
  y = 28

  // Summary row
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  const parts: string[] = []
  if (data.totals.projects)  parts.push(`${data.totals.projects} projecten`)
  if (data.totals.customers) parts.push(`${data.totals.customers} klanten`)
  if (data.totals.total_hours > 0) parts.push(`${data.totals.total_hours}u geregistreerd`)
  if (data.from_date) parts.push(`${data.from_date} t/m ${data.to_date ?? '...'}`)
  doc.text(parts.join('  ·  '), M, y)
  y += 10

  // ── Sectie helper ─────────────────────────────────────
  function sectionHeader(title: string, color: [number,number,number]) {
    check(14)
    doc.setFillColor(...color)
    doc.rect(M, y - 4, COL, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(title, M + 3, y + 2)
    y += 12
    doc.setTextColor(71, 85, 105)
  }

  function metaLine(label: string, value: string) {
    if (!value) return
    check(6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label + ':', M + 3, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85)
    doc.text(value, M + 36, y)
    y += 5.5
  }

  // ── Projecten ────────────────────────────────────────
  if (data.projects?.length > 0) {
    sectionHeader(`Projecten (${data.projects.length})`, [10, 102, 69])

    data.projects.forEach((p: any, idx: number) => {
      check(28)

      // Title bar
      doc.setFillColor(248, 250, 252)
      doc.rect(M, y - 3.5, COL, 9, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.rect(M, y - 3.5, COL, 9, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(`${idx + 1}. ${p.name}`, M + 3, y + 1.5)

      // Status pill
      const sc: Record<string,string> = { active:'#10b981','in-progress':'#f59e0b',archived:'#94a3b8' }
      const hex = sc[p.status] ?? '#94a3b8'
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      doc.setFillColor(r,g,b)
      doc.roundedRect(W - M - 30, y - 3, 30, 7, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(255,255,255)
      doc.text(STATUS_NL[p.status] ?? p.status, W - M - 15, y + 1.5, { align: 'center' })
      y += 11

      metaLine('Eigenaar',   p.owner?.full_name ?? '')
      metaLine('Klant',      p.customer?.name   ?? '')
      metaLine('Thema',      [p.theme?.name, p.process?.name].filter(Boolean).join(' › '))
      metaLine('Periode',    [p.start_date, p.end_date].filter(Boolean).join(' – '))

      const sps   = p.subprocesses ?? []
      const done  = sps.filter((s: any) => s.status === 'done').length
      if (sps.length > 0) metaLine('Voortgang', `${done}/${sps.length} taken gereed`)

      if (p.description) {
        check(8)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        const lines = doc.splitTextToSize(p.description, COL - 6) as string[]
        lines.slice(0, 2).forEach((l: string) => { doc.text(l, M + 3, y); y += 5 })
      }

      y += 5
    })
  }

  // ── Klanten ─────────────────────────────────────────
  if (data.customers?.length > 0) {
    check(14)
    sectionHeader(`Klanten (${data.customers.length})`, [109, 40, 217])

    data.customers.forEach((c: any, idx: number) => {
      check(24)

      doc.setFillColor(250, 245, 255)
      doc.rect(M, y - 3.5, COL, 9, 'F')
      doc.setDrawColor(237, 233, 254)
      doc.rect(M, y - 3.5, COL, 9, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(`${idx + 1}. ${c.name}${c.code ? ` (#${c.code})` : ''}`, M + 3, y + 1.5)
      y += 11

      metaLine('Status',    CSTATUS_NL[c.status] ?? c.status)
      metaLine('E-mail',    c.email    ?? '')
      metaLine('Telefoon',  c.phone    ?? '')
      metaLine('Adres',     [c.address_street, c.address_zip, c.address_city].filter(Boolean).join(', '))
      metaLine('Contact',   [c.contact_name, c.contact_role].filter(Boolean).join(', '))

      y += 4
    })
  }

  // ── Urenregistratie ──────────────────────────────────
  if (data.hours?.length > 0) {
    check(14)
    sectionHeader(`Urenregistratie (${data.totals.total_hours}u totaal)`, [37, 99, 235])

    // Group by user
    const byUser: Record<string, { name: string; entries: any[]; total: number }> = {}
    data.hours.forEach((h: any) => {
      const name = h.user?.full_name ?? 'Onbekend'
      if (!byUser[name]) byUser[name] = { name, entries: [], total: 0 }
      byUser[name].entries.push(h)
      byUser[name].total += Number(h.hours)
    })

    Object.values(byUser).forEach(({ name, entries, total }) => {
      check(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      doc.text(`${name}  —  ${total}u totaal`, M + 3, y)
      y += 7

      entries.forEach((h: any) => {
        check(6)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        const note = h.notes ? `  · ${h.notes}` : ''
        doc.text(`${h.date}   ${h.project?.name ?? '—'}   ${h.hours}u${note}`, M + 6, y)
        y += 5
      })
      y += 3
    })
  }

  // ── Paginanummers ─────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Pagina ${i} van ${pages}  ·  NexSolve Export`, W / 2, 292, { align: 'center' })
  }

  doc.save(`nexsolve-export-${Date.now()}.pdf`)
}

// ─── Excel generator (client-side via SheetJS) ────────────────

async function generateExcel(data: any) {
  // Dynamisch laden — SheetJS is groot
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs' as any)

  const wb = XLSX.utils.book_new()

  // Helper: array van objecten → sheet
  function addSheet(name: string, rows: Record<string, any>[]) {
    if (rows.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Geen gegevens']])
      XLSX.utils.book_append_sheet(wb, ws, name)
      return
    }
    const ws = XLSX.utils.json_to_sheet(rows)

    // Kolombreedte automatisch berekenen
    const cols = Object.keys(rows[0])
    ws['!cols'] = cols.map(k => ({
      wch: Math.min(
        Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)),
        50
      )
    }))

    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  if (data.sheets.projects?.length  > 0) addSheet('Projecten',       data.sheets.projects)
  if (data.sheets.customers?.length > 0) addSheet('Klanten',         data.sheets.customers)
  if (data.sheets.hours?.length     > 0) addSheet('Urenregistratie', data.sheets.hours)

  // Meta tabblad
  const meta = [
    { Sleutel: 'Geëxporteerd op',   Waarde: new Date(data.exported_at).toLocaleString('nl-NL') },
    { Sleutel: 'Projecten',         Waarde: data.totals.projects },
    { Sleutel: 'Klanten',           Waarde: data.totals.customers },
    { Sleutel: 'Totaal uren',       Waarde: data.totals.total_hours },
    { Sleutel: 'Periode',           Waarde: data.date_range ?? 'Alle datums' },
  ]
  addSheet('Info', meta)

  XLSX.writeFile(wb, `nexsolve-export-${Date.now()}.xlsx`)
}

// ─── Main component ───────────────────────────────────────────

export function ExportModal({ variant = 'button', defaultScope = 'all' }: Props) {
  const [open,    setOpen]    = useState(false)
  const [format,  setFormat]  = useState<Format>('excel')
  const [scope,   setScope]   = useState<Scope>(defaultScope)
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [inclHours, setInclHours] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)

    try {
      if (format === 'excel') {
        const params = new URLSearchParams({ include_hours: String(inclHours) })
        if (from) params.set('from', from)
        if (to)   params.set('to',   to)
        const res  = await fetch(`/api/export/excel?${params}`)
        if (!res.ok) throw new Error((await res.json()).error ?? 'Export mislukt')
        const data = await res.json()
        await generateExcel(data)
      } else {
        const params = new URLSearchParams({
          scope,
          include_hours: String(inclHours),
        })
        if (from) params.set('from', from)
        if (to)   params.set('to',   to)
        const res  = await fetch(`/api/export/pdf?${params}`)
        if (!res.ok) throw new Error((await res.json()).error ?? 'Export mislukt')
        const data = await res.json()
        await generatePDF(data)
      }

      setDone(true)
      setTimeout(() => { setDone(false); setOpen(false) }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis')
    } finally {
      setLoading(false)
    }
  }

  // ── Trigger knop ─────────────────────────────────────
  const TriggerButton = () => {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={() => setOpen(v => !v)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            open ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          )}
        >
          <FileDown size={18} />
          <span className="flex-1 text-left">Exporteren</span>
        </button>
      )
    }
    if (variant === 'icon') {
      return (
        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
          title="Exporteren"
        >
          <FileDown size={16} />
        </button>
      )
    }
    return (
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
      >
        <FileDown size={15} /> Exporteren
      </button>
    )
  }

  return (
    <div className="relative">
      <TriggerButton />

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className={clsx(
            'absolute z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-80',
            variant === 'sidebar' ? 'left-full top-0 ml-2' : 'right-0 top-full mt-2'
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileDown size={16} className="text-brand-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Exporteren</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Formaat kiezen */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Formaat</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'excel', icon: FileSpreadsheet, label: 'Excel', sub: '.xlsx' },
                    { value: 'pdf',   icon: FileDown,        label: 'PDF',   sub: '.pdf' },
                  ] as const).map(({ value, icon: Icon, label, sub }) => (
                    <button
                      key={value}
                      onClick={() => setFormat(value)}
                      className={clsx(
                        'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                        format === value
                          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Icon size={18} className={format === value ? 'text-brand-600' : 'text-slate-400'} />
                      <div>
                        <p className={clsx('text-sm font-semibold', format === value ? 'text-brand-700' : 'text-slate-700')}>{label}</p>
                        <p className="text-[10px] text-slate-400">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope (alleen bij PDF) */}
              {format === 'pdf' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Inhoud</label>
                  <div className="space-y-1.5">
                    {([
                      { value: 'all',       icon: FileDown,    label: 'Alles' },
                      { value: 'projects',  icon: FolderKanban,label: 'Alleen projecten' },
                      { value: 'customers', icon: Building2,   label: 'Alleen klanten' },
                    ] as const).map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => setScope(value)}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                          scope === value
                            ? 'border-brand-400 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <Icon size={14} />
                        {label}
                        {scope === value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Uren meenemen */}
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <div className={clsx(
                  'w-9 h-5 rounded-full transition-colors relative',
                  inclHours ? 'bg-brand-500' : 'bg-slate-200'
                )}>
                  <div className={clsx(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    inclHours ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">Urenregistratie</span>
                </div>
                <input
                  type="checkbox"
                  checked={inclHours}
                  onChange={e => setInclHours(e.target.checked)}
                  className="sr-only"
                />
              </label>

              {/* Datumrange */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
                  <Calendar size={11} /> Periode filteren <span className="text-slate-400 font-normal">(optioneel)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Van</p>
                    <input
                      type="date"
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Tot</p>
                    <input
                      type="date"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              {/* Export knop */}
              <button
                onClick={handleExport}
                disabled={loading || done}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Bezig met genereren…</>
                ) : done ? (
                  <><Check size={15} /> Gedownload!</>
                ) : (
                  <><FileDown size={15} /> Download {format === 'excel' ? 'Excel' : 'PDF'}</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
