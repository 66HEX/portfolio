import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";
import { postMetadataSchema, postSlugSchema } from "./src/lib/features/blog/schema.ts";

const posts = defineCollection({
  name: "posts",
  directory: "src/portfolio/posts",
  include: "**/*.svx",
  schema: postMetadataSchema.extend({ content: z.string() }),
  transform: (document) => ({
    ...document,
    slug: postSlugSchema.parse(document._meta.path),
  }),
});

export default defineConfig({ content: [posts] });
