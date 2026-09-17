import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import {
  acceptAssignmentAction,
  declineAssignmentAction,
  withdrawAssignmentAction,
} from "./actions";

export default async function MyAssignmentsPage() {
  await requireProfile();

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: rows, error } = await supabase
    .from("assignments")
    .select(
      "id,team_role,status,created_at,accepted_at,declined_at,decline_reason,request_id"
    )
    .eq("interpreter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Interpreter assignments load error:", error);
    throw new Error(`Could not load assignments: ${error.message}`);
  }

  const requestIds = rows?.map((row) => row.request_id) ?? [];

  let requests: any[] = [];

  if (requestIds.length > 0) {
    const { data: requestRows, error: requestsError } = await supabase
      .from("requests")
      .select(
        "id,title,event_address,event_start,event_end,event_type,description"
      )
      .in("id", requestIds);

    if (requestsError) {
      console.error("Requests load error:", requestsError);
      throw new Error(`Could not load requests: ${requestsError.message}`);
    }

    requests = requestRows ?? [];
  }

  const rowsWithRequests =
    rows?.map((row) => ({
      ...row,
      requests: requests.find(
        (request) => request.id === row.request_id
      ),
    })) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">My assignments</h1>

      <p className="text-ink-muted mt-1">
        Coordinators invite you as either the Advanced ITP student or mentor.
        Confirm whether you are available before the team is finalized.
      </p>

      <div className="space-y-4 mt-6">
        {rowsWithRequests.map((row: any) => {
          const wasWithdrawn =
            row.status === "declined" && Boolean(row.accepted_at);

          const displayStatus = wasWithdrawn
            ? "Withdrawn"
            : row.status?.replace("_", " ") ?? "";

          return (
            <div key={row.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-subtle capitalize">
                    {row.requests?.event_type?.replace("_", " ")}
                  </p>

                  <span className="badge mt-2 bg-slate-100 text-ink-muted">
                    {row.team_role === "student"
                      ? "Advanced ITP student"
                      : "Mentor interpreter"}
                  </span>

                  <h3 className="font-semibold mt-1">
                    {row.requests?.title}
                  </h3>

                  <p className="text-sm text-ink-muted mt-1">
                    {row.requests?.event_start
                      ? formatDateTime(row.requests.event_start)
                      : ""}
                    {row.requests?.event_address
                      ? ` — ${row.requests.event_address}`
                      : ""}
                  </p>

                  {row.requests?.description && (
                    <p className="text-sm mt-2">
                      {row.requests.description}
                    </p>
                  )}
                </div>

                <span className="badge bg-brand-50 text-brand-700 capitalize">
                  {displayStatus}
                </span>
              </div>

              {row.status === "released" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={acceptAssignmentAction}>
                    <input
                      type="hidden"
                      name="id"
                      value={row.id}
                    />

                    <button className="btn-primary text-sm py-1.5 px-3">
                      Confirm availability
                    </button>
                  </form>

                  <form
                    action={declineAssignmentAction}
                    className="flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={row.id}
                    />

                    <input
                      name="decline_reason"
                      placeholder="Reason (optional)"
                      className="input text-sm py-1.5 max-w-xs"
                    />

                    <button className="btn-secondary text-sm py-1.5 px-3">
                      I’m not available
                    </button>
                  </form>
                </div>
              )}

              {row.status === "accepted" && (
                <div className="mt-4">
                  <p className="text-sm text-ink-muted mb-2">
                    If you can no longer attend this assignment, let the
                    coordinator know so replacement coverage can be arranged.
                  </p>

                  <form
                    action={withdrawAssignmentAction}
                    className="flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={row.id}
                    />

                    <input
                      name="decline_reason"
                      placeholder="Reason (optional)"
                      className="input text-sm py-1.5 max-w-xs"
                    />

                    <button className="btn-secondary text-sm py-1.5 px-3">
                      I can no longer attend
                    </button>
                  </form>
                </div>
              )}

              {wasWithdrawn && (
                <div className="mt-4">
                  <p className="text-sm text-ink-muted">
                    You withdrew from this assignment. The request has been
                    returned to the coordinator for replacement coverage.
                  </p>

                  {row.decline_reason && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Reason:</span>{" "}
                      {row.decline_reason}
                    </p>
                  )}
                </div>
              )}

              {row.status === "declined" && !wasWithdrawn && (
                <div className="mt-4">
                  <p className="text-sm text-ink-muted">
                    You declined this assignment.
                  </p>

                  {row.decline_reason && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Reason:</span>{" "}
                      {row.decline_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {rowsWithRequests.length === 0 && (
          <p className="text-ink-muted">
            No assignments yet.
          </p>
        )}
      </div>
    </div>
  );
}
