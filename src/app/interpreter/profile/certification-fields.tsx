"use client";

import { useState } from "react";

export function CertificationFields({
  defaultIsCertified,
  defaultCredentials,
  defaultCertifications,
}: {
  defaultIsCertified: boolean | null;
  defaultCredentials: string;
  defaultCertifications: string;
}) {
  const [answer, setAnswer] = useState(
    defaultIsCertified === true ? "yes" : defaultIsCertified === false ? "no" : ""
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="is_certified">Are you currently certified?</label>
        <select
          id="is_certified"
          name="is_certified"
          className="input"
          required
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        >
          <option value="">Select an answer</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      {answer === "yes" && (
        <div className="space-y-4 rounded-xl bg-slate-50 p-4">
          <div>
            <label className="label" htmlFor="credentials">Credential</label>
            <input
              id="credentials"
              name="credentials"
              className="input"
              required
              defaultValue={defaultCredentials}
              placeholder="RID NIC, BEI, EIPA, etc."
            />
          </div>
          <div>
            <label className="label" htmlFor="certifications">Certifications</label>
            <input
              id="certifications"
              name="certifications"
              className="input"
              defaultValue={defaultCertifications}
              placeholder="RID NIC, CDI, BEI, EIPA"
            />
            <p className="mt-1 text-xs text-ink-muted">Separate multiple certifications with commas.</p>
          </div>
        </div>
      )}
    </div>
  );
}
