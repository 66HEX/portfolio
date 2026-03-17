import { contactFormSchema } from "$lib/validation/contact";
import { uniqueNonEmptyMessages, type ContactPayload } from "../shared";

export function collectValidationMessages(payload: ContactPayload): string[] {
  const parsed = contactFormSchema.safeParse(payload);
  if (parsed.success) {
    return [];
  }

  return uniqueNonEmptyMessages(parsed.error.issues.map((issue) => issue.message));
}
