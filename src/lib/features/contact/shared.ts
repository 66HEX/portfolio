export const TURNSTILE_ACTION = "contact_form";

export type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

export type ContactPayload = ContactForm & {
  turnstileToken: string;
};

export const contactFieldNames = ["name", "email", "subject", "message"] as const;

export type ContactField = (typeof contactFieldNames)[number];
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export type ContactValidationErrors = {
  fieldErrors: ContactFieldErrors;
  formErrors: string[];
};

export function createEmptyContactForm(): ContactForm {
  return {
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
  };
}

export function uniqueNonEmptyMessages(messages: string[]): string[] {
  return [...new Set(messages.map((message) => message.trim()).filter((message) => message.length > 0))];
}

export function groupContactValidationIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): ContactValidationErrors {
  const fieldErrors: ContactFieldErrors = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const message = issue.message.trim();
    if (message.length === 0) continue;

    const field = issue.path[0];
    if (typeof field === "string" && contactFieldNames.includes(field as ContactField)) {
      fieldErrors[field as ContactField] ??= message;
    } else {
      formErrors.push(message);
    }
  }

  return {
    fieldErrors,
    formErrors: uniqueNonEmptyMessages(formErrors),
  };
}
