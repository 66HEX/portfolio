import { allPosts } from "content-collections";
import { portfolio } from "$portfolio/config";
import { externalPosts, publicationSources } from "$portfolio/publications";
import { buildRssFeed, createRssResponse } from "$lib/features/writing/server/rss";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ request }) => {
  const xml = buildRssFeed(
    {
      title: `${portfolio.name} — Writing`,
      description: `Articles by ${portfolio.name} on software development, design and personal projects.`,
      url: new URL("/", portfolio.url).href,
      feedUrl: new URL("/rss.xml", portfolio.url).href,
      language: portfolio.language,
      author: portfolio.name,
    },
    [
      ...allPosts.map((post) => ({
        title: post.title,
        description: post.description,
        date: post.date,
        href: new URL(`/blog/${post.slug}`, portfolio.url).href,
        published: post.published,
        categories: post.tags,
        html: post.feedHtml,
      })),
      ...externalPosts.map((post) => ({
        title: post.title,
        description: `Published on ${publicationSources[post.source]}. ${post.description}`,
        date: post.date,
        href: post.href,
        published: post.published,
      })),
    ],
  );

  return createRssResponse(request, xml);
};
