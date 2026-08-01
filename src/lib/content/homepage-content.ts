import type { HomepageContent } from "./types";
import { aboutData } from "./data/about";
import { projectsData } from "./data/projects";
import { testimonialsData } from "./data/testimonials";
import { siteData } from "./data/site";
import { heroData } from "./data/hero";
import { githubData } from "./data/github";
import { blogData } from "./data/blog";
import { contactData } from "./data/contact";
import { footerData } from "./data/footer";

export const homepageContent: HomepageContent = {
  ...siteData,
  ...heroData,
  about: aboutData,
  profile: {
    name: siteData.site.siteName,
    role: siteData.site.jobTitle,
  },
  ...githubData,
  projects: projectsData,
  ...blogData,
  testimonials: testimonialsData,
  ...contactData,
  ...footerData,
};

export * from "./types";
