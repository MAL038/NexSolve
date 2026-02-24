import { z } from "zod";

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
