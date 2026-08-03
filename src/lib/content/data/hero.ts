import type { HomepageContent } from "../types";
import { siteData } from "./site";

export const heroData: Pick<HomepageContent, "hero"> = {
  hero: {
    avatarSrc: "/images/avatar.webp",
    avatarAlt: `Portrait of ${siteData.site.siteName}`,
  },
};
