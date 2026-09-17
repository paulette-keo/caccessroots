"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import {
  ALLOWED_EVENT_TYPES,
  REVIEW_EVENT_TYPES,
} from "@/lib/request-workflow";

export async function createRequestAction(
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

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description =
    String(
      formData.get("description") ?? ""
    ).trim() || null;

  const event_type = String(
    formData.get("event_type") ?? "other"
  );

  const other_event_type = String(
    formData.get("other_event_type") ?? ""
  ).trim();

  const coverage_responsibility = String(
    formData.get(
      "coverage_responsibility"
    ) ?? ""
  );

  const involves_minor =
    formData.get("involves_minor") ===
    "yes";

  let sensitivity =
    formData.get("sensitivity") ===
    "sensitive"
      ? "sensitive"
      : "standard";

  const event_address = String(
    formData.get("event_address") ?? ""
  ).trim();

  const event_start = String(
    formData.get("event_start") ?? ""
  );

  const event_end = String(
    formData.get("event_end") ?? ""
  );

  const modality = String(
    formData.get("modality") ??
      "in_person"
  );

  const languages_needed = String(
    formData.get("languages_needed") ??
      "ASL"
  )
    .split(",")
    .map((language) => language.trim())
    .filter(Boolean);

  if (
    !title ||
    !event_address ||
    !event_start ||
    !event_end
  ) {
    throw new Error(
      "Missing required fields"
    );
  }

  const { data: requestorProfile, error: commitmentError } = await supabase
    .from("requestor_profiles")
    .select("community_commitment_signed_at")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (commitmentError) throw new Error(commitmentError.message);
  if (!requestorProfile?.community_commitment_signed_at) {
    throw new Error("Complete your requester profile agreement before submitting a request");
  }

  if (
    !ALLOWED_EVENT_TYPES.has(event_type)
  ) {
    throw new Error(
      "That event type is not eligible for this request form"
    );
  }

  if (
    event_type === "other" &&
    !other_event_type
  ) {
    throw new Error(
      "Please briefly describe the Other event type"
    );
  }

  if (
    ![
      "personal",
      "not_sure",
      "organization_responsible",
    ].includes(coverage_responsibility)
  ) {
    throw new Error(
      "Please answer the access responsibility question"
    );
  }

  const startsAt = new Date(event_start);
  const endsAt = new Date(event_end);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    throw new Error(
      "The event end time must be after the start time"
    );
  }

  const reviewReasons: string[] = [];

  if (
    REVIEW_EVENT_TYPES.has(event_type)
  ) {
    reviewReasons.push(
      event_type === "other"
        ? `Other event type: ${other_event_type}`
        : "Funeral or memorial request"
    );
  }

  if (
    coverage_responsibility ===
    "not_sure"
  ) {
    reviewReasons.push(
      "Requester is unsure who is responsible for access"
    );
  } else if (
    coverage_responsibility ===
    "organization_responsible"
  ) {
    reviewReasons.push(
      "An organization may be responsible for access"
    );
  }

  if (involves_minor) {
    reviewReasons.push(
      "Request involves a minor"
    );
  }

  if (sensitivity === "sensitive") {
    reviewReasons.push("Requester marked the request as sensitive");
  }

  const needsReview =
    reviewReasons.length > 0;

  if (
    event_type ===
      "funeral_memorial" ||
    involves_minor
  ) {
    sensitivity = "sensitive";
  }

  let geo;

  try {
    geo = await geocodeAddress(
      event_address
    );
  } catch (error) {
    console.error("Geocoding failed:", {
      event_address,
      error,
      hasMapboxToken: Boolean(
        process.env
          .NEXT_PUBLIC_MAPBOX_TOKEN
      ),
    });

    throw new Error(
      "Could not geocode the event address"
    );
  }

  if (!geo) {
    console.error(
      "Geocoding returned no result:",
      {
        event_address,
        hasMapboxToken: Boolean(
          process.env
            .NEXT_PUBLIC_MAPBOX_TOKEN
        ),
      }
    );

    throw new Error(
      "Could not geocode the event address"
    );
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      requestor_id: user.id,
      title,
      description,
      event_type,
      sensitivity,
      event_address: geo.formatted,
      event_location:
        `SRID=4326;POINT(` +
        `${geo.longitude} ${geo.latitude})`,
      event_start,
      event_end,
      languages_needed,
      modality,
      student_interpreter_allowed: true,
      status: needsReview
        ? "pending_review"
        : "open",
      notes_internal: needsReview
        ? reviewReasons.join("; ")
        : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      "Request creation failed:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }
    );

    throw new Error(error.message);
  }

  console.log(
    "Request created successfully:",
    data.id
  );

  redirect("/requestor/requests");
}
