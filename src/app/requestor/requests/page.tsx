import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInterpreterPhotoUrl } from "@/lib/interpreter-photos";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { eventTypeLabel, requestStatusLabel } from "@/lib/request-workflow";

type TeamMemberRow = {
  assignment_id: string;
  request_id: string;
  team_role: "student" | "mentor";
  assignment_status: string;
  interpreter_name: string;
  interpreter_credentials: string | null;
  interpreter_is_certified: boolean | null;
  interpreter_certifications: string[];
  interpreter_specialties: string[];
  interpreter_experience_band: string | null;
  interpreter_profile_photo_path: string | null;
  interpreter_professional_profile_url: string | null;
  interpreter_is_advanced_itp_student: boolean;
  interpreter_college_name: string | null;
  interpreter_photo_url?: string | null;
};

export default async function MyRequestsPage() {
  const profile = await requireProfile();
  const supabase = createSupabaseServerClient();

  const { data: requests, error: requestsError } = await supabase
    .from("requests")
    .select("id,title,event_start,event_address,status,sensitivity,event_type")
    .eq("requestor_id", profile.id)
    .order("event_start", { ascending: false });
  if (requestsError) throw new Error(requestsError.message);

  const { data: teamRows, error: teamError } = await supabase.rpc(
    "requestor_assignment_team"
  );
  if (teamError) {
    throw new Error(`Could not load assigned teams: ${teamError.message}`);
  }

  const team = await Promise.all(
    ((teamRows ?? []) as TeamMemberRow[]).map(async (member) => ({
      ...member,
      interpreter_photo_url: await createInterpreterPhotoUrl(
        supabase,
        member.interpreter_profile_photo_path
      ),
    }))
  );
  const teamByRequest = new Map<string, TeamMemberRow[]>();
  for (const member of team) {
    const current = teamByRequest.get(member.request_id) ?? [];
    current.push(member);
    teamByRequest.set(member.request_id, current);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">My requests</h1>
      <p className="text-ink-muted mt-1">
        Track review, team confirmation, and upcoming pro bono requests.
      </p>

      <div className="mt-6 space-y-4">
        {requests?.map((request) => {
          const members = teamByRequest.get(request.id) ?? [];
          return (
            <article key={request.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-subtle">
                    {eventTypeLabel(request.event_type)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{request.title}</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDateTime(request.event_start)} — {request.event_address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge bg-brand-50 text-brand-700">
                    {requestStatusLabel(request.status)}
                  </span>
                  {request.sensitivity === "sensitive" && (
                    <span className="badge bg-terra-100 text-terra-900">Sensitive</span>
                  )}
                </div>
              </div>

              {request.status === "pending_review" ? (
                <p className="mt-4 text-sm text-ink-muted">
                  A person is reviewing this request before team matching begins.
                </p>
              ) : request.status === "pending_acceptance" ? (
                <p className="mt-4 text-sm text-ink-muted">
                  The coordinator has invited a student and mentor. Your team will
                  appear here after both people confirm availability.
                </p>
              ) : members.length > 0 ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {["student", "mentor"].map((role) => {
                    const member = members.find((item) => item.team_role === role);
                    return member ? (
                      <TeamMember key={member.assignment_id} member={member} />
                    ) : (
                      <div key={role} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-ink-subtle">
                          {role === "student" ? "Advanced ITP student" : "Mentor interpreter"}
                        </p>
                        <p className="mt-2 text-sm text-ink-muted">
                          The coordinator is still filling this role.
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">
                  A coordinator will select an Advanced ITP student and mentor. Each person confirms availability before the team is final.
                </p>
              )}
            </article>
          );
        })}

        {(!requests || requests.length === 0) && (
          <div className="card p-8 text-center text-ink-muted">No requests yet.</div>
        )}
      </div>
    </div>
  );
}

function TeamMember({ member }: { member: TeamMemberRow }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-subtle">
        {member.team_role === "student" ? "Advanced ITP student" : "Mentor interpreter"}
      </p>
      <div className="mt-3 flex items-start gap-3">
        {member.interpreter_photo_url ? (
          <img
            src={member.interpreter_photo_url}
            alt={`${member.interpreter_name} profile`}
            className="h-12 w-12 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 font-semibold text-ink-muted">
            {member.interpreter_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{member.interpreter_name}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {member.assignment_status === "accepted"
                ? "Availability confirmed"
                : member.assignment_status.replaceAll("_", " ")}
          </p>
          {member.interpreter_college_name && (
            <p className="mt-1 text-xs text-ink-muted">
              Program: {member.interpreter_college_name}
            </p>
          )}
        </div>
      </div>

      {member.interpreter_is_certified === true && member.interpreter_credentials && (
        <p className="mt-3 text-xs text-ink-muted">
          Credentials: {member.interpreter_credentials}
        </p>
      )}
      {member.interpreter_specialties?.length > 0 && (
        <p className="mt-1 text-xs text-ink-muted">
          Specialties: {member.interpreter_specialties.join(", ")}
        </p>
      )}
      {member.interpreter_professional_profile_url && (
        <a
          href={member.interpreter_professional_profile_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-brand-700 underline"
        >
          View professional or practicum profile
        </a>
      )}
    </div>
  );
}
