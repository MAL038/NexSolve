// Voeg dit toe BOVEN de Profile interface:
export type Locale = "en" | "nl" | "de" | "fr";

// ─── Auth / User ──────────────────────────────────────────────
export type UserRole = "admin" | "member" | "viewer" | "superuser";
export type MemberRole = "member" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  prefered_language: Locale
}

// ─── Platform-instellingen ────────────────────────────────────
export interface PlatformSettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  updated_at: string;
  updated_by: string | null;
}

// ─── Customers ────────────────────────────────────────────────
export type CustomerStatus = "active" | "inactive";

export interface Customer {
  id: string;
  owner_id: string;
  // Stap 1 – Identiteit
  name: string;
  code: string | null;
  status: CustomerStatus;
  // Stap 2 – Basisgegevens
  email: string | null;
  phone: string | null;
  website: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  // Stap 3 – Contactpersoon
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // Meta
  created_at: string;
  updated_at: string;
  /** Populated when fetching customer detail with projects */
  projects?: Project[];
}

export interface CustomerFormData {
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


// ─── Projects ─────────────────────────────────────────────────
export type ProjectStatus = "active" | "in-progress" | "archived";

export interface Project {
  id: string;
  owner_id: string;
  customer_id: string | null;          // nullable – backwards compat
  name: string;
  description: string | null;
  theme_id: string | null;
  process_id: string | null;
  process_type_id: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  /** Joined from customers table */
  customer?: Pick<Customer, "id" | "name"> | null;
  /** Joined from profiles */
  owner?: Pick<Profile, "full_name" | "email" | "avatar_url">;
  /** Joined members */
  project_members?: ProjectMember[];
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  customer_id?: string | null;
}

// ─── Project Members ──────────────────────────────────────────
export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: MemberRole;
  added_at: string;
  /** Populated via join on profiles */
  profile?: Pick<Profile, "full_name" | "email" | "avatar_url">;
}

export interface AddMemberPayload {
  user_id: string;
  role?: MemberRole;
}

// ─── API helpers ──────────────────────────────────────────────
export interface ApiError {
  error: string;
}

// ─── Subprocesses ─────────────────────────────────────────────
export type SubprocessStatus = "todo" | "in-progress" | "done" | "blocked";

export interface Subprocess {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  theme_id: string | null;
  process_id: string | null;
  process_type_id: string | null;
  status: SubprocessStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SubprocessFormData {
  title: string;
  description?: string;
  status: SubprocessStatus;
}

// Voeg dit toe aan types/index.ts, na de Subprocess-sectie

// ─── Kalender ─────────────────────────────────────────────────
export type EventType = "verlof" | "niet_beschikbaar";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  type: EventType;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  all_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Joined via profiles */
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };
}

// ─── Project Planning ─────────────────────────────────────────
export interface PlanningEntry {
  id: string;
  project_id: string;
  user_id: string;
  planned_by: string;
  date: string;         // YYYY-MM-DD
  hours: number;        // e.g. 4.0, 7.5
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Joined via projects */
  project?: Pick<Project, "id" | "name" | "status">;
  /** Joined via profiles */
  user?: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };
}

// ─── Theme Hierarchy ──────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  slug: string;
  position: number;
  created_at: string;
}

export interface Process {
  id: string;
  theme_id: string;
  name: string;
  slug: string;
  position: number;
  created_at: string;
}

export interface ProcessType {
  id: string;
  process_id: string;
  name: string;
  slug: string;
  position: number;
  created_at: string;
}

/** Full hierarchy tree (used when loading everything at once) */
export interface ThemeWithChildren extends Theme {
  processes: ProcessWithChildren[];
}

export interface ProcessWithChildren extends Process {
  process_types: ProcessType[];
}

/** The three selections a project can hold */
export interface ThemeSelection {
  theme_id:        string | null;
  process_id:      string | null;
  process_type_id: string | null;
}

// ─── Aangepaste project-rollen ────────────────────────────────
export interface CustomRole {
  id:         string;
  name:       string;
  slug:       string;
  color:      string;
  position:   number;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

// ─── Admin overzicht-types ────────────────────────────────────
export interface AdminUserRow extends Profile {
  project_count?: number;
}
