import type { HomepageContent } from "../../lib/types/portfolio";
import { siteData } from "../seo";

export const heroData: Pick<HomepageContent, "hero"> = {
  hero: {
    avatarSrc: "/images/avatar.webp",
    avatarAlt: `Portrait of ${siteData.site.siteName}`,
  },
};
