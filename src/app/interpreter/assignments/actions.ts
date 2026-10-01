"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  sendWorkflowEmail,
  workflowRoleLabel,
} from "@/lib/workflow-notifications";

async function loadNotificationContext(assignmentId: string) {
  const service = createSupabaseServiceClient();
  const { data: assignment } = await service
    .from("assignments")
    .select("request_id,proposed_by,team_role")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return null;

  const [{ data: request }, { data: coordinator }] = await Promise.all([
    service
      .from("requests")
      .select("status,requestor_id")
      .eq("id", assignment.request_id)
      .maybeSingle(),
    service
      .from("profiles")
      .select("email")
      .eq("id", assignment.proposed_by)
      .maybeSingle(),
  ]);

  let requestorEmail: string | null = null;
  if (request?.requestor_id) {
    const { data: requestor } = await service
      .from("profiles")
      .select("email")
      .eq("id", request.requestor_id)
      .maybeSingle();
    requestorEmail = requestor?.email ?? null;
  }

  return {
    requestId: assignment.request_id as string,
    teamRole: assignment.team_role as string,
    requestStatus: request?.status as string | undefined,
    coordinatorEmail: coordinator?.email ?? null,
    requestorEmail,
  };
}

export async function acceptAssignmentAction(formData: FormData) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const id = String(formData.get("id") ?? "");

  if (!id) throw new Error("Missing assignment");

  const { data: assignment, error } = await supabase
    .from("assignments")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("interpreter_id", user.id)
    .eq("status", "released")
    .select("request_id")
    .single();

  if (error) throw new Error(error.message);

  const notification = await loadNotificationContext(id);

  if (notification?.requestStatus === "assigned") {
    const recipients = [
      notification.coordinatorEmail,
      notification.requestorEmail,
    ].filter((email): email is string => Boolean(email));

    if (recipients.length > 0) {
      await sendWorkflowEmail({
        to: recipients,
        subject: "Your CAccessRoots volunteer team is confirmed",
        heading: "The full volunteer team has confirmed",
        message:
          "The Advanced ITP Student and Mentor Interpreter have both confirmed their availability. Sign in to review the request and assigned team.",
        actionLabel: "View request status",
        actionPath: "/dashboard",
      });
    }
  } else if (notification?.coordinatorEmail) {
    await sendWorkflowEmail({
      to: notification.coordinatorEmail,
      subject: `${workflowRoleLabel(notification.teamRole)} accepted a CAccessRoots invitation`,
      heading: "One team member has confirmed",
      message: `The ${workflowRoleLabel(notification.teamRole)} accepted the invitation. The request will be fully assigned after both team members confirm.`,
      actionLabel: "Review the request",
      actionPath: `/coordinator/requests/${notification.requestId}`,
    });
  }

  if (assignment?.request_id) {
    // The database trigger updates the request to Assigned.
    revalidatePath(
      `/coordinator/requests/${assignment.request_id}`
    );
  }

  revalidatePath("/interpreter/assignments");
  revalidatePath("/requestor/requests");
  revalidatePath("/coordinator");
}

export async function declineAssignmentAction(formData: FormData) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const id = String(formData.get("id") ?? "");

  if (!id) throw new Error("Missing assignment");

  const decline_reason =
    String(formData.get("decline_reason") ?? "").trim() || null;

  const { data: assignment, error } = await supabase
    .from("assignments")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason,
    })
    .eq("id", id)
    .eq("interpreter_id", user.id)
    .eq("status", "released")
    .select("request_id")
    .single();

  if (error) throw new Error(error.message);

  const notification = await loadNotificationContext(id);
  if (notification?.coordinatorEmail) {
    await sendWorkflowEmail({
      to: notification.coordinatorEmail,
      subject: `${workflowRoleLabel(notification.teamRole)} declined a CAccessRoots invitation`,
      heading: "A team slot needs a replacement",
      message: `The ${workflowRoleLabel(notification.teamRole)} is not available. The slot has returned to the coordinator for a new invitation.`,
      actionLabel: "Choose a replacement",
      actionPath: `/coordinator/requests/${notification.requestId}`,
    });
  }

  if (assignment?.request_id) {
    // The database trigger returns the request to Open.
    revalidatePath(
      `/coordinator/requests/${assignment.request_id}`
    );
  }

  revalidatePath("/interpreter/assignments");
  revalidatePath("/requestor/requests");
  revalidatePath("/coordinator");
}

export async function withdrawAssignmentAction(formData: FormData) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const id = String(formData.get("id") ?? "");

  if (!id) throw new Error("Missing assignment");

  const decline_reason =
    String(formData.get("decline_reason") ?? "").trim() || null;

  const { data: assignment, error } = await supabase
    .from("assignments")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason,
    })
    .eq("id", id)
    .eq("interpreter_id", user.id)
    .eq("status", "accepted")
    .select("request_id")
    .single();

  if (error) throw new Error(error.message);

  const notification = await loadNotificationContext(id);
  if (notification?.coordinatorEmail) {
    await sendWorkflowEmail({
      to: notification.coordinatorEmail,
      subject: `${workflowRoleLabel(notification.teamRole)} withdrew from a CAccessRoots assignment`,
      heading: "An accepted team member can no longer attend",
      message: `The ${workflowRoleLabel(notification.teamRole)} withdrew after accepting. The slot has returned to the coordinator for replacement coverage.`,
      actionLabel: "Arrange replacement coverage",
      actionPath: `/coordinator/requests/${notification.requestId}`,
    });
  }

  if (assignment?.request_id) {
    // The database trigger returns the request to Open.
    revalidatePath(
      `/coordinator/requests/${assignment.request_id}`
    );
  }

  revalidatePath("/interpreter/assignments");
  revalidatePath("/requestor/requests");
  revalidatePath("/coordinator");
}
