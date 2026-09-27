import { error } from "@sveltejs/kit";
// These styles must be in the initial SSR response, before the lazy article module is loaded.
import "$lib/features/blog/components/code-block.css";
import "$lib/components/copy-feedback/copy-feedback.css";
import posts from "virtual:portfolio-posts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data }) => {
  const loadPost = posts[`/src/portfolio/posts/${data.post.slug}.svx`];
  if (!loadPost) error(404, "Post not found");
  const { default: Post } = await loadPost();
  return { ...data, Post };
};
