-- Core extensions
create extension if not exists pgcrypto;

-- Shared trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- User profile table (1:1 with auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  native_language text not null default 'vi',
  target_band numeric(2,1) check (target_band between 1.0 and 9.0),
  proficiency_level text,
  study_minutes_per_day integer,
  focus_skills text[] not null default '{}'::text[],
  exam_date date,
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists proficiency_level text,
  add column if not exists study_minutes_per_day integer,
  add column if not exists focus_skills text[] not null default '{}'::text[],
  add column if not exists exam_date date,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_proficiency_level_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_proficiency_level_check
      check (
        proficiency_level is null
        or proficiency_level in ('beginner', 'intermediate', 'advanced')
      );
  end if;
end $$;

-- Auto-create profile whenever a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Vocabulary pool per user
create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  source_text text,
  translation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vocabulary_items_user_created
  on public.vocabulary_items (user_id, created_at desc);

create unique index if not exists idx_vocabulary_items_user_term_ci
  on public.vocabulary_items (user_id, lower(term));

create trigger trg_vocabulary_items_updated_at
before update on public.vocabulary_items
for each row execute function public.set_updated_at();

-- Spaced repetition flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_item_id uuid references public.vocabulary_items(id) on delete set null,
  front_text text not null,
  back_text text not null,
  interval_days integer not null default 1,
  ease_factor numeric(3,2) not null default 2.50,
  repetitions integer not null default 0,
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_flashcards_user_next_review
  on public.flashcards (user_id, next_review_at asc);

create trigger trg_flashcards_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

-- Enable RLS and ownership policies
alter table public.user_profiles enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.flashcards enable row level security;

create policy "user_profiles_select_own"
on public.user_profiles
for select
using (auth.uid() = id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
using (auth.uid() = id);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_insert_own'
  ) then
    create policy "user_profiles_insert_own"
    on public.user_profiles
    for insert
    with check (auth.uid() = id);
  end if;
end $$;

create policy "vocabulary_items_select_own"
on public.vocabulary_items
for select
using (auth.uid() = user_id);

create policy "vocabulary_items_insert_own"
on public.vocabulary_items
for insert
with check (auth.uid() = user_id);

create policy "vocabulary_items_update_own"
on public.vocabulary_items
for update
using (auth.uid() = user_id);

create policy "vocabulary_items_delete_own"
on public.vocabulary_items
for delete
using (auth.uid() = user_id);

create policy "flashcards_select_own"
on public.flashcards
for select
using (auth.uid() = user_id);

create policy "flashcards_insert_own"
on public.flashcards
for insert
with check (auth.uid() = user_id);

create policy "flashcards_update_own"
on public.flashcards
for update
using (auth.uid() = user_id);

create policy "flashcards_delete_own"
on public.flashcards
for delete
using (auth.uid() = user_id);

-- ============================================================
-- Chat projects + recents
-- ============================================================

-- User-owned project folders for grouping conversations
create table if not exists public.chat_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_projects_user_updated
  on public.chat_projects (user_id, updated_at desc);

create unique index if not exists idx_chat_projects_user_name_ci
  on public.chat_projects (user_id, lower(name));

create trigger trg_chat_projects_updated_at
before update on public.chat_projects
for each row execute function public.set_updated_at();

-- Conversation threads: this table powers "Recents"
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.chat_projects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  last_message_preview text,
  last_activity_at timestamptz not null default now(),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_user_recent
  on public.chat_conversations (user_id, last_activity_at desc);

create index if not exists idx_chat_conversations_user_project_recent
  on public.chat_conversations (user_id, project_id, last_activity_at desc);

create trigger trg_chat_conversations_updated_at
before update on public.chat_conversations
for each row execute function public.set_updated_at();

-- Optional normalized message history per conversation
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation_created
  on public.chat_messages (conversation_id, created_at asc);

create trigger trg_chat_messages_updated_at
before update on public.chat_messages
for each row execute function public.set_updated_at();

-- RLS
alter table public.chat_projects enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "chat_projects_select_own"
on public.chat_projects
for select
using (auth.uid() = user_id);

create policy "chat_projects_insert_own"
on public.chat_projects
for insert
with check (auth.uid() = user_id);

create policy "chat_projects_update_own"
on public.chat_projects
for update
using (auth.uid() = user_id);

create policy "chat_projects_delete_own"
on public.chat_projects
for delete
using (auth.uid() = user_id);

create policy "chat_conversations_select_own"
on public.chat_conversations
for select
using (auth.uid() = user_id);

create policy "chat_conversations_insert_own"
on public.chat_conversations
for insert
with check (auth.uid() = user_id);

create policy "chat_conversations_update_own"
on public.chat_conversations
for update
using (auth.uid() = user_id);

create policy "chat_conversations_delete_own"
on public.chat_conversations
for delete
using (auth.uid() = user_id);

create policy "chat_messages_select_own"
on public.chat_messages
for select
using (auth.uid() = user_id);

create policy "chat_messages_insert_own"
on public.chat_messages
for insert
with check (auth.uid() = user_id);

create policy "chat_messages_update_own"
on public.chat_messages
for update
using (auth.uid() = user_id);

create policy "chat_messages_delete_own"
on public.chat_messages
for delete
using (auth.uid() = user_id);

-- ============================================================
-- Vocabulary enrichment (2026-03-27)
-- Run this block after the initial schema above is applied.
-- ============================================================

-- Add rich dictionary columns to vocabulary_items.
-- `translation` and `source_text` already exist from the initial schema.
alter table public.vocabulary_items
  add column if not exists ipa text,
  add column if not exists entries jsonb not null default '[]'::jsonb,
  add column if not exists notes text[] not null default '{}'::text[];

-- ============================================================
-- NEW SQL (2026-03-27) - COPY & RUN THIS BLOCK
-- Writing attempts for adaptive scoring + progress dashboard + speaking reports
-- ============================================================

create table if not exists public.writing_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_mode text not null check (
    exercise_mode in ('sentence-translation', 'topic-writing', 'speaking-live')
  ),
  overall_accuracy numeric(5,2) not null check (overall_accuracy between 0 and 100),
  band_score numeric(2,1) not null check (band_score between 0 and 9),
  criterion_scores jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_writing_attempts_user_created
  on public.writing_practice_attempts (user_id, created_at desc);

drop trigger if exists trg_writing_attempts_updated_at on public.writing_practice_attempts;
create trigger trg_writing_attempts_updated_at
before update on public.writing_practice_attempts
for each row execute function public.set_updated_at();

alter table public.writing_practice_attempts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'writing_practice_attempts'
      and policyname = 'writing_attempts_select_own'
  ) then
    create policy "writing_attempts_select_own"
    on public.writing_practice_attempts
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'writing_practice_attempts'
      and policyname = 'writing_attempts_insert_own'
  ) then
    create policy "writing_attempts_insert_own"
    on public.writing_practice_attempts
    for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'writing_practice_attempts_exercise_mode_check'
  ) then
    alter table public.writing_practice_attempts
      drop constraint writing_practice_attempts_exercise_mode_check;
  end if;

  alter table public.writing_practice_attempts
    add constraint writing_practice_attempts_exercise_mode_check
    check (exercise_mode in ('sentence-translation', 'topic-writing', 'speaking-live'));
