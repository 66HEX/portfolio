import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { fileURLToPath } from "node:url";
import rehypeSlug from "rehype-slug";
import { taskListFormatter } from "./tooling/markdown/task-lists.js";
import { tableCellFormatter } from "./tooling/markdown/tables.js";
import { highlightCode } from "./tooling/markdown/highlight.js";

const markdownLayout = fileURLToPath(
  new URL("./src/lib/features/blog/components/MarkdownLayout.svelte", import.meta.url),
);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".svx"],
  preprocess: [
    mdsvex({
      extensions: [".svx"],
      layout: { docs: markdownLayout, _: markdownLayout },
      rehypePlugins: [taskListFormatter, tableCellFormatter, rehypeSlug],
      highlight: { highlighter: highlightCode },
    }),
    vitePreprocess(),
  ],
  kit: {
    adapter: adapter(),
    alias: {
      $portfolio: "./src/portfolio",
      "content-collections": "./.content-collections/generated",
    },
  },
};

export default config;
