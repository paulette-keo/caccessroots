import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatDateTime, relativeFromNow } from "@/lib/utils";
import { requestStatusLabel } from "@/lib/request-workflow";

export default async function RequestorHome() {
  const profile = await requireProfile();
  const supabase = createSupabaseServerClient();

  const { data: requestorProfile } = await supabase
    .from("requestor_profiles")
    .select("community_commitment_signed_at")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: open } = await supabase
    .from("requests")
    .select("id,title,event_start,event_address,status,sensitivity")
    .eq("requestor_id", profile.id)
    .in("status", ["draft", "pending_review", "open", "proposed", "pending_acceptance", "assigned"])
    .order("event_start", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold">
          Hi {profile.preferred_name || profile.full_name.split(" ")[0]}.
        </h1>
        <p className="text-ink-muted mt-1">
          Welcome to CAccessRoots. Submit a request when you need an interpreter, and
          our coordinators will work to find someone who's a fit.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/requestor/new-request" className="btn-primary">
            New request
          </Link>
          <Link href="/requestor/blocklist" className="btn-secondary">
            Manage my blocklist
          </Link>
        </div>
      </section>

      {!requestorProfile?.community_commitment_signed_at && (
        <section className="card border-l-4 border-amber-400 p-6">
          <h2 className="font-semibold">Complete your requester profile</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Review the community commitments before submitting a request.
          </p>
          <Link href="/requestor/profile" className="btn-primary mt-4 inline-block">
            Complete profile
          </Link>
        </section>
      )}

      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My upcoming requests</h2>
          <Link href="/requestor/requests" className="text-sm text-brand-600">
            View all →
          </Link>
        </div>
        {open && open.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {open.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-ink-muted">
                    {formatDateTime(r.event_start)} •{" "}
                    {relativeFromNow(r.event_start)} • {r.event_address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.sensitivity === "sensitive" && (
                    <span className="badge bg-terra-100 text-terra-900">
                      Sensitive
                    </span>
                  )}
                  <span className="badge bg-brand-50 text-brand-700 capitalize">
                    {requestStatusLabel(r.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">
            No upcoming requests. Tap{" "}
            <Link href="/requestor/new-request" className="text-brand-600">
              New request
            </Link>{" "}
            to get started.
          </p>
        )}
      </section>
    </div>
  );
}
