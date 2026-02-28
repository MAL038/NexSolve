"use client";

/**
 * CustomerWizard.tsx
 * 4-staps wizard modal voor het aanmaken van een klant:
 *   Stap 1 – Identiteit   (naam, code, status)
 *   Stap 2 – Basisgegevens (email, telefoon, website, adres)
 *   Stap 3 – Contactpersoon (naam, rol, email, telefoon)
 *   Stap 4 – Bevestiging   (samenvatting + confetti + projectkoppeling)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Hash, Building2, Mail, Phone, Globe, MapPin,
  User, Briefcase, CheckCircle2, ChevronRight, ChevronLeft,
  FolderKanban, Sparkles, Loader2,
} from "lucide-react";
import type { Customer, Project, CustomerStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface WizardForm {
  // Stap 1
  name: string;
  code: string;
  autoCode: boolean;
  status: CustomerStatus;
  // Stap 2
  email: string;
  phone: string;
  website: string;
  address_street: string;
  address_zip: string;
  address_city: string;
  address_country: string;
  // Stap 3
  contact_name: string;
  contact_role: string;
  contact_email: string;
  contact_phone: string;
}


const EMPTY_FORM: WizardForm = {
  name: "", code: "", autoCode: true, status: "active",
  email: "", phone: "", website: "",
  address_street: "", address_zip: "", address_city: "", address_country: "Nederland",
  contact_name: "", contact_role: "", contact_email: "", contact_phone: "",
};

interface Props {
  open: boolean;
  allProjects: Project[];
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  /** Optioneel: als dit gezet is, werkt de wizard in edit-modus (PATCH) */
  editCustomer?: Customer;
}

// ─── Step metadata ────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identiteit",     icon: Building2  },
  { id: 2, label: "Basisgegevens",  icon: MapPin     },
  { id: 3, label: "Contactpersoon", icon: User       },
  { id: 4, label: "Bevestiging",    icon: CheckCircle2 },
];

// ─── Confetti ─────────────────────────────────────────────────

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const COLORS = ["#0A6645", "#69B296", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];
    const pieces = Array.from({ length: 120 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * -canvas.height,
      w:   Math.random() * 10 + 4,
      h:   Math.random() * 6 + 3,
      r:   Math.random() * Math.PI * 2,
      dr:  (Math.random() - 0.5) * 0.15,
      dy:  Math.random() * 3 + 1.5,
      dx:  (Math.random() - 0.5) * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.6 + 0.4,
    }));

    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      pieces.forEach(p => {
        p.y  += p.dy;
        p.x  += p.dx;
        p.r  += p.dr;
        if (p.y > canvas!.height) { p.y = -20; p.x = Math.random() * canvas!.width; }
        ctx!.save();
        ctx!.globalAlpha = p.opacity;
        ctx!.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx!.rotate(p.r);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();

    // Stop na 4 seconden
    const timeout = setTimeout(() => cancelAnimationFrame(raf), 4000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl"
    />
  );
}

// ─── Label + Input helpers ────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors
        focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
        ${hasError
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white hover:border-slate-300"
        } ${className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
        transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
        hover:border-slate-300"
    />
  );
}

// ─── Summary row ──────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────

