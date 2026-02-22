import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long.")
    .max(80, "Name must be at most 80 characters long."),
  email: z.string().trim().max(160, "Email must be at most 160 characters long.").email("Enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters long.")
    .max(140, "Subject must be at most 140 characters long."),
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters long.")
    .max(3000, "Message must be at most 3000 characters long."),
  website: z.string().trim().max(120, "Website field must be at most 120 characters long.").optional().default(""),
  turnstileToken: z
    .string()
    .trim()
    .min(1, "Please complete the anti-bot verification.")
    .max(2048, "Verification token is too long. Refresh the page and try again."),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
