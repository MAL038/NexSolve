import { z } from "zod";

import { z } from "zod";

// ─── Customer ─────────────────────────────────────────────────
export const customerSchema = z.object({
  // Stap 1 – Identiteit
  name:     z.string().min(1, "Naam is verplicht").max(200),
  code:     z.string().min(1, "Code is verplicht").max(20)
              .regex(/^[A-Za-z0-9_-]+$/, "Alleen letters, cijfers, - en _"),
  status:   z.enum(["active", "inactive"]).default("active"),
  autoCode: z.boolean().optional(),

  // Stap 2 – Basisgegevens (allemaal optioneel)
  email:           z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone:           z.string().max(50).optional().or(z.literal("")),
  website:         z.string().url("Ongeldige URL (begin met https://)").optional().or(z.literal("")),
  address_street:  z.string().max(200).optional().or(z.literal("")),
  address_zip:     z.string().max(20).optional().or(z.literal("")),
  address_city:    z.string().max(100).optional().or(z.literal("")),
  address_country: z.string().max(100).optional().or(z.literal("")),

  // Stap 3 – Contactpersoon (allemaal optioneel)
  contact_name:  z.string().max(200).optional().or(z.literal("")),
  contact_role:  z.string().max(100).optional().or(z.literal("")),
  contact_email: z.string().email("Ongeldig e-mailadres contactpersoon").optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional().or(z.literal("")),
});

export const customerUpdateSchema = customerSchema.partial().omit({ autoCode: true });

export type CustomerInput = z.infer<typeof customerSchema>;


export const projectSchema = z.object({
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  status:      z.enum(["active", "in-progress", "archived"]),
});

export const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email:     z.string().email("Invalid email address"),
  password:  z.string().min(6, "Password must be at least 6 characters"),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

export type ProjectInput  = z.infer<typeof projectSchema>;
export type ProfileInput  = z.infer<typeof profileSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;