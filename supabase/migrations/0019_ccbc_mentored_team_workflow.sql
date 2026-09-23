begin;

-- Every request is staffed by two distinct roles: an advanced ITP student
-- and an experienced interpreter serving as mentor.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'assignment_role'
      and n.nspname = 'public'
  ) then
    create type public.assignment_role as enum ('student', 'mentor');
  end if;
end
$$;

alter table public.assignments
  add column if not exists team_role public.assignment_role;

-- Preserve historical assignments and infer their new team role from the
-- interpreter profile whenever possible.
update public.assignments a
set team_role = 'student'::public.assignment_role
from public.interpreter_profiles ip
where a.interpreter_id = ip.profile_id
  and coalesce(ip.is_advanced_itp_student, false) = true
  and a.team_role is null;

update public.assignments
set team_role = 'mentor'::public.assignment_role
where team_role is null;

alter table public.assignments
  alter column team_role set default 'mentor'::public.assignment_role,
  alter column team_role set not null;

drop index if exists public.assignments_one_active_per_request;

create unique index if not exists assignments_one_active_per_team_role
  on public.assignments(request_id, team_role)
  where status in (
    'proposed'::public.assignment_status,
    'pending_admin_release'::public.assignment_status,
    'released'::public.assignment_status,
    'accepted'::public.assignment_status
  );

create unique index if not exists assignments_one_active_role_per_interpreter
  on public.assignments(request_id, interpreter_id)
  where status in (
    'proposed'::public.assignment_status,
    'pending_admin_release'::public.assignment_status,
    'released'::public.assignment_status,
    'accepted'::public.assignment_status
  );

alter table public.interpreter_profiles
  add column if not exists professional_profile_url text;

-- Normalize the legacy checkbox fields into mutually exclusive participation
-- paths. Profiles with no prior choice remain unclassified and must choose a
-- path the next time they save their profile.
update public.interpreter_profiles
set
  willing_to_mentor = false,
  willing_to_work_with_students = false
where coalesce(is_advanced_itp_student, false) = true;

update public.interpreter_profiles
set
  willing_to_mentor = true,
  willing_to_work_with_students = true
where coalesce(is_advanced_itp_student, false) = false
  and (
    coalesce(willing_to_mentor, false) = true
    or coalesce(willing_to_work_with_students, false) = true
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'interpreter_profiles_participation_path_check'
      and conrelid = 'public.interpreter_profiles'::regclass
  ) then
    alter table public.interpreter_profiles
      add constraint interpreter_profiles_participation_path_check
      check (
        (
          coalesce(is_advanced_itp_student, false) = true
          and coalesce(willing_to_mentor, false) = false
          and coalesce(willing_to_work_with_students, false) = false
        )
        or (
          coalesce(is_advanced_itp_student, false) = false
          and coalesce(willing_to_mentor, false) = true
          and coalesce(willing_to_work_with_students, false) = true
        )
        or (
          coalesce(is_advanced_itp_student, false) = false
          and coalesce(willing_to_mentor, false) = false
          and coalesce(willing_to_work_with_students, false) = false
        )
      );
  end if;
end
$$;

-- Retire new introduction-video uploads to avoid unnecessary storage growth.
-- Existing private objects are preserved so nothing is destructively deleted.
drop policy if exists "interpreter video owner upload" on storage.objects;
drop policy if exists "interpreter video owner update" on storage.objects;

alter table public.requestor_profiles
  add column if not exists community_commitment_signed_at timestamptz,
  add column if not exists community_commitment_version text;

alter table public.requests
  alter column student_interpreter_allowed set default true;

update public.requests
set student_interpreter_allowed = true
where student_interpreter_allowed is distinct from true;

-- New accounts accept the community commitment during sign-up. Create the
-- role-specific profile row at the same time so the agreement is durable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  commitment_signed_at timestamptz;
  interpreter_path text;
