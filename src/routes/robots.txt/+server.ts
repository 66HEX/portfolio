import { homepageContent } from "$lib/content/homepage-content";
import type { RequestHandler } from "./$types";

const directives = ["User-agent: *", "Allow: /", "Disallow: /blog/raw/"];

function buildSitemapUrl(origin: string): string {
  return new URL("/sitemap.xml", origin).toString();
}

export const GET: RequestHandler = () => {
  const canonicalOrigin = new URL(homepageContent.site.siteUrl).origin;
  const lines = [...directives, `Sitemap: ${buildSitemapUrl(canonicalOrigin)}`];
  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
