begin;

alter table public.cloud_batches
  add column variety text check (length(trim(variety)) between 1 and 100),
  add column weight_kg numeric check (weight_kg > 0 and weight_kg <= 1000000);
grant insert (variety, weight_kg) on public.cloud_batches to authenticated;
grant update (farm, province, harvest_date, variety, weight_kg) on public.cloud_batches to authenticated;

create table public.cloud_evidence (
  id uuid primary key,
  batch_id uuid not null references public.cloud_batches(id),
  kind text not null check (kind in ('photo', 'lab_report', 'other')),
  source text not null check (length(trim(source)) between 1 and 160),
  document_date date not null,
  filename text not null check (length(filename) between 1 and 180),
  file_path text not null unique check (file_path = batch_id::text || '/' || id::text),
  created_at timestamptz not null default now()
);
create index cloud_evidence_batch_created on public.cloud_evidence(batch_id, created_at desc, id desc);
alter table public.cloud_evidence enable row level security;
revoke all on public.cloud_evidence from anon, authenticated;
grant select on public.cloud_evidence to anon, authenticated;
grant insert (id, batch_id, kind, source, document_date, filename, file_path)
  on public.cloud_evidence to authenticated;

create policy evidence_read on public.cloud_evidence for select to anon, authenticated
  using (exists (select 1 from public.cloud_batches b where b.id = batch_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('batch-evidence', 'batch-evidence', false, 5242880,
  array['image/jpeg', 'image/png', 'application/pdf']);

-- Unlinked uploads remain visible only to the batch owner, even for public batches.
create policy batch_evidence_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'batch-evidence' and (
    exists (select 1 from public.cloud_batches b
      where b.id::text = split_part(name, '/', 1) and b.owner_id = (select auth.uid()))
    or exists (select 1 from public.cloud_evidence e where e.file_path = name)
  ));
create policy batch_evidence_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'batch-evidence'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'
    and exists (select 1 from public.cloud_batches b
      where b.id::text = split_part(name, '/', 1) and b.owner_id = (select auth.uid())));
-- Only failed/unlinked uploads may be cleaned up. Attached evidence is append-only.
create policy batch_evidence_files_cleanup on storage.objects for delete to authenticated
  using (bucket_id = 'batch-evidence'
    and exists (select 1 from public.cloud_batches b
      where b.id::text = split_part(name, '/', 1) and b.owner_id = (select auth.uid()))
    and not exists (select 1 from public.cloud_evidence e where e.file_path = name));
-- Avoid a recursive evidence -> storage -> evidence policy expansion. This
-- narrow function only confirms an existing object belonging to the caller's batch.
create function public.owns_evidence_upload(batch uuid, file uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from storage.objects o
    join public.cloud_batches b on b.id = batch
    where b.owner_id = (select auth.uid()) and o.bucket_id = 'batch-evidence'
      and o.name = batch::text || '/' || file::text)
$$;
revoke all on function public.owns_evidence_upload(uuid, uuid) from public, anon;
grant execute on function public.owns_evidence_upload(uuid, uuid) to authenticated;
create policy evidence_append on public.cloud_evidence for insert to authenticated
  with check (
    exists (select 1 from public.cloud_batches b
      where b.id = batch_id and b.owner_id = (select auth.uid()))
    and public.owns_evidence_upload(batch_id, id)
  );

commit;
