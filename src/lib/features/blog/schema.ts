import { z } from "zod";

export const publicationDate = z.iso.date();
export const postMetadataSchema = z.object({
  title: z.string().trim().min(1, "Give the post a title."),
  description: z.string().trim().min(1, "Add a description for cards and SEO."),
  date: publicationDate,
  tags: z.array(z.string().trim().min(1)).default([]),
  published: z.boolean().default(false),
});

export const postSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/, "Use lowercase words separated by hyphens.")
  .refine((slug) => !["raw", "og"].includes(slug.split("/")[0]), "The raw and og paths are reserved.");

export const externalPostSchema = postMetadataSchema.omit({ tags: true }).extend({
  href: z.url({ protocol: /^https$/ }),
  source: z.string().min(1),
});
