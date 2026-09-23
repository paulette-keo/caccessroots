"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVE_ASSIGNMENT_STATUSES = [
  "proposed",
  "pending_admin_release",
  "released",
  "accepted",
];

export async function inviteTeamMemberAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const requestId = String(formData.get("request_id") ?? "");
  const interpreterId = String(formData.get("interpreter_id") ?? "");
  const teamRole = String(formData.get("team_role") ?? "");

  if (!requestId || !interpreterId) {
    throw new Error("Missing request or interpreter");
  }
  if (teamRole !== "student" && teamRole !== "mentor") {
    throw new Error("Select a valid team role");
  }

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (requestError) throw new Error(requestError.message);
  if (!["open", "pending_acceptance"].includes(request.status)) {
    throw new Error("This request is not available for team matching");
  }

  const { data: interpreter, error: interpreterError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", interpreterId)
    .single();
  if (interpreterError) throw new Error(interpreterError.message);
  const requiredAccountRole =
    teamRole === "student"
      ? "student_interpreter"
      : "mentor_interpreter";

  if (
    ![
      requiredAccountRole,
      "interpreter",
    ].includes(interpreter.role) ||
    interpreter.status !== "active"
  ) {
    throw new Error(
      `Only an active ${teamRole} interpreter account can fill this role`
    );
  }

  const { data: interpreterProfile, error: profileError } = await supabase
    .from("interpreter_profiles")
    .select("is_advanced_itp_student,willing_to_mentor")
    .eq("profile_id", interpreterId)
    .single();
  if (profileError) throw new Error(profileError.message);

  if (teamRole === "student" && !interpreterProfile.is_advanced_itp_student) {
    throw new Error("Only an Advanced ITP student can fill the student role");
  }
  if (teamRole === "mentor" && !interpreterProfile.willing_to_mentor) {
    throw new Error("This interpreter has not opted in to mentoring");
  }

  const { data: occupiedSlot, error: occupiedError } = await supabase
    .from("assignments")
    .select("id")
    .eq("request_id", requestId)
    .eq("team_role", teamRole)
    .in("status", ACTIVE_ASSIGNMENT_STATUSES)
    .limit(1)
    .maybeSingle();
  if (occupiedError) throw new Error(occupiedError.message);
  if (occupiedSlot) {
    throw new Error(`The ${teamRole} slot is already filled or awaiting a response`);
  }

  const { data: activeForInterpreter, error: activeInterpreterError } =
    await supabase
      .from("assignments")
      .select("id")
      .eq("request_id", requestId)
      .eq("interpreter_id", interpreterId)
      .in("status", ACTIVE_ASSIGNMENT_STATUSES)
      .limit(1)
      .maybeSingle();
  if (activeInterpreterError) throw new Error(activeInterpreterError.message);
  if (activeForInterpreter) {
    throw new Error("The same person cannot fill both team roles");
  }

  const { data: previousAssignment, error: previousError } = await supabase
    .from("assignments")
    .select("id")
    .eq("request_id", requestId)
    .eq("interpreter_id", interpreterId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) throw new Error(previousError.message);

  const assignmentValues = {
    team_role: teamRole,
    status: "released",
    proposed_by: user.id,
    released_by: user.id,
    released_at: new Date().toISOString(),
    accepted_at: null,
    declined_at: null,
    decline_reason: null,
    completed_at: null,
  };

  const { error: saveError } = previousAssignment
    ? await supabase
        .from("assignments")
        .update(assignmentValues)
        .eq("id", previousAssignment.id)
    : await supabase.from("assignments").insert({
        request_id: requestId,
        interpreter_id: interpreterId,
        ...assignmentValues,
      });
  if (saveError) throw new Error(saveError.message);

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/requests/${requestId}`);
  revalidatePath("/interpreter/assignments");
  revalidatePath("/requestor/requests");
  redirect(`/coordinator/requests/${requestId}`);
}
