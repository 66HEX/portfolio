import { contactFieldNames, uniqueNonEmptyMessages, type ContactFieldErrors, type ContactPayload } from "../shared";

type ContactApiErrorBody = {
  message?: string;
  errors?: string[];
  fieldErrors?: unknown;
};

export type SubmitContactFormResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      validationErrors: string[];
      fieldErrors: ContactFieldErrors;
    };

function parseFieldErrors(value: unknown): ContactFieldErrors {
  if (!value || typeof value !== "object") return {};

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    contactFieldNames.flatMap((field) =>
      typeof source[field] === "string" && source[field].trim().length > 0 ? [[field, source[field].trim()]] : [],
    ),
  );
}

export async function submitContactForm(
  payload: ContactPayload,
  fallbackErrorMessage: string,
  fetchFn: typeof fetch = fetch,
): Promise<SubmitContactFormResult> {
  try {
    const response = await fetchFn("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { ok: true };
    }

    let message = fallbackErrorMessage;
    let validationErrors: string[] = [];
    let fieldErrors: ContactFieldErrors = {};

    try {
      const errorBody = (await response.json()) as ContactApiErrorBody;
      if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
        validationErrors = uniqueNonEmptyMessages(errorBody.errors);
      }
      fieldErrors = parseFieldErrors(errorBody.fieldErrors);
      if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
        message = errorBody.message;
      }
    } catch {
      // Keep fallback message.
    }

    return {
      ok: false,
      message,
      validationErrors,
      fieldErrors,
    };
  } catch {
    return {
      ok: false,
      message: fallbackErrorMessage,
      validationErrors: [],
      fieldErrors: {},
    };
  }
}
