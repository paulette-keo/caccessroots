import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createInterpreterPhotoUrl } from "@/lib/interpreter-photos";
import { saveInterpreterProfileAction } from "./actions";
import { ProfileMediaUploader } from "./profile-media-uploader";
import { StudentStatusFields } from "./student-status-fields";
import { CertificationFields } from "./certification-fields";

const AVAILABLE_DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

const TIME_BLOCKS = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
] as const;

export default async function InterpreterProfilePage({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const profile = await requireProfile();
  const supabase = createSupabaseServerClient();

  const { data: row } = await supabase
    .from("interpreter_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const profilePhotoUrl =
    await createInterpreterPhotoUrl(
      supabase,
      row?.profile_photo_path
    );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">
        My interpreter profile
      </h1>

      <p className="text-ink-muted mt-1">
  This information helps us match you with requests close to home and
  appropriate to your skills.
</p>

{searchParams?.saved === "1" && (
  <div
    role="status"
    className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
  >
    Your interpreter profile was saved successfully.
  </div>
)}

<form
  action={saveInterpreterProfileAction}
        className="card p-6 mt-6 space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="home_address"
          >
            Home address
          </label>

          <input
            id="home_address"
            name="home_address"
            required
            className="input"
            defaultValue={row?.home_address ?? ""}
            placeholder="Street, City, State"
          />

          <p className="text-xs text-ink-muted mt-1">
            Used to compute distance and travel time. Your full address is
            never shown to requestors.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              className="label"
              htmlFor="service_radius_miles"
            >
              Service radius (miles)
            </label>

            <input
              id="service_radius_miles"
              name="service_radius_miles"
              type="number"
              min={1}
              max={500}
              required
              defaultValue={
                row?.service_radius_miles ?? 25
              }
              className="input"
            />
          </div>

          <div>
            <label
              className="label"
              htmlFor="languages"
            >
              Languages
            </label>

            <input
              id="languages"
              name="languages"
              defaultValue={(
                row?.languages ?? ["ASL"]
              ).join(", ")}
              className="input"
              placeholder="ASL, ProTactile, etc."
            />
          </div>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium">
            Modalities
          </legend>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="modalities"
                value="in_person"
                defaultChecked={
                  row?.modalities?.includes(
                    "in_person"
                  ) ?? true
                }
              />
              In person
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="modalities"
                value="video"
                defaultChecked={
                  row?.modalities?.includes(
                    "video"
                  ) ?? false
                }
              />
              Video
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4 space-y-4">
          <legend className="px-2 text-sm font-medium">
            Availability
          </legend>

          <input
            type="hidden"
            name="availability_fields_present"
            value="true"
          />

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="accepting_requests"
              defaultChecked={
                row?.accepting_requests ?? true
              }
              className="mt-1"
            />

            <span>
              <span className="block font-medium">
                I am currently accepting requests
              </span>

              <span className="block text-xs text-ink-muted mt-1">
                Turn this off if you want to temporarily pause new matches.
              </span>
            </span>
          </label>

          <div>
            <p className="label">
              Days generally available
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AVAILABLE_DAYS.map(
                ([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="available_days"
                      value={value}
                      defaultChecked={
                        row?.available_days?.includes(
                          value
                        ) ?? false
                      }
                    />
                    {label}
                  </label>
                )
              )}
            </div>

            <p className="text-xs text-ink-muted mt-2">
              Leave all days unchecked if your schedule is flexible or varies.
            </p>
          </div>

          <div>
            <p className="label">
              Preferred times
            </p>

            <div className="flex flex-wrap gap-4">
              {TIME_BLOCKS.map(
                ([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="preferred_time_blocks"
                      value={value}
                      defaultChecked={
                        row?.preferred_time_blocks?.includes(
                          value
                        ) ?? false
                      }
                    />
                    {label}
                  </label>
                )
              )}
            </div>

            <p className="text-xs text-ink-muted mt-2">
              Leave all times unchecked if you do not have a regular
              preference.
            </p>
          </div>

          <div>
            <label
              className="label"
              htmlFor="unavailable_until"
            >
              Unavailable until
            </label>

            <input
              id="unavailable_until"
              name="unavailable_until"
              type="date"
              className="input"
              defaultValue={
                row?.unavailable_until ?? ""
              }
            />

            <p className="text-xs text-ink-muted mt-1">
              Optional. Use this for a vacation, leave, or other temporary
              break.
            </p>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4 space-y-4">
          <legend className="px-2 text-sm font-medium">
            Qualifications and experience
          </legend>

          <CertificationFields
            defaultIsCertified={row?.is_certified ?? null}
            defaultCredentials={row?.credentials ?? ""}
            defaultCertifications={(row?.certifications ?? []).join(", ")}
          />

          <div>
              <label
                className="label"
                htmlFor="experience_band"
              >
                Interpreting experience
              </label>

              <select
                id="experience_band"
                name="experience_band"
                className="input"
                defaultValue={
                  row?.experience_band ?? ""
                }
              >
                <option value="">
                  Select an experience level
                </option>
                <option value="less_than_2">
                  Less than 2 years
                </option>
                <option value="2_to_5">
                  2–5 years
                </option>
                <option value="6_to_10">
                  6–10 years
                </option>
                <option value="11_plus">
                  11+ years
                </option>
              </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                className="label"
                htmlFor="licenses"
              >
                Licenses
              </label>

              <input
                id="licenses"
                name="licenses"
                className="input"
                defaultValue={(
                  row?.licenses ?? []
                ).join(", ")}
                placeholder="State license or permit"
              />
            </div>

            <div>
              <label
                className="label"
                htmlFor="specialties"
              >
                Specialties
              </label>

              <input
                id="specialties"
                name="specialties"
                className="input"
                defaultValue={(
                  row?.specialties ?? []
                ).join(", ")}
                placeholder="DeafBlind, medical, legal"
              />
            </div>
          </div>
        </fieldset>

        <ProfileMediaUploader
          userId={profile.id}
          fullName={profile.full_name}
          currentPhotoPath={
            row?.profile_photo_path ?? null
          }
          currentPhotoUrl={profilePhotoUrl}
        />

        <div>
          <label className="label" htmlFor="professional_profile_url">
            Professional, LinkedIn, or practicum profile link (optional)
          </label>
          <input
            id="professional_profile_url"
            name="professional_profile_url"
            type="url"
            className="input"
            defaultValue={row?.professional_profile_url ?? ""}
            placeholder="https://…"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Requesters and coordinators can open this link when reviewing a team match.
          </p>
        </div>

        <StudentStatusFields
          defaultIsAdvancedItpStudent={
            row?.is_advanced_itp_student ?? false
          }
          defaultCollegeName={row?.college_name ?? ""}
        />
  
        <fieldset className="rounded-xl border border-slate-200 p-4 space-y-3">
          <legend className="px-2 text-sm font-medium">
            Mentorship and student support
          </legend>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="willing_to_mentor"
              defaultChecked={
                row?.willing_to_mentor ?? false
              }
              className="mt-1"
            />

            <span>
              I am willing to mentor another
              interpreter.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="willing_to_work_with_students"
              defaultChecked={
                row?.willing_to_work_with_students ??
                false
              }
              className="mt-1"
            />

            <span>
              I am willing to work with approved
              interpreting students.
            </span>
          </label>
        </fieldset>

        <div>
          <label
            className="label"
            htmlFor="pro_bono_commitment"
          >
            Your pro bono commitment statement
          </label>

          <textarea
            id="pro_bono_commitment"
            name="pro_bono_commitment"
            className="input min-h-[96px]"
            defaultValue={
              row?.pro_bono_commitment ?? ""
            }
            placeholder="A few sentences about why you give pro bono time and what you'll offer the community."
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="accept_pro_bono"
            required
            defaultChecked={
              !!row?.pro_bono_signed_at
            }
            className="mt-1"
          />

            <span>
              I commit to this pro bono learning community. I will provide
              accurate profile details, protect requester privacy, confirm my
              availability before accepting an assignment, support respectful
              student-and-mentor teamwork, and recuse myself from conflicts.
            </span>
        </label>

        <button className="btn-primary w-full">
          Save profile
        </button>
      </form>
    </div>
  );
}