begin
  requested_role :=
    case new.raw_user_meta_data ->> 'role'
      when 'interpreter' then 'interpreter'::public.user_role
      else 'requestor'::public.user_role
    end;

  commitment_signed_at :=
    case
      when lower(coalesce(
        new.raw_user_meta_data ->> 'community_commitment_accepted',
        ''
      )) in ('true', '1', 'yes', 'on') then now()
      else null
    end;

  interpreter_path :=
    case new.raw_user_meta_data ->> 'interpreter_path'
      when 'student' then 'student'
      when 'mentor' then 'mentor'
      else null
    end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'New user'), '@', 1)
    ),
    requested_role,
    case
      when requested_role = 'requestor'::public.user_role
        then 'active'::public.user_status
      else 'pending'::public.user_status
    end
  );

  if requested_role = 'interpreter'::public.user_role then
    insert into public.interpreter_profiles (
      profile_id,
      pro_bono_signed_at,
      is_advanced_itp_student,
      willing_to_mentor,
      willing_to_work_with_students
    )
    values (
      new.id,
      commitment_signed_at,
      coalesce(interpreter_path = 'student', false),
      coalesce(interpreter_path = 'mentor', false),
      coalesce(interpreter_path = 'mentor', false)
    )
    on conflict (profile_id) do nothing;
  else
    insert into public.requestor_profiles (
      profile_id,
      community_commitment_signed_at,
      community_commitment_version
    )
    values (
      new.id,
      commitment_signed_at,
      case when commitment_signed_at is not null then '2026-09' else null end
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- Recompute the request state from both team slots after any assignment
-- change. A request is assigned only when both people have accepted.
create or replace function public.sync_request_team_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_student_accepted boolean;
  v_mentor_accepted boolean;
  v_has_released boolean;
begin
  if tg_op = 'DELETE' then
    v_request_id := old.request_id;
  else
    v_request_id := new.request_id;
  end if;

  select
    coalesce(bool_or(
      a.team_role = 'student'::public.assignment_role
      and a.status = 'accepted'::public.assignment_status
    ), false),
    coalesce(bool_or(
      a.team_role = 'mentor'::public.assignment_role
      and a.status = 'accepted'::public.assignment_status
    ), false),
    coalesce(bool_or(
      a.status = 'released'::public.assignment_status
    ), false)
  into
    v_student_accepted,
    v_mentor_accepted,
    v_has_released
  from public.assignments a
  where a.request_id = v_request_id;

  update public.requests
  set
    status = case
      when v_student_accepted and v_mentor_accepted
        then 'assigned'::public.request_status
      when v_has_released
        then 'pending_acceptance'::public.request_status
      else 'open'::public.request_status
    end,
    updated_at = now()
  where id = v_request_id
    and status not in (
      'pending_review'::public.request_status,
      'completed'::public.request_status,
      'cancelled'::public.request_status
    );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists assignments_sync_request_status
  on public.assignments;
drop trigger if exists assignments_sync_request_team_status
  on public.assignments;

create trigger assignments_sync_request_team_status
after insert or update of status, team_role or delete
on public.assignments
for each row
execute function public.sync_request_team_status();

revoke all on function public.sync_request_team_status() from public;

-- Move any in-flight legacy proposal to the new interpreter-first gate. The
-- requester no longer has to approve the name before the invitation is sent.
update public.assignments
set
  status = 'released'::public.assignment_status,
  released_at = coalesce(released_at, now())
where status = 'proposed'::public.assignment_status;

-- Previously assigned single-interpreter requests need their second team
-- member. Keep the accepted person attached and return the request to the
-- coordinator to fill the open role.
update public.requests r
set
  status = 'open'::public.request_status,
  updated_at = now()
where r.status = 'assigned'::public.request_status
  and not (
    exists (
      select 1 from public.assignments a
      where a.request_id = r.id
        and a.team_role = 'student'::public.assignment_role
        and a.status = 'accepted'::public.assignment_status
    )
    and exists (
      select 1 from public.assignments a
      where a.request_id = r.id
        and a.team_role = 'mentor'::public.assignment_role
        and a.status = 'accepted'::public.assignment_status
    )
  );

-- Availability, distance, language, modality, and COI remain hard filters.
-- Student/mentor role is selected by the coordinator from profile details.
create or replace function public.match_interpreters_for_request(
  p_request_id uuid
)
returns table(
  interpreter_id uuid,
  full_name text,
  distance_miles numeric,
  within_service_radius boolean,
  service_radius_miles integer,
  languages text[],
  modalities text[],
  total_completed integer,
  active_workload integer,
  fit_score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_req public.requests%rowtype;
begin
  if not public.is_coordinator_or_admin() then
    raise exception 'permission denied';
  end if;

  select * into v_req
  from public.requests
  where id = p_request_id;

  if not found then
    raise exception 'request not found';
  end if;

  return query
  with eligible as (
    select
      p.id as interpreter_id,
      p.full_name,
      ip.service_radius_miles,
      ip.languages,
      ip.modalities,
      ip.total_completed,
      ip.home_location,
      (
        st_distance(ip.home_location, v_req.event_location) / 1609.344
      )::numeric(10,2) as distance_miles,
      (
        select count(*)::int
        from public.assignments a
        where a.interpreter_id = p.id
          and a.status in (
            'proposed'::public.assignment_status,
            'pending_admin_release'::public.assignment_status,
            'released'::public.assignment_status,
            'accepted'::public.assignment_status
          )
      ) as active_workload
    from public.profiles p
    join public.interpreter_profiles ip on ip.profile_id = p.id
    where p.role = 'interpreter'::public.user_role
      and p.status = 'active'::public.user_status
      and ip.home_location is not null
      and coalesce(ip.accepting_requests, true) = true
      and (
        ip.unavailable_until is null
        or ip.unavailable_until < v_req.event_start::date
      )
      and not exists (
        select 1
        from public.coi_blocks b
        where b.requestor_id = v_req.requestor_id
          and b.interpreter_id = p.id
      )
      and ip.languages && v_req.languages_needed
      and v_req.modality = any(ip.modalities)
  )
  select
    e.interpreter_id,
    e.full_name,
    e.distance_miles,
    (e.distance_miles <= e.service_radius_miles),
    e.service_radius_miles,
    e.languages,
    e.modalities,
    e.total_completed,
    e.active_workload,
    case
      when e.distance_miles > e.service_radius_miles then 0
      else greatest(
        0,
        100
        - (e.distance_miles * 1.5)
        - (e.active_workload * 8)
        + least(15, e.total_completed * 1.5)
      )
    end::numeric(6,2)
  from eligible e
  order by
    (e.distance_miles <= e.service_radius_miles) desc,
    fit_score desc,
    e.distance_miles asc
  limit 50;
end;
$$;

-- Requesters observe the final coordinator-assigned team only after both
-- people confirm. They no longer approve or reject individual interpreters.
drop function if exists public.respond_to_assignment_proposal(uuid, boolean);
drop function if exists public.requestor_assignment_proposals();
drop function if exists public.requestor_assignment_team();

create function public.requestor_assignment_team()
returns table (
  assignment_id uuid,
  request_id uuid,
  team_role public.assignment_role,
  assignment_status public.assignment_status,
  interpreter_id uuid,
  interpreter_name text,
  interpreter_credentials text,
  interpreter_is_certified boolean,
  interpreter_certifications text[],
  interpreter_specialties text[],
  interpreter_experience_band text,
  interpreter_profile_photo_path text,
  interpreter_professional_profile_url text,
  interpreter_is_advanced_itp_student boolean,
  interpreter_college_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.request_id,
    a.team_role,
    a.status,
    a.interpreter_id,
    p.full_name,
    ip.credentials,
    ip.is_certified,
    ip.certifications,
    ip.specialties,
    ip.experience_band,
    ip.profile_photo_path,
    ip.professional_profile_url,
    coalesce(ip.is_advanced_itp_student, false),
    ip.college_name
  from public.assignments a
  join public.requests r on r.id = a.request_id
  join public.profiles p on p.id = a.interpreter_id
  left join public.interpreter_profiles ip on ip.profile_id = a.interpreter_id
  where r.requestor_id = auth.uid()
    and r.status in (
      'assigned'::public.request_status,
      'completed'::public.request_status
    )
    and a.status in (
      'accepted'::public.assignment_status,
      'completed'::public.assignment_status
    );
$$;

revoke all on function public.requestor_assignment_team() from public;
grant execute on function public.requestor_assignment_team() to authenticated;

commit;
