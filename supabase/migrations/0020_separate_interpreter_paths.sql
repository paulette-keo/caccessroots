-- Separate interpreter participation into mutually exclusive student and mentor
-- paths for existing projects that already applied migration 0019.

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
