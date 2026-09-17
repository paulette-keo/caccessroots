"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveRequestorProfileAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const agreed = formData.get("accept_community_commitment") === "on";
  if (!agreed) {
    throw new Error("Accept the community commitments to save your profile");
  }

  const contactPreference = String(
    formData.get("contact_preference") ?? "email"
  );
  if (!["email", "sms", "videophone"].includes(contactPreference)) {
    throw new Error("Select a valid contact preference");
  }

  const { error } = await supabase.from("requestor_profiles").upsert(
    {
      profile_id: user.id,
      contact_preference: contactPreference,
      community_commitment_signed_at: new Date().toISOString(),
      community_commitment_version: "2026-09",
    },
    { onConflict: "profile_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/requestor/profile");
  revalidatePath("/requestor/new-request");
  redirect("/requestor/profile?saved=1");
}
