# NEXSOLVE – Project Management Platform

A full-stack project management web application built with **Next.js 14 App Router**, **Supabase**, **Tailwind CSS**, and **TypeScript** — fully aligned with the NEXSOLVE brand guidelines.

---

## ✦ Features

- **Authentication** — Sign up, login, logout with Supabase Auth
- **Dashboard** — Overview with stats and recent projects
- **Projects (CRUD)** — Create, read, update, delete projects with status tracking
- **Team** — View all team members and their roles
- **Profile** — Edit your own profile information
- **Settings** — General, notification, and security settings
- **Protected routes** — Auth guard on all app pages
- **RLS** — Row Level Security on all Supabase tables

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd nexsolve
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # only if needed
```

### 3. Run the database migration

In the Supabase SQL Editor (or via CLI), run:
```
supabase/migrations/001_initial_schema.sql
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
nexsolve/
├── app/
│   ├── (protected)/          # Auth-guarded pages
│   │   ├── dashboard/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   ├── team/
│   │   ├── settings/
│   │   └── profile/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   ├── api/
│   │   └── projects/
│   │       └── [id]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/
│       ├── Logo.tsx
│       ├── Avatar.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabaseClient.ts     # Browser client
│   ├── supabaseServer.ts     # Server client
│   ├── auth.ts
│   ├── constants.ts
│   ├── time.ts
│   └── validators.ts
├── types/
│   └── index.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── middleware.ts
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── AUTH.md
    ├── DEPLOYMENT.md
    └── TROUBLESHOOTING.md
```

---

## 🎨 Brand

| Token          | Value     |
|----------------|-----------|
| Primary green  | `#0A6645` |
| Light green    | `#69B296` |
| Font           | Poppins   |

---

## 📦 Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Framework   | Next.js 14 (App Router)     |
| Database    | Supabase (Postgres)         |
| Auth        | Supabase Auth               |
| Styling     | Tailwind CSS                |
| Types       | TypeScript                  |
| Validation  | Zod                         |
| Icons       | Lucide React                |
| Deployment  | Vercel (recommended)        |

---

## 📋 Release Checklist

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] RLS policies verified in Supabase
- [ ] Env vars set in hosting platform
- [ ] Test: login → dashboard → create project → edit → delete
- [ ] Test: register new user → profile auto-created
