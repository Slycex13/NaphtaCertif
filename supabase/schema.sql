-- N/OPS — schéma Supabase minimal pour une mise en ligne gratuite.
-- À exécuter dans Supabase > SQL Editor après création du projet.

create extension if not exists "pgcrypto";

create table if not exists public.questions (
  id text primary key,
  theme_id text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  critical boolean not null default false,
  prompt text not null,
  choices jsonb not null,
  correct_index int not null default 0,
  rationale text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id text primary key,
  employee_name text not null,
  team text not null,
  role text not null,
  mode text not null,
  score int not null default 0,
  question_count int not null default 0,
  overconfidence int not null default 0,
  critical_failures int not null default 0,
  theme_ids jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

alter table public.questions enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "published questions are readable" on public.questions;
create policy "published questions are readable" on public.questions for select using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "admins manage questions" on public.questions;
create policy "admins manage questions" on public.questions for all to authenticated using (true) with check (true);

drop policy if exists "anyone can submit an attempt" on public.attempts;
create policy "anyone can submit an attempt" on public.attempts for insert with check (true);

drop policy if exists "admins can read attempts" on public.attempts;
create policy "admins can read attempts" on public.attempts for select to authenticated using (true);
