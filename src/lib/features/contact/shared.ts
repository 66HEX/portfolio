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
