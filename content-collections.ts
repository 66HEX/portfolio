import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";
import { postMetadataSchema, postSlugSchema } from "./src/lib/features/blog/schema.ts";
import { portfolio } from "./src/portfolio/config.ts";
import { renderFeedHtml } from "./tooling/markdown/feed.ts";

const posts = defineCollection({
  name: "posts",
  directory: "src/portfolio/posts",
  include: "**/*.svx",
  schema: postMetadataSchema.extend({ content: z.string() }),
  transform: async (document) => {
    const slug = postSlugSchema.parse(document._meta.path);
    return {
      ...document,
      slug,
      feedHtml: document.published
        ? await renderFeedHtml(document.content, new URL(`/blog/${slug}`, portfolio.url).href)
        : "",
    };
  },
});

export default defineConfig({ content: [posts] });
