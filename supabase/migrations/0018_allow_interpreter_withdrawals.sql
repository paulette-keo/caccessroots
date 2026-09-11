begin;

drop policy if exists "assignments interpreter respond"
  on public.assignments;

create policy "assignments interpreter respond"
  on public.assignments for update
  using (
    interpreter_id = auth.uid()
    and status in (
      'released'::public.assignment_status,
      'accepted'::public.assignment_status
    )
  )
  with check (
    interpreter_id = auth.uid()
    and status in (
      'accepted'::public.assignment_status,
      'declined'::public.assignment_status
    )
  );

commit;
