-- PostgreSQL requires new enum values to be committed before they can be used
-- by later data updates, functions, or policies. Keep this migration separate
-- from 0022.

alter type public.user_role
  add value if not exists 'student_interpreter';

alter type public.user_role
  add value if not exists 'mentor_interpreter';
