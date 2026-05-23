# Habitly 🌱

A habit-tracking web app. Track the **good habits** that build your health
(water, meals, gym, sleep, walking, study, work) and **prevent the bad ones**
(alcohol, smoking, vaping, drugs). Get daily targets, weekly/monthly reports
with graphs, in-app reminders for good habits, AI coaching, a monthly score
and an earnable certificate.

Built with **Next.js (App Router)**, **Supabase (PostgreSQL)**, **Tailwind CSS**,
and **Google Gemini** (AI tips).

---

## Features

| Task | Built |
|------|-------|
| Landing page, login, create account (name, phone, email, password, weight, height, age, sex, **pick your habits**) | ✅ |
| Dashboard: selected habits, today's progress, reports, graphs, **in-app reminders**, **next reminder time**, **consequence if not maintained** | ✅ |
| In-app reminders **only for good habits**; bad habits show tracking + report + graph only | ✅ |
| AI suggestions to maintain good health & prevent bad habits (Gemini, with a built-in fallback) | ✅ |
| Gen-Z, clean UI with plain (non-neon) colors | ✅ |
| Daily targets per habit (6 L water, 3 meals, 8 h sleep, …) — editable | ✅ |
| Monthly score + earnable, printable certificate | ✅ |
| Supabase (PostgreSQL) database | ✅ |

---

## Prerequisites

- **Node.js 18+** (tested on Node 24)
- A free **Supabase** project (<https://supabase.com>)

## Setup

```bash
npm install
```

**1. Create the database tables.** In the Supabase dashboard → **SQL Editor** →
paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

**2. Configure `.env.local`:**

```ini
# Supabase → Project Settings → API
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret   # keep private!

JWT_SECRET=<a long random string>

# AI tips — optional. Without a key the app uses smart built-in suggestions.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

COOKIE_SECURE=false        # set true ONLY when served over HTTPS
```

Reminders are shown **in-app** (on the dashboard) — no email/SMTP setup needed.

## Run

```bash
npm run dev      # development → http://localhost:3000
# or
npm run build && npm start    # production
```

That's the only process you need. Reminders surface **inside the app**: while
the dashboard is open it checks every minute for good habits whose reminder time
has passed today and shows them in the **Reminders** panel until you log them.
Bad habits never get reminders, by design.

---

## Project structure

```
app/
  page.js                 Landing page (redirects to /login or /dashboard)
  welcome/                Marketing landing page
  login/  signup/         Auth pages
  dashboard/              Dashboard (server guard → <Dashboard/>)
  reports/                Weekly/monthly reports (server guard → <Reports/>)
  certificate/            Earnable monthly certificate (printable)
  api/
    auth/                 signup, login, logout, me
    logs/                 add/list habit entries
    habits/summary        dashboard data (progress, next reminder, counts)
    habits/settings       edit target + reminder times
    reminders/due         in-app due reminders (records + returns pending)
    reports/              weekly/monthly aggregation
    ai/suggestions        Gemini (or fallback) tips
components/               Dashboard, HabitCard, Reminders, Reports, Charts,
                          AISuggestions, ThoughtOfDay, PrintButton, TopNav, Brand
lib/                      supabase (client), store (data access), auth, habits,
                          dates, stats, ai, thoughts
supabase/schema.sql       PostgreSQL tables (users, habit_logs, reminder_logs)
```

## How habits work

- **Good habits** have a daily target you aim to *reach* (e.g. 6 L water). They
  get in-app reminders and a "if you skip…" consequence.
- **Bad habits** have a target of **0** you aim to *stay under*. They show usage
  tracking, trend graphs and a "why prevent…" consequence — but **no reminders**.

Log entries throughout the day; multiple entries are summed per day.

---

## Deploy (Render + Supabase)

The app runs as a single Node web service — no background worker (reminders are
in-app). The database is Supabase, so it works the same locally and in the cloud.

**1. Set up Supabase**
1. Create a project at <https://supabase.com>.
2. **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
3. **Project Settings → API** → copy the **Project URL** and the **service_role** key.

**2. Deploy on Render (Blueprint)**
1. Open <https://render.com/deploy?repo=https://github.com/satyasai7337-bot/habitly>
   (or Render → **New → Blueprint** → pick the repo). Render reads `render.yaml`.
2. It auto-generates `JWT_SECRET`; you provide:
   | Variable | Value |
   |----------|-------|
   | `SUPABASE_URL` | your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role secret |
3. Click **Apply**. Your app goes live at `https://habitly-xxxx.onrender.com`.
