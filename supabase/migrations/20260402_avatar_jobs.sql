-- 1) UUID generator
create extension if not exists pgcrypto;

-- 2) Job table: one record per generation request
create table if not exists public.avatar_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  avatar_path text not null,

  -- lifecycle
  status text not null default 'pending',             -- pending | processing | done | failed
  progress_stage text not null default 'queued',      -- queued | downloading_avatar | generating_images | uploading_originals | slicing | saving_records | completed | failed
  progress_percent int not null default 0,

  prompts jsonb,
  result_set_id uuid,

  error_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_avatar_generation_jobs_user_id
  on public.avatar_generation_jobs(user_id);

create index if not exists idx_avatar_generation_jobs_status
  on public.avatar_generation_jobs(status);

-- 3) Set table: grouping of 10 generated images
create table if not exists public.user_puzzle_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid references public.avatar_generation_jobs(id) on delete set null,

  title text not null default 'Avatar Puzzle Pack',
  avatar_path text not null,

  originals_folder text not null,
  pieces_folder text not null,

  images_count int not null default 10,
  status text not null default 'pending', -- pending | processing | done | failed

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_puzzle_sets_user_id
  on public.user_puzzle_sets(user_id);

-- 4) Update trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_avatar_generation_jobs_updated_at on public.avatar_generation_jobs;
create trigger trg_avatar_generation_jobs_updated_at
before update on public.avatar_generation_jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_puzzle_sets_updated_at on public.user_puzzle_sets;
create trigger trg_user_puzzle_sets_updated_at
before update on public.user_puzzle_sets
for each row execute function public.set_updated_at();

-- 5) Add columns to puzzles for ownership
alter table public.puzzles
  add column if not exists user_id uuid,
  add column if not exists set_id uuid references public.user_puzzle_sets(id) on delete cascade;

create index if not exists idx_puzzles_user_id on public.puzzles(user_id);
create index if not exists idx_puzzles_set_id on public.puzzles(set_id);

-- 6) RLS (мінімальний безпечний набір для читання в мобільному клієнті)
alter table public.avatar_generation_jobs enable row level security;
alter table public.user_puzzle_sets enable row level security;
alter table public.puzzles enable row level security;

-- Jobs: читати тільки свої
drop policy if exists jobs_select_own on public.avatar_generation_jobs;
create policy jobs_select_own
on public.avatar_generation_jobs
for select
using (user_id = auth.uid());

-- Sets: читати тільки свої
drop policy if exists sets_select_own on public.user_puzzle_sets;
create policy sets_select_own
on public.user_puzzle_sets
for select
using (user_id = auth.uid());

-- Puzzles: бачити свої + "публічні" (user_id is null)
drop policy if exists puzzles_select_public_or_own on public.puzzles;
create policy puzzles_select_public_or_own
on public.puzzles
for select
using (user_id is null or user_id = auth.uid());
