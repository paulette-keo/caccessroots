"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { INTERPRETER_PHOTO_BUCKET } from "@/lib/interpreter-photos";
import { isInterpreterRole } from "@/lib/types";

const EXPERIENCE_BANDS = new Set([
  "less_than_2",
  "2_to_5",
  "6_to_10",
  "11_plus",
]);

const AVAILABLE_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const TIME_BLOCKS = new Set([
  "morning",
  "afternoon",
  "evening",
]);

function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAllowedSelections(
  formData: FormData,
  name: string,
  allowedValues: ReadonlySet<string>,
  label: string
) {
  const values = formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (
    values.some(
      (value) => !allowedValues.has(value)
    )
  ) {
    throw new Error(
      `Select valid ${label.toLowerCase()}.`
    );
  }

  return Array.from(new Set(values));
}

function parseOwnedMediaPath(
  value: FormDataEntryValue | null,
  userId: string,
  label: string
) {
  const path = String(value ?? "").trim();

  if (!path) {
    return null;
  }

  if (
    !path.startsWith(`${userId}/`) ||
    path.includes("..")
  ) {
    throw new Error(`${label} path is invalid.`);
  }

  return path;
}

export async function saveInterpreterProfileAction(
  formData: FormData
) {
  const supabase =
    createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: account, error: accountError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (!isInterpreterRole(account.role)) {
    throw new Error("This account does not have an interpreter role.");
  }

  const { data: existingRoleProfile, error: existingRoleError } =
    await supabase
      .from("interpreter_profiles")
      .select("is_advanced_itp_student")
      .eq("profile_id", user.id)
      .maybeSingle();

  if (existingRoleError) {
    throw new Error(existingRoleError.message);
  }

  const home_address = String(
    formData.get("home_address") ?? ""
  ).trim();

  const service_radius_miles = Number(
    formData.get("service_radius_miles") ?? 25
  );

  const languages = parseList(
    formData.get("languages")
  );

  const modalities = (
    formData.getAll("modalities") as string[]
  ).filter(Boolean);

  const submittedCredentials =
    String(
      formData.get("credentials") ?? ""
    ).trim() || null;

  const certificationAnswer = String(
    formData.get("is_certified") ?? ""
  );

  const is_certified =
    certificationAnswer === "yes"
      ? true
      : certificationAnswer === "no"
        ? false
        : null;

  const submittedCertifications = parseList(
    formData.get("certifications")
  );

  const credentials = is_certified === true ? submittedCredentials : null;
  const certifications = is_certified === true ? submittedCertifications : [];

  const licenses = parseList(
    formData.get("licenses")
  );

  const specialties = parseList(
    formData.get("specialties")
  );

  const rawExperienceBand = String(
    formData.get("experience_band") ?? ""
  );

  const experience_band =
    rawExperienceBand || null;

  if (
    experience_band &&
    !EXPERIENCE_BANDS.has(experience_band)
  ) {
    throw new Error(
      "Select a valid experience level."
    );
  }

  const is_advanced_itp_student =
    account.role === "student_interpreter" ||
    (account.role === "interpreter" &&
      existingRoleProfile?.is_advanced_itp_student === true);
  const willing_to_mentor =
    account.role === "mentor_interpreter" ||
    (account.role === "interpreter" &&
      !is_advanced_itp_student);
  const willing_to_work_with_students =
    willing_to_mentor;

  const college_name = is_advanced_itp_student
    ? String(
        formData.get("college_name") ?? ""
      ).trim() || null
    : null;

  if (
    is_advanced_itp_student &&
    !college_name
  ) {
    throw new Error(
      "Enter the college or ITP program you attend."
    );
  }

  /*
   * This marker prevents the availability values from
   * being overwritten before the new form controls are
   * added to the profile page.
   */
  const availabilityFieldsPresent =
    formData.get(
      "availability_fields_present"
    ) === "true";

  const availabilityUpdate: Record<
    string,
    unknown
  > = {};

  if (availabilityFieldsPresent) {
    const accepting_requests =
      formData.get("accepting_requests") ===
      "on";

    const available_days =
      parseAllowedSelections(
        formData,
        "available_days",
        AVAILABLE_DAYS,
        "available days"
      );

    const preferred_time_blocks =
      parseAllowedSelections(
        formData,
        "preferred_time_blocks",
        TIME_BLOCKS,
        "preferred time blocks"
      );

    const rawUnavailableUntil = String(
      formData.get("unavailable_until") ?? ""
    ).trim();

    const unavailable_until =
      rawUnavailableUntil || null;

    if (
      unavailable_until &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        unavailable_until
      )
    ) {
      throw new Error(
        "Select a valid unavailable-until date."
      );
    }

    availabilityUpdate.accepting_requests =
      accepting_requests;
    availabilityUpdate.available_days =
      available_days;
    availabilityUpdate.preferred_time_blocks =
      preferred_time_blocks;
    availabilityUpdate.unavailable_until =
      unavailable_until;
  }

  const pro_bono_commitment =
    String(
      formData.get("pro_bono_commitment") ?? ""
    ).trim() || null;

  const accept =
    formData.get("accept_pro_bono") === "on";

  if (!accept) {
    throw new Error("Accept the interpreter community commitments to save your profile.");
  }

  const professional_profile_url = String(
    formData.get("professional_profile_url") ?? ""
  ).trim() || null;

  if (professional_profile_url) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(professional_profile_url);
    } catch {
      throw new Error("Enter a valid professional profile link.");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("The professional profile link must start with http:// or https://.");
    }
  }

  let geo = null;

  if (home_address) {
    geo = await geocodeAddress(home_address);

    if (!geo) {
      throw new Error(
        "Could not geocode your home address. Try adding city/state."
      );
    }
  }

  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from("interpreter_profiles")
    .select("profile_photo_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(
      existingProfileError.message
    );
  }

  const removePhoto =
    formData.get("remove_profile_photo") ===
    "on";

  const submittedPhotoPath =
    parseOwnedMediaPath(
      formData.get("profile_photo_path"),
      user.id,
      "Profile photo"
    );

  const nextPhotoPath = removePhoto
    ? null
    : submittedPhotoPath ??
      existingProfile?.profile_photo_path ??
      null;

  const update: Record<string, unknown> = {
    profile_id: user.id,
    home_address:
      geo?.formatted ?? home_address,
    service_radius_miles,
    languages: languages.length
      ? languages
      : ["ASL"],
    modalities: modalities.length
      ? modalities
      : ["in_person"],
    credentials,
    is_certified,
    certifications,
    licenses,
    specialties,
    experience_band,
    profile_photo_path: nextPhotoPath,
    professional_profile_url,
    willing_to_mentor,
    willing_to_work_with_students,
    is_advanced_itp_student,
    college_name,
    pro_bono_commitment,
    ...availabilityUpdate,
  };

  if (geo) {
    update.home_location =
      `SRID=4326;POINT(` +
      `${geo.longitude} ${geo.latitude})`;
  }

  update.pro_bono_signed_at = new Date().toISOString();

  const { error } = await supabase
    .from("interpreter_profiles")
    .upsert(update, {
      onConflict: "profile_id",
    });

  if (error) {
    if (
      nextPhotoPath &&
      nextPhotoPath !==
        existingProfile?.profile_photo_path
    ) {
      await supabase.storage
        .from(INTERPRETER_PHOTO_BUCKET)
        .remove([nextPhotoPath]);
    }

    throw new Error(error.message);
  }

  const previousPhotoPath =
    existingProfile?.profile_photo_path;

  if (
    previousPhotoPath &&
    previousPhotoPath !== nextPhotoPath
  ) {
    const { error: removalError } =
      await supabase.storage
        .from(INTERPRETER_PHOTO_BUCKET)
        .remove([previousPhotoPath]);

    if (removalError) {
      console.error(
        "Could not remove previous profile photo:",
        removalError
      );
    }
  }

  revalidatePath("/interpreter/profile");
  revalidatePath("/interpreter");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/interpreters");

  redirect("/interpreter/profile?saved=1");
}
