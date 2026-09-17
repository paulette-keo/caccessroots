import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveRequestorProfileAction } from "./actions";

export default async function RequestorProfilePage({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const profile = await requireProfile();
  const supabase = createSupabaseServerClient();
  const { data: row } = await supabase
    .from("requestor_profiles")
    .select("contact_preference,community_commitment_signed_at")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">My requester profile</h1>
      <p className="mt-1 text-ink-muted">
        Confirm how this learning and pro bono community works before submitting requests.
      </p>

      {searchParams?.saved === "1" && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Your requester profile was saved successfully.
        </div>
      )}

      <form action={saveRequestorProfileAction} className="card mt-6 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="contact_preference">Preferred contact method</label>
          <select
            id="contact_preference"
            name="contact_preference"
            className="input"
            defaultValue={row?.contact_preference ?? "email"}
          >
            <option value="email">Email</option>
            <option value="sms">Text message</option>
            <option value="videophone">Videophone</option>
          </select>
        </div>

        <fieldset className="rounded-xl border border-[#B7D8C4] bg-[#EDF7F1] p-5">
          <legend className="px-2 text-sm font-semibold">Community commitments</legend>
          <div className="space-y-3 text-sm leading-relaxed text-[#374151]">
            <p>
              I understand that CAccessRoots supports pro bono requests through a learning team made up of an Advanced ITP student and a mentor interpreter.
            </p>
            <p>
              I understand that profile information is self-disclosed, not the result of an in-depth vetting process, and that coverage depends on local volunteers. Coverage is not guaranteed.
            </p>
            <p>
              I will share only information needed to coordinate the request, respect the privacy of volunteers, and promptly tell the coordinator if the request changes or is no longer needed.
            </p>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="accept_community_commitment"
              required
              defaultChecked={Boolean(row?.community_commitment_signed_at)}
              className="mt-1"
            />
            <span>I agree to these requester community commitments.</span>
          </label>
        </fieldset>

        <button className="btn-primary w-full">Save profile</button>
      </form>
    </div>
  );
}
