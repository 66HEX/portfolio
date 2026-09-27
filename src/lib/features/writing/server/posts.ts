import { portfolio } from "$portfolio/config";
import { externalPosts, publicationSources } from "$portfolio/publications";
import { getAllBlogPosts } from "$lib/features/blog/server/posts";
import type { WritingPost } from "../types";

export function getRecentWritingPosts(limit = portfolio.writing.limit): WritingPost[] {
  const localPosts: WritingPost[] = getAllBlogPosts().map((post) => ({
    kind: "local",
    title: post.title,
    description: post.description,
    date: post.date,
    href: `/blog/${post.slug}`,
  }));

  const publishedExternalPosts: WritingPost[] = externalPosts
    .filter((post) => post.published)
    .map((post) => ({
      kind: "external",
      title: post.title,
      description: post.description,
      date: post.date,
      href: post.href,
      source: publicationSources[post.source],
    }));

  return [...localPosts, ...publishedExternalPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
