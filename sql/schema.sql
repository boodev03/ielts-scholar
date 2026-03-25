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
