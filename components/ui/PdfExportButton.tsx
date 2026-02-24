"use client";

import { useState } from "react";
import { FileDown, Calendar, Loader2, X, Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  /** "all" | "theme:{id}" | "project:{id}" */
  scope?: string;
  label?: string;
  variant?: "button" | "sidebar";
}

export default function PdfExportButton({
  scope = "all",
  label = "Exporteer PDF",
  variant = "button",
}: Props) {
  const [open,     setOpen]     = useState(false);
  const [date,     setDate]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  async function handleExport() {
    setLoading(true); setError(""); setDone(false);

    const params = new URLSearchParams({ scope });
    if (date) params.set("date", date);

    try {
      const res = await fetch(`/api/export/pdf?${params}`);
      const text = await res.text();

      if (!res.ok || !text) {
        let msg = "Export mislukt";
        try { msg = JSON.parse(text)?.error ?? msg; } catch {}
        setError(msg);
        setLoading(false);
        return;
      }

      let data: any;
      try { data = JSON.parse(text); } catch {
        setError("Ongeldige serverrespons ontvangen.");
        setLoading(false);
        return;
      }

    // ── Client-side PDF via jsPDF (geladen dynamisch) ────
    // Installeer eerst: npm install jspdf
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const W        = 210;
    const MARGIN   = 16;
    const COL      = W - MARGIN * 2;
    let   y        = MARGIN;
    const LINE     = 6;

    function checkPage(needed = 10) {
      if (y + needed > 280) { doc.addPage(); y = MARGIN; }
    }

    // ── Header ────────────────────────────────────────────
    doc.setFillColor(10, 102, 69); // brand green
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NEXSOLVE — Projectoverzicht", MARGIN, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const exportedAt = new Date(data.exported_at).toLocaleString("nl-NL");
    doc.text(`Geëxporteerd op ${exportedAt}`, W - MARGIN, 12, { align: "right" });
    y = 26;

    // Meta row
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    const dateLabel = data.date_filter
      ? `Dag: ${new Date(data.date_filter).toLocaleDateString("nl-NL")}`
      : "Alle datums";
    doc.text(`${data.count} project(en)  ·  ${dateLabel}`, MARGIN, y);
    y += 10;

    // ── Projects ──────────────────────────────────────────
    if (data.projects.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Geen projecten gevonden voor deze selectie.", MARGIN, y);
    }

    data.projects.forEach((p: any, idx: number) => {
      checkPage(30);

      // Project title bar
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y - 4, COL, 9, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(MARGIN, y - 4, COL, 9, "S");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`${idx + 1}. ${p.name}`, MARGIN + 3, y + 1);

      // Status badge (right)
      const STATUS_COLORS: Record<string, [number, number, number]> = {
        "active":      [16, 185, 129],
        "in-progress": [245, 158, 11],
        "archived":    [148, 163, 184],
      };
      const sc = STATUS_COLORS[p.status] ?? [148, 163, 184];
      doc.setFillColor(...sc);
      doc.roundedRect(W - MARGIN - 28, y - 3.5, 28, 7, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      const statusLabel: Record<string, string> = {
        "active": "Actief", "in-progress": "In uitvoering", "archived": "Gearchiveerd"
      };
      doc.text(statusLabel[p.status] ?? p.status, W - MARGIN - 14, y + 1, { align: "center" });

      y += 10;

      // Meta details
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      const metaItems = [
        p.owner_name    && `Eigenaar: ${p.owner_name}`,
        p.customer_name && `Klant: ${p.customer_name}`,
        p.theme_name    && `Thema: ${p.theme_name}${p.process_name ? ` › ${p.process_name}` : ""}`,
        p.subprocesses_total > 0 && `Subtaken: ${p.subprocesses_done}/${p.subprocesses_total} klaar`,
      ].filter(Boolean) as string[];

      metaItems.forEach(item => {
        checkPage(LINE);
        doc.text(`• ${item}`, MARGIN + 3, y);
        y += LINE;
      });

      // Description
      if (p.description) {
        checkPage(LINE + 4);
        y += 2;
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(p.description, COL - 6) as string[];
        lines.slice(0, 3).forEach((line: string) => {
          checkPage(LINE);
          doc.text(line, MARGIN + 3, y);
          y += LINE;
        });
      }

      y += 6; // gap between projects
    });

    // ── Footer ────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Pagina ${i} van ${pageCount}  ·  NEXSOLVE`, W / 2, 290, { align: "center" });
    }

    // Download
    const filename = `nexsolve-export-${date || "alle"}-${Date.now()}.pdf`;
    doc.save(filename);

    setLoading(false);
    setDone(true);
    setTimeout(() => { setDone(false); setOpen(false); }, 2000);
    } catch (err: any) {
      setError(err?.message ?? "Er ging iets mis bij het genereren van de PDF.");
      setLoading(false);
    }
  }

  if (variant === "sidebar") {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            open
              ? "bg-brand-50 text-brand-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
          )}
        >
          <FileDown size={18} />
          <span className="flex-1 text-left">Exporteer PDF</span>
        </button>

        {open && (
          <div className="mt-1 ml-3 border-l-2 border-slate-100 pl-3 pb-2 space-y-2">
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Calendar size={10} /> Dag filteren (optioneel)
              </p>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleExport}
              disabled={loading || done}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {loading ? <><Loader2 size={11} className="animate-spin" /> Bezig…</>
               : done  ? <><Check size={11} /> Klaar!</>
               :          <><FileDown size={11} /> Download PDF</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Button variant (inline / modal) ──────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-outline flex items-center gap-2 text-sm"
      >
        <FileDown size={15} /> {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-72 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">PDF exporteren</p>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
            </div>

            <div>
              <label className="label flex items-center gap-1.5 mb-1.5">
                <Calendar size={11} /> Filter op dag <span className="text-slate-300 font-normal">(optioneel)</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input text-sm"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Laat leeg voor alle projecten.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleExport}
              disabled={loading || done}
              className="btn-primary w-full justify-center"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Bezig met genereren…</>
               : done  ? <><Check size={15} /> Gedownload!</>
               :          <><FileDown size={15} /> Download PDF</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
