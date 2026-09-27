export type FeedEntry = {
  title: string;
  description: string;
  date: string;
  href: string;
  published: boolean;
  categories?: string[];
  html?: string;
};

type FeedSite = {
  title: string;
  description: string;
  url: string;
  feedUrl: string;
  language: string;
  author: string;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export function buildRssFeed(site: FeedSite, entries: FeedEntry[]): string {
  const published = entries
    .filter((entry) => entry.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.href.localeCompare(b.href));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "<channel>",
    `<title>${escapeXml(site.title)}</title>`,
    `<link>${escapeXml(site.url)}</link>`,
    `<description>${escapeXml(site.description)}</description>`,
    `<language>${escapeXml(site.language)}</language>`,
    `<atom:link href="${escapeXml(site.feedUrl)}" rel="self" type="application/rss+xml" />`,
    "<ttl>60</ttl>",
    ...(published.length ? [`<pubDate>${new Date(published[0].date).toUTCString()}</pubDate>`] : []),
    ...published.flatMap((entry) => [
      "<item>",
      `<title>${escapeXml(entry.title)}</title>`,
      `<link>${escapeXml(entry.href)}</link>`,
      `<guid isPermaLink="true">${escapeXml(entry.href)}</guid>`,
      `<pubDate>${new Date(entry.date).toUTCString()}</pubDate>`,
      `<dc:creator>${escapeXml(site.author)}</dc:creator>`,
      `<description>${cdata(escapeXml(entry.description))}</description>`,
      ...(entry.categories ?? []).map((category) => `<category>${escapeXml(category)}</category>`),
      ...(entry.html ? [`<content:encoded>${cdata(entry.html)}</content:encoded>`] : []),
      "</item>",
    ]),
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}

export async function createRssResponse(request: Request, xml: string): Promise<Response> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(xml));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const etag = `W/"${hash}"`;
  const headers = {
    "content-type": "application/rss+xml; charset=utf-8",
    "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    etag,
  };

  const unchanged = request.headers
    .get("if-none-match")
    ?.split(",")
    .some((value) => value.trim() === "*" || value.trim().replace(/^W\//, "") === etag.slice(2));

  return new Response(unchanged ? null : xml, { status: unchanged ? 304 : 200, headers });
}
