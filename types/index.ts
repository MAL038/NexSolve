// ─────────────────────────────────────────────────────────────
// types/index.ts — NexSolve centrale type definities
//
// ROL-MODEL:
//   Platform-level  (profiles.role):        "superuser" | "member"
//   Org-level       (org_members.org_role):  "admin" | "member" | "viewer"
//   Project-level   (project_members.role):  "projectleider" | "member"
// ─────────────────────────────────────────────────────────────

export type Locale = "en" | "nl" | "de" | "fr";

// ── Platform-level rol ────────────────────────────────────────
export type UserRole = "superuser" | "member";

// ── Org-level rol ─────────────────────────────────────────────
export type OrgRole = "admin" | "member" | "viewer";

// ── Project-level rol ─────────────────────────────────────────
export type MemberRole = "projectleider" | "member";

// ─── Profile ──────────────────────────────────────────────────
export interface Profile {
  id:                 string;
  full_name:          string;
  email:              string;
  avatar_url:         string | null;
  role:               UserRole;
  org_id:             string | null;
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
  preferred_language: Locale;
  /** @deprecated typo — gebruik preferred_language. Blijft voor DB-compat. */
  prefered_language?: Locale;
}

// ─── Platform-instellingen ────────────────────────────────────
export interface PlatformSettings {
  id:            string;
  company_name:  string;
  logo_url:      string | null;
  primary_color: string;
  accent_color:  string;
  updated_at:    string;
  updated_by:    string | null;
}

// ─── Organisation ─────────────────────────────────────────────
export interface Organisation {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;

  primary_color: string | null;
  accent_color: string | null;
  plan: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Org Member ───────────────────────────────────────────────
export interface OrgMember {
  org_id:     string;
  user_id:    string;
  org_role:   OrgRole;
  invited_by: string | null;
  joined_at:  string;
  profile?:   Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "is_active">;
}

// ─── Invite ───────────────────────────────────────────────────
export interface TeamInvite {
  id:          string;
  email:       string;
  org_id:      string;
  org_role:    OrgRole;
  invited_by:  string;
  token:       string;
  accepted_at: string | null;
  created_at:  string;
  expires_at:  string;
}

// ─── Admin overzicht ──────────────────────────────────────────
export interface AdminUserRow extends Profile {
  project_count?: number;
}

// ─── API helpers ──────────────────────────────────────────────
export interface ApiError {
  error: string;
}

// ─── Customers ────────────────────────────────────────────────
export type CustomerStatus = "active" | "inactive";

export interface Customer {
  id:              string;
  owner_id:        string;
  org_id:          string | null;
  name:            string;
  code:            string | null;
  status:          CustomerStatus;
  email:           string | null;
  phone:           string | null;
  website:         string | null;
  address_street:  string | null;
  address_zip:     string | null;
  address_city:    string | null;
  address_country: string | null;
  contact_name:    string | null;
  contact_role:    string | null;
  contact_email:   string | null;
  contact_phone:   string | null;
  created_at:      string;
  updated_at:      string;
  projects?:       Project[];
}

export interface CustomerFormData {
  name:            string;
  code:            string;
  autoCode:        boolean;
  status:          CustomerStatus;
  email:           string;
  phone:           string;
  website:         string;
  address_street:  string;
  address_zip:     string;
  address_city:    string;
  address_country: string;
  contact_name:    string;
  contact_role:    string;
  contact_email:   string;
  contact_phone:   string;
}

// ─── Projects ─────────────────────────────────────────────────
export type ProjectStatus = "active" | "in-progress" | "archived";

export interface Project {
  id:              string;
  owner_id:        string;
  org_id:          string | null;
  customer_id:     string | null;
  name:            string;
  code:            string | null;
  description:     string | null;
  theme_id:        string | null;
  process_id:      string | null;
  process_type_id: string | null;
  status:          ProjectStatus;
  start_date:      string | null;
  end_date:        string | null;
  team_id:         string | null;
  created_at:      string;
  updated_at:      string;
  customer?:       Pick<Customer, "id" | "name"> | null;
  owner?:          Pick<Profile, "full_name" | "email" | "avatar_url">;
  project_members?: ProjectMember[];
  team?:           Pick<Team, "id" | "name"> | null;
}

export interface ProjectFormData {
  name:             string;
  description:      string;
  status:           ProjectStatus;
  customer_id?:     string | null;
  theme_id?:        string | null;
  process_id?:      string | null;
  process_type_id?: string | null;
  start_date?:      string | null;
  end_date?:        string | null;
  team_id?:         string | null;
}

// ─── Project Members ──────────────────────────────────────────
export interface ProjectMember {
  project_id: string;
  user_id:    string;
  role:       MemberRole;
  added_at:   string;
  profile?:   Pick<Profile, "full_name" | "email" | "avatar_url">;
}

export interface AddMemberPayload {
  user_id: string;
  role?:   MemberRole;
}

// ─── Teams ────────────────────────────────────────────────────
export interface Team {
  id:          string;
  name:        string;
  description: string | null;
  leader_id:   string | null;
  created_by:  string;
  org_id:      string | null;
  created_at:  string;
  updated_at:  string;
  leader?:     Pick<Profile, "id" | "full_name" | "avatar_url">;
  members?:    TeamMember[];
}

export interface TeamMember {
  team_id:  string;
  user_id:  string;
  added_at: string;
  profile?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role">;
}

export interface TeamFormData {
  name:         string;
  description?: string;
  leader_id?:   string | null;
  member_ids?:  string[];
}

// ─── Subprocesses ─────────────────────────────────────────────
export type SubprocessStatus = "todo" | "in-progress" | "done" | "blocked";

export interface Subprocess {
  id:          string;
  project_id:  string;
  title:       string;
  description: string | null;
  status:      SubprocessStatus;
  position:    number;
  created_at:  string;
  updated_at:  string;
}

export interface SubprocessFormData {
  title:        string;
  description?: string;
  status:       SubprocessStatus;
}

// ─── Kalender ─────────────────────────────────────────────────
export type EventType = "verlof" | "niet_beschikbaar";

export interface CalendarEvent {
  id:         string;
  user_id:    string;
  title:      string;
  type:       EventType;
  start_date: string;
  end_date:   string;
  all_day:    boolean;
  notes:      string | null;
  created_at: string;
  updated_at: string;
  profile?:   Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };
}

