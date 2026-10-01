"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { sendWorkflowEmail } from "@/lib/workflow-notifications";

// Decide an approval. `slot` is 'first' or 'second' (for two-key items).
export async function decideApprovalAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as "approved" | "rejected";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  // Load the approval
  const { data: approval, error: loadErr } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", id)
    .single();
  if (loadErr || !approval) throw new Error("Approval not found");

  const isFirst = approval.first_decision === "pending";
  const updates: Record<string, unknown> = {};
  if (isFirst) {
    updates.first_decision = decision;
    updates.first_decided_by = user.id;
    updates.first_decided_at = new Date().toISOString();
    updates.first_reason = reason;
  } else {
    if (approval.first_decided_by === user.id) {
      throw new Error("A different admin must give the second key");
    }
    updates.second_decision = decision;
    updates.second_decided_by = user.id;
    updates.second_decided_at = new Date().toISOString();
    updates.second_reason = reason;
  }

  // Compute final decision
  let final: "pending" | "approved" | "rejected" = "pending";
  if (decision === "rejected") final = "rejected";
  else if (!approval.requires_two_keys) final = "approved";
  else if (!isFirst) final = "approved"; // second key just landed
  // else still pending awaiting second

  updates.final_decision = final;

  const { error: updErr } = await supabase
    .from("approvals")
    .update(updates)
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);

  // Side effects when fully approved/rejected
  if (final === "approved") {
    await applyApprovalSideEffect(supabase, { ...approval, ...updates }, user.id);
  } else if (final === "rejected") {
    await applyRejectionSideEffect(supabase, approval);
  }

  if (final !== "pending") {
    await notifyApprovalOutcome(approval, final);
  }

  // Audit
  await supabase.rpc("write_audit", {
    p_action: `approval.${decision}.${isFirst ? "first" : "second"}`,
    p_target_table: "approvals",
    p_target_id: id,
    p_before: approval,
    p_after: { ...approval, ...updates },
    p_reason: reason,
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

async function notifyApprovalOutcome(
  approval: any,
  decision: "approved" | "rejected"
) {
  const service = createSupabaseServiceClient();
  let recipientEmail: string | null = null;
  let subject = "CAccessRoots review decision";
  let heading =
    decision === "approved" ? "Your review was approved" : "Your review was closed";
  let message =
    decision === "approved"
      ? "The review is complete and the next step is available in your CAccessRoots account."
      : "The review is complete and the item will not move forward. Sign in to review its current status.";
  let actionPath = "/dashboard";

  if (
    approval.kind === "interpreter_onboarding" ||
    approval.kind === "reinstatement" ||
    approval.kind === "role_escalation"
  ) {
    const profileId = approval.context?.profile_id || approval.target_id;
    const { data: profile } = await service
      .from("profiles")
      .select("email")
      .eq("id", profileId)
      .maybeSingle();
    recipientEmail = profile?.email ?? null;
    subject =
      decision === "approved"
        ? "Your CAccessRoots volunteer account is approved"
        : "Your CAccessRoots volunteer account review is complete";
    heading =
      decision === "approved"
        ? "Your volunteer account is active"
        : "Your volunteer account was not approved";
    message =
      decision === "approved"
        ? "You can now sign in, complete your profile, and receive Student or Mentor invitations."
        : "Your account review is complete and the account was not activated. Please contact the program team if you have questions.";
    actionPath = "/sign-in";
  } else if (approval.kind === "request_review") {
    const { data: request } = await service
      .from("requests")
      .select("requestor_id")
      .eq("id", approval.target_id)
      .maybeSingle();
    if (request?.requestor_id) {
      const { data: requestor } = await service
        .from("profiles")
        .select("email")
        .eq("id", request.requestor_id)
        .maybeSingle();
      recipientEmail = requestor?.email ?? null;
    }
    subject =
      decision === "approved"
        ? "Your CAccessRoots request is ready for matching"
        : "Your CAccessRoots request review is complete";
    heading =
      decision === "approved"
        ? "Your request was approved"
        : "Your request was closed after review";
    message =
      decision === "approved"
        ? "A coordinator can now begin inviting an Advanced ITP Student and Mentor Interpreter. Coverage is not guaranteed until both team members confirm."
        : "The request will not move forward to volunteer matching. Sign in to review its status.";
    actionPath = "/requestor/requests";
  }

  if (!recipientEmail) return;

  await sendWorkflowEmail({
    to: recipientEmail,
    subject,
    heading,
    message,
    actionLabel: "Open CAccessRoots",
    actionPath,
  });
}

async function applyApprovalSideEffect(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  approval: any,
  approverId: string
) {
  switch (approval.kind) {
    case "interpreter_onboarding":
    case "community_onboarding":
    case "reinstatement":
      if (approval.target_table === "profiles") {
        await supabase.from("profiles").update({ status: "active" }).eq("id", approval.target_id);
      } else if (approval.target_table === "communities") {
        await supabase.from("communities").update({ status: "active" }).eq("id", approval.target_id);
      }
      break;
    case "role_escalation":
      // context: { profile_id, new_role }
      if (approval.context?.profile_id && approval.context?.new_role) {
        await supabase
          .from("profiles")
          .update({ role: approval.context.new_role, status: "active" })
          .eq("id", approval.context.profile_id);
      }
      break;
    case "sensitive_assignment":
      // Legacy sensitive-assignment approvals release the invitation directly
      // to the interpreter. New requests are reviewed before team matching.
      if (approval.context?.request_id && approval.context?.interpreter_id) {
        await supabase
          .from("assignments")
          .update({
            status: "released",
            released_by: approverId,
            released_at: new Date().toISOString(),
          })
          .eq("request_id", approval.context.request_id)
          .eq("interpreter_id", approval.context.interpreter_id)
          .eq("status", "pending_admin_release");
        await supabase
          .from("requests")
          .update({ status: "pending_acceptance" })
          .eq("id", approval.context.request_id);
      }
      break;
    case "request_review":
      if (approval.target_table === "requests") {
        await supabase
          .from("requests")
          .update({ status: "open" })
          .eq("id", approval.target_id)
          .eq("status", "pending_review");
      }
      break;
    case "blocklist_edit":
      // No automated side effect — admin will perform edit manually with logged reason.
      break;
  }
}

async function applyRejectionSideEffect(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  approval: any
) {
  if (approval.kind === "sensitive_assignment" && approval.context?.request_id) {
    await supabase
      .from("assignments")
      .update({ status: "cancelled" })
      .eq("request_id", approval.context.request_id)
      .eq("status", "pending_admin_release");
    await supabase.from("requests").update({ status: "open" }).eq("id", approval.context.request_id);
  } else if (approval.kind === "request_review") {
    await supabase
      .from("requests")
      .update({ status: "cancelled" })
      .eq("id", approval.target_id)
      .eq("status", "pending_review");
  }
}
