import { RESEND_API_URL, RESEND_TIMEOUT_MS } from "./constants";

type SendContactEmailInput = {
  resendApiKey: string;
  contactFromEmail: string;
  contactToEmail: string;
  name: string;
  email: string;
  subject: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildContactEmailPayload(input: SendContactEmailInput) {
  const safeSubject = input.subject.replaceAll(/\s+/g, " ").trim();
  const escapedName = escapeHtml(input.name);
  const escapedEmail = escapeHtml(input.email);
  const escapedSubject = escapeHtml(safeSubject);
  const escapedMessage = escapeHtml(input.message).replaceAll("\n", "<br />");

  return {
    from: input.contactFromEmail,
    to: [input.contactToEmail],
    reply_to: input.email,
    subject: `[Portfolio] ${safeSubject}`,
    text: `New message from ${input.name} <${input.email}>\n\nSubject: ${safeSubject}\n\n${input.message}`,
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
}

export async function sendContactEmail(fetchFn: typeof fetch, input: SendContactEmailInput): Promise<boolean> {
  const emailPayload = buildContactEmailPayload(input);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetchFn(RESEND_API_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.resendApiKey}`,
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
      return false;
    }

    return true;
  } catch (error) {
    console.error("Contact API request failed:", error);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
