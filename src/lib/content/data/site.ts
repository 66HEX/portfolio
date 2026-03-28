import type { HomepageContent } from "../types";

export const siteData: Pick<HomepageContent, "site" | "seo" | "header"> = {
  site: {
    siteName: "Marek Jóźwiak",
    siteUrl: "https://madebyhex.com",
    locale: "en_US",
    twitterHandle: "@madebyhex",
    defaultOgImage: "/og-image.jpg",
    defaultOgImageAlt: "Marek Jóźwiak portfolio banner",
    jobTitle: "Creative Developer",
    sameAsLinks: [
      "https://github.com/66HEX",
      "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
      "https://x.com/madebyhex",
    ],
  },
  seo: {
    title: "Marek Jóźwiak | Creative Developer",
    description:
      "Portfolio of Marek Jóźwiak - Creative developer focused on product interfaces, front-end architecture, and performance-first SvelteKit development.",
    imageAlt: "Open Graph Image for Marek Jóźwiak's Portfolio",
    keywords: [
      "Marek Jóźwiak",
      "Design Engineer",
      "Front-end Developer",
      "SvelteKit",
      "UI Engineering",
      "Product Design",
      "Web Performance",
      "Portfolio",
    ],
  },
  header: {
    h1: "Marek Jóźwiak - Creative Developer portfolio",
  },
};