// ─── Project Planning ─────────────────────────────────────────
export interface PlanningEntry {
  id:         string;
  project_id: string;
  user_id:    string;
  planned_by: string;
  date:       string;
  hours:      number;
  notes:      string | null;
  created_at: string;
  updated_at: string;
  project?:   Pick<Project, "id" | "name" | "status">;
  user?:      Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> & { id: string };
}

// ─── Theme Hierarchy ──────────────────────────────────────────
export interface Theme {
  id:         string;
  name:       string;
  slug:       string;
  position:   number;
  created_at: string;
}

export interface Process {
  id:         string;
  theme_id:   string;
  name:       string;
  slug:       string;
  position:   number;
  created_at: string;
}

export interface ProcessType {
  id:         string;
  process_id: string;
  name:       string;
  slug:       string;
  position:   number;
  created_at: string;
}

export interface ThemeWithChildren extends Theme {
  processes: ProcessWithChildren[];
}

export interface ProcessWithChildren extends Process {
  process_types: ProcessType[];
}

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

// ─── Activiteitenlog ──────────────────────────────────────────
export interface ActivityLogEntry {
  id:          string;
  actor_id:    string;
  action:      string;
  entity_type: string;
  entity_id:   string;
  entity_name: string | null;
  project_id:  string | null;
  customer_id: string | null;
  metadata:    Record<string, unknown> | null;
  created_at:  string;
  actor?:      Pick<Profile, "id" | "full_name" | "avatar_url">;
}

// ─── Dossier ──────────────────────────────────────────────────
export type DossierType =
  | "document"
  | "vraag"
  | "case"
  | "notitie"
  | "offerte"
  | "contract";

export const DOSSIER_TYPE_LABELS: Record<DossierType, string> = {
  document: "Document",
  vraag:    "Vraag",
  case:     "Case",
  notitie:  "Notitie",
  offerte:  "Offerte",
  contract: "Contract",
};

export interface Dossier {
  id:           string;
  title:        string;
  type:         DossierType;
  description:  string | null;
  file_url:     string | null;
  file_name:    string | null;
  file_size:    number | null;
  submitted_by: string;
  submitted_at: string;
  project_id:   string | null;
  customer_id:  string | null;
  created_at:   string;
  updated_at:   string;
}

export interface DossierWithDetails extends Dossier {
  submitted_by_name:   string;
  submitted_by_avatar: string | null;
  project_name:        string | null;
  customer_name:       string | null;
}

export interface CreateDossierInput {
  title:        string;
  type:         DossierType;
  description?: string;
  project_id?:  string;
  customer_id?: string;
  file?:        File;
}