import { error } from "@sveltejs/kit";
import { getBlogPostBySlug } from "$lib/features/blog/server/posts";
import { createOgImage } from "$lib/seo/og-image";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params }) => {
  const rawSlug = (params.slug ?? "").replace(/^\/+|\/+$/g, "");
  const slug = rawSlug === "" || rawSlug === "index" || rawSlug === "blog" ? "" : rawSlug;
  const metadata = slug.length > 0 ? getBlogPostBySlug(slug) : undefined;

  if (!metadata) {
    throw error(404, "Document not found");
  }

  return createOgImage({
    title: metadata.ogTitle ?? metadata.title,
    category: metadata.ogCategory ?? "Writing",
    kind: "article",
  });
};
