import { socialLinks } from "./socials";
import type { HomepageContent } from "../types";

export const footerData: Pick<HomepageContent, "footer"> = {
  footer: {
    headline: "Let's build something useful.",
    description: "Available for product design and front-end engineering projects.",
    socialLinks: socialLinks,
    copyrightName: "Marek Jóźwiak",
    copyrightSuffix: "Crafted with SvelteKit.",
  },
};
