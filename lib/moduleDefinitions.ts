// lib/moduleDefinitions.ts
// ────────────────────────────────────────────────────────────────
// Single source of truth voor alle modules in NexSolve.
// Importeer ModuleKey en MODULE_DEFINITIONS overal vandaan hier.
// ────────────────────────────────────────────────────────────────

export const MODULE_DEFINITIONS = {
  // ── Work Management ─────────────────────────────────────────
  projects:  { label: "Projecten",       category: "work",     defaultEnabled: true  },
  tasks:     { label: "Taken",           category: "work",     defaultEnabled: true  },
  customers: { label: "Klanten",         category: "work",     defaultEnabled: true  },
  teams:     { label: "Teams",           category: "work",     defaultEnabled: false },

  // ── Planning ────────────────────────────────────────────────
  calendar:  { label: "Kalender",        category: "planning", defaultEnabled: false },
  time:      { label: "Urenregistratie", category: "planning", defaultEnabled: false },

  // ── Process Management ───────────────────────────────────────
  processes: { label: "Processen",       category: "process",  defaultEnabled: false },
  templates: { label: "Templates",       category: "process",  defaultEnabled: false },

  // ── Content ─────────────────────────────────────────────────
  documents: { label: "Documenten",      category: "content",  defaultEnabled: true  },

  // ── Insights ────────────────────────────────────────────────
  reports:   { label: "Rapportages",     category: "insights", defaultEnabled: false },
} as const;

// Het type wordt automatisch afgeleid — nooit handmatig bijhouden
export type ModuleKey = keyof typeof MODULE_DEFINITIONS;

export type ModuleCategory = "work" | "planning" | "process" | "content" | "insights";

// Helper: geeft de default voor een key (voor als er geen DB-rij bestaat)
export function moduleDefault(key: ModuleKey): boolean {
  return MODULE_DEFINITIONS[key].defaultEnabled;
}

// Helper: geeft alle keys van een categorie
export function modulesByCategory(category: ModuleCategory): ModuleKey[] {
  return (Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).filter(
    (k) => MODULE_DEFINITIONS[k].category === category
  );
}

// Helper: geeft een plat Record<ModuleKey, boolean> met alle defaults
// Gebruik dit bij aanmaken nieuwe org
export function defaultModuleSet(): Record<ModuleKey, boolean> {
  return Object.fromEntries(
    (Object.keys(MODULE_DEFINITIONS) as ModuleKey[]).map((k) => [
      k,
      MODULE_DEFINITIONS[k].defaultEnabled,
    ])
  ) as Record<ModuleKey, boolean>;
}