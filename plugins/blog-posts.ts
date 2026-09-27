import type { Plugin } from "vite";
import { resolve } from "node:path";
import { readPosts } from "../scripts/content.ts";

const moduleId = "virtual:portfolio-posts";

/** Production bundles import published articles only; dev also supports draft previews. */
export function blogPostsPlugin(): Plugin {
  let development = false;
  let root = process.cwd();
  return {
    name: "portfolio-posts",
    configResolved(config) {
      development = config.command === "serve";
      root = config.root;
    },
    resolveId(id) {
      if (id === moduleId) return `\0${moduleId}`;
    },
    async load(id) {
      if (id !== `\0${moduleId}`) return;
      if (development) return 'export default import.meta.glob("/src/portfolio/posts/**/*.svx");';
      const posts = await readPosts(resolve(root, "src/portfolio/posts"));
      const entries = posts
        .filter((post) => post.published)
        .map((post) => {
          this.addWatchFile(post.path);
          const path = JSON.stringify(`/src/portfolio/posts/${post.slug}.svx`);
          return `${path}: () => import(${path})`;
        });
      return `export default {${entries.join(",")}};`;
    },
  };
}
