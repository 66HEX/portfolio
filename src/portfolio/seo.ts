import { portfolio } from "./config.ts";
import type { HomepageContent } from "../lib/types/portfolio";

export const siteData: Pick<HomepageContent, "site" | "seo"> = {
  site: {
    siteName: portfolio.name,
    siteUrl: portfolio.url,
    locale: portfolio.locale,
    twitterHandle: portfolio.xHandle ? `@${portfolio.xHandle}` : "",
    defaultOgImage: "/og",
    defaultOgImageAlt: `${portfolio.name} portfolio banner`,
    jobTitle: portfolio.role,
    sameAsLinks: [
      ...(portfolio.githubUsername ? [`https://github.com/${portfolio.githubUsername}`] : []),
      ...(portfolio.linkedInUrl ? [portfolio.linkedInUrl] : []),
      ...(portfolio.xHandle ? [`https://x.com/${portfolio.xHandle}`] : []),
    ],
  },
  seo: {
    title: `${portfolio.name} | ${portfolio.role}`,
    description: `Portfolio of ${portfolio.name}—creative developer focused on product interfaces, front-end architecture, and performance-first SvelteKit development.`,
    imageAlt: `Open Graph Image for ${portfolio.name}'s Portfolio`,
    keywords: [
      portfolio.name,
      "Design Engineer",
      "Front-end Developer",
      "SvelteKit",
      "UI Engineering",
      "Product Design",
      "Web Performance",
      "Portfolio",
    ],
  },
};
