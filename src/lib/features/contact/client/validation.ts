import { contactFormSchema } from "$lib/validation/contact";
import {
  groupContactValidationIssues,
  type ContactPayload,
  type ContactValidationErrors,
} from "../shared";

export function validateContactPayload(payload: ContactPayload): ContactValidationErrors {
  const parsed = contactFormSchema.safeParse(payload);
  if (parsed.success) {
    return { fieldErrors: {}, formErrors: [] };
  }

  return groupContactValidationIssues(parsed.error.issues);
}
