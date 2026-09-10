-- =========================================================================
-- Pro Bono Interpreter Scheduling Platform
-- Initial schema — tables, enums, RLS, audit triggers, matching helpers
-- =========================================================================

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------
create type user_role as enum (
  'requestor',
  'interpreter',
  'coordinator',
  'admin',
);

create type user_status as enum (
  'pending',     -- awaiting admin approval
  'active',
  'suspended',
  'archived'
);

create type request_status as enum (
  'draft',
  'open',                   -- visible in coordinator queue
  'proposed',               -- coordinator picked an interpreter, pending admin release (if sensitive)
  'pending_acceptance',     -- interpreter has been invited, awaiting their accept
  'assigned',               -- accepted
  'completed',
  'cancelled'
);

create type request_sensitivity as enum (
  'standard',
  'sensitive'   -- routes through admin approval before interpreter ever sees it
);

create type assignment_status as enum (
  'proposed',
  'pending_admin_release',
  'released',
  'accepted',
  'declined',
  'completed',
  'cancelled'
);

create type approval_kind as enum (
  'interpreter_onboarding',
  'community_onboarding',
  'sensitive_assignment',
  'role_escalation',
  'reinstatement',
  'blocklist_edit'
);

create type approval_decision as enum (
  'pending',
  'approved',
  'rejected'
);

-- -----------------------------------------------------------------------
-- PROFILES (one row per auth user)
-- -----------------------------------------------------------------------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'requestor',
  status          user_status not null default 'pending',
  full_name       text not null,
  preferred_name  text,
  email           text not null,
  phone           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_status_idx on profiles(status);

-- -----------------------------------------------------------------------
-- COMMUNITIES (partner Deaf community organizations)
-- -----------------------------------------------------------------------
create table communities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  city         text,
  region       text,
  status       user_status not null default 'pending',
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table community_memberships (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  is_admin     boolean not null default false,
  vouched_by   uuid references profiles(id),
  vouched_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique(community_id, profile_id)
);

-- -----------------------------------------------------------------------
-- INTERPRETER PROFILE
-- -----------------------------------------------------------------------
create table interpreter_profiles (
  profile_id            uuid primary key references profiles(id) on delete cascade,
  home_address          text,
  home_location         geography(point, 4326),
  service_radius_miles  integer not null default 25 check (service_radius_miles between 1 and 500),
  languages             text[] not null default array['ASL']::text[],
  modalities            text[] not null default array['in_person']::text[],   -- in_person, video
  credentials           text,                                                 -- e.g. RID NIC, BEI, EIPA
  pro_bono_commitment   text,                                                 -- short statement
  pro_bono_signed_at    timestamptz,
  notes                 text,
  total_completed       integer not null default 0
);

-- -----------------------------------------------------------------------
-- REQUESTOR PROFILE
-- -----------------------------------------------------------------------
create table requestor_profiles (
  profile_id           uuid primary key references profiles(id) on delete cascade,
  primary_community_id uuid references communities(id),
  contact_preference   text default 'email',  -- email, sms, videophone
  notes                text
);

