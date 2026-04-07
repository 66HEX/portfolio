import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import contentCollections from "@content-collections/vite";
import { defineConfig } from "vite";
import { tweetPrefetchPlugin } from "./plugins/tweet-prefetch";
import { testimonialsData } from "./src/lib/content/data/testimonials";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), contentCollections(), tweetPrefetchPlugin(testimonialsData.tweetIds)],
  ssr: {
    noExternal: ["lucide-svelte"],
  },
});
