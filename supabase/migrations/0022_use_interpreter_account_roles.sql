-- Make Student Interpreter and Mentor Interpreter true account roles.
-- The legacy interpreter enum value remains for PostgreSQL compatibility, but
-- new accounts no longer use it. Existing accounts remain compatible until
-- migration 0023 performs the final conversion after deployment.

begin;

create or replace function public.current_user_is_interpreter()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in (
        'student_interpreter'::public.user_role,
        'mentor_interpreter'::public.user_role,
        'interpreter'::public.user_role
      )
  );
$$;

revoke all on function public.current_user_is_interpreter() from public;
grant execute on function public.current_user_is_interpreter()
  to authenticated;

-- New signups provide their exact role. Legacy metadata remains supported so
-- a signup already in progress is not lost during deployment.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  commitment_signed_at timestamptz;
begin
  requested_role :=
    case new.raw_user_meta_data ->> 'role'
      when 'student_interpreter'
        then 'student_interpreter'::public.user_role
      when 'mentor_interpreter'
        then 'mentor_interpreter'::public.user_role
      when 'interpreter' then
        case new.raw_user_meta_data ->> 'interpreter_path'
          when 'student' then 'student_interpreter'::public.user_role
          else 'mentor_interpreter'::public.user_role
        end
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

  if requested_role in (
    'student_interpreter'::public.user_role,
    'mentor_interpreter'::public.user_role
  ) then
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
      requested_role = 'student_interpreter'::public.user_role,
      requested_role = 'mentor_interpreter'::public.user_role,
      requested_role = 'mentor_interpreter'::public.user_role
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

-- Both account types use the existing interpreter onboarding approval queue.
create or replace function public.profile_onboarding_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'::public.user_status
    and new.role <> 'requestor'::public.user_role
  then
    insert into public.approvals (
      kind,
      target_table,
      target_id,
      requested_by,
      context
    )
    values (
      case
        when new.role in (
          'student_interpreter'::public.user_role,
          'mentor_interpreter'::public.user_role,
          'interpreter'::public.user_role
        ) then 'interpreter_onboarding'::public.approval_kind
        else 'role_escalation'::public.approval_kind
      end,
      'profiles',
      new.id,
      new.id,
      jsonb_build_object(
        'full_name', new.full_name,
        'email', new.email,
        'role', new.role
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.map_interpreters()
returns table (
  profile_id uuid,
  full_name text,
  service_radius_miles integer,
  languages text[],
  lng double precision,
  lat double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    ip.service_radius_miles,
    ip.languages,
    st_x(ip.home_location::geometry) as lng,
    st_y(ip.home_location::geometry) as lat
  from public.profiles p
  join public.interpreter_profiles ip on ip.profile_id = p.id
  where public.is_coordinator_or_admin()
    and p.role in (
      'student_interpreter'::public.user_role,
      'mentor_interpreter'::public.user_role,
      'interpreter'::public.user_role
    )
    and p.status = 'active'::public.user_status
    and ip.home_location is not null;
$$;

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
    where p.role in (
        'student_interpreter'::public.user_role,
        'mentor_interpreter'::public.user_role,
        'interpreter'::public.user_role
      )
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

create or replace function public.add_requestor_block_by_email(
  p_interpreter_email text,
  p_reason text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_requestor_id uuid := auth.uid();
  v_interpreter_id uuid;
  v_block_id uuid;
begin
  if v_requestor_id is null
    or not public.current_role_is('requestor'::public.user_role)
  then
    raise exception using
      errcode = '42501',
      message = 'permission denied';
  end if;

  select p.id
  into v_interpreter_id
  from public.profiles p
  where lower(p.email) = lower(trim(p_interpreter_email))
    and p.role in (
      'student_interpreter'::public.user_role,
      'mentor_interpreter'::public.user_role,
      'interpreter'::public.user_role
    );

  if v_interpreter_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'interpreter not found';
  end if;

  insert into public.coi_blocks (
    requestor_id,
    interpreter_id,
    reason
  )
  values (
    v_requestor_id,
    v_interpreter_id,
    nullif(trim(p_reason), '')
  )
  on conflict (requestor_id, interpreter_id) do nothing
  returning id into v_block_id;

  if v_block_id is null then
    select b.id
    into v_block_id
    from public.coi_blocks b
    where b.requestor_id = v_requestor_id
      and b.interpreter_id = v_interpreter_id;
  end if;

  return v_block_id;
end;
$$;

drop policy if exists "requests interpreter visible"
  on public.requests;

create policy "requests interpreter visible"
  on public.requests
  for select
  to authenticated
  using (
    public.current_user_is_interpreter()
    and public.interpreter_can_view_request(id)
  );

-- Storage ownership continues to be restricted to the signed-in account, now
-- authorized through either interpreter role.
drop policy if exists "interpreter photo owner upload"
  on storage.objects;
create policy "interpreter photo owner upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'interpreter-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

drop policy if exists "interpreter photo owner update"
  on storage.objects;
create policy "interpreter photo owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'interpreter-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  )
  with check (
    bucket_id = 'interpreter-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

drop policy if exists "interpreter photo owner delete"
  on storage.objects;
create policy "interpreter photo owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'interpreter-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

drop policy if exists "interpreter video owner upload"
  on storage.objects;
create policy "interpreter video owner upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'interpreter-intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

drop policy if exists "interpreter video owner update"
  on storage.objects;
create policy "interpreter video owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'interpreter-intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  )
  with check (
    bucket_id = 'interpreter-intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

drop policy if exists "interpreter video owner delete"
  on storage.objects;
create policy "interpreter video owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'interpreter-intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_is_interpreter()
  );

commit;
