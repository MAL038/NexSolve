"use client";

/**
 * IntakeTab.tsx
 * Tab op de projectpagina voor intake-beheer.
 * - Lijst van gegenereerde intakes
 * - PDF downloaden (via jsPDF)
 * - E-mail versturen
 * - Status beheren
 * - Nieuwe intake genereren
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Download, Mail, Check, Loader2, Plus,
  Trash2, AlertCircle, Send, RefreshCw, ChevronDown, ChevronUp,
  Clock, CheckCircle2, X,
} from "lucide-react";
import clsx from "clsx";
import IntakeModal from "./IntakeModal";

interface Question {
  id: string;
  type: "text" | "textarea" | "select";
  label: string;
  required?: boolean;
  options?: string[];
}

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

interface IntakeSnapshot {
  project: {
    id: string;
    name: string;
    code?: string;
    start_date?: string;
    end_date?: string;
    customer?: { id: string; name: string; contact_name?: string; contact_email?: string } | null;
  };
  sections: Section[];
  generated_at: string;
}

interface Intake {
  id: string;
  project_id: string;
  template_snapshot: IntakeSnapshot;
  status: "draft" | "sent" | "received";
  sent_to: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Props {
  projectId:   string;
  projectName: string;
  themeId?:    string | null;
}

const STATUS_CONFIG = {
  draft:    { label: "Concept",    icon: Clock,          bg: "bg-slate-100",   text: "text-slate-600" },
  sent:     { label: "Verstuurd", icon: Send,           bg: "bg-blue-50",     text: "text-blue-600"  },
  received: { label: "Ontvangen", icon: CheckCircle2,   bg: "bg-emerald-50",  text: "text-emerald-600"},
};

// ─── PDF generator (client-side via jsPDF) ───────────────────

async function generatePDF(intake: Intake): Promise<void> {
  const mod = await import("jspdf");
  const JsPDF = (mod as any).default ?? (mod as any).jsPDF;
  if (!JsPDF) throw new Error("jsPDF kon niet worden geladen");

  const snapshot   = intake.template_snapshot;
  const project    = snapshot.project;
  const doc        = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 16, COL = W - M * 2;
  let y = 0;

  const newPage = () => { doc.addPage(); y = M; };
  const check   = (h = 10) => { if (y + h > 280) newPage(); };

  // ── Header balk ──────────────────────────────────────────────
  doc.setFillColor(10, 102, 69);
  doc.rect(0, 0, W, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NEXSOLVE", M, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Projectintake document", M, 18);
  doc.setFontSize(8);
  doc.text(
    new Date(snapshot.generated_at).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" }),
    W - M, 11, { align: "right" }
  );
  y = 32;

  // ── Project info box ─────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(M, y, COL, 32, 3, 3, "FD");

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("PROJECT", M + 6, y + 8);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(project.name, M + 6, y + 16);

  if (project.code) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`# ${project.code}`, M + 6, y + 22);
  }

  if (project.customer) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Klant: ${project.customer.name}`, W - M - 6, y + 8, { align: "right" });
    if (project.customer.contact_name) {
      doc.text(`Contactpersoon: ${project.customer.contact_name}`, W - M - 6, y + 14, { align: "right" });
    }
    if (project.customer.contact_email) {
      doc.setTextColor(10, 102, 69);
      doc.text(project.customer.contact_email, W - M - 6, y + 20, { align: "right" });
    }
  }

  y += 40;

  // ── Introductietekst ─────────────────────────────────────────
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const intro = `Beste ${project.customer?.contact_name ?? "relatie"},\n\nHartelijk dank voor uw interesse. Om uw project goed te kunnen voorbereiden, vragen wij u onderstaande vragenlijst zo volledig mogelijk in te vullen. Uw antwoorden helpen ons het project optimaal in te richten.\n\nStuur het ingevulde document terug naar uw projectcontact.`;
  const introLines = doc.splitTextToSize(intro, COL);
  doc.text(introLines, M, y);
  y += introLines.length * 4.5 + 8;

  // ── Secties + vragen ─────────────────────────────────────────
  for (const section of snapshot.sections) {
    check(20);

    // Sectie header
    doc.setFillColor(10, 102, 69);
    doc.rect(M, y, COL, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(section.title.toUpperCase(), M + 4, y + 5.5);
    y += 12;

    for (const q of section.questions) {
      const isTextarea = q.type === "textarea";
      const boxH = isTextarea ? 20 : 9;

      check(boxH + 14);

      // Vraag label
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const labelLines = doc.splitTextToSize(
        (q.required ? "* " : "") + q.label,
        COL
      );
      doc.text(labelLines, M, y + 4);
      y += labelLines.length * 4.2 + 3;

      // Antwoord box
      if (q.type === "select" && q.options) {
        // Toon opties als aanvinkbare lijst
        for (const opt of q.options) {
          check(7);
          doc.setDrawColor(203, 213, 225);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(M, y, 4.5, 4.5, 0.5, 0.5, "FD");
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(opt, M + 7, y + 3.5);
          y += 7;
        }
        y += 3;
      } else {
        // Invulvak
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(M, y, COL, boxH, 2, 2, "FD");
        if (!isTextarea) {
          // Schrijflijn
          doc.setDrawColor(226, 232, 240);
          doc.line(M + 3, y + boxH - 2, M + COL - 3, y + boxH - 2);
        }
        y += boxH + 5;
      }
    }

    y += 6;
  }

  // ── Footer ───────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, 288, W - M, 288);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Vertrouwelijk document — NexSolve", M, 293);
    doc.text(`Pagina ${i} van ${pageCount}`, W - M, 293, { align: "right" });
  }

  const filename = `Intake_${project.name.replace(/[^a-z0-9]/gi, "_")}_${
    new Date().toISOString().slice(0, 10)
  }.pdf`;
  doc.save(filename);
}

// ─── E-mail modal ─────────────────────────────────────────────

function EmailModal({
  intake,
  onSent,
  onClose,
}: {
  intake: Intake;
  onSent: (updated: Intake) => void;
  onClose: () => void;
}) {
  const snap        = intake.template_snapshot;
  const defaultTo   = snap.project.customer?.contact_email ?? "";
  const [emailTo,   setEmailTo]   = useState(defaultTo);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function send() {
    if (!emailTo.trim()) { setError("Voer een e-mailadres in"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/intakes/${intake.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email", email_to: emailTo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Versturen mislukt"); return; }
      onSent(data);
    } catch {
      setError("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail size={15} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Intake versturen</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              E-mailadres ontvanger
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="naam@bedrijf.nl"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              De ontvanger krijgt een e-mail met het verzoek de intake in te vullen en terug te sturen.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">
            Annuleren
          </button>
          <button
            onClick={send}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> Versturen…</>
              : <><Send size={13} /> Versturen</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Intake kaart ─────────────────────────────────────────────

function IntakeCard({
  intake,
  onUpdate,
  onDelete,
}: {
  intake: Intake;
  onUpdate: (updated: Intake) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError,   setPdfError]   = useState("");
  const [showEmail,  setShowEmail]  = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const snap   = intake.template_snapshot;
  const status = STATUS_CONFIG[intake.status];
  const StatusIcon = status.icon;

  async function handlePDF() {
    setPdfLoading(true); setPdfError("");
    try {
      await generatePDF(intake);
    } catch (e) {
      setPdfError("PDF genereren mislukt");
    } finally {
      setPdfLoading(false);
    }
  }

  async function changeStatus(action: string) {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/intakes/${intake.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Weet je zeker dat je deze intake wilt verwijderen?")) return;
    await fetch(`/api/intakes/${intake.id}`, { method: "DELETE" });
    onDelete(intake.id);
  }

  const totalQuestions = snap.sections.reduce(
    (acc, s) => acc + s.questions.length, 0
  );

  return (
    <>
      {showEmail && (
        <EmailModal
          intake={intake}
          onSent={updated => { onUpdate(updated); setShowEmail(false); }}
          onClose={() => setShowEmail(false)}
        />
      )}

      <div className="card overflow-hidden">
        {/* Kaart header */}
        <div className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-slate-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg",
                status.bg, status.text
              )}>
                <StatusIcon size={11} />
                {status.label}
              </span>
              {intake.sent_to && (
                <span className="text-xs text-slate-400 truncate">
                  → {intake.sent_to}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {snap.sections.length} secties · {totalQuestions} vragen ·{" "}
              {new Date(intake.created_at).toLocaleDateString("nl-NL")}
            </p>
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {/* Foutmelding PDF */}
        {pdfError && (
          <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle size={12} /> {pdfError}
          </div>
        )}

        {/* Acties */}
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {pdfLoading
              ? <><Loader2 size={12} className="animate-spin" /> PDF laden…</>
              : <><Download size={12} /> PDF downloaden</>
            }
          </button>

          <button
            onClick={() => setShowEmail(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <Mail size={12} /> E-mail versturen
          </button>

          {intake.status !== "received" && (
            <button
              onClick={() => changeStatus("mark_received")}
              disabled={statusLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
            >
              {statusLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Markeer als ontvangen
            </button>
          )}

          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
            title="Verwijderen"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Sectie-preview */}
        {expanded && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50">
            {snap.sections.map(section => (
              <div key={section.id}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.questions.map(q => (
                    <div key={q.id} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="text-slate-300 flex-shrink-0 mt-0.5">·</span>
                      <span>
                        {q.label}
                        {q.required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Hoofd component ──────────────────────────────────────────

export default function IntakeTab({ projectId, projectName, themeId }: Props) {
  const [intakes,      setIntakes]      = useState<Intake[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);

  const loadIntakes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/intakes?project_id=${projectId}`);
      if (res.ok) setIntakes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadIntakes(); }, [loadIntakes]);

  function handleCreated(intake: Intake) {
    setIntakes(prev => [intake, ...prev]);
    setShowModal(false);
  }

  function handleUpdate(updated: Intake) {
    setIntakes(prev => prev.map(i => i.id === updated.id ? updated : i));
  }

  function handleDelete(id: string) {
    setIntakes(prev => prev.filter(i => i.id !== id));
  }

  return (
    <>
      {showModal && (
        <IntakeModal
          projectId={projectId}
          projectName={projectName}
          themeId={themeId}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-700">Intake documenten</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {intakes.length === 0
                ? "Nog geen intake gegenereerd"
                : `${intakes.length} intake${intakes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadIntakes}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              title="Vernieuwen"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <Plus size={14} /> Nieuwe intake
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Laden…
          </div>
        ) : intakes.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold mb-1">Nog geen intake gegenereerd</p>
            <p className="text-sm text-slate-400 mb-5">
              Genereer een intake document om naar de klant te sturen met een vragenlijst.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <Plus size={15} /> Intake genereren
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.map(intake => (
              <IntakeCard
                key={intake.id}
                intake={intake}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
