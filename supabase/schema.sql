-- Habitly schema for Supabase / PostgreSQL.
-- Run this once in the Supabase dashboard → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text not null unique,
  password_hash text not null,
  body_weight   numeric,
  height        numeric,
  age           integer,
  sex           text,
  goal_weight   numeric,                      -- weight-loss target (kg)
  goal_date     text,                          -- "YYYY-MM-DD" target date
  avatar        text,                          -- profile picture as a data URL
  health_plan   jsonb,                          -- latest AI plan from a medical report
  habits        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
-- If the users table already exists, add the new columns:
alter table users add column if not exists goal_weight numeric;
alter table users add column if not exists goal_date   text;
alter table users add column if not exists avatar      text;
alter table users add column if not exists health_plan jsonb;

create table if not exists habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  habit_key  text not null,
  date       text not null,                 -- "YYYY-MM-DD" (local day)
  value      numeric not null default 0,
  note       text default '',
  created_at timestamptz not null default now()
);
create index if not exists habit_logs_user_date_idx on habit_logs (user_id, date);
create index if not exists habit_logs_user_habit_date_idx on habit_logs (user_id, habit_key, date);

create table if not exists reminder_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  habit_key  text not null,
  slot       text not null,                 -- "HH:MM"
  date       text not null,                 -- "YYYY-MM-DD"
  channel    text default 'app',
  status     text default 'shown',
  sent_at    timestamptz not null default now(),
  unique (user_id, habit_key, slot, date)
);
create index if not exists reminder_logs_user_date_idx on reminder_logs (user_id, date);

-- User-defined medications and their daily dose schedule.
create table if not exists medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  dosage     text default '',               -- e.g. "500 mg", "1 tablet"
  times      jsonb not null default '[]'::jsonb,  -- ["08:00","20:00"] (local)
  start_date text,                           -- "YYYY-MM-DD" or null (starts today)
  end_date   text,                           -- "YYYY-MM-DD" or null (ongoing / course end)
  notes      text default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists medications_user_idx on medications (user_id);

-- One row per dose the user marked taken/skipped on a given day.
create table if not exists medication_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  slot          text not null,              -- "HH:MM" dose time
  date          text not null,              -- "YYYY-MM-DD"
  status        text not null default 'taken', -- 'taken' | 'skipped'
  taken_at      timestamptz not null default now(),
  unique (user_id, medication_id, slot, date)
);
create index if not exists medication_logs_user_date_idx on medication_logs (user_id, date);

-- Daily body-weight entries for the weight-loss feature (one per day).
create table if not exists weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  date       text not null,                 -- "YYYY-MM-DD"
  weight     numeric not null,              -- kg
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists weight_logs_user_date_idx on weight_logs (user_id, date);

-- Calorie / food intake entries (manual calorie logging).
create table if not exists food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  date       text not null,                 -- "YYYY-MM-DD"
  name       text default '',
  calories   numeric not null,
  meal       text default '',               -- breakfast | lunch | dinner | snack
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx on food_logs (user_id, date);

-- Web Push subscriptions (one per browser/device the user enabled).
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- Dedup log so the scheduler sends each reminder push at most once per day.
create table if not exists push_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  tag        text not null,                 -- e.g. "habit:water:09:00" or "med:<id>:08:00"
  date       text not null,                 -- "YYYY-MM-DD"
  sent_at    timestamptz not null default now(),
  unique (user_id, tag, date)
);
create index if not exists push_logs_user_date_idx on push_logs (user_id, date);

-- Vitals readings: glucose, blood pressure, mood (single flexible table).
create table if not exists vital_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text not null,                 -- 'glucose' | 'bp' | 'mood'
  date       text not null,                 -- "YYYY-MM-DD"
  time       text default '',               -- "HH:MM" (optional)
  value      numeric,                       -- glucose mg/dL, mood 1-5
  systolic   numeric,                       -- BP only
  diastolic  numeric,                       -- BP only
  context    text default '',               -- e.g. 'fasting', 'post-meal'
  note       text default '',
  created_at timestamptz not null default now()
);
create index if not exists vital_logs_user_date_idx on vital_logs (user_id, date);
create index if not exists vital_logs_user_type_idx on vital_logs (user_id, type);

-- Note: the app connects with the Supabase service role key and enforces access
-- via its own JWT auth, so row-level security is intentionally left disabled.
