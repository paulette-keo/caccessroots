"use client";

import { useState } from "react";

type StudentStatusFieldsProps = {
  defaultIsAdvancedItpStudent: boolean;
  defaultCollegeName: string;
};

export function StudentStatusFields({
  defaultIsAdvancedItpStudent,
  defaultCollegeName,
}: StudentStatusFieldsProps) {
  const [isAdvancedItpStudent, setIsAdvancedItpStudent] = useState(
    defaultIsAdvancedItpStudent
  );

  return (
    <fieldset className="rounded-xl border border-slate-200 p-4 space-y-4">
      <legend className="px-2 text-sm font-medium">Student status</legend>

      <p className="text-xs text-ink-muted">
        Select one answer. Choosing one automatically clears the other.
      </p>

      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="is_advanced_itp_student"
            value="yes"
            checked={isAdvancedItpStudent}
            onChange={() => setIsAdvancedItpStudent(true)}
            required
          />
          Yes, I am currently an Advanced ITP student
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="is_advanced_itp_student"
            value="no"
            checked={!isAdvancedItpStudent}
            onChange={() => setIsAdvancedItpStudent(false)}
            required
          />
          No, I am a working interpreter
        </label>
      </div>

      <div>
        <label className="label" htmlFor="college_name">
          College or ITP program
        </label>

        <input
          id="college_name"
          name="college_name"
          className="input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-ink-muted"
          defaultValue={defaultCollegeName}
          placeholder="Name of your college or ITP program"
          required={isAdvancedItpStudent}
          disabled={!isAdvancedItpStudent}
        />

        <p className="mt-1 text-xs text-ink-muted">
          {isAdvancedItpStudent
            ? "Required because Advanced ITP student is selected."
            : "Available only when Advanced ITP student is selected."}
        </p>
      </div>
    </fieldset>
  );
}
