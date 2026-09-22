"use client";

import { useState } from "react";

export type InterpreterPath = "student" | "mentor";

export function InterpreterPathFields({
  defaultPath,
  defaultCollegeName,
}: {
  defaultPath: InterpreterPath | null;
  defaultCollegeName: string;
}) {
  const [path, setPath] = useState<InterpreterPath | null>(defaultPath);

  return (
    <fieldset className="rounded-xl border border-[#B7D8C4] bg-[#EDF7F1] p-5 space-y-4">
      <legend className="px-2 text-sm font-semibold">Volunteer profile</legend>

      <div>
        <p className="font-medium text-[#0A0D12]">How will you participate?</p>
        <p className="mt-1 text-xs text-ink-muted">
          Choose one profile. You can update this later if your role changes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className={`cursor-pointer rounded-xl border p-4 ${
            path === "student"
              ? "border-[#2F6B4F] bg-white"
              : "border-[#D1D5DB] bg-white/60"
          }`}
        >
          <span className="flex items-start gap-3">
            <input
              type="radio"
              name="interpreter_path"
              value="student"
              checked={path === "student"}
              onChange={() => setPath("student")}
              required
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Advanced ITP Student</span>
              <span className="mt-1 block text-xs text-ink-muted">
                Participate in pro bono requests with an experienced mentor.
              </span>
            </span>
          </span>
        </label>

        <label
          className={`cursor-pointer rounded-xl border p-4 ${
            path === "mentor"
              ? "border-[#2F6B4F] bg-white"
              : "border-[#D1D5DB] bg-white/60"
          }`}
        >
          <span className="flex items-start gap-3">
            <input
              type="radio"
              name="interpreter_path"
              value="mentor"
              checked={path === "mentor"}
              onChange={() => setPath("mentor")}
              required
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Mentor Interpreter</span>
              <span className="mt-1 block text-xs text-ink-muted">
                Serve alongside and support an Advanced ITP student.
              </span>
            </span>
          </span>
        </label>
      </div>

      {path === "student" ? (
        <div>
          <label className="label" htmlFor="college_name">
            College or ITP program
          </label>
          <input
            id="college_name"
            name="college_name"
            className="input"
            defaultValue={defaultCollegeName}
            placeholder="Name of your college or ITP program"
            required
          />
          <p className="mt-1 text-xs text-ink-muted">
            Required for the Advanced ITP Student profile.
          </p>
        </div>
      ) : path === "mentor" ? (
        <div className="space-y-3 rounded-lg bg-white px-4 py-3 text-sm text-[#374151]">
          <p>
            Your profile will be listed for the Mentor position. Coordinators will
            review your experience, availability, and qualifications before sending
            an invitation.
          </p>

          <label className="flex items-start gap-2 font-medium text-[#0A0D12]">
            <input
              type="checkbox"
              name="mentor_commitment"
              required
              className="mt-1"
            />
            <span>
              I agree to support Advanced ITP students as a Mentor Interpreter.
            </span>
          </label>
        </div>
      ) : (
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-[#374151]">
          Select the profile that describes how you will participate.
        </p>
      )}
    </fieldset>
  );
}
