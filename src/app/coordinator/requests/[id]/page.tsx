import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInterpreterPhotoUrl } from "@/lib/interpreter-photos";
import { formatDateTime, relativeFromNow } from "@/lib/utils";
import type { InterpreterRecommendation } from "@/lib/types";
import { eventTypeLabel, requestStatusLabel } from "@/lib/request-workflow";
import { inviteTeamMemberAction } from "./actions";

const ACTIVE_STATUSES = new Set([
  "proposed",
  "pending_admin_release",
  "released",
  "accepted",
]);

export default async function MatchRequestPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: request, error } = await supabase
    .from("requests")
    .select(
      "id,title,description,event_type,sensitivity,event_address,event_start,event_end,languages_needed,modality,status,requestor_id,notes_internal"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load request: ${error.message}`);
  if (!request) notFound();

  const { data: requestor } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", request.requestor_id)
    .maybeSingle();

  const canBuildTeam = ["open", "pending_acceptance"].includes(request.status);
  let recs: InterpreterRecommendation[] = [];

  if (canBuildTeam) {
    const { data, error: recError } = await supabase.rpc(
      "match_interpreters_for_request",
      { p_request_id: params.id }
    );
    if (recError) throw new Error(recError.message);
    recs = (data ?? []) as InterpreterRecommendation[];
  }

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("assignments")
    .select(
      "id,interpreter_id,team_role,status,accepted_at,declined_at,decline_reason,created_at"
    )
    .eq("request_id", params.id)
    .order("created_at", { ascending: false });
  if (assignmentError) throw new Error(assignmentError.message);

  const allInterpreterIds = Array.from(
    new Set([
      ...recs.map((rec) => rec.interpreter_id),
      ...(assignmentRows ?? []).map((row) => row.interpreter_id),
    ])
  );

  const [{ data: profiles }, { data: details, error: detailsError }] =
    allInterpreterIds.length > 0
      ? await Promise.all([
          supabase.from("profiles").select("id,full_name").in("id", allInterpreterIds),
          supabase
            .from("interpreter_profiles")
            .select(
              "profile_id,is_certified,experience_band,profile_photo_path,professional_profile_url,willing_to_mentor,is_advanced_itp_student,college_name,available_days,preferred_time_blocks"
            )
            .in("profile_id", allInterpreterIds),
        ])
      : [{ data: [] }, { data: [], error: null }];
  if (detailsError) throw new Error(detailsError.message);

  const namesById = new Map(
    (profiles ?? []).map((profile: any) => [profile.id, profile.full_name])
  );
  const detailsById = new Map(
    await Promise.all(
      (details ?? []).map(async (detail: any) => [
        detail.profile_id,
        {
          ...detail,
          profilePhotoUrl: await createInterpreterPhotoUrl(
            supabase,
            detail.profile_photo_path
          ),
        },
      ] as const)
    )
  );

  const activeAssignments = (assignmentRows ?? []).filter((row) =>
    ACTIVE_STATUSES.has(row.status)
  );
  const activeByRole = new Map(
    activeAssignments.map((assignment) => [assignment.team_role, assignment])
  );
  const activeInterpreterIds = new Set(
    activeAssignments.map((assignment) => assignment.interpreter_id)
  );
  const latestByInterpreter = new Map<string, any>();
  for (const assignment of assignmentRows ?? []) {
    if (!latestByInterpreter.has(assignment.interpreter_id)) {
      latestByInterpreter.set(assignment.interpreter_id, assignment);
    }
  }

  const availableRecommendations = recs.filter(
    (rec) => !activeInterpreterIds.has(rec.interpreter_id)
  );
  const studentRecommendations = availableRecommendations.filter(
    (rec) => (detailsById.get(rec.interpreter_id) as any)?.is_advanced_itp_student
  );
  const mentorRecommendations = availableRecommendations.filter((rec) => {
    const detail = detailsById.get(rec.interpreter_id) as any;
    return detail?.willing_to_mentor && !detail?.is_advanced_itp_student;
  });

  return (
    <div>
      <Link href="/coordinator" className="text-sm text-ink-muted">
        ← Back to queue
      </Link>

      <div className="card p-6 mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-subtle">
              {eventTypeLabel(request.event_type)}
            </p>
            <h1 className="text-2xl font-semibold mt-1">{request.title}</h1>
            <p className="text-ink-muted mt-1">
              {requestor?.full_name ?? "Unknown requestor"}
              {requestor?.email ? ` (${requestor.email})` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-brand-50 text-brand-700">
              {requestStatusLabel(request.status)}
            </span>
            {request.sensitivity === "sensitive" && (
              <span className="badge bg-terra-100 text-terra-900">
                Sensitive — coordinate with care
              </span>
            )}
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <dt className="text-ink-muted">When</dt>
            <dd>
              {formatDateTime(request.event_start)} ({relativeFromNow(request.event_start)})
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Where</dt>
            <dd>{request.event_address}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Modality</dt>
            <dd className="capitalize">{request.modality.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Languages</dt>
            <dd>{request.languages_needed?.join(", ") ?? ""}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Team structure</dt>
            <dd>One Advanced ITP student and one mentor are required.</dd>
          </div>
        </dl>
        {request.description && (
          <p className="mt-4 text-sm text-ink-muted">{request.description}</p>
        )}
      </div>

      {request.status === "pending_review" && (
        <div className="mt-5 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Held for admin review</p>
          <p className="mt-1">An admin must approve this request before team matching begins.</p>
          {request.notes_internal && (
            <p className="mt-2">Review reason: {request.notes_internal}</p>
          )}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Team confirmation</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Invite each person first. The request is fully assigned only after both the student and mentor accept.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TeamSlot
            label="Advanced ITP student"
            assignment={activeByRole.get("student")}
            name={nameForAssignment(activeByRole.get("student"), namesById)}
          />
          <TeamSlot
            label="Mentor interpreter"
            assignment={activeByRole.get("mentor")}
            name={nameForAssignment(activeByRole.get("mentor"), namesById)}
          />
        </div>
      </section>

      {canBuildTeam && !activeByRole.get("student") && (
        <RecommendationSection
          title="Choose an Advanced ITP student"
          emptyMessage="No eligible Advanced ITP students match the location, language, modality, availability, and blocklist filters."
          recommendations={studentRecommendations}
          detailsById={detailsById}
          latestByInterpreter={latestByInterpreter}
          requestId={request.id}
          teamRole="student"
        />
      )}

      {canBuildTeam && !activeByRole.get("mentor") && (
        <RecommendationSection
          title="Choose a mentor interpreter"
          emptyMessage="No mentor volunteers match the location, language, modality, availability, and blocklist filters."
          recommendations={mentorRecommendations}
          detailsById={detailsById}
          latestByInterpreter={latestByInterpreter}
          requestId={request.id}
          teamRole="mentor"
        />
      )}

      {!canBuildTeam && request.status !== "pending_review" && (
        <div className="card mt-6 p-6 text-center text-ink-muted">
          Current status: {requestStatusLabel(request.status)}.
        </div>
      )}
    </div>
  );
}

function TeamSlot({ label, assignment, name }: { label: string; assignment: any; name: string | null }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-ink-subtle">{label}</p>
      {assignment ? (
        <>
          <p className="mt-2 font-semibold">{name ?? "Interpreter"}</p>
          <span className="badge mt-2 bg-brand-50 text-brand-700 capitalize">
            {assignment.status === "released" ? "Awaiting response" : assignment.status}
          </span>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Open slot — choose someone below.</p>
      )}
    </div>
  );
}

function RecommendationSection({
  title,
  emptyMessage,
  recommendations,
  detailsById,
  latestByInterpreter,
  requestId,
  teamRole,
}: {
  title: string;
  emptyMessage: string;
  recommendations: InterpreterRecommendation[];
  detailsById: Map<string, any>;
  latestByInterpreter: Map<string, any>;
  requestId: string;
  teamRole: "student" | "mentor";
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Ranked by fit. Blocklisted and unavailable interpreters are excluded.
      </p>
      <div className="mt-4 space-y-3">
        {recommendations.map((recommendation) => {
          const detail = detailsById.get(recommendation.interpreter_id);
          const previous = latestByInterpreter.get(recommendation.interpreter_id);
          return (
            <div
              key={recommendation.interpreter_id}
              className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                {detail?.profilePhotoUrl ? (
                  <img
                    src={detail.profilePhotoUrl}
                    alt={`${recommendation.full_name} profile`}
                    className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-ink-muted">
                    {recommendation.full_name?.charAt(0)?.toUpperCase() ?? "I"}
                  </div>
                )}
                <div>
                  <p className="font-medium">{recommendation.full_name}</p>
                  <p className="text-sm text-ink-muted">
                    {recommendation.distance_miles} mi away • radius {recommendation.service_radius_miles} mi • workload {recommendation.active_workload}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {detail?.is_certified === true
                      ? "Certified"
                      : detail?.is_certified === false
                        ? "Not certified"
                        : "Certification not provided"}
                    {detail?.experience_band
                      ? ` • ${experienceBandLabel(detail.experience_band)}`
                      : ""}
                  </p>
                  {teamRole === "student" && detail?.college_name && (
                    <p className="mt-1 text-xs text-ink-muted">Program: {detail.college_name}</p>
                  )}
                  <AvailabilityDetails interpreter={detail} />
                  {detail?.professional_profile_url && (
                    <a
                      href={detail.professional_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-brand-700 underline"
                    >
                      View professional or practicum profile
                    </a>
                  )}
                  {previous?.status === "declined" && (
                    <p className="mt-2 text-xs text-rose-600">
                      This person previously declined or withdrew from this request.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold">
                  {recommendation.fit_score} <span className="text-xs text-ink-muted">fit</span>
                </span>
                <form action={inviteTeamMemberAction}>
                  <input type="hidden" name="request_id" value={requestId} />
                  <input type="hidden" name="interpreter_id" value={recommendation.interpreter_id} />
                  <input type="hidden" name="team_role" value={teamRole} />
                  <button className="btn-primary px-3 py-1.5 text-sm">
                    Invite as {teamRole}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {recommendations.length === 0 && (
          <div className="card p-6 text-center text-ink-muted">{emptyMessage}</div>
        )}
      </div>
    </section>
  );
}

function AvailabilityDetails({ interpreter }: { interpreter: any }) {
  if (!interpreter) return null;
  return (
    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-muted">
      <span className="badge bg-emerald-50 text-emerald-700">Accepting requests</span>
      <p className="mt-2">Available days: {formatAvailabilityList(interpreter.available_days)}</p>
      <p className="mt-1">Preferred times: {formatAvailabilityList(interpreter.preferred_time_blocks)}</p>
    </div>
  );
}

function formatAvailabilityList(values: string[] | null | undefined) {
  if (!Array.isArray(values) || values.length === 0) return "Flexible / not specified";
  return values.map((value) => value.replaceAll("_", " ")).join(", ");
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

function nameForAssignment(assignment: any, namesById: Map<string, string>) {
  return assignment ? namesById.get(assignment.interpreter_id) ?? null : null;
}
