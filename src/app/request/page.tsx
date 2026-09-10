import Link from "next/link";

const ELIGIBLE_EXAMPLES = [
  "Family and holiday gatherings",
  "Weddings, showers, and bachelorette parties",
  "Recreational or sports events",
  "Community activities",
];

export default function RequestInterpreterPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-[#2F6B4F]">
          ← Back to home
        </Link>

        <section className="card mt-5 p-7 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2F6B4F]">
            Request an interpreter
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-[#0A0D12] sm:text-5xl">
            For personal moments that have nowhere else to go.
          </h1>

          <div className="mt-7 rounded-xl border-l-4 border-[#2F6B4F] bg-[#EDF7F1] p-5">
            <h2 className="font-semibold text-[#0A0D12]">
              Before you continue
            </h2>
            <p className="mt-2 leading-relaxed text-[#374151]">
             CAccessRoots provides the platform, interpreters provide their details, and
             the system facilitates matching. Profile details are self-disclosed;
             CAccessRoots does not conduct an in-depth vetting process and cannot
             guarantee coverage. Coverage depends on whether local interpreters volunteer
             to provide pro bono services. If no one offers, our volunteers will send a
             call out to all publicly registered RID members—Associate and Certified—in
             your local area.
            </p>
          </div>

          <div className="mt-8 grid gap-7 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl text-[#0A0D12]">
                Requests this platform is for
              </h2>
              <ul className="mt-4 space-y-2 text-[#374151]">
                {ELIGIBLE_EXAMPLES.map((example) => (
                  <li key={example} className="flex gap-2">
                    <span aria-hidden="true" className="text-[#2F6B4F]">
                      ✓
                    </span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-serif text-2xl text-[#0A0D12]">
                Ask the responsible organization first
              </h2>
              <p className="mt-4 leading-relaxed text-[#374151]">
                Medical providers, schools, employers, courts, government
                offices, and many businesses may be legally responsible for
                communication access. Those requests are not matched
                automatically here.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                If you are unsure, you can still submit the request. A person
                will review it before any interpreter is contacted.
              </p>
            </div>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up?role=requestor&next=/requestor/new-request"
              className="btn-primary text-center"
            >
              Continue to request
            </Link>
            <Link href="/sign-in?next=/requestor/new-request" className="btn-secondary text-center">
              I already have an account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
