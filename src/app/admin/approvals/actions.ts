"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
