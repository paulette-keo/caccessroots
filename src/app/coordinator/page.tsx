import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, relativeFromNow } from "@/lib/utils";
import { eventTypeLabel, requestStatusLabel } from "@/lib/request-workflow";

export default async function CoordinatorQueue() {
  const supabase = createSupabaseServerClient();
  const requestFields =
    "id,title,event_type,event_address,event_start,event_end,status,sensitivity,languages_needed,modality,requestor:requestor_id(full_name)";

  const [queueResult, historyResult] = await Promise.all([
    supabase
      .from("requests")
      .select(requestFields)
      .in("status", ["pending_review", "open", "proposed", "pending_acceptance"])
      .order("event_start", { ascending: true }),
    supabase
      .from("requests")
      .select(requestFields)
      .in("status", ["assigned", "completed", "cancelled"])
      .order("event_start", { ascending: false }),
  ]);

  if (queueResult.error) {
    throw new Error(`Could not load the coordinator queue: ${queueResult.error.message}`);
  }

  if (historyResult.error) {
    throw new Error(`Could not load assigned requests: ${historyResult.error.message}`);
  }

  const queue = queueResult.data;
  const history = historyResult.data;
  const historyRequestIds = (history ?? []).map((request: any) => request.id);
  const teamByRequest = new Map<
    string,
    { student?: string; mentor?: string }
  >();

  if (historyRequestIds.length > 0) {
    const { data: assignmentRows, error: assignmentError } = await supabase
      .from("assignments")
      .select("request_id,team_role,status,created_at")
      .in("request_id", historyRequestIds)
      .order("created_at", { ascending: false });

    if (assignmentError) {
      throw new Error(`Could not load assigned teams: ${assignmentError.message}`);
    }

    for (const assignment of assignmentRows ?? []) {
      if (!assignment.team_role) continue;

      const team = teamByRequest.get(assignment.request_id) ?? {};
      if (assignment.team_role === "student" && !team.student) {
        team.student = assignment.status;
      }
      if (assignment.team_role === "mentor" && !team.mentor) {
        team.mentor = assignment.status;
      }
      teamByRequest.set(assignment.request_id, team);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Request queue</h1>
          <p className="text-ink-muted mt-1">
            Build each student-and-mentor team and track availability responses.
            The COI blocklist is applied before recommendations are shown.
          </p>
        </div>
        <Link href="/coordinator/map" className="btn-secondary">View map</Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-ink-muted text-left">
            <tr>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Requestor</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {queue?.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-ink-muted">{r.event_address}</p>
                </td>
                <td className="px-4 py-3">{r.requestor?.full_name}</td>
                <td className="px-4 py-3 capitalize">
                  {eventTypeLabel(r.event_type)}
                  {r.sensitivity === "sensitive" && (
                    <span className="badge bg-terra-100 text-terra-900 ml-2">
                      Sensitive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{formatDateTime(r.event_start)}</div>
                  <div className="text-xs text-ink-muted">{relativeFromNow(r.event_start)}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-brand-50 text-brand-700 capitalize">
                    {requestStatusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/coordinator/requests/${r.id}`} className="btn-primary text-xs py-1 px-2">
                    {["open", "pending_acceptance"].includes(r.status)
                      ? "Build team"
                      : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {(!queue || queue.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  Inbox zero. Nothing waiting to be matched.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Assigned and past requests</h2>
        <p className="text-ink-muted mt-1">
          Confirmed teams stay visible here after they leave the active queue.
        </p>

        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-ink-muted text-left">
              <tr>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Requestor</th>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Team</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {history?.map((r: any) => {
                const team = teamByRequest.get(r.id);

                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-ink-muted">{r.event_address}</p>
                    </td>
                    <td className="px-4 py-3">{r.requestor?.full_name}</td>
                    <td className="px-4 py-3">
                      <div>{formatDateTime(r.event_start)}</div>
                      <div className="text-xs text-ink-muted">
                        {relativeFromNow(r.event_start)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <TeamStatus label="Student" status={team?.student} />
                        <TeamStatus label="Mentor" status={team?.mentor} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-brand-50 text-brand-700 capitalize">
                        {requestStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/coordinator/requests/${r.id}`}
                        className="btn-secondary text-xs py-1 px-2"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!history || history.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                    No assigned or past requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TeamStatus({ label, status }: { label: string; status?: string }) {
  return (
    <p>
      <span className="font-medium">{label}:</span>{" "}
      <span className={status === "accepted" || status === "completed" ? "text-emerald-700" : "text-ink-muted"}>
        {assignmentStatusLabel(status)}
      </span>
    </p>
  );
}

function assignmentStatusLabel(status?: string) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "completed":
      return "Completed";
    case "released":
      return "Awaiting response";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "proposed":
    case "pending_admin_release":
      return "Pending";
    default:
      return "Not assigned";
  }
}
