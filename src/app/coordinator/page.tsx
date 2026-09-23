import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, relativeFromNow } from "@/lib/utils";
import { eventTypeLabel, requestStatusLabel } from "@/lib/request-workflow";

export default async function CoordinatorQueue() {
  const supabase = createSupabaseServerClient();
  const { data: queue } = await supabase
    .from("requests")
    .select(
      "id,title,event_type,event_address,event_start,event_end,status,sensitivity,languages_needed,modality,requestor:requestor_id(full_name)"
    )
    .in("status", ["pending_review", "open", "proposed", "pending_acceptance"])
    .order("event_start", { ascending: true });

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

      <div className="card mt-6 overflow-hidden">
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
    </div>
  );
}
