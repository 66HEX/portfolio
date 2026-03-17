import { uniqueNonEmptyMessages, type ContactPayload } from "../shared";

type ContactApiErrorBody = {
  message?: string;
  errors?: string[];
};

export type SubmitContactFormResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      validationErrors: string[];
    };

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

    try {
      const errorBody = (await response.json()) as ContactApiErrorBody;
      if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
        validationErrors = uniqueNonEmptyMessages(errorBody.errors);
      } else if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
        message = errorBody.message;
      }
    } catch {
      // Keep fallback message.
    }

    return {
      ok: false,
      message,
      validationErrors,
    };
  } catch {
    return {
      ok: false,
      message: fallbackErrorMessage,
      validationErrors: [],
    };
  }
}
