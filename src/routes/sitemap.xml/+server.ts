import { getAllBlogPosts } from "$lib/features/blog/server/posts";
import { homepageContent } from "$lib/content/homepage-content";
import type { RequestHandler } from "./$types";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
};

function toAbsoluteUrl(pathname: string): string {
  return new URL(pathname, homepageContent.site.siteUrl).toString();
}

function normalizeDate(date: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: RequestHandler = async ({ setHeaders }) => {
  const posts = getAllBlogPosts();

  const urls: SitemapUrl[] = [
    {
      loc: toAbsoluteUrl("/"),
    },
    {
      loc: toAbsoluteUrl("/llms.txt"),
    },
    ...posts.map((post) => ({
      loc: toAbsoluteUrl(`/blog/${post.slug}`),
      lastmod: normalizeDate(post.date),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${
      url.lastmod
        ? `
    <lastmod>${escapeXml(url.lastmod)}</lastmod>`
        : ""
    }
  </url>`,
  )
  .join("\n")}
</urlset>`;

  setHeaders({
    "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  });

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
};
