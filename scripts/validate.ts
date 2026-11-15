import { resolve } from "node:path";
import { z } from "zod";
import { portfolio, sectionIds } from "../src/portfolio/config.ts";
import { externalPosts, publicationSources } from "../src/portfolio/publications.ts";
import { testimonialsData } from "../src/portfolio/sections/testimonials.ts";
import { externalPostSchema } from "../src/lib/features/blog/schema.ts";
import { readPosts } from "./content.ts";

export const portfolioSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  url: z.url({ protocol: /^https$/ }).refine((value) => {
    const url = new URL(value);
    return url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
  }, "Use the site origin, without a subpath, query, fragment or credentials."),
  language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/),
  locale: z.string().regex(/^[a-z]{2,3}_[A-Z]{2}$/),
  githubUsername: z.string().regex(/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)?$/),
  xHandle: z.string().regex(/^[A-Za-z0-9_]{0,15}$/),
  linkedInUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
  resumeHref: z.string().refine((v) => !v || v.startsWith("/") || v.startsWith("https://")),
  sections: z
    .array(z.enum(sectionIds))
    .refine((ids) => new Set(ids).size === ids.length, "Each section can appear only once."),
  writing: z.object({ limit: z.number().int().min(0) }),
  hero: z.object({
    shader: z.object({
      enabled: z.boolean(),
      svgSource: z.string().trim().min(1),
      fontUrl: z.string().trim().min(1),
      scale: z.number().min(0.1).max(1.8),
      offsetX: z.number().min(-0.3).max(0.3),
      offsetY: z.number().min(-0.5).max(0.5),
      panX: z.number().min(-14).max(26),
      panY: z.number().min(-8).max(20),
      logoScale: z.number().min(0.3).max(1.15),
      legendScale: z.number().min(0.5).max(1.6),
      letterSpacing: z.number().min(-0.1).max(0.5),
      roughness: z.number().min(0.3).max(0.85),
      lightAngle: z.number().min(-180).max(180),
      lightElevation: z.number().min(10).max(85),
      lightIntensity: z.number().min(0).max(3),
      lightSize: z.number().min(0.25).max(3),
      environmentRotation: z.number().min(-180).max(180),
      environmentIntensity: z.number().min(0).max(3),
      exposure: z.number().min(0).max(2),
      interactive: z.boolean(),
      sound: z.object({
        enabled: z.boolean(),
        src: z.string().trim().startsWith("/"),
        volume: z.number().min(0).max(1),
      }),
    }),
  }),
});

export async function validatePortfolio(root = process.cwd()) {
  portfolioSchema.parse(portfolio);
  const urls = new Set<string>();
  for (const [index, entry] of externalPosts.entries()) {
    const post = externalPostSchema.parse(entry);
    const source = publicationSources[post.source as keyof typeof publicationSources];
    if (!source?.trim()) throw new Error(`externalPosts[${index}]: unknown or empty source "${post.source}".`);
    if (urls.has(post.href)) throw new Error(`externalPosts[${index}]: duplicate URL ${post.href}`);
    urls.add(post.href);
  }
  z.array(z.string().regex(/^\d{1,40}$/))
    .refine((ids) => new Set(ids).size === ids.length, "Testimonial IDs must be unique.")
    .parse(testimonialsData.tweetIds);
  const posts = await readPosts(resolve(root, "src/portfolio/posts"));
  console.log(
    `[content] ${posts.filter((post) => post.published).length} published posts, ${posts.filter((post) => !post.published).length} drafts, ${externalPosts.filter((post) => post.published).length} external publications. Configuration valid.`,
  );
}
