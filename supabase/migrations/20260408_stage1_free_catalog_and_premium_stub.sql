-- =========================================================
-- STAGE 1
-- free catalog puzzles + premium stub
-- =========================================================

-- -------------------------
-- profiles: premium stub
-- -------------------------
alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_expires_at timestamptz null,
  add column if not exists premium_plan text null;

create index if not exists profiles_is_premium_idx
  on public.profiles (is_premium);

NOTIFY pgrst, 'reload schema';

-- -------------------------
-- avatar_variants:
-- add catalog / premium flags
-- -------------------------
alter table public.avatar_variants
  add column if not exists variant_type text not null default 'user_free',
  add column if not exists is_public boolean not null default false,
  add column if not exists is_premium boolean not null default false,
  add column if not exists display_title text null,
  add column if not exists sort_order int not null default 0,
  add column if not exists preview_bucket text null,
  add column if not exists preview_path text null;

-- якщо user_id зараз NOT NULL і ви хочете shared catalog rows без user_id
alter table public.avatar_variants
  alter column user_id drop not null;

-- нормалізація старих записів
update public.avatar_variants
set
  variant_type = coalesce(variant_type, 'user_free'),
  is_public = coalesce(is_public, false),
  is_premium = coalesce(is_premium, false),
  sort_order = coalesce(sort_order, 0)
where true;

-- optional check
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'avatar_variants_variant_type_check'
  ) then
    alter table public.avatar_variants
      add constraint avatar_variants_variant_type_check
      check (variant_type in ('user_free', 'free_catalog', 'premium_catalog', 'user_premium'));
  end if;
end
$$;

create index if not exists avatar_variants_variant_type_idx
  on public.avatar_variants (variant_type);

create index if not exists avatar_variants_public_idx
  on public.avatar_variants (is_public, sort_order);

create index if not exists avatar_variants_premium_idx
  on public.avatar_variants (is_premium);

NOTIFY pgrst, 'reload schema';

-- -------------------------
-- RLS
-- current policy was own-only
-- now:
-- - own rows selectable
-- - public catalog rows selectable
-- -------------------------
alter table public.avatar_variants enable row level security;

drop policy if exists "avatar_variants_select_own" on public.avatar_variants;
drop policy if exists "avatar_variants_select_own_or_public" on public.avatar_variants;

create policy "avatar_variants_select_own_or_public"
on public.avatar_variants
for select
to authenticated
using (
  auth.uid() = user_id
  or is_public = true
);

drop policy if exists "avatar_variants_update_own" on public.avatar_variants;
create policy "avatar_variants_update_own"
on public.avatar_variants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

-- -------------------------
-- OPTIONAL:
-- example free catalog items
-- IMPORTANT:
-- generated_path / pieces_folder / piece_manifest
-- must point to real already uploaded puzzle assets
-- -------------------------

-- insert into public.avatar_variants (
--   user_id,
--   job_id,
--   idx,
--   prompt,
--   display_title,
--   generated_path,
--   pieces_bucket,
--   pieces_folder,
--   board_cols,
--   board_rows,
--   image_width,
--   image_height,
--   piece_aspect_ratio,
--   cut_pattern,
--   piece_manifest,
--   pieces_count,
--   variant_type,
--   is_public,
--   is_premium,
--   sort_order,
--   preview_bucket,
--   preview_path
-- )
-- values (
--   null,
--   null,
--   0,
--   'Free catalog puzzle 1',
--   'Київ • Весна',
--   'catalog/free/kyiv-spring/full.png',
--   'avatar-puzzle-pieces',
--   'catalog/free/kyiv-spring',
--   6,
--   5,
--   1200,
--   1000,
--   1.2,
--   'pattern-a',
--   '[]'::jsonb,
--   30,
--   'free_catalog',
--   true,
--   false,
--   1,
--   'avatar_generated',
--   'catalog/free/kyiv-spring/full.png'
-- );