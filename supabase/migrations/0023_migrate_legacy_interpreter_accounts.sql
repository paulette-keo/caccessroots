-- Run after the compatible website release is live. Convert every remaining
-- legacy interpreter account to its permanent Student or Mentor role.

begin;

update public.profiles p
set role = case
  when coalesce(ip.is_advanced_itp_student, false)
    then 'student_interpreter'::public.user_role
  else 'mentor_interpreter'::public.user_role
end
from public.interpreter_profiles ip
where ip.profile_id = p.id
  and p.role = 'interpreter'::public.user_role;

update public.interpreter_profiles ip
set
  is_advanced_itp_student = true,
  willing_to_mentor = false,
  willing_to_work_with_students = false
from public.profiles p
where p.id = ip.profile_id
  and p.role = 'student_interpreter'::public.user_role;

update public.interpreter_profiles ip
set
  is_advanced_itp_student = false,
  willing_to_mentor = true,
  willing_to_work_with_students = true
from public.profiles p
where p.id = ip.profile_id
  and p.role = 'mentor_interpreter'::public.user_role;

commit;
