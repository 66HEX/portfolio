import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import contentCollections from "@content-collections/vite";
import { blogPostsPlugin } from "./plugins/blog-posts.ts";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [blogPostsPlugin(), tailwindcss(), sveltekit(), contentCollections()],
});
