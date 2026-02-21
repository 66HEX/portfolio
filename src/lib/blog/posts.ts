import { allPosts } from "content-collections";

type CollectionBlogPost = (typeof allPosts)[number];

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  thumbnail: string;
  published: boolean;
};

function toBlogPostMeta(post: CollectionBlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    tags: post.tags,
    thumbnail: post.thumbnail,
    published: post.published,
  };
}

export function getAllBlogPosts(): BlogPostMeta[] {
  return allPosts
    .filter((post) => post.published)
    .map(toBlogPostMeta)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPostBySlug(slug: string): BlogPostMeta | undefined {
  return getAllBlogPosts().find((post) => post.slug === slug);
}

export function getRecentBlogPosts(limit = 3): BlogPostMeta[] {
  return getAllBlogPosts().slice(0, limit);
}
