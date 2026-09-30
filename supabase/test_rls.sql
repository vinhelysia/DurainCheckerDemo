-- Run only against an empty, disposable PostgreSQL database. Never against production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
-- Minimal Storage metadata schema for SQL policy tests only. Upload byte limits
-- are enforced by the real Storage service and need a separate live check.
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, unique(bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;

-- Apply migration here before executing the assertions below.
-- ASSERTIONS
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.cloud_batches(code, farm, province, harvest_date) values ('TEST', 'Farm', 'Region', '2026-09-26');
insert into public.cloud_events(batch_id, stage, location, occurred_on)
  select id, 'Harvest', 'Farm', '2026-09-26' from public.cloud_batches;
do $$ begin
  assert (select count(*) from public.cloud_batches) = 1, 'Owner cannot read own batch';
  assert (select count(*) from public.cloud_events) = 1, 'Owner cannot read own history';
  begin
    insert into public.cloud_batches(owner_id, code, farm, province, harvest_date)
      values ('22222222-2222-4222-8222-222222222222', 'SPOOF', 'Farm', 'Region', '2026-09-26');
    raise exception 'Owner spoof accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.cloud_events set notes = 'Rewrite';
    raise exception 'Event rewrite accepted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.cloud_events;
    raise exception 'Event delete accepted';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_batches) = 0, 'Anonymous private batch leak';
  assert (select count(*) from public.cloud_events) = 0, 'Anonymous private history leak';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  assert (select count(*) from public.cloud_batches) = 0, 'Other account private batch leak';
  assert (select count(*) from public.cloud_events) = 0, 'Other account private history leak';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
update public.cloud_batches set is_public = true;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ declare changed integer; begin
  assert (select count(*) from public.cloud_batches) = 1, 'Published batch not visible';
  assert (select count(*) from public.cloud_events) = 1, 'Published history not visible';
  update public.cloud_batches set is_public = false;
  get diagnostics changed = row_count;
  assert changed = 0, 'Other user changed publication';
  begin
    insert into public.cloud_events(batch_id, stage, location, occurred_on)
      select id, 'Unauthorized', 'Farm', '2026-09-26' from public.cloud_batches;
    raise exception 'Other account added an event';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_batches) = 1, 'Anonymous public batch missing';
  assert (select count(*) from public.cloud_events) = 1, 'Anonymous public history missing';
  begin
    insert into public.cloud_batches(code, farm, province, harvest_date) values ('ANON', 'Farm', 'Region', '2026-09-26');
    raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
update public.cloud_batches set is_public = false;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_batches) = 0, 'Unpublished batch still public';
  assert (select count(*) from public.cloud_events) = 0, 'Unpublished history still public';
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.cloud_batches(code, farm, province, harvest_date, variety, weight_kg)
  values ('EVIDENCE', 'Farm', 'Region', '2026-09-27', 'Ri6', 850);
insert into storage.objects(bucket_id, name)
  select 'batch-evidence', id::text || '/33333333-3333-4333-8333-333333333333' from public.cloud_batches;
insert into storage.objects(bucket_id, name)
  select 'batch-evidence', id::text || '/44444444-4444-4444-8444-444444444444' from public.cloud_batches;
insert into public.cloud_evidence(id, batch_id, kind, source, document_date, filename, file_path)
  select '33333333-3333-4333-8333-333333333333', id, 'photo', 'Grower', '2026-09-27', 'photo.png',
    id::text || '/33333333-3333-4333-8333-333333333333' from public.cloud_batches;
do $$ declare changed integer; begin
  assert (select count(*) from storage.objects) = 2, 'Owner cannot see own uploads';
  delete from storage.objects where name like '%/33333333-3333-4333-8333-333333333333';
  get diagnostics changed = row_count;
  assert changed = 0, 'Attached file deleted';
  update storage.objects set name = 'replacement';
  get diagnostics changed = row_count;
  assert changed = 0, 'File overwritten';
  begin
    insert into public.cloud_evidence(id, batch_id, kind, source, document_date, filename, file_path)
      select '55555555-5555-4555-8555-555555555555', id, 'lab_report', 'Unverified lab', '2026-09-27', 'missing.pdf',
        id::text || '/55555555-5555-4555-8555-555555555555' from public.cloud_batches;
    raise exception 'Missing object attached';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_evidence) = 0, 'Private metadata leaked';
  assert (select count(*) from storage.objects) = 0, 'Private files leaked';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  assert (select count(*) from public.cloud_evidence) = 0, 'Other account private metadata leak';
  assert (select count(*) from storage.objects) = 0, 'Other account private file leak';
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
update public.cloud_batches set is_public = true;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ declare changed integer; begin
  assert (select count(*) from public.cloud_evidence) = 1, 'Published metadata not visible';
  assert (select count(*) from storage.objects) = 1, 'Unlinked file leaked or published file missing';
  update public.cloud_batches set weight_kg = 999;
  get diagnostics changed = row_count;
  assert changed = 0, 'Other user edited batch';
  begin
    insert into storage.objects(bucket_id, name)
      select 'batch-evidence', id::text || '/55555555-5555-4555-8555-555555555555' from public.cloud_batches;
    raise exception 'Other user uploaded evidence';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cloud_evidence(id, batch_id, kind, source, document_date, filename, file_path)
      select '44444444-4444-4444-8444-444444444444', id, 'photo', 'Spoof', '2026-09-27', 'spoof.png',
        id::text || '/44444444-4444-4444-8444-444444444444' from public.cloud_batches;
    raise exception 'Other user attached metadata';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_evidence) = 1, 'Anonymous metadata missing';
  assert (select count(*) from storage.objects) = 1, 'Anonymous public file missing';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
update public.cloud_batches set is_public = false;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.cloud_evidence) = 0, 'Revoked evidence metadata leaked';
  assert (select count(*) from storage.objects) = 0, 'Revoked file still visible';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  assert (select count(*) from public.cloud_evidence) = 0, 'Revoked metadata visible to another account';
  assert (select count(*) from storage.objects) = 0, 'Revoked file visible to another account';
end $$;
rollback;
