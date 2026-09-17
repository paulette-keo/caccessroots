"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";
import type { UserRole } from "@/lib/types";

const ROLES: {
  value: UserRole;
  label: string;
  desc: string;
}[] = [
  {
    value: "requestor",
    label: "I'm requesting an interpreter",
    desc: "Deaf community members requesting pro bono interpreting for personal moments.",
  },
  {
    value: "interpreter",
    label: "I'm a volunteer interpreter",
    desc: "Interpreters offering pro bono service close to home.",
  },
];

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const nextParam = params.get("next");

  const initialRole: UserRole =
    roleParam === "interpreter" || roleParam === "requestor"
      ? roleParam
      : "requestor";
  const hasLockedRole =
    roleParam === "interpreter" || roleParam === "requestor";

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [commitmentAccepted, setCommitmentAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          community_commitment_accepted: commitmentAccepted,
        },
      },
    });

    if (signUpErr) {
      setLoading(false);
      setError(signUpErr.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      setError("Your account could not be created. Please try again.");
      return;
    }

    if (!data.session) {
      setLoading(false);
      setError(
        "Your account was created, but no login session was started. Please sign in."
      );
      return;
    }

    setLoading(false);

    if (role === "requestor") {
      window.location.href =
        nextParam?.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/requestor";
      return;
    }

    window.location.href = "/pending-approval";
  }

  const isInterpreter = role === "interpreter";

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-12">
      <div
        className={`mx-auto w-full ${
          isInterpreter
            ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-8"
            : "max-w-xl"
        }`}
      >
        {isInterpreter && <VolunteerRecruitingSection />}

        <div
          className={`card w-full p-8 ${
            isInterpreter ? "mt-8 lg:mt-0" : ""
          }`}
        >
          <Link
            href={role === "requestor" && hasLockedRole ? "/request" : "/"}
            className="text-sm text-[#2F6B4F]"
          >
            ← Back
          </Link>

          <div className="mb-2 mt-4">
            <Wordmark size="sm" href={null} />
          </div>

          {isInterpreter ? (
            <h2 className="mt-2 font-serif text-3xl text-[#0A0D12]">
              Welcome to the roots.
            </h2>
          ) : (
            <h1 className="mt-2 font-serif text-3xl text-[#0A0D12]">
              Welcome to the roots.
            </h1>
          )}

          <p className="mt-1 text-sm text-[#6B7280]">
            {hasLockedRole
              ? "Create your account to continue."
              : "Tell us which account you’d like."}
          </p>

          {hasLockedRole ? (
            <div className="mt-6 rounded-xl border border-[#2F6B4F] bg-[#EDF7F1] p-4">
              <p className="font-medium text-[#0A0D12]">
                {ROLES.find((option) => option.value === role)?.label}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {ROLES.find((option) => option.value === role)?.desc}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    role === r.value
                      ? "border-[#2F6B4F] bg-[#EDF7F1]"
                      : "border-[#E5E7EB] hover:border-[#2F6B4F]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      className="mt-1"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                    />

                    <div>
                      <p className="font-medium text-[#0A0D12]">
                        {r.label}
                      </p>

                      <p className="text-sm text-[#6B7280]">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="fullName">
                Full name
              </label>

              <input
                id="fullName"
                required
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={8}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <p className="mt-1 text-xs text-[#6B7280]">
                At least 8 characters.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#B7D8C4] bg-[#EDF7F1] p-4 text-sm leading-relaxed text-[#374151]">
              <input
                type="checkbox"
                required
                checked={commitmentAccepted}
                onChange={(event) => setCommitmentAccepted(event.target.checked)}
                className="mt-1"
              />
              <span>
                {isInterpreter
                  ? "I agree to participate in this pro bono learning community, protect requester privacy, provide accurate profile information, and confirm my availability before accepting a student or mentor assignment."
                  : "I understand that each request is supported by an Advanced ITP student and mentor, profile details are self-disclosed, and volunteer coverage cannot be guaranteed. I agree to protect the privacy of the people who serve my request."}
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-[#FEF3F2] px-3 py-2 text-sm text-[#B42318]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-[#2F6B4F] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function VolunteerRecruitingSection() {
  return (
    <section
      aria-labelledby="volunteer-recruiting-heading"
      className="rounded-2xl bg-[#173629] p-7 shadow-sm sm:p-9"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-[#A7E0BF]">
        Volunteer to interpret
      </p>

      <h1
        id="volunteer-recruiting-heading"
        className="mt-3 font-serif text-4xl font-medium leading-tight text-[#F9FAFB] sm:text-5xl"
      >
        Thank you for your commitment to pro bono interpreting.
      </h1>
    
      <p className="mt-4 text-lg leading-relaxed text-[#E5E7EB]">
        We’re building a community of learning and practice where Advanced
        ITP students team with experienced mentors to serve local pro bono
        requests. Every match helps meet a need today while strengthening the
        interpreting community for the future.
      </p>

      <p className="mt-6 leading-relaxed text-[#E5E7EB]">
        Students gain supported, real-world experience. Mentors share judgment
        and practice. Deaf requesters receive a coordinated team for moments
        that may otherwise go uncovered.
      </p>

      <div className="mt-4 rounded-r-xl border-l-4 border-[#5EAA7D] bg-white/10 px-5 py-4 text-lg leading-relaxed text-[#F9FAFB]">
        Learn together. Serve together. Grow the next generation of community interpreters.
      </div>

      <p className="mt-6 leading-relaxed text-[#E5E7EB]">
        Choose the distance and availability that work for you. Coordinators
        assemble each student-and-mentor team, and every volunteer confirms
        availability before the assignment is final.
      </p>
    </section>
  );
}

function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFA] px-4">
      <div className="card w-full max-w-xl p-8">
        <Wordmark size="sm" href={null} />

        <p className="mt-4 text-sm text-[#6B7280]">
          Loading sign up…
        </p>
      </div>
    </main>
  );
}
