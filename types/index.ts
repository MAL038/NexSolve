// ─────────────────────────────────────────────────────────────
// types/index.ts — NexSolve central type definitions
//
// ROL-MODEL SAMENVATTING:
//   Platform-level  (profiles.role):         "superuser" | "member"
//   Org-level       (org_members.org_role):   "admin" | "member" | "viewer"
//   Project-level   (project_members.role):   "projectleider" | "member"
// ─────────────────────────────────────────────────────────────

export type Locale = "en" | "nl" | "de" | "fr";

// ── Platform-level rol (op profiles tabel) ────────────────────
// superuser = platform beheerder, staat boven alle orgs
// member    = iedereen met een account; org-rol bepaalt rechten binnen een org
export type UserRole = "superuser" | "member";

// ── Org-level rol (op org_members tabel) ─────────────────────
// admin  = beheert de org, kan uitnodigen, rollen wijzigen
// member = normaal lid, kan projecten zien/bewerken
// viewer = alleen-lezen toegang
export type OrgRole = "admin" | "member" | "viewer";

// ── Project-level rol (op project_members tabel) ─────────────
// projectleider = beheert het project, kan leden toevoegen
// member        = werkt mee aan het project
export type MemberRole = "projectleider" | "member";

// ─── Profile ──────────────────────────────────────────────────
export interface Profile {
  id:                 string;
  full_name:          string;
  email:              string;
  avatar_url:         string | null;
  role:               UserRole;
  org_id:             string | null;   // null = nog niet aan org gekoppeld / superuser
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
  preferred_language: Locale;
}

// ─── Organisation ──────────────────────────────────────────────
export interface Organisation {
  id:         string;
  name:       string;
  slug:       string;
  logo_url:   string | null;
  is_active:  boolean;
  created_by: string | null;
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
  /** Joined from profiles */
  profile?:   Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "is_active">;
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

// ─── Customers ────────────────────────────────────────────────
export type CustomerStatus = "active" | "inactive";

export interface Customer {
  id:              string;
  owner_id:        string;
  org_id:          string;
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
  org_id:          string;
  customer_id:     string | null;
  name:            string;
  description:     string | null;
  theme_id:        string | null;
  process_id:      string | null;
  process_type_id: string | null;
  status:          ProjectStatus;
  created_at:      string;
  updated_at:      string;
  customer?:       Pick<Customer, "id" | "name"> | null;
  owner?:          Pick<Profile, "full_name" | "email" | "avatar_url">;
  project_members?: ProjectMember[];
}

export interface ProjectFormData {
  name:            string;
  description:     string;
  status:          ProjectStatus;
  customer_id?:    string | null;
  theme_id?:       string | null;
  process_id?:     string | null;
  process_type_id?: string | null;
}

// ─── Project Members ──────────────────────────────────────────
export interface ProjectMember {
  project_id: string;
  user_id:    string;
  role:       MemberRole;
  added_at:   string;
  profile?:   Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;
}

// ─── Teams ────────────────────────────────────────────────────
export interface Team {
  id:          string;
  org_id:      string;
  name:        string;
  description: string | null;
  leader_id:   string | null;
  created_at:  string;
  updated_at:  string;
  members?:    TeamMember[];
}

export interface TeamMember {
  team_id:  string;
  user_id:  string;
  added_at: string;
  profile?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;
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

// ─── Themes ───────────────────────────────────────────────────
export interface Theme {
  id:        string;
  name:      string;
  slug:      string;
  position:  number;
}

export interface Process {
  id:       string;
  theme_id: string;
  name:     string;
  slug:     string;
  position: number;
}

export interface ProcessType {
  id:         string;
  process_id: string;
  name:       string;
  slug:       string;
  position:   number;
}

export interface ThemeWithChildren extends Theme {
  processes: (Process & { process_types: ProcessType[] })[];
}

// ─── Custom Roles (project-team rollen) ───────────────────────
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
