import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createInterpreterPhotoUrl,
  createInterpreterVideoUrl,
} from "@/lib/interpreter-photos";
import {
  formatDateTime,
  relativeFromNow,
} from "@/lib/utils";
import type { InterpreterRecommendation } from "@/lib/types";
import {
  eventTypeLabel,
  requestStatusLabel,
} from "@/lib/request-workflow";
import { proposeAssignmentAction } from "./actions";

export default async function MatchRequestPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase =
    createSupabaseServerClient();

  const { data: request, error } =
    await supabase
      .from("requests")
      .select(
        "id,title,description,event_type,sensitivity,event_address,event_start,event_end,languages_needed,modality,student_interpreter_allowed,status,requestor_id,notes_internal"
      )
      .eq("id", params.id)
      .maybeSingle();

  if (error) {
    console.error(
      "Coordinator request load error:",
      error
    );

    throw new Error(
      `Could not load request: ${error.message}`
    );
  }

  if (!request) {
    notFound();
  }

  const {
    data: requestor,
    error: requestorError,
  } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", request.requestor_id)
    .maybeSingle();

  if (requestorError) {
    console.error(
      "Coordinator requestor load error:",
      requestorError
    );
  }

  let recs: InterpreterRecommendation[] = [];

  if (request.status === "open") {
    const { data, error: recError } =
      await supabase.rpc(
        "match_interpreters_for_request",
        {
          p_request_id: params.id,
        }
      );

    if (recError) {
      throw new Error(recError.message);
    }

    recs =
      (data ?? []) as InterpreterRecommendation[];
  }

  const {
    data: assignmentRows,
    error: assignmentError,
  } = await supabase
    .from("assignments")
    .select(
      "id,interpreter_id,status,accepted_at,declined_at,decline_reason,created_at"
    )
    .eq("request_id", params.id)
    .order("created_at", {
      ascending: false,
    });

  if (assignmentError) {
    throw new Error(
      assignmentError.message
    );
  }

  const {
    data: interpreterDetails,
    error: interpreterDetailsError,
  } = recs.length
    ? await supabase
        .from("interpreter_profiles")
        .select(
          "profile_id,is_certified,certifications,licenses,specialties,experience_band,profile_photo_path,intro_video_path,willing_to_mentor,willing_to_work_with_students,is_advanced_itp_student,college_name,accepting_requests,available_days,preferred_time_blocks,unavailable_until"
        )
        .in(
          "profile_id",
          recs.map(
            (recommendation) =>
              recommendation.interpreter_id
          )
        )
    : {
        data: [],
        error: null,
      };

  if (interpreterDetailsError) {
    throw new Error(
      interpreterDetailsError.message
    );
  }

  const interpreterDetailsById =
    new Map(
      await Promise.all(
        (interpreterDetails ?? []).map(
          async (details: any) =>
            [
              details.profile_id,
              {
                ...details,

                profilePhotoUrl:
                  await createInterpreterPhotoUrl(
                    supabase,
                    details.profile_photo_path
                  ),

                introVideoUrl:
                  await createInterpreterVideoUrl(
                    supabase,
                    details.intro_video_path
                  ),
              },
            ] as const
        )
      )
    );

  const recommendations = recs;

  const assignmentByInterpreter =
    new Map<string, any>();

  for (const assignment of
    assignmentRows ?? []) {
    if (
      !assignmentByInterpreter.has(
        assignment.interpreter_id
      )
    ) {
      assignmentByInterpreter.set(
        assignment.interpreter_id,
        assignment
      );
    }
  }

  const canAssignNewInterpreter =
    request.status === "open";

  return (
    <div>
      <Link
        href="/coordinator"
        className="text-sm text-ink-muted"
      >
        ← Back to queue
      </Link>

      <div className="card p-6 mt-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-subtle">
              {eventTypeLabel(
                (request as any).event_type
              )}
            </p>

            <h1 className="text-2xl font-semibold mt-1">
              {request.title}
            </h1>

            <p className="text-ink-muted mt-1">
              {requestor?.full_name ??
                "Unknown requestor"}

              {requestor?.email
                ? ` (${requestor.email})`
                : ""}
            </p>
          </div>

          {request.sensitivity ===
            "sensitive" && (
            <span className="badge bg-terra-100 text-terra-900">
              Sensitive — extra review required
            </span>
          )}
        </div>

        <dl className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <dt className="text-ink-muted">
              When
            </dt>

            <dd>
              {formatDateTime(
                request.event_start
              )}{" "}
              (
              {relativeFromNow(
                request.event_start
              )}
              )
            </dd>
          </div>

          <div>
            <dt className="text-ink-muted">
              Where
            </dt>

            <dd>{request.event_address}</dd>
          </div>

          <div>
            <dt className="text-ink-muted">
              Modality
            </dt>

            <dd className="capitalize">
              {(request as any).modality.replace(
                "_",
                " "
              )}
            </dd>
          </div>

          <div>
            <dt className="text-ink-muted">
              Languages
            </dt>

            <dd>
              {Array.isArray(
                request.languages_needed
              )
                ? request.languages_needed.join(
                    ", "
                  )
                : ""}
            </dd>
          </div>
          <div>
  <dt className="text-ink-muted">
    Advanced ITP student
  </dt>

  <dd>
    {request.student_interpreter_allowed
      ? "Requester is open to a student match"
      : "Do not propose a student"}
  </dd>
</div>
        </dl>

        {request.description && (
          <p className="mt-4 text-sm text-ink-muted">
            {request.description}
          </p>
        )}
      </div>

      {request.status ===
        "pending_review" && (
        <div className="mt-5 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Held for admin review
          </p>

          <p className="mt-1">
            This request cannot move forward until an
            admin approves it.
          </p>

          {request.notes_internal && (
            <p className="mt-2">
              Review reason:{" "}
              {request.notes_internal}
            </p>
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold mt-8">
        {canAssignNewInterpreter
          ? "Recommended interpreters"
          : "Match status"}{" "}

        {canAssignNewInterpreter && (
          <span className="text-sm text-ink-muted font-normal">
            ({recommendations.length} eligible after
            COI / language / radius filters)
          </span>
        )}
      </h2>

      <p className="text-sm text-ink-muted">
        {canAssignNewInterpreter
          ? "Ranked by fit. Blocklisted interpreters are excluded by the database — they do not appear here."
          : `This request is ${requestStatusLabel(
              request.status
            ).toLowerCase()}. No new interpreter can be proposed right now.`}
      </p>

      <div className="space-y-3 mt-4">
        {canAssignNewInterpreter &&
          recommendations.map((r) => {
            const existingAssignment =
              assignmentByInterpreter.get(
                r.interpreter_id
              );

            const details =
              interpreterDetailsById.get(
                r.interpreter_id
              ) as any;

            const wasWithdrawn =
              existingAssignment?.status ===
                "declined" &&
              Boolean(
                existingAssignment?.accepted_at
              );

            const wasDeclinedByRequester =
              existingAssignment?.status ===
                "cancelled" &&
              existingAssignment?.decline_reason ===
                "Declined by requester";

            return (
              <div
                key={r.interpreter_id}
                className="card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  {details?.profilePhotoUrl ? (
                    <img
                      src={
                        details.profilePhotoUrl
                      }
                      alt={`${r.full_name} profile`}
                      className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-ink-muted">
                      {r.full_name
                        ?.charAt(0)
                        ?.toUpperCase() ?? "I"}
                    </div>
                  )}

                  <div>
                    <p className="font-medium">
                      {r.full_name}
                    </p>

                    <p className="text-sm text-ink-muted">
                      {r.distance_miles} mi away •
                      radius{" "}
                      {r.service_radius_miles} mi •{" "}
                      {r.within_service_radius ? (
                        <span className="text-emerald-700">
                          within radius
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          outside radius
                        </span>
                      )}{" "}
                      • workload{" "}
                      {r.active_workload} •{" "}
                      {r.total_completed} pro bono done
                    </p>

                    <p className="text-xs text-ink-muted mt-1">
                      Languages:{" "}
                      {Array.isArray(r.languages)
                        ? r.languages.join(", ")
                        : ""}{" "}
                      • Modalities:{" "}
                      {Array.isArray(r.modalities)
                        ? r.modalities.join(", ")
                        : ""}
                    </p>

                    <p className="text-xs text-ink-muted mt-1">
                      {details?.is_certified === true
                        ? "Certified"
                        : details?.is_certified ===
                            false
                          ? "Not certified"
                          : "Certification not provided"}

                      {details?.experience_band
                        ? ` • ${experienceBandLabel(
                            details.experience_band
                          )}`
                        : ""}

                      {details?.specialties?.length
                        ? ` • ${details.specialties.join(
                            ", "
                          )}`
                        : ""}
                    </p>

                    {details?.is_advanced_itp_student && (
  <div className="mt-2">
    <span className="badge bg-blue-50 text-blue-700">
      Advanced ITP student
    </span>

    {details.college_name && (
      <span className="ml-2 text-xs text-ink-muted">
        {details.college_name}
      </span>
    )}
  </div>
)}
                    
                    <AvailabilityDetails
                      interpreter={details}
                    />

                    {details?.introVideoUrl && (
                      <a
                        href={
                          details.introVideoUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-brand-700 underline"
                      >
                        View ASL introduction
                      </a>
                    )}

                    {wasWithdrawn && (
                      <p className="text-xs text-rose-600 mt-2">
                        This interpreter previously
                        accepted and withdrew from this
                        request.
                      </p>
                    )}

                    {existingAssignment?.status ===
                      "declined" &&
                      !wasWithdrawn && (
                        <p className="text-xs text-ink-muted mt-2">
                          This interpreter previously
                          declined this request.
                        </p>
                      )}

                    {wasDeclinedByRequester && (
                      <p className="text-xs text-ink-muted mt-2">
                        The requester previously declined
                        this proposed match.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    {r.fit_score}{" "}
                    <span className="text-ink-muted text-xs">
                      fit
                    </span>
                  </span>

                  {existingAssignment?.status ===
                    "accepted" && (
                    <span className="badge bg-brand-50 text-brand-700">
                      Accepted
                    </span>
                  )}

                  {existingAssignment?.status ===
                    "released" && (
                    <span className="badge bg-brand-50 text-brand-700">
                      Awaiting response
                    </span>
                  )}

                  {(existingAssignment?.status ===
                    "proposed" ||
                    existingAssignment?.status ===
                      "pending_admin_release") && (
                    <span className="badge bg-brand-50 text-brand-700">
                      Proposed
                    </span>
                  )}

                  {wasWithdrawn && (
                    <span className="badge bg-terra-100 text-terra-900">
                      Withdrawn
                    </span>
                  )}

                  {existingAssignment?.status ===
                    "declined" &&
                    !wasWithdrawn && (
                      <span className="badge bg-terra-100 text-terra-900">
                        Declined
                      </span>
                    )}

                  {wasDeclinedByRequester && (
                    <span className="badge bg-terra-100 text-terra-900">
                      Declined by requester
                    </span>
                  )}

                  {canAssignNewInterpreter &&
                    (!existingAssignment ||
                      existingAssignment.status ===
                        "declined" ||
                      wasDeclinedByRequester) && (
                      <form
                        action={
                          proposeAssignmentAction
                        }
                      >
                        <input
                          type="hidden"
                          name="request_id"
                          value={request.id}
                        />

                        <input
                          type="hidden"
                          name="interpreter_id"
                          value={
                            r.interpreter_id
                          }
                        />

                        <button className="btn-primary text-sm py-1.5 px-3">
                          {wasDeclinedByRequester
                            ? "Re-propose to requester"
                            : existingAssignment?.status ===
                                "declined"
                              ? "Reassign"
                            : request.sensitivity ===
                                "sensitive"
                              ? "Send for admin review"
                              : "Propose to requester"}
                        </button>
                      </form>
                    )}
                </div>
              </div>
            );
          })}

        {canAssignNewInterpreter &&
          recommendations.length === 0 && (
            <div className="card p-6 text-center text-ink-muted">
              No interpreters match this
              request&apos;s filters. Consider
              widening the service radius, contacting
              partner communities, or flagging this for
              admin attention.
            </div>
          )}

        {!canAssignNewInterpreter && (
          <div className="card p-6 text-center text-ink-muted">
            {request.status === "proposed"
              ? "The proposed match is waiting for the requester’s decision. The interpreter has not been contacted."
              : request.status ===
                  "pending_acceptance"
                ? "The requester accepted the match. The interpreter can now accept or decline it."
                : request.status ===
                    "pending_review"
                  ? "An admin must finish the review before matching can continue."
                  : `Current status: ${requestStatusLabel(
                      request.status
                    )}.`}
          </div>
        )}
      </div>
    </div>
  );
}

function AvailabilityDetails({
  interpreter,
}: {
  interpreter: any;
}) {
  if (!interpreter) {
    return null;
  }

  const isAccepting =
    interpreter.accepting_requests !== false;

  return (
    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-muted">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`badge ${
            isAccepting
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isAccepting
            ? "Accepting requests"
            : "Paused"}
        </span>

        {interpreter.unavailable_until && (
          <span>
            Unavailable until{" "}
            {formatDateOnly(
              interpreter.unavailable_until
            )}
          </span>
        )}
      </div>

      <p className="mt-2">
        Available days:{" "}
        {formatAvailabilityList(
          interpreter.available_days
        )}
      </p>

      <p className="mt-1">
        Preferred times:{" "}
        {formatAvailabilityList(
          interpreter.preferred_time_blocks
        )}
      </p>
    </div>
  );
}

function formatAvailabilityList(
  values: string[] | null | undefined
) {
  if (!Array.isArray(values) || values.length === 0) {
    return "Flexible / not specified";
  }

  return values
    .map((value) =>
      value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        )
    )
    .join(", ");
}

function formatDateOnly(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(
      Date.UTC(year, month - 1, day)
    )
  );
}

function experienceBandLabel(value: string) {
  const labels: Record<string, string> = {
    less_than_2: "Less than 2 years",
    "2_to_5": "2–5 years",
    "6_to_10": "6–10 years",
    "11_plus": "11+ years",
  };

  return labels[value] ?? value;
}
