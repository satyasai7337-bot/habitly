# Habitly 🌱

A habit-tracking web app. Track the **good habits** that build your health
(water, meals, gym, sleep, walking, study, work) and **prevent the bad ones**
(alcohol, smoking, vaping, drugs). Get daily targets, weekly/monthly reports
with graphs, in-app reminders for good habits, AI coaching, a monthly score
and an earnable certificate.

Built with **Next.js (App Router)**, **MongoDB/Mongoose**, **Tailwind CSS**,
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
| MongoDB database | ✅ |

---

## Prerequisites

- **Node.js 18+** (tested on Node 24)
- **MongoDB** running locally at `mongodb://127.0.0.1:27017`
  (the included Windows MongoDB service works out of the box)

## Setup

```bash
npm install
```

Configuration lives in **`.env.local`** (already created). Key values:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/habit_tracker
JWT_SECRET=<change me to a long random string>

# AI tips — optional. Without a key the app uses smart built-in suggestions.
GEMINI_API_KEY=            # get one at https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-1.5-flash

COOKIE_SECURE=false        # set true ONLY when deployed over HTTPS
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
  page.js                 Landing page
  login/  signup/         Auth pages
  dashboard/              Dashboard (server guard → <Dashboard/>)
  reports/                Weekly/monthly reports (server guard → <Reports/>)
  api/
    auth/                 signup, login, logout, me
    logs/                 add/list habit entries
    habits/summary        dashboard data (progress, next reminder, counts)
    habits/settings       edit target + reminder times
    reminders/due         in-app due reminders (records + returns pending)
    reports/              weekly/monthly aggregation
    ai/suggestions        Gemini (or fallback) tips
  certificate/            earnable monthly certificate (printable)
components/               Dashboard, HabitCard, Reminders, Reports, Charts,
                          AISuggestions, ThoughtOfDay, PrintButton, TopNav, Brand
lib/                      habits catalog, db, auth, dates, stats, ai, thoughts
models/                   User, HabitLog, ReminderLog (Mongoose)
```

## How habits work

- **Good habits** have a daily target you aim to *reach* (e.g. 6 L water). They
  get in-app reminders and a "if you skip…" consequence.
- **Bad habits** have a target of **0** you aim to *stay under*. They show usage
  tracking, trend graphs and a "why prevent…" consequence — but **no reminders**.

Log entries throughout the day; multiple entries are summed per day.
