-- Off-chain, user-entered records. No wallet roles or chain ownership are inferred here.
begin;

create table public.cloud_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  farm text not null check (length(trim(farm)) between 1 and 160),
  province text not null check (length(trim(province)) between 1 and 160),
  harvest_date date not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, code)
);

create table public.cloud_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.cloud_batches(id),
  stage text not null check (length(trim(stage)) between 1 and 160),
  location text not null check (length(trim(location)) between 1 and 160),
  occurred_on date not null,
  notes text not null default '' check (length(notes) <= 2000),
  cadmium_ppm numeric check (cadmium_ppm between 0 and 100),
  threshold_ppm numeric check (threshold_ppm > 0 and threshold_ppm <= 100),
  created_at timestamptz not null default now(),
  check ((cadmium_ppm is null) = (threshold_ppm is null))
);
create index cloud_events_batch_created on public.cloud_events(batch_id, created_at, id);
create index cloud_batches_owner_created on public.cloud_batches(owner_id, created_at desc, id desc);

alter table public.cloud_batches enable row level security;
alter table public.cloud_events enable row level security;

-- Explicit grants also protect direct Data API access, bypassing our Render API.
revoke all on public.cloud_batches, public.cloud_events from anon, authenticated;
grant select on public.cloud_batches, public.cloud_events to anon, authenticated;
grant insert (code, farm, province, harvest_date) on public.cloud_batches to authenticated;
grant update (is_public) on public.cloud_batches to authenticated;
grant insert (batch_id, stage, location, occurred_on, notes, cadmium_ppm, threshold_ppm)
  on public.cloud_events to authenticated;

create policy batches_read on public.cloud_batches for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()));
create policy batches_create on public.cloud_batches for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy batches_publish on public.cloud_batches for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy events_read on public.cloud_events for select to anon, authenticated
  using (exists (select 1 from public.cloud_batches b where b.id = batch_id));
create policy events_append on public.cloud_events for insert to authenticated
  with check (exists (select 1 from public.cloud_batches b
    where b.id = batch_id and b.owner_id = (select auth.uid())));

commit;