end $$;

-- ============================================================
-- Weekly study plan (2026-04-06)
-- ============================================================

create table if not exists public.study_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  day_type text not null check (day_type in ('weekday', 'weekend')),
  target_minutes integer not null check (target_minutes between 10 and 600),
  is_mock_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists idx_study_plan_days_user_date
  on public.study_plan_days (user_id, plan_date asc);

drop trigger if exists trg_study_plan_days_updated_at on public.study_plan_days;
create trigger trg_study_plan_days_updated_at
before update on public.study_plan_days
for each row execute function public.set_updated_at();

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_day_id uuid not null references public.study_plan_days(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  focus_area text not null,
  task_type text not null check (task_type in ('writing', 'speaking', 'vocabulary', 'grammar', 'mock-test')),
  weakness_key text,
  weakness_label text,
  planned_minutes integer not null check (planned_minutes between 5 and 240),
  status text not null default 'pending' check (status in ('pending', 'done')),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_plan_items_user_day
  on public.study_plan_items (user_id, plan_day_id, sort_order asc);

create index if not exists idx_study_plan_items_user_status
  on public.study_plan_items (user_id, status, created_at desc);

drop trigger if exists trg_study_plan_items_updated_at on public.study_plan_items;
create trigger trg_study_plan_items_updated_at
before update on public.study_plan_items
for each row execute function public.set_updated_at();

alter table public.study_plan_days enable row level security;
alter table public.study_plan_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_days'
      and policyname = 'study_plan_days_select_own'
  ) then
    create policy "study_plan_days_select_own"
    on public.study_plan_days
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_days'
      and policyname = 'study_plan_days_insert_own'
  ) then
    create policy "study_plan_days_insert_own"
    on public.study_plan_days
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_days'
      and policyname = 'study_plan_days_update_own'
  ) then
    create policy "study_plan_days_update_own"
    on public.study_plan_days
    for update
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_days'
      and policyname = 'study_plan_days_delete_own'
  ) then
    create policy "study_plan_days_delete_own"
    on public.study_plan_days
    for delete
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_items'
      and policyname = 'study_plan_items_select_own'
  ) then
    create policy "study_plan_items_select_own"
    on public.study_plan_items
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_items'
      and policyname = 'study_plan_items_insert_own'
  ) then
    create policy "study_plan_items_insert_own"
    on public.study_plan_items
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_items'
      and policyname = 'study_plan_items_update_own'
  ) then
    create policy "study_plan_items_update_own"
    on public.study_plan_items
    for update
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_plan_items'
      and policyname = 'study_plan_items_delete_own'
  ) then
    create policy "study_plan_items_delete_own"
    on public.study_plan_items
    for delete
    using (auth.uid() = user_id);
  end if;
end $$;