-- -----------------------------------------------------------------------
-- REQUESTS
-- -----------------------------------------------------------------------
create table requests (
  id                  uuid primary key default gen_random_uuid(),
  requestor_id        uuid not null references profiles(id) on delete restrict,
  community_id        uuid references communities(id),
  title               text not null,
  description         text,
  event_type          text not null,           -- medical, funeral, wedding, family_event, school, legal, other
  sensitivity         request_sensitivity not null default 'standard',
  event_address       text not null,
  event_location      geography(point, 4326) not null,
  event_start         timestamptz not null,
  event_end           timestamptz not null,
  languages_needed    text[] not null default array['ASL']::text[],
  modality            text not null default 'in_person',
  status              request_status not null default 'open',
  notes_internal      text,                    -- coordinator/admin only
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index requests_status_idx on requests(status);
create index requests_event_start_idx on requests(event_start);
create index requests_event_location_gix on requests using gist(event_location);
create index requests_requestor_idx on requests(requestor_id);

-- -----------------------------------------------------------------------
-- CONFLICT-OF-INTEREST BLOCKLIST
-- -----------------------------------------------------------------------
create table coi_blocks (
  id              uuid primary key default gen_random_uuid(),
  requestor_id    uuid not null references profiles(id) on delete cascade,
  interpreter_id  uuid not null references profiles(id) on delete cascade,
  reason          text,            -- visible only to requestor and admin (rare admin view, audited)
  created_at      timestamptz not null default now(),
  unique(requestor_id, interpreter_id)
);

create index coi_blocks_requestor_idx on coi_blocks(requestor_id);
create index coi_blocks_interpreter_idx on coi_blocks(interpreter_id);

-- -----------------------------------------------------------------------
-- ASSIGNMENTS
-- -----------------------------------------------------------------------
create table assignments (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references requests(id) on delete cascade,
  interpreter_id     uuid not null references profiles(id) on delete restrict,
  status             assignment_status not null default 'proposed',
  proposed_by        uuid not null references profiles(id),
  released_by        uuid references profiles(id),     -- admin who released a sensitive assignment
  released_at        timestamptz,
  accepted_at        timestamptz,
  declined_at        timestamptz,
  decline_reason     text,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index assignments_request_idx on assignments(request_id);
create index assignments_interpreter_idx on assignments(interpreter_id);
create index assignments_status_idx on assignments(status);

-- only one active (non-declined/cancelled) assignment per request
create unique index assignments_one_active_per_request
  on assignments(request_id)
  where status in ('proposed','pending_admin_release','released','accepted');

-- -----------------------------------------------------------------------
-- APPROVALS QUEUE
-- -----------------------------------------------------------------------
create table approvals (
  id                  uuid primary key default gen_random_uuid(),
  kind                approval_kind not null,
  target_table        text not null,
  target_id           uuid not null,
  requested_by        uuid references profiles(id),
  context             jsonb,                       -- snapshot details for the admin
  requires_two_keys   boolean not null default false,
  first_decision      approval_decision not null default 'pending',
  first_decided_by    uuid references profiles(id),
  first_decided_at    timestamptz,
  first_reason        text,
  second_decision     approval_decision not null default 'pending',
  second_decided_by   uuid references profiles(id),
  second_decided_at   timestamptz,
  second_reason       text,
  final_decision      approval_decision not null default 'pending',
  created_at          timestamptz not null default now()
);

create index approvals_pending_idx on approvals(final_decision) where final_decision = 'pending';
create index approvals_kind_idx on approvals(kind);

-- -----------------------------------------------------------------------
-- AUDIT LOG (append-only, admin-readable)
-- -----------------------------------------------------------------------
create table audit_log (
  id            bigserial primary key,
  actor_id      uuid references profiles(id),
  action        text not null,                  -- e.g. 'profile.update', 'request.create', 'assignment.release'
  target_table  text not null,
  target_id     uuid,
  before_json   jsonb,
  after_json    jsonb,
  reason        text,
  created_at    timestamptz not null default now()
);

create index audit_log_actor_idx on audit_log(actor_id);
create index audit_log_target_idx on audit_log(target_table, target_id);
create index audit_log_created_idx on audit_log(created_at desc);

-- -----------------------------------------------------------------------
-- updated_at helpers
-- -----------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at  before update on profiles
  for each row execute function set_updated_at();
create trigger requests_set_updated_at  before update on requests
  for each row execute function set_updated_at();
create trigger assignments_set_updated_at  before update on assignments
  for each row execute function set_updated_at();

-- =========================================================================
-- ROLE / PERMISSION HELPERS
-- =========================================================================
create or replace function current_role_is(target user_role) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = target and p.status = 'active'
  );
$$;

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select current_role_is('admin'::user_role);
$$;

create or replace function is_coordinator_or_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('coordinator','admin')
      and p.status = 'active'
  );
$$;

-- =========================================================================
-- ROW-LEVEL SECURITY
-- =========================================================================
alter table profiles                enable row level security;
alter table communities             enable row level security;
alter table community_memberships   enable row level security;
alter table interpreter_profiles    enable row level security;
alter table requestor_profiles      enable row level security;
alter table requests                enable row level security;
alter table coi_blocks              enable row level security;
alter table assignments             enable row level security;
alter table approvals               enable row level security;
alter table audit_log               enable row level security;

-- ------- profiles -------
create policy "profiles self read"
  on profiles for select
  using (id = auth.uid());

create policy "profiles staff read"
  on profiles for select
  using (is_coordinator_or_admin());

