import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInterpreterPhotoUrl } from "@/lib/interpreter-photos";
import { userRoleLabel } from "@/lib/types";

export default async function InterpretersDirectoryPage() {
  const supabase =
    createSupabaseServerClient();

  const { data: interpreters } =
    await supabase
      .from("profiles")
      .select(
        "id,full_name,email,role,status,interp:interpreter_profiles(home_address,service_radius_miles,languages,credentials,is_certified,certifications,licenses,specialties,experience_band,profile_photo_path,professional_profile_url,willing_to_mentor,willing_to_work_with_students,is_advanced_itp_student,college_name,accepting_requests,available_days,preferred_time_blocks,unavailable_until,total_completed,pro_bono_signed_at)"
      )
      .in("role", [
        "student_interpreter",
        "mentor_interpreter",
        "interpreter",
      ])
      .order("full_name");

  const interpreterRows = await Promise.all(
    (interpreters ?? []).map(
      async (interpreter: any) => ({
        ...interpreter,

        profilePhotoUrl:
          await createInterpreterPhotoUrl(
            supabase,
            interpreter.interp
              ?.profile_photo_path
          ),
      })
    )
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Interpreters
      </h1>

      <p className="text-ink-muted mt-1">
        The full roster of pro bono interpreters.
      </p>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-left text-ink-muted">
            <tr>
              <th className="px-4 py-2">
                Name
              </th>

              <th className="px-4 py-2">
                Home
              </th>

              <th className="px-4 py-2">
                Radius
              </th>

              <th className="px-4 py-2">
                Qualifications
              </th>

              <th className="px-4 py-2">
                Languages
              </th>

              <th className="px-4 py-2">
                Availability
              </th>

              <th className="px-4 py-2">
                Pro bono done
              </th>

              <th className="px-4 py-2">
                Account status
              </th>
            </tr>
          </thead>

          <tbody>
            {interpreterRows.map((p: any) => (
              <tr
                key={p.id}
                className="border-t border-slate-100 align-top"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.profilePhotoUrl ? (
                      <img
                        src={p.profilePhotoUrl}
                        alt={`${p.full_name} profile`}
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-ink-muted">
                        {p.full_name
                          ?.charAt(0)
                          ?.toUpperCase() ?? "I"}
                      </div>
                    )}

                    <div>
                      <p className="font-medium">
                        {p.full_name}
                      </p>

                      <p className="text-xs text-ink-muted">
                        {p.email}
                      </p>

                      <span className="badge mt-1 bg-brand-50 text-brand-700">
                        {userRoleLabel(p.role)}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  {p.interp?.home_address ?? "—"}
                </td>

                <td className="px-4 py-3">
                  {p.interp
                    ?.service_radius_miles ?? "—"}{" "}
                  mi
                </td>

                <td className="px-4 py-3">
                  <p>
                    {p.interp?.is_certified === true
                      ? "Certified"
                      : p.interp?.is_certified ===
                          false
                        ? "Not certified"
                        : "Certification not provided"}
                  </p>

                  {p.interp?.experience_band && (
                    <p className="text-xs text-ink-muted">
                      {experienceBandLabel(
                        p.interp.experience_band
                      )}
                    </p>
                  )}

                  {p.interp?.specialties?.length >
                    0 && (
                    <p className="text-xs text-ink-muted">
                      {p.interp.specialties.join(
                        ", "
                      )}
                    </p>
                  )}

                  {p.interp
  ?.is_advanced_itp_student && (
  <div className="mt-2">
    <span className="badge bg-blue-50 text-blue-700">
      Advanced ITP student
    </span>

    {p.interp.college_name && (
      <p className="mt-1 text-xs text-ink-muted">
        {p.interp.college_name}
      </p>
    )}
  </div>
)}
                  
                  {p.interp?.professional_profile_url && (
                    <a
                      href={p.interp.professional_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-brand-700 underline"
                    >
                      View professional profile
                    </a>
                  )}
                </td>

                <td className="px-4 py-3">
                  {p.interp?.languages?.join(
                    ", "
                  ) ?? "—"}
                </td>

                <td className="px-4 py-3">
                  <AvailabilityDetails
                    interpreter={p.interp}
                  />
                </td>

                <td className="px-4 py-3">
                  {p.interp?.total_completed ?? 0}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`badge capitalize ${
                      p.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : p.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}

            {interpreterRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-ink-muted"
                >
                  No interpreter profiles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    return (
      <span className="text-ink-muted">
        Not provided
      </span>
    );
  }

  const availableDays =
    interpreter.available_days ?? [];

  const preferredTimeBlocks =
    interpreter.preferred_time_blocks ?? [];

  const isAccepting =
    interpreter.accepting_requests ?? true;

  const unavailableUntil =
    interpreter.unavailable_until as
      | string
      | null;

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const isTemporarilyUnavailable =
    Boolean(
      unavailableUntil &&
        unavailableUntil >= today
    );

  const availabilityLabel = !isAccepting
    ? "Paused"
    : isTemporarilyUnavailable
      ? "Temporarily unavailable"
      : "Accepting requests";

  const availabilityColor =
    availabilityLabel === "Accepting requests"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className="min-w-48 space-y-1">
      <span
        className={`badge ${availabilityColor}`}
      >
        {availabilityLabel}
      </span>

      <p className="text-xs text-ink-muted">
        <span className="font-medium text-ink">
          Days:
        </span>{" "}
        {availableDays.length > 0
          ? availableDays
              .map(formatAvailabilityLabel)
              .join(", ")
          : "Flexible"}
      </p>

      <p className="text-xs text-ink-muted">
        <span className="font-medium text-ink">
          Times:
        </span>{" "}
        {preferredTimeBlocks.length > 0
          ? preferredTimeBlocks
              .map(formatAvailabilityLabel)
              .join(", ")
          : "Flexible"}
      </p>

      {isTemporarilyUnavailable &&
        unavailableUntil && (
          <p className="text-xs font-medium text-amber-700">
            Unavailable until{" "}
            {formatAvailabilityDate(
              unavailableUntil
            )}
          </p>
        )}
    </div>
  );
}

function formatAvailabilityLabel(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatAvailabilityDate(
  value: string
) {
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
