import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import { getBlogPostBySlug } from "$lib/features/blog/server/posts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params, setHeaders }) => {
  const post = getBlogPostBySlug(params.slug, dev);
  if (!post) error(404, "Post not found");
  if (!post.published) setHeaders({ "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
  return { post };
};
