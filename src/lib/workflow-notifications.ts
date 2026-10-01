import "server-only";

type WorkflowEmail = {
  to: string | string[];
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionPath: string;
};

type WorkflowEmailResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appUrl(path: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://caccessroots.vercel.app");

  return new URL(path, configuredUrl).toString();
}

/**
 * Sends a privacy-conscious workflow email through Resend.
 *
 * Notifications never block the underlying workflow. Missing configuration,
 * provider errors, and delivery errors are logged and returned to the caller.
 * Event details remain behind the authenticated action link.
 */
export async function sendWorkflowEmail({
  to,
  subject,
  heading,
  message,
  actionLabel,
  actionPath,
}: WorkflowEmail): Promise<WorkflowEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const recipients = (Array.isArray(to) ? to : [to])
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { status: "skipped", reason: "No recipient email was provided" };
  }

  if (!apiKey || !from) {
    console.info("Workflow email skipped: notification provider is not configured", {
      subject,
      recipientCount: recipients.length,
    });
    return {
      status: "skipped",
      reason: "RESEND_API_KEY or NOTIFICATION_FROM_EMAIL is missing",
    };
  }

  const actionUrl = appUrl(actionPath);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeActionLabel = escapeHtml(actionLabel);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        reply_to: process.env.NOTIFICATION_REPLY_TO || undefined,
        text: `${heading}\n\n${message}\n\n${actionLabel}: ${actionUrl}`,
        html: `
          <div style="background:#f6faf7;padding:32px 16px;font-family:Arial,sans-serif;color:#183226">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dcebe1;border-radius:16px;padding:28px">
              <p style="margin:0 0 8px;color:#2f6b4f;font-size:14px;font-weight:700">CAccessRoots</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#173629">${safeHeading}</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151">${safeMessage}</p>
              <a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:10px;background:#2f6b4f;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700">${safeActionLabel}</a>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280">For privacy, assignment details are available only after you sign in.</p>
            </div>
          </div>
        `,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok) {
      const reason = payload?.message || `Email provider returned ${response.status}`;
      console.error("Workflow email delivery failed", {
        subject,
        recipientCount: recipients.length,
        reason,
      });
      return { status: "failed", reason };
    }

    return { status: "sent", id: payload?.id ?? null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown email error";
    console.error("Workflow email delivery failed", {
      subject,
      recipientCount: recipients.length,
      reason,
    });
    return { status: "failed", reason };
  }
}

export function workflowRoleLabel(teamRole: string | null | undefined) {
  return teamRole === "student"
    ? "Advanced ITP Student"
    : "Mentor Interpreter";
}
