import { error } from "@sveltejs/kit";
import { getBlogPostBySlug } from "$lib/features/blog/server/posts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const slug = (params.slug ?? "").replace(/^\/+|\/+$/g, "");
  const targetSlug = slug === "index" || slug === "blog" ? "" : slug;

  const metadata = targetSlug.length > 0 ? getBlogPostBySlug(targetSlug) : undefined;
  if (!metadata) {
    throw error(404, "Document not found");
  }

  const modules = import.meta.glob<string>("/src/routes/blog/**/+page.svx", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  const modulePath = `/src/routes/blog/${metadata.slug}/+page.svx`;
  const content = modules[modulePath];

  if (!content) {
    throw error(404, "Document not found");
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
