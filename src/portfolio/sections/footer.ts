import { portfolio } from "../config.ts";
import { socialLinks } from "./socials";
import type { HomepageContent } from "../../lib/types/portfolio";

export const footerData: Pick<HomepageContent, "footer"> = {
  footer: {
    headline: "Let's build something useful.",
    description: "Available for product design and front-end engineering projects.",
    socialLinks: socialLinks,
    copyrightName: portfolio.name,
    copyrightSuffix: "Crafted with SvelteKit.",
  },
};
