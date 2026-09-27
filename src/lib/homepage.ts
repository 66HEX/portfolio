import type { HomepageContent } from "./types/portfolio";
import { aboutData } from "$portfolio/sections/about";
import { projectsData } from "$portfolio/sections/projects";
import { testimonialsData } from "$portfolio/sections/testimonials";
import { siteData } from "$portfolio/seo";
import { heroData } from "$portfolio/sections/hero";
import { githubData } from "$portfolio/sections/github";
import { writingData } from "$portfolio/sections/writing";
import { contactData } from "$portfolio/sections/contact";
import { footerData } from "$portfolio/sections/footer";
import { experienceData } from "$portfolio/sections/experience";

export const homepageContent: HomepageContent = {
  ...siteData,
  ...heroData,
  about: aboutData,
  profile: {
    name: siteData.site.siteName,
    role: siteData.site.jobTitle,
  },
  ...githubData,
  experience: experienceData,
  projects: projectsData,
  ...writingData,
  testimonials: testimonialsData,
  ...contactData,
  ...footerData,
};

export * from "./types/portfolio";