create policy "profiles self update"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "profiles admin all"
  on profiles for all
  using (is_admin())
  with check (is_admin());

create policy "profiles insert self"
  on profiles for insert
  with check (id = auth.uid());

-- ------- communities -------
create policy "communities public read active"
  on communities for select
  using (status = 'active' or is_coordinator_or_admin());

create policy "communities admin write"
  on communities for all
  using (is_admin())
  with check (is_admin());

create policy "communities insert pending"
  on communities for insert
  with check (auth.uid() is not null);

-- ------- community memberships -------
create policy "memberships self read"
  on community_memberships for select
  using (profile_id = auth.uid() or is_coordinator_or_admin());

create policy "memberships admin write"
  on community_memberships for all
  using (is_admin())
  with check (is_admin());

-- ------- interpreter profiles -------
create policy "interpreter profiles staff read"
  on interpreter_profiles for select
  using (is_coordinator_or_admin() or profile_id = auth.uid());

create policy "interpreter profiles self write"
  on interpreter_profiles for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "interpreter profiles admin all"
  on interpreter_profiles for all
  using (is_admin())
  with check (is_admin());

-- ------- requestor profiles -------
create policy "requestor profiles self"
  on requestor_profiles for all
  using (profile_id = auth.uid() or is_coordinator_or_admin())
  with check (profile_id = auth.uid() or is_admin());

-- ------- requests -------
create policy "requests requestor own"
  on requests for select
  using (requestor_id = auth.uid());

create policy "requests staff read"
  on requests for select
  using (is_coordinator_or_admin());

-- interpreters can see open standard-sensitivity requests; sensitive requests
-- are never exposed to interpreters until released by an admin via an assignment.
create policy "requests interpreter visible"
  on requests for select
  using (
    current_role_is('interpreter')
    and status in ('open','pending_acceptance')
    and sensitivity = 'standard'
  );

create policy "requests insert by requestor"
  on requests for insert
  with check (requestor_id = auth.uid());

create policy "requests requestor update own draft/open"
  on requests for update
  using (requestor_id = auth.uid() and status in ('draft','open'))
  with check (requestor_id = auth.uid());

create policy "requests staff write"
  on requests for all
  using (is_coordinator_or_admin())
  with check (is_coordinator_or_admin());

-- ------- COI blocklist (very private) -------
create policy "coi requestor own"
  on coi_blocks for all
  using (requestor_id = auth.uid())
  with check (requestor_id = auth.uid());

create policy "coi admin read"
  on coi_blocks for select
  using (is_admin());

-- ------- assignments -------
create policy "assignments interpreter own"
  on assignments for select
  using (interpreter_id = auth.uid());

create policy "assignments requestor own"
  on assignments for select
  using (
    exists (select 1 from requests r where r.id = request_id and r.requestor_id = auth.uid())
  );

create policy "assignments staff all"
  on assignments for all
  using (is_coordinator_or_admin())
  with check (is_coordinator_or_admin());

create policy "assignments interpreter respond"
  on assignments for update
  using (interpreter_id = auth.uid() and status = 'released')
  with check (interpreter_id = auth.uid());

-- ------- approvals (admin only) -------
create policy "approvals admin all"
  on approvals for all
  using (is_admin())
  with check (is_admin());

create policy "approvals coordinator read own"
  on approvals for select
  using (requested_by = auth.uid());

-- ------- audit log (read-only to admins) -------
create policy "audit admin read"
  on audit_log for select
  using (is_admin());

-- =========================================================================
-- MATCHING: server-side function returning ranked interpreters for a request
-- =========================================================================
create or replace function match_interpreters_for_request(p_request_id uuid)
returns table (
  interpreter_id          uuid,
  full_name               text,
  distance_miles          numeric,
  within_service_radius   boolean,
  service_radius_miles    integer,
  languages               text[],
  modalities              text[],
  total_completed         integer,
  active_workload         integer,
  fit_score               numeric
)
language plpgsql stable security definer as $$
declare
  v_req requests%rowtype;
