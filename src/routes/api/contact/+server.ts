import { env } from "$env/dynamic/private";
import { contactFormSchema } from "$lib/validation/contact";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 4500;
const RATE_LIMIT_MS = 15_000;
type PlatformEnv = {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
};

const submissionByIp = new Map<string, number>();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolvePrivateValue(platformEnv: PlatformEnv | undefined, key: keyof PlatformEnv): string | undefined {
  const fromPlatform = platformEnv?.[key];
  if (typeof fromPlatform === "string" && fromPlatform.trim().length > 0) {
    return fromPlatform.trim();
  }

  const fromProcess = env[key];
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return undefined;
}

function resolveIp(headers: Headers, getClientAddress: () => string): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim().length > 0) {
    return cfIp.trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  try {
    return getClientAddress();
  } catch {
    return "unknown";
  }
}

function hasRecentSubmission(ip: string): boolean {
  const now = Date.now();
  const lastSubmission = submissionByIp.get(ip) ?? 0;
  const isRateLimited = now - lastSubmission < RATE_LIMIT_MS;

  if (!isRateLimited) {
    submissionByIp.set(ip, now);
  }

  if (submissionByIp.size > 256) {
    const staleCutoff = now - RATE_LIMIT_MS * 4;
    for (const [key, value] of submissionByIp.entries()) {
      if (value < staleCutoff) {
        submissionByIp.delete(key);
      }
    }
  }

  return isRateLimited;
}

export const POST: RequestHandler = async ({ request, fetch, platform, getClientAddress }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: "Invalid request payload." }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    const errors = [
      ...new Set(parsed.error.issues.map((issue) => issue.message.trim()).filter((message) => message.length > 0)),
    ];
    return json(
      {
        success: false,
        message: errors[0] ?? "Invalid contact form values.",
        errors,
      },
      { status: 400 },
    );
  }

  const { name, email, subject, message, website } = parsed.data;
  if (website.length > 0) {
    return json({ success: true }, { status: 200 });
  }

  const ip = resolveIp(request.headers, getClientAddress);
  if (hasRecentSubmission(ip)) {
    return json(
      {
        success: false,
        message: "You're sending messages too quickly. Please wait a moment and try again.",
      },
      { status: 429 },
    );
  }

  const resendApiKey = resolvePrivateValue(platform?.env, "RESEND_API_KEY");
  const contactToEmail = resolvePrivateValue(platform?.env, "CONTACT_TO_EMAIL");
  const contactFromEmail =
    resolvePrivateValue(platform?.env, "CONTACT_FROM_EMAIL") ?? "Portfolio Contact <onboarding@resend.dev>";

  if (!resendApiKey) {
    return json({ success: false, message: "Email service is not configured." }, { status: 503 });
  }

  const safeSubject = subject.replaceAll(/\s+/g, " ").trim();
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedSubject = escapeHtml(safeSubject);
  const escapedMessage = escapeHtml(message).replaceAll("\n", "<br />");

  const emailPayload = {
    from: contactFromEmail,
    to: [contactToEmail],
    reply_to: email,
    subject: `[Portfolio] ${safeSubject}`,
    text: `New message from ${name} <${email}>\n\nSubject: ${safeSubject}\n\n${message}`,
    html: `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.6; color: #111318;">
        <h2 style="margin: 0 0 12px;">New portfolio contact message</h2>
        <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapedName} &lt;${escapedEmail}&gt;</p>
        <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapedSubject}</p>
        <p style="margin: 12px 0 0;"><strong>Message:</strong></p>
        <p style="margin: 6px 0 0;">${escapedMessage}</p>
      </div>
    `,
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      let resendError = "Unknown Resend error";

      try {
        const errorBody = (await response.json()) as { message?: string; error?: string };
        resendError = errorBody.message ?? errorBody.error ?? resendError;
      } catch {
        // Keep fallback message.
      }

      console.error("Resend contact API error:", resendError);
      return json({ success: false, message: "Failed to send email." }, { status: 502 });
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Contact API request failed:", error);
    return json({ success: false, message: "Failed to send email." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
};
