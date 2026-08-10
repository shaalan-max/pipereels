# Pipelooms Portal — v1

Agency + client portal for Pipelooms. Built with Next.js 14 (App Router) and Supabase (Postgres + Auth, with Row Level Security enforcing every permission).

## What's in this repo

- **`/agency`** — Owner/team view. GoHighLevel-style sub-account switcher, team management, "New Sub-account" and "Add Team Member" flows that create real login credentials.
- **`/c/[clientId]`** — Client workspace (Home, Tasks, Calendar, Performance) — used both by clients logging in directly and by agency/team members clicking into a sub-account.
- **`/api/admin/*`** — Server-only routes that create real Supabase Auth accounts (service role key, never exposed to the browser).

Roles: `owner`, `editor`, `content_creator`, `account_manager`, `client`. Team roles only see sub-accounts they've been explicitly assigned to — enforced at the database level via Row Level Security, not just hidden in the UI.

## The Supabase project

A real project is already live: **`pipelooms-portal`** (ref `ogehuqorluzhbfuygsjc`) under your "Pipelooms" Supabase org. Schema, RLS policies, and demo data are already applied.

### Demo login credentials

| Role | Email | Password |
|---|---|---|
| Owner (you) | `alex@pipelooms.com` | `Pipelooms2026!` |
| Editor | `jordan@pipelooms.com` | `Editor2026!` |
| Content Creator | `casey@pipelooms.com` | `Creator2026!` |
| Account Manager | `riley@pipelooms.com` | `Manager2026!` |
| Client — Acme Realty | `sarah@acmerealty.com` | `Acme2026!` |
| Client — Stark & Co. | `mike@starkhomes.com` | `Stark2026!` |
| Client — Wayne Luxury | `diana@wayneluxury.com` | `Wayne2026!` |

**Change these passwords before using this with real clients.** These are seed/demo credentials sitting in a public-ish repo — treat them as compromised from day one.

## Setup

### 1. Get your service role key

The app needs one secret I can't retrieve for you: go to your [Supabase dashboard](https://supabase.com/dashboard/project/ogehuqorluzhbfuygsjc/settings/api) → Project Settings → API → copy the **`service_role`** key (not `anon`).

### 2. Local development

```bash
git clone <your-repo-url>
cd pipelooms-portal
npm install
cp .env.example .env.local
# paste your service_role key into .env.local
npm run dev
```

Visit `http://localhost:3000`.

### 3. Push to your GitHub repo

```bash
git init
git add .
git commit -m "Pipelooms Portal v1"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 4. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.
2. Vercel auto-detects Next.js — no config needed.
3. Add environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ogehuqorluzhbfuygsjc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from `.env.example`)
   - `SUPABASE_SERVICE_ROLE_KEY` = (the secret from step 1 — mark it "Sensitive")
4. Deploy. Done — free tier covers this comfortably.

## How sub-accounts & team members get created

Both go through `/agency` (owner only):

- **New Sub-account** — creates a real Supabase Auth login for the client, a `clients` row, and a `profiles` row linking them together. You set the temp password when creating it; share it with the client yourself (matches how you said you want to do it).
- **Add Team Member** — same idea, but you pick their role (Editor / Content Creator / Account Manager) and tick which sub-accounts they should see. They will *only* ever see those — it's enforced by the database, not just hidden UI.

## What's genuinely production-ready vs. what to harden next

**Solid for v1:**
- Real authentication, real database, real Row Level Security (verified — team members physically cannot query another client's data, even via direct API calls)
- Working task pipeline, comments, revision requests, calendar, performance dashboards, all backed by real Postgres data

**Worth doing before a wider client rollout:**
- File uploads currently record the filename only, not the actual video — wire up Supabase Storage next
- No password-reset flow yet (you're manually setting temp passwords, which matches what you asked for, but you'll want self-service reset eventually)
- No email notifications (task assigned, revision requested, etc.)
- Consider enabling Supabase's leaked-password protection and MFA for the owner account in Auth settings

## Project structure

```
app/
  login/page.js              — sign-in
  page.js                    — role-based redirect
  agency/page.js              — owner/team overview + sub-account & team management
  c/[clientId]/layout.js      — client workspace shell (sidebar, nav, access check)
  c/[clientId]/page.js        — Home
  c/[clientId]/tasks/page.js  — Task pipeline + detail drawer
  c/[clientId]/calendar/page.js
  c/[clientId]/performance/page.js
  api/admin/create-client/route.js
  api/admin/create-team-member/route.js
lib/
  supabase/client.js   — browser client
  supabase/server.js   — server component / route handler client
  supabase/admin.js    — service-role client (server-only)
  ui.js                — shared design system (colors, buttons, cards, etc.)
  workspace-context.js
middleware.js           — session refresh + route protection
```
