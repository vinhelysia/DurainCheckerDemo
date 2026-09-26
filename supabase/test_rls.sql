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