begin
  if not is_coordinator_or_admin() then
    raise exception 'permission denied';
  end if;

  select * into v_req from requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;

  return query
  with eligible as (
    select
      p.id   as interpreter_id,
      p.full_name,
      ip.service_radius_miles,
      ip.languages,
      ip.modalities,
      ip.total_completed,
      ip.home_location,
      (st_distance(ip.home_location, v_req.event_location) / 1609.344)::numeric(10,2) as distance_miles,
      (
        select count(*)::int from assignments a
        where a.interpreter_id = p.id
          and a.status in ('proposed','pending_admin_release','released','accepted')
      ) as active_workload
    from profiles p
    join interpreter_profiles ip on ip.profile_id = p.id
    where p.role = 'interpreter'
      and p.status = 'active'
      and ip.home_location is not null
      -- COI hard filter: requestor's blocklist
      and not exists (
        select 1 from coi_blocks b
        where b.requestor_id = v_req.requestor_id
          and b.interpreter_id = p.id
      )
      -- language overlap
      and ip.languages && v_req.languages_needed
      -- modality match
      and v_req.modality = any(ip.modalities)
  )
  select
    e.interpreter_id,
    e.full_name,
    e.distance_miles,
    (e.distance_miles <= e.service_radius_miles) as within_service_radius,
    e.service_radius_miles,
    e.languages,
    e.modalities,
    e.total_completed,
    e.active_workload,
    -- Fit score: lower distance is better, prior pro bono history adds weight,
    -- workload penalty, hard exclude if outside radius.
    case
      when e.distance_miles > e.service_radius_miles then 0
      else
        greatest(0,
          100
          - (e.distance_miles * 1.5)               -- distance penalty
          - (e.active_workload * 8)                -- workload penalty
          + least(15, e.total_completed * 1.5)     -- experience bonus, capped
        )
    end::numeric(6,2) as fit_score
  from eligible e
  order by within_service_radius desc, fit_score desc, distance_miles asc
  limit 50;
end;
$$;

-- =========================================================================
-- AUDIT: write helper (use from server actions)
-- =========================================================================
create or replace function write_audit(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_before jsonb,
  p_after jsonb,
  p_reason text
) returns void
language sql security definer as $$
  insert into audit_log(actor_id, action, target_table, target_id, before_json, after_json, reason)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_before, p_after, p_reason);
$$;

-- =========================================================================
-- AUDIT TRIGGERS — capture every change to high-value tables
-- =========================================================================
create or replace function audit_trigger() returns trigger as $$
declare
  v_action text;
  v_target_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  v_action := tg_table_name || '.' || lower(tg_op);
  if tg_op = 'DELETE' then
    v_target_id := (to_jsonb(old)->>'id')::uuid;
    v_before := to_jsonb(old);
    v_after  := null;
  elsif tg_op = 'UPDATE' then
    v_target_id := (to_jsonb(new)->>'id')::uuid;
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
  else
    v_target_id := (to_jsonb(new)->>'id')::uuid;
    v_before := null;
    v_after  := to_jsonb(new);
  end if;

  insert into audit_log(actor_id, action, target_table, target_id, before_json, after_json)
  values (auth.uid(), v_action, tg_table_name, v_target_id, v_before, v_after);

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger audit_profiles    after insert or update or delete on profiles
  for each row execute function audit_trigger();
create trigger audit_requests    after insert or update or delete on requests
  for each row execute function audit_trigger();
create trigger audit_assignments after insert or update or delete on assignments
  for each row execute function audit_trigger();
create trigger audit_coi_blocks  after insert or update or delete on coi_blocks
  for each row execute function audit_trigger();
create trigger audit_approvals   after insert or update or delete on approvals
  for each row execute function audit_trigger();
create trigger audit_communities after insert or update or delete on communities
  for each row execute function audit_trigger();

-- =========================================================================
-- SENSITIVE-REQUEST GUARD: any new assignment on a sensitive request must
-- start as pending_admin_release, regardless of who proposed it.
-- =========================================================================
create or replace function guard_sensitive_assignment() returns trigger as $$
declare
  v_sens request_sensitivity;
begin
  select sensitivity into v_sens from requests where id = new.request_id;
  if v_sens = 'sensitive' and new.status = 'proposed' then
    new.status := 'pending_admin_release';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger assignments_sensitive_guard
  before insert on assignments
  for each row execute function guard_sensitive_assignment();

-- =========================================================================
-- BOOTSTRAP: first admin (run manually with service-role)
-- See README → "Seeding the first admin"
-- =========================================================================
