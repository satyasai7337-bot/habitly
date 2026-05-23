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
  habits        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

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

-- Note: the app connects with the Supabase service role key and enforces access
-- via its own JWT auth, so row-level security is intentionally left disabled.
