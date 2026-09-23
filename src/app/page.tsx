import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      {/* HEADER */}
      <header className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Wordmark size="md" href={null} showSub />
          </Link>

          <nav
            aria-label="Primary"
            className="flex items-center gap-2 sm:gap-3"
          >
            <Link
              href="/sign-in"
              className="rounded-lg border border-[#2F6B4F] px-3 py-2.5 text-sm font-medium text-[#2F6B4F] transition hover:bg-[#EDF7F1] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] focus:ring-offset-2 sm:px-5 sm:text-base"
            >
              Sign in
            </Link>

            <Link
              href="/request"
              className="rounded-lg bg-[#2F6B4F] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#24543E] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] focus:ring-offset-2 sm:px-5 sm:text-base"
            >
              Request help
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 md:pb-24 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-[#EDF7F1] px-4 py-2 text-sm font-medium text-[#2F6B4F]">
              Community-led pro bono access
            </p>

            <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight text-[#0A0D12] md:text-6xl">
              Where access
              <br />
              takes{" "}
              <em className="not-italic text-[#2F6B4F]">root.</em>
            </h1>

            <div className="mt-6 max-w-lg space-y-4 text-lg leading-relaxed text-[#374151]">
              <p>
                Nobody is required to provide an interpreter at a wedding.
                Or a funeral. Or a family meeting about your mother’s care.
                These are the rooms where being understood matters most,
                and they are exactly the rooms the law does not reach.
              </p>

              <p>
                CAccessRoots is a community of learning and practice. Advanced
                ITP students team with experienced mentor interpreters to serve
                pro bono requests—meeting needs today while supporting the next
                generation of community interpreters.
              </p>
            </div>

            <div className="mt-8">
              <div className="flex flex-nowrap gap-3 sm:gap-4">
                <Link
                  href="/request"
                  className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-lg bg-[#2F6B4F] px-3 py-3 text-center text-sm font-medium leading-tight text-white transition hover:bg-[#24543E] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] focus:ring-offset-2 sm:px-6 sm:text-base"
                >
                  Request an interpreter
                </Link>

                <Link
                  href="/sign-up?role=interpreter"
                  className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-lg border border-[#2F6B4F] px-3 py-3 text-center text-sm font-medium leading-tight text-[#2F6B4F] transition hover:bg-[#EDF7F1] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] focus:ring-offset-2 sm:px-6 sm:text-base"
                >
                  Volunteer to interpret
                </Link>
              </div>

              <p className="mt-4 max-w-lg text-center text-sm leading-relaxed text-[#6B7280]">
                Share just enough to make a match. Personal details stay
                between you and your interpreter once you’re connected.
              </p>
            </div>

            <p className="mt-6 text-sm font-medium italic text-[#2F6B4F]">
              Communication. Access. Roots.
            </p>
          </div>

          {/* WHY CACCESROOTS */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 font-serif text-2xl text-[#0A0D12]">
              Why CAccessRoots
            </h2>

            <ul className="space-y-5 text-sm">
              <Feature
                title="Close to home"
                desc="Matching starts with geography. Interpreters see requests within a distance they can actually travel, so giving back fits around real life."
              />

              <Feature
                title="Your circle, respected"
                desc="Deaf communities are small. Name anyone you’d rather not be matched with, and they’ll never see your request. No explanation needed."
              />

              <Feature
                title="A person looks first"
                desc="Tender requests, like a funeral, a family conflict, or a first meeting, get a coordinator’s eyes before anyone is matched. You don’t have to explain why it’s tender."
              />

              <Feature
                title="A student and mentor team"
                desc="Every request brings an Advanced ITP student together with an experienced mentor. Both confirm availability before the team is final."
              />
            </ul>
          </div>
        </div>
      </section>

      {/* COVERAGE GUIDE */}
      <CoverageGuide />

      {/* COMMUNITY SECTION */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-serif text-3xl text-[#0A0D12] md:text-4xl">
            For the moments no one is required to cover
          </h2>

          <div
            className="mx-auto mt-5 h-1 w-12 rounded-full bg-[#2F6B4F]"
            aria-hidden="true"
          />

          <div className="mx-auto mt-8 max-w-3xl space-y-6 text-lg leading-relaxed text-[#374151]">
            <p className="text-center">
              Funerals. Wedding ceremonies. A family meeting about Mom’s care. A hiking group that meets every
              Saturday morning.
            </p>

              <p className="text-center">
              The law follows institutions. It requires an interpreter at the hospital, the courthouse, the school, the
              employer. It stops at the church door, the graveside, the reception hall, and the living room. In those
              rooms nobody is entitled to access, and nobody is entitled to be paid for providing it.
            </p>

              <p className="text-center">
              Which means the moments most likely to go unshared are the ones a person actually remembers. Not
              the deposition. The eulogy.
            </p>

              <p className="text-center">
              Researchers have a name for what happens instead. In a 2020 study in The Qualitative Report, Deaf
              adults described dinner table syndrome: sitting in a room full of family, watching mouths move, waiting
              to be caught up. One participant, describing a Christmas game with her own family, put it plainly.
            </p>

           <blockquote className="rounded-r-xl border-l-4 border-[#2F6B4F] bg-[#EDF7F1] px-6 py-5 text-center italic text-[#374151]">
          <p>“I so wanted to be a part of that. I felt so alone.”</p>

          <footer className="mt-2 text-sm not-italic text-[#6B7280]">
          Study participant, Meek (2020)
          </footer>
          </blockquote>

            <p className="text-center">
              Interpreters and Deaf people built this profession together, in living rooms and church basements, long
              before there were contracts. CAccessRoots is a way back to that.
            </p>
          </div>
        </div>
      </section>

      {/* EXPECTATIONS */}
      <section
        aria-labelledby="expectations-heading"
        className="border-y border-[#E5E7EB] bg-[#F5F6F7] py-16"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="expectations-heading" className="sr-only">
            What to know before getting started
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <ExpectationCard title="Before you request">
              <p>
                Your request becomes part of a community learning opportunity.
                A coordinator assembles an Advanced ITP student and mentor team
                and confirms that both people are available.
              </p>

              <p>
                First, check the list above. If your event is somewhere that’s
                legally required to provide an interpreter, ask them. You’ll
                get a qualified interpreter at their expense, and you’ll keep
                this pool free for the moments that have nowhere else to go.
              </p>

              <p>
                Tell us the basics: date, location, type of event. Keep
                sensitive details out of the form.
              </p>

              <p>
                Once your team is confirmed, share what they should know. Names,
                signs, family dynamics, and anything that helps them serve you
                well can stay within the assignment.
              </p>
            </ExpectationCard>

            <ExpectationCard title="Before you volunteer">
              <p>
                Students and mentors serve side by side. Students gain supported
                practice, and experienced interpreters help guide the work.
              </p>

              <p>
                Interpreting a wedding or a funeral is intimate work. Come
                prepared to meet the family, not just the event.
              </p>

              <p>
                Set an honest service radius and availability. You will always
                confirm that you can attend before the team is finalized.
              </p>
            </ExpectationCard>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10 text-center text-sm text-[#6B7280]">
        <div className="inline-flex items-center justify-center">
          <Wordmark size="md" href={null} />
        </div>

        <p className="mt-4 italic">
          A community-led pro bono platform. No fees, no invoices, no
          contracts—for anyone.
        </p>

        <p className="mt-2 text-xs text-[#6B7280]">
          Communication. Access. Roots.
        </p>
      </footer>
    </main>
  );
}

function Feature({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-4">
      <div
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2F6B4F]"
        aria-hidden="true"
      />

      <div>
        <p className="font-semibold text-[#0A0D12]">{title}</p>
        <p className="mt-1 leading-relaxed text-[#374151]">{desc}</p>
      </div>
    </li>
  );
}

function CoverageGuide() {
  const covered = [
    {
      where:
        "Hospitals, doctors, dentists, therapists, urgent care, and labs",
      detail:
        "The provider. Every appointment, regardless of practice size.",
    },
    {
      where:
        "Courts, police, jury duty, DMV, city council, and government offices",
      detail: "The government agency.",
    },
    {
      where: "Public schools",
      detail:
        "The school district—including IEP meetings, parent-teacher conferences, disciplinary hearings, and school events.",
    },
    {
      where:
        "Colleges, universities, trade schools, and adult education",
      detail: "The institution.",
    },
    {
      where: "Your job, if your employer has 15 or more employees",
      detail:
        "Your employer—including interviews, meetings, training, and workplace events.",
    },
    {
      where: "Businesses open to the public",
      detail:
        "The business—including hotels, restaurants, banks, gyms, theaters, retail stores, funeral homes, and salons.",
    },
    {
      where: "Programs that receive federal money",
      detail:
        "The program, including many nonprofits, clinics, and housing programs.",
    },
  ];

  const notCovered = [
    {
      where: "Religious organizations and activities they operate",
      detail: "Religious organizations are exempt from the ADA outright. A wedding, a funeral, a baptism, a bar mitzvah, or a Sunday service in a house of worship carries no legal obligation to anyone.",
    },
    {
      where: "Private homes",
      detail:
        "Family dinners, baby showers, birthday parties, and family meetings normally have no covered organization responsible for access.",
    },
    {
      where: "Events hosted by a private person",
      detail:
        "Wedding receptions, graduation parties, memorials at someone’s home, and private retirement dinners.",
    },
    {
      where: "Informal and volunteer-run groups",
      detail:
        "Hiking clubs, running groups, book clubs, quilting circles, neighborhood associations, pickup sports. Nobody is a covered entity. Nobody has a budget.",
    },
    {
      where: "Private clubs that genuinely limit membership",
      detail: "Private clubs may be exempt from the ADA.",
    },
    {
      where: "Your job, if your employer has fewer than 15 employees",
      detail:
        "Federal employment protections generally begin at 15 employees.",
    },
    {
      where: "The graveside",
      detail:
        "The funeral home’s services may be covered, while the cemetery service and gathering afterward usually are not.",
    },
  ];

  return (
    <section
      id="coverage-guide"
      aria-labelledby="coverage-heading"
      className="border-y border-[#E5E7EB] bg-white py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* INTRO */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2F6B4F]">
            Know your rights
          </p>

          <h2
            id="coverage-heading"
            className="mt-3 font-serif text-3xl leading-tight text-[#0A0D12] md:text-4xl"
          >
            Before you ask us, check whether someone already owes you.
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-[#374151]">
            Plenty of places are legally required to provide communication
            access and pay for it. If your event is one of them, ask that
            organization first. CAccessRoots exists for moments nobody is
            required to cover.
          </p>
        </div>

        {/* COVERED */}
        <div className="mt-12">
          <CoverageTable
            title="Covered: someone else has to provide it, and they have to pay"
            description="You should not be paying for these, and you should not need a volunteer."
            detailHeading="Who is responsible"
            rows={covered}
          />
        </div>

        {/* TWO THINGS WORTH KNOWING */}
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-[#B6DDC5] bg-[#EDF7F1] p-6 md:p-8">
          <h3 className="font-serif text-2xl text-[#0A0D12]">
            Two things worth knowing
          </h3>

          <div className="mt-4 space-y-4 leading-relaxed text-[#374151]">
            <p>
              They cannot charge you for it. Federal regulation is explicit: a business may not impose a surcharge on a
              person with a disability to cover the cost of an interpreter (28 CFR § 36.301(c)). If someone tells you to
              bring your own interpreter or pay for one yourself, that is not how it works.
            </p>

            <p>
              The standard is effective communication, not “an interpreter, always.” A covered place has to give you
              what actually works for you. For a complex, high-stakes, or long conversation, that is usually a qualified
              interpreter. Written notes are not a substitute for a diagnosis, a court hearing, or a job interview.
            </p>
          </div>
        </div>

        {/* NOT COVERED */}
        <div className="mt-12">
          <CoverageTable
            title="Not covered: nobody is required to provide anything"
            description="This is where CAccessRoots comes in."
            detailHeading="Why it may not be covered"
            rows={notCovered}
          />
        </div>

        {/* CONFUSING MIDDLE */}
        <div className="mx-auto mt-12 max-w-4xl">
          <h3 className="font-serif text-2xl text-[#0A0D12] md:text-3xl">
            It depends: the confusing middle
          </h3>

          <div className="mt-6 space-y-6 leading-relaxed text-[#374151]">
            <div>
              <h4 className="font-semibold text-[#0A0D12]">
                A funeral
              </h4>

              <p className="mt-1">
                The funeral home’s own services are covered, so the arrangements meeting, the paperwork,
                and the director’s conversations with your family should be interpreted at their expense. The church
                service, the eulogy, the graveside, and the reception are not. That split is why so many Deaf people end
                up with a relative interpreting their own father’s funeral.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#0A0D12]">
                A wedding at a hotel or venue
              </h4>

              <p className="mt-1">
                The venue owes you effective communication for its own services, like
                the front desk and the event staff. Nobody owes anyone the vows, the toasts, or the speeches. That is
                the part you actually came for.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#0A0D12]">
                A recreation league or community class
              </h4>

              <p className="mt-1">
               If it runs through a city parks department, a public library, or a college,
               it’s covered. If it’s a group of neighbors with a group chat, it isn’t.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#0A0D12]">
                Your state may go further than federal law.
              </h4>

              <p className="mt-1">
                Some states have stronger requirements or a commission
                that helps fund interpreters for community events. Worth a phone call before assuming no.
              </p>
            </div>
          </div>
        </div>

        {/* CLOSING LINE + LEGAL NOTE */}
        <div className="mx-auto mt-12 max-w-4xl border-t border-[#E5E7EB] pt-8 text-center">
          <p className="text-lg leading-relaxed text-[#374151]">
            Even where the law is on your side, asking and receiving are two
            different things, and Deaf people know that better than anyone. If
            a covered place refuses you, that’s worth pursuing. If nobody was
            ever required in the first place, that’s worth a request here.
          </p>

          <p className="mx-auto mt-5 max-w-3xl text-sm italic leading-relaxed text-[#6B7280]">
            This is a plain-language summary, not legal advice. If you’ve been
            denied an interpreter somewhere that’s required to provide one,
            the National Association of the Deaf and your state’s Deaf and
            hard of hearing commission can help.
          </p>
        </div>
      </div>
    </section>
  );
}

function CoverageTable({
  title,
  description,
  detailHeading,
  rows,
}: {
  title: string;
  description: string;
  detailHeading: string;
  rows: Array<{
    where: string;
    detail: string;
  }>;
}) {
  return (
    <div>
      <h3 className="text-center font-serif text-2xl text-[#0A0D12] md:text-3xl">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-3xl text-center leading-relaxed text-[#374151]">
        {description}
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#D1D5DB]">
        <table className="w-full min-w-[700px] border-collapse bg-white text-left">
          <thead className="bg-[#173629] text-white">
            <tr>
              <th
                scope="col"
                className="w-2/5 px-5 py-4 font-semibold"
              >
                Where
              </th>

              <th
                scope="col"
                className="px-5 py-4 font-semibold"
              >
                {detailHeading}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#D1D5DB]">
            {rows.map((row, index) => (
              <tr
                key={row.where}
                className={
                  index % 2 === 0
                    ? "bg-white"
                    : "bg-[#F5F6F7]"
                }
              >
                <th
                  scope="row"
                  className="px-5 py-4 align-top font-semibold text-[#0A0D12]"
                >
                  {row.where}
                </th>

                <td className="px-5 py-4 align-top leading-relaxed text-[#374151]">
                  {row.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpectationCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
      <h3 className="text-center font-serif text-2xl text-[#0A0D12]">
        {title}
      </h3>

      <div className="mt-5 space-y-4 leading-relaxed text-[#374151]">
        {children}
      </div>
    </article>
  );
}
