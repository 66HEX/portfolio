import { homepageContent } from "$lib/homepage";
import { getAllBlogPosts } from "$lib/features/blog/server/posts";
import { externalPosts, publicationSources } from "$portfolio/publications";
import type { RequestHandler } from "./$types";

type BlogEntry = {
  slug: string;
  fallbackTitle: string;
  description: string;
};

const summary = `${homepageContent.site.siteName} is ${homepageContent.seo.description}`;

const detailParagraphs = [
  "LLM-friendly Markdown for local blog posts is available at `/blog/raw/<slug>`; this is the source blog content without page chrome.",
  "Use `/sitemap.xml` for URL discovery and `/robots.txt` for crawl guidance.",
  "Subscribe at `/rss.xml` for full local articles and links to external publications.",
];

const buildBlogEntry = (origin: string, entry: BlogEntry) => {
  const title = entry.fallbackTitle;
  const description = entry.description || `Article for ${title}.`;
  const link = new URL(`/blog/raw/${entry.slug}`, origin).href;
  return `- [${title}](${link}): ${description}`;
};

const dedupeBlogs = (entries: BlogEntry[]) => {
  const map = new Map<string, BlogEntry>();
  for (const entry of entries) {
    if (!map.has(entry.slug)) {
      map.set(entry.slug, entry);
    }
  }
  return Array.from(map.values());
};

const buildSection = (title: string, items: string[]) => {
  if (items.length === 0) return [];
  return [`## ${title}`, "", ...items];
};

export const GET: RequestHandler = () => {
  const canonicalOrigin = new URL(homepageContent.site.siteUrl).origin;
  const optionalLinks = homepageContent.footer.socialLinks
    .filter((link) => link.platform.toLowerCase() !== "resume")
    .map((link) => `- [${link.platform}](${link.href}): ${homepageContent.site.siteName} on ${link.platform}.`);
  optionalLinks.push(
    `- [RSS](${new URL("/rss.xml", canonicalOrigin).href}): Full local articles and links to external publications.`,
  );

  const blogs = dedupeBlogs(
    getAllBlogPosts().map((post) => ({
      slug: post.slug,
      fallbackTitle: post.title,
      description: post.description,
    })),
  );
  const writingArticles = blogs.map((entry) => buildBlogEntry(canonicalOrigin, entry));

  const externalArticles = externalPosts
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(
      (post) => `- [${post.title}](${post.href}): Published on ${publicationSources[post.source]}. ${post.description}`,
    );

  const lines = [
    `# ${homepageContent.site.siteName}`,
    "",
    `> ${summary}`,
    "",
    ...detailParagraphs,
    "",
    ...buildSection("Writing", writingArticles),
    "",
    ...buildSection("External publications", externalArticles),
    "",
    ...buildSection("Optional", optionalLinks),
    "",
  ];

  const body =
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
