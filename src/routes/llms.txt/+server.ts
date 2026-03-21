import { homepageContent } from "$lib/content/homepage-content";
import { getAllBlogPosts } from "$lib/features/blog/server/posts";
import type { RequestHandler } from "./$types";

type BlogEntry = {
  slug: string;
  fallbackTitle: string;
  description: string;
  category: string;
};

const summary = `${homepageContent.site.siteName} is ${homepageContent.seo.description}`;

const detailParagraphs = [
  "LLM-friendly Markdown for every page is available at `/blog/raw/<slug>`; this is the source blog content without page chrome.",
  "Use `/sitemap.xml` for URL discovery and `/robots.txt` for crawl guidance.",
];

const toCategoryTitle = (value: string): string => {
  const normalized = value.trim().replaceAll(/[-_]+/g, " ");
  if (normalized.length === 0) {
    return "Blog";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

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

const groupByCategory = (entries: BlogEntry[]) => {
  const grouped = new Map<string, BlogEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.category);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(entry.category, [entry]);
    }
  }
  return grouped;
};

const buildSection = (title: string, items: string[]) => {
  if (items.length === 0) return [];
  return [`## ${title}`, "", ...items];
};

export const GET: RequestHandler = () => {
  const canonicalOrigin = new URL(homepageContent.site.siteUrl).origin;
  const githubLink = homepageContent.socialRow.links.find((link) => link.platform.toLowerCase() === "github")?.href;
  const optionalLinks = githubLink ? [`- [GitHub](${githubLink}): Source code, issues, and discussions.`] : [];

  const blogs = dedupeBlogs(
    getAllBlogPosts().map((post) => ({
      slug: post.slug,
      fallbackTitle: post.title,
      description: post.description,
      category: toCategoryTitle(post.tags[0] ?? "Blog"),
    })),
  );
  const groupedBlogs = groupByCategory(blogs);

  const categorySections = Array.from(groupedBlogs.entries()).flatMap(([category, entries]) =>
    buildSection(
      category,
      entries.map((entry) => buildBlogEntry(canonicalOrigin, entry)),
    ),
  );

  const lines = [
    `# ${homepageContent.site.siteName}`,
    "",
    `> ${summary}`,
    "",
    ...detailParagraphs,
    "",
    ...categorySections,
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
