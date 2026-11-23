# Pipelooms — video production portal (v2)

One place to run the whole short-form video service for every client:

```
Monthly plan → Script → Client shoots → Footage check → Editing → Internal review → Client review → Scheduled → Posted
```

- **Team** (owner, account managers, scriptwriters, editors) get a *My work* queue, a production board across all clients, and a workspace per video (brief, script + shooting notes, raw footage, edit versions with time-stamped review notes, publishing details, discussion and history).
- **Clients** get a simple branded portal: approve the monthly plan, approve scripts, film with the built-in teleprompter, upload clips from their phone, review videos (comments pinned to the exact second) and approve.
- Every hand-off notifies the next person (in-app bell).

Built with Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage). Deployed on Vercel.

## Roles

| Role | Can do |
|---|---|
| Owner | Everything, including team logins, clients and branding |
| Account manager | Runs the clients they manage: plans, footage checks, internal review, sending to client, posting; adds client logins |
| Scriptwriter | Writes scripts for videos assigned to them, sends them to the client |
| Editor | Edits videos assigned to them, uploads versions, submits for review |
| Client | Sees only their own workspace; approves/asks for changes, uploads footage, comments |

**Admin page (`/admin`, owners only):** every login in one list — create accounts (including more owners), change someone's role, choose which clients each team member can see, move a client login to another client, reset passwords, disable/enable, and delete. Safety rules: you can't change or delete your own account there, and at least one active owner always remains.

Access is enforced **in the database** (Row Level Security), not just hidden in the UI. Stage changes can only happen through the workflow functions (`advance_video`, `plan_action`), so nobody can skip a step, and clients can never edit content.

## Setup

### 1. Environment variables

Copy `.env.example` to `.env.local` (local) and add the same values in **Vercel → Project → Settings → Environment Variables**:

| Name | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ogehuqorluzhbfuygsjc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → *publishable* key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → *secret / service_role* key. **Secret — mark "Sensitive" in Vercel, never commit it.** |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | `50` on the free plan |
| `CRON_SECRET` | Any long random string (lets Vercel's daily cron keep the free database awake) |

### 2. Database

The schema lives in `supabase/migrations/` and is already applied to the `pipelooms-portal` project. To rebuild a fresh project, run those files in order (Supabase SQL editor or `supabase db push`).

### 3. First owner account

After deploying, open `https://<your-site>/setup`. It works **once**: it creates the owner account and then closes itself. (It refuses while any owner exists — delete the test data first; see below.)

### 4. Supabase Auth settings (for "Forgot password")

Supabase → Authentication → URL Configuration:
- **Site URL**: your live URL, e.g. `https://pipereels.vercel.app`
- **Redirect URLs**: add `https://pipereels.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`

Also recommended: Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (all logins are created from inside the app), and turn on leaked-password protection.

### 5. Run locally

```bash
npm install
npm run dev
```

## Free plan limits & what to upgrade at client #1

The app runs on free Vercel + free Supabase. Limits that matter:

| Limit (free) | Effect | Fix when you sign client #1 |
|---|---|---|
| 50 MB per file, 1 GB total storage | Raw footage must be short/compressed | **Supabase Pro ($25/mo)**: 100 GB included; then raise the bucket limit (`update storage.buckets set file_size_limit = … where id = 'media'`) and `NEXT_PUBLIC_MAX_UPLOAD_MB` |
| Project pauses after 7 days idle | Site stops working | Handled by the daily `/api/keepalive` cron (vercel.json); Pro never pauses |
| Built-in auth emails (~2/hour) | Password-reset emails can be slow | Add a free SMTP provider (e.g. Resend) in Supabase Auth settings |

## Project structure

```
app/
  (team)/dashboard        My work queue
  (team)/board            Production board (all videos by stage)
  (team)/clients          Clients, client page (pipeline, plans, logins, details)
  (team)/clients/[id]/plans/[planId]   Monthly plan editor
  (team)/videos/[id]      Video workspace
  (team)/team, settings   Owner only
  portal/                 Client portal (home, plan review, video review/shoot)
  api/admin/users         Create / disable / reset logins (server, service key)
  api/setup               One-time owner creation
  api/keepalive           Daily ping (Vercel Cron)
components/               UI kit, shells, video workspace parts (player, uploader, teleprompter…)
lib/                      Supabase clients, workflow rules (stages, actions), types, helpers
supabase/migrations/      Database schema, security rules, workflow functions
proxy.ts                  Session refresh + sign-in redirect (Next.js 16 "proxy", formerly middleware)
```

## Test data

The database currently holds a test client ("Acme Realty (TEST)") and five test logins on `.test` emails. Their passwords are only in `test-accounts.local.md` on the development machine (git-ignored). Delete them before going live:

```sql
delete from public.clients where name like '%(TEST)%';
delete from auth.users where email like '%.test';
```
