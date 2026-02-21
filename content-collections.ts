import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";

const posts = defineCollection({
  name: "posts",
  directory: "src/routes/blog",
  include: "**/+page.svx",
  schema: z.object({
    title: z.string().default(""),
    description: z.string().default("No description provided."),
    date: z.string().default("1970-01-01"),
    tags: z.array(z.string()).default([]),
    thumbnail: z.string().default("/og-image.jpg"),
    published: z.boolean().default(true),
    content: z.string(),
  }),
  transform: (document) => {
    const slug = document._meta.path.replace(/\/\+page$/, "");
    const fallbackTitle = slug
      .split("-")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");

    return {
      ...document,
      slug,
      title: document.title || fallbackTitle,
    };
  },
});

export default defineConfig({
  content: [posts],
});
