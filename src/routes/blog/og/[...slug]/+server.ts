import { error } from "@sveltejs/kit";
import { getBlogPostBySlug } from "$lib/features/blog/server/posts";
import { createOgImage } from "$lib/seo/og-image";
import type { RequestHandler } from "./$types";

const MAX_TITLE_LENGTH = 88;
const MAX_DESCRIPTION_LENGTH = 180;

const clampText = (value: string, maxLength: number) => {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const getTitleFontSize = (title: string) => {
  if (title.length <= 34) return 54;
  if (title.length <= 58) return 44;
  return 36;
};

export const GET: RequestHandler = ({ params }) => {
  const rawSlug = (params.slug ?? "").replace(/^\/+|\/+$/g, "");
  const slug = rawSlug === "" || rawSlug === "index" || rawSlug === "blog" ? "" : rawSlug;
  const metadata = slug.length > 0 ? getBlogPostBySlug(slug) : undefined;

  if (!metadata) {
    throw error(404, "Document not found");
  }

  const title = clampText(metadata.title, MAX_TITLE_LENGTH);
  const description = clampText(
    metadata.description || "Technical notes and workflow insights on frontend development and SvelteKit.",
    MAX_DESCRIPTION_LENGTH,
  );

  return createOgImage({
    title,
    description,
    titleFontSize: getTitleFontSize(title),
    titleLineHeight: 1.04,
  });
};