function CustomerWizardDefault({ open, allProjects, onClose, onCreated, editCustomer }: Props) {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState<WizardForm>(EMPTY_FORM);
  const [errors,  setErrors]  = useState<Partial<Record<keyof WizardForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState("");
  const [created, setCreated] = useState<Customer | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Project koppeling op stap 4
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkedIds,   setLinkedIds]   = useState<string[]>([]);
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  // Reset bij openen / vul in bij edit-modus
  useEffect(() => {
    if (open) {
      setStep(1);
      setErrors({});
      setApiErr("");
      setCreated(null);
      setShowConfetti(false);
      setLinkedIds([]);
      setLinkSearch("");
      if (editCustomer) {
        setForm({
          name:            editCustomer.name,
          code:            editCustomer.code ?? "",
          autoCode:        false,
          status:          editCustomer.status,
          email:           editCustomer.email ?? "",
          phone:           editCustomer.phone ?? "",
          website:         editCustomer.website ?? "",
          address_street:  editCustomer.address_street ?? "",
          address_zip:     editCustomer.address_zip ?? "",
          address_city:    editCustomer.address_city ?? "",
          address_country: editCustomer.address_country ?? "",
          contact_name:    editCustomer.contact_name ?? "",
          contact_role:    editCustomer.contact_role ?? "",
          contact_email:   editCustomer.contact_email ?? "",
          contact_phone:   editCustomer.contact_phone ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editCustomer]);

  const set = useCallback(<K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  // ─── Per-step validatie ──────────────────────────────────

  function validateStep1(): boolean {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Naam is verplicht";
    if (!form.autoCode) {
      if (!form.code.trim()) errs.code = "Code is verplicht";
      else if (!/^[A-Za-z0-9_-]+$/.test(form.code)) errs.code = "Alleen letters, cijfers, - en _";
      else if (form.code.length > 20) errs.code = "Maximaal 20 tekens";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: typeof errors = {};
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Ongeldig e-mailadres";
    if (form.website && !/^https?:\/\/.+/.test(form.website))
      errs.website = "Begin met https://";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3(): boolean {
    const errs: typeof errors = {};
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      errs.contact_email = "Ongeldig e-mailadres";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) {
      if (!validateStep3()) return;
      handleSubmit();
      return;
    }
    setStep(s => s + 1);
  }

  // In edit-modus: stap 3 toont Opslaan i.p.v. Verder
  const isEditMode = !!editCustomer;
  const isLastStep = isEditMode ? step === 3 : step === 3;

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
  }

  // ─── API submit ──────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true);
    setApiErr("");

    const isEdit = !!editCustomer;
    const url    = isEdit ? `/api/customers/${editCustomer!.id}` : "/api/customers";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setApiErr(typeof json.error === "string" ? json.error : "Er is iets misgegaan.");
      return;
    }

    const customer = json as Customer;
    onCreated(customer);

    if (isEdit) {
      // In edit-modus: meteen sluiten, geen confetti/step 4
      onClose();
    } else {
      setCreated(customer);
      setStep(4);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);
    }
  }

  // ─── Project koppelen op stap 4 ──────────────────────────

  async function toggleLink(project: Project) {
    if (!created) return;
    const isLinked = linkedIds.includes(project.id);
    setLinkLoading(project.id);

    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: isLinked ? null : created.id }),
    });

    if (res.ok) {
      setLinkedIds(prev =>
        isLinked ? prev.filter(id => id !== project.id) : [...prev, project.id]
      );
    }
    setLinkLoading(null);
  }

  if (!open) return null;

  const filteredProjects = allProjects.filter(p =>
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
           style={{ maxHeight: "90vh" }}>

        {/* Confetti overlay */}
        {showConfetti && <Confetti />}

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{editCustomer ? `${editCustomer.name} bewerken` : "Nieuwe klant"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Stap {step} van {STEPS.length}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step indicator ─────────────────────────────── */}
        <div className="flex items-center px-6 py-3 gap-0 flex-shrink-0">
          {STEPS.map((s, i) => {
            const done    = step > s.id;
            const current = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                {/* Dot */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                    ${done    ? "bg-brand-500 text-white shadow-md shadow-brand-200" : ""}
                    ${current ? "bg-brand-500 text-white ring-4 ring-brand-100" : ""}
                    ${!done && !current ? "bg-slate-100 text-slate-400" : ""}
                  `}>
                    {done ? <CheckCircle2 size={14} /> : s.id}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap
                    ${current ? "text-brand-600" : done ? "text-slate-500" : "text-slate-300"}`}>
                    {s.label}
                  </span>
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500
                    ${step > s.id ? "bg-brand-400" : "bg-slate-100"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body (scrollable) ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Stap 1: Identiteit ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Building2 size={16} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Identiteit</p>
                  <p className="text-xs text-slate-400">Hoe identificeren we deze klant?</p>
                </div>
              </div>

              <Field label="Bedrijfsnaam *" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="ACME B.V."
                  hasError={!!errors.name}
                  autoFocus
                />
              </Field>

              <Field label="Klantcode *" error={errors.code}>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-8 font-mono"
                      value={form.autoCode ? "" : form.code}
                      onChange={e => set("code", e.target.value.toUpperCase())}
                      disabled={form.autoCode}
                      placeholder={form.autoCode ? "automatisch…" : "bijv. ACME01"}
                      hasError={!!errors.code}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.autoCode}
                      onChange={e => set("autoCode", e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Autonummering
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {form.autoCode
                    ? "Volgnummer wordt automatisch gegenereerd op teamniveau (0001, 0002, …)"
                    : "Max. 20 tekens · letters, cijfers, - en _"}
                </p>
              </Field>

              <Field label="Status">
                <Select value={form.status} onChange={e => set("status", e.target.value as CustomerStatus)}>
                  <option value="active">✅ Actief</option>
                  <option value="inactive">⏸ Inactief</option>
                </Select>
              </Field>
            </div>
          )}

          {/* ── Stap 2: Basisgegevens ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MapPin size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Basisgegevens</p>
                  <p className="text-xs text-slate-400">Contactinfo en adres (alle velden optioneel)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail" error={errors.email}>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      className="pl-8"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      placeholder="info@bedrijf.nl"
                      hasError={!!errors.email}
                    />
                  </div>
                </Field>

                <Field label="Telefoon">
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      className="pl-8"
                      value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      placeholder="+31 20 123 4567"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Website" error={errors.website}>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="url"
                    className="pl-8"
                    value={form.website}
                    onChange={e => set("website", e.target.value)}
                    placeholder="https://bedrijf.nl"
                    hasError={!!errors.website}
                  />
                </div>
              </Field>

              {/* Adres */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Adres</p>
                <div className="space-y-3">
                  <Field label="Straat + huisnummer">
                    <Input
                      value={form.address_street}
                      onChange={e => set("address_street", e.target.value)}
                      placeholder="Herengracht 420"
                    />
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Postcode">
                      <Input
                        value={form.address_zip}
                        onChange={e => set("address_zip", e.target.value)}
                        placeholder="1017 BZ"
                      />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Stad">
                        <Input
                          value={form.address_city}
                          onChange={e => set("address_city", e.target.value)}
                          placeholder="Amsterdam"
                        />
                      </Field>
                    </div>
                  </div>
                  <Field label="Land">
                    <Input
                      value={form.address_country}
                      onChange={e => set("address_country", e.target.value)}
                      placeholder="Nederland"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Stap 3: Contactpersoon ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <User size={16} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Contactpersoon</p>
                  <p className="text-xs text-slate-400">Wie is de primaire contactpersoon? (optioneel)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Naam contactpersoon">
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-8"
                      value={form.contact_name}
                      onChange={e => set("contact_name", e.target.value)}
                      placeholder="Jan de Vries"
                    />
                  </div>
                </Field>

                <Field label="Rol in organisatie">
                  <div className="relative">
                    <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-8"
                      value={form.contact_role}
                      onChange={e => set("contact_role", e.target.value)}
                      placeholder="Inkoper, CFO, …"
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail contactpersoon" error={errors.contact_email}>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      className="pl-8"
                      value={form.contact_email}
                      onChange={e => set("contact_email", e.target.value)}
                      placeholder="jan@bedrijf.nl"
                      hasError={!!errors.contact_email}
                    />
                  </div>
                </Field>

                <Field label="Telefoon contactpersoon">
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      className="pl-8"
                      value={form.contact_phone}
                      onChange={e => set("contact_phone", e.target.value)}
                      placeholder="+31 6 12 34 56 78"
                    />
                  </div>
                </Field>
              </div>

              {apiErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {apiErr}
                </div>
              )}
            </div>
          )}

          {/* ── Stap 4: Bevestiging ── */}
          {step === 4 && created && (
            <div className="space-y-5">
              {/* Succes header */}
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-100">
                  <Sparkles size={24} className="text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Klant aangemaakt! 🎉</h3>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-semibold text-brand-600">{created.name}</span> is succesvol toegevoegd.
                </p>
              </div>

              {/* Samenvatting */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Samenvatting</p>

                <div className="space-y-0">
                  {/* Identiteit */}
                  <SummaryRow label="Naam"   value={created.name} />
                  <SummaryRow label="Code"   value={created.code ? `#${created.code}` : null} />
                  <SummaryRow label="Status" value={created.status === "active" ? "Actief" : "Inactief"} />

                  {/* Basisgegevens */}
                  {(created.email || created.phone || created.website) && (
                    <div className="pt-2 mt-1">
                      <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-1">Contact</p>
                    </div>
                  )}
                  <SummaryRow label="E-mail"   value={created.email} />
                  <SummaryRow label="Telefoon" value={created.phone} />
                  <SummaryRow label="Website"  value={created.website} />

                  {/* Adres */}
                  {created.address_city && (
                    <SummaryRow
                      label="Adres"
                      value={[created.address_street, `${created.address_zip ?? ""} ${created.address_city ?? ""}`.trim(), created.address_country]
                        .filter(Boolean).join(", ")}
                    />
                  )}

                  {/* Contactpersoon */}
                  {created.contact_name && (
                    <div className="pt-2 mt-1">
                      <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-1">Contactpersoon</p>
                    </div>
                  )}
                  <SummaryRow label="Naam"     value={created.contact_name} />
                  <SummaryRow label="Rol"      value={created.contact_role} />
                  <SummaryRow label="E-mail"   value={created.contact_email} />
                  <SummaryRow label="Telefoon" value={created.contact_phone} />
                </div>
              </div>

              {/* Projecten koppelen */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FolderKanban size={12} /> Projecten koppelen (optioneel)
                </p>

                <div className="relative mb-2">
                  <input
                    value={linkSearch}
                    onChange={e => setLinkSearch(e.target.value)}
                    placeholder="Zoek project…"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm
                      focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {filteredProjects.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Geen projecten gevonden.</p>
                  ) : filteredProjects.map(p => {
                    const linked = linkedIds.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <FolderKanban size={13} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{p.name}</span>
                        </div>
                        <button
                          disabled={linkLoading === p.id}
                          onClick={() => toggleLink(p)}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition-all
                            ${linked
                              ? "bg-brand-100 text-brand-700 hover:bg-red-50 hover:text-red-600"
                              : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                            }`}
                        >
                          {linkLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : linked ? "✓ Gekoppeld" : "Koppelen"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          {/* Terug */}
          {step > 1 && step < 4 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft size={16} /> Terug
            </button>
          ) : <div />}

          {/* Volgende / Opslaan / Sluiten */}
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold
                hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Opslaan…</>
              ) : step === 3 ? (
                <><CheckCircle2 size={15} /> Klant aanmaken</>
              ) : (
                <>Volgende <ChevronRight size={15} /></>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold
                hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
            >
              <CheckCircle2 size={15} /> Klaar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Named export wrapper ──────────────────────────────────────
// Gebruikt door CustomerSelectWithCreate met interface { mode, onCreated, onCancel }

interface CustomerWizardModalProps {
  mode?: 'page' | 'modal'
  onCreated?: (customer: Customer) => void
  onCancel?: () => void
}

export function CustomerWizard({ onCreated, onCancel }: CustomerWizardModalProps) {
  return (
    <CustomerWizardDefault
      open={true}
      allProjects={[]}
      onClose={() => onCancel?.()}
      onCreated={(customer) => onCreated?.(customer)}
    />
  );
}

export default CustomerWizardDefault;
