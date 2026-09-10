import { createRequestAction } from "./actions";
import {
  COVERAGE_RESPONSES,
  EVENT_TYPES,
} from "@/lib/request-workflow";

export default function NewRequestPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">
        New request
      </h1>

      <p className="text-ink-muted mt-1">
        Tell us the basics. Requests marked for review are held until a person
        confirms that they belong on CAccessRoots.
      </p>

      <form
        action={createRequestAction}
        className="card p-6 space-y-4 mt-6"
      >
        <div className="rounded-xl border-l-4 border-[#2F6B4F] bg-[#EDF7F1] p-4 text-sm leading-relaxed text-[#374151]">
          <p className="font-semibold text-[#0A0D12]">
            Platform disclaimer
          </p>

          <p className="mt-1">
            CAccessRoots provides the platform, interpreters provide their
            details, and the system facilitates matching. Profile details are
            self-disclosed; CAccessRoots does not conduct an in-depth vetting
            process and cannot guarantee coverage. Coverage depends on whether
            local interpreters volunteer to provide pro bono services. If no
            one offers, our volunteers will send a call out to all publicly
            registered RID members—Associate and Certified—in your local area.
          </p>

          <label className="mt-3 flex items-start gap-2 font-medium">
            <input
              type="checkbox"
              name="disclaimer_accepted"
              value="yes"
              required
              className="mt-1"
            />

            <span>
              I understand and want to continue.
            </span>
          </label>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium">
            Is another organization responsible for providing access?
          </legend>

          <p className="mb-3 text-xs leading-relaxed text-ink-muted">
            This may include a medical provider, school, employer, court,
            government office, or business. Choosing “yes” or “not sure” sends
            the request to a person for review before matching.
          </p>

          <div className="space-y-2 text-sm">
            {COVERAGE_RESPONSES.map(
              (response, index) => (
                <label
                  key={response.value}
                  className="flex items-start gap-2"
                >
                  <input
                    type="radio"
                    name="coverage_responsibility"
                    value={response.value}
                    required
                    defaultChecked={index === 0}
                    className="mt-1"
                  />

                  <span>{response.label}</span>
                </label>
              )
            )}
          </div>
        </fieldset>

        <div>
          <label
            className="label"
            htmlFor="title"
          >
            Title
          </label>

          <input
            id="title"
            name="title"
            required
            className="input"
            placeholder="e.g. Grandma's 80th birthday dinner"
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="description"
          >
            Practical details (optional)
          </label>

          <textarea
            id="description"
            name="description"
            className="input min-h-[88px]"
            placeholder="Share only practical details needed to make a match. Save names, signs, and family details for your interpreter after you're connected."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              className="label"
              htmlFor="event_type"
            >
              Event type
            </label>

            <select
              id="event_type"
              name="event_type"
              className="input"
            >
              {EVENT_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-ink-muted">
              Funeral, memorial, and Other requests are always reviewed before
              matching.
            </p>
          </div>

          <div>
            <label
              className="label"
              htmlFor="modality"
            >
              Modality
            </label>

            <select
              id="modality"
              name="modality"
              className="input"
            >
              <option value="in_person">
                In person
              </option>

              <option value="video">
                Video
              </option>
            </select>
          </div>
        </div>

        <div>
          <label
            className="label"
            htmlFor="other_event_type"
          >
            If you chose Other, briefly describe the type of event
          </label>

          <input
            id="other_event_type"
            name="other_event_type"
            className="input"
            placeholder="Event type only — do not include names or private details"
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="languages_needed"
          >
            Languages needed
          </label>

          <input
            id="languages_needed"
            name="languages_needed"
            defaultValue="ASL"
            className="input"
            placeholder="ASL, ProTactile, etc. — comma separated"
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="event_address"
          >
            Event address
          </label>

          <input
            id="event_address"
            name="event_address"
            required
            className="input"
            placeholder="123 Main St, Springfield, VA"
          />

          <p className="text-xs text-ink-muted mt-1">
            We&apos;ll geocode this to find interpreters near the location.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              className="label"
              htmlFor="event_start"
            >
              Start
            </label>

            <input
              id="event_start"
              name="event_start"
              type="datetime-local"
              required
              className="input"
            />
          </div>

          <div>
            <label
              className="label"
              htmlFor="event_end"
            >
              End
            </label>

            <input
              id="event_end"
              name="event_end"
              type="datetime-local"
              required
              className="input"
            />
          </div>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium">
            Sensitivity
          </legend>

          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="sensitivity"
                value="standard"
                defaultChecked
                className="mt-1"
              />

              <span>
                <span className="font-medium">
                  Standard.
                </span>{" "}
                A coordinator can propose a nearby interpreter for you to
                approve.
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="sensitivity"
                value="sensitive"
                className="mt-1"
              />

              <span>
                <span className="font-medium">
                  Sensitive.
                </span>{" "}
                Funeral, family conflict, a first meeting, or another intimate
                context. A coordinator and admin will review the category
                before proposing a match to you. You do not need to explain why
                it is sensitive.
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium">
            Does this request involve anyone under 18?
          </legend>

          <p className="mb-3 text-xs text-ink-muted">
            Requests involving minors are held for review and are never
            automatically matched.
          </p>

          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="involves_minor"
                value="no"
                defaultChecked
                required
              />

              <span>No</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="involves_minor"
                value="yes"
                required
              />

              <span>Yes</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium">
            Are you willing to be matched with an Advanced ITP student?
          </legend>

          <p className="mb-3 text-xs leading-relaxed text-ink-muted">
            Student status and college or ITP program information are
            self-disclosed and clearly shown before you approve a proposed
            match. Selecting No will prevent student profiles from being
            proposed for this request.
          </p>

          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="student_interpreter_allowed"
                value="yes"
                required
                className="mt-1"
              />

              <span>
                Yes, I am open to an Advanced ITP student.
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="student_interpreter_allowed"
                value="no"
                required
                className="mt-1"
              />

              <span>
                No, do not propose an Advanced ITP student.
              </span>
            </label>
          </div>
        </fieldset>

        <p className="text-xs text-ink-muted">
          Reminder: interpreters on your blocklist will never see this request.
          Manage your blocklist anytime from{" "}
          <strong>My blocklist</strong>.
        </p>

        <button className="btn-primary w-full">
          Submit request
        </button>
      </form>
    </div>
  );
}
