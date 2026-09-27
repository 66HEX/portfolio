import { portfolio } from "../config.ts";
import { IconFile, IconGitHub, IconLinkedIn, IconX } from "../../lib/components/icons/data.ts";
import type { HomeSocialLink } from "../../lib/types/portfolio";

const links: HomeSocialLink[] = [
  {
    platform: "GitHub",
    handle: `@${portfolio.githubUsername}`,
    href: portfolio.githubUsername ? `https://github.com/${portfolio.githubUsername}` : "",
    icon: IconGitHub,
  },
  {
    platform: "LinkedIn",
    handle: "",
    href: portfolio.linkedInUrl,
    icon: IconLinkedIn,
  },
  {
    platform: "X",
    handle: `@${portfolio.xHandle}`,
    href: portfolio.xHandle ? `https://x.com/${portfolio.xHandle}` : "",
    icon: IconX,
  },
  {
    platform: "Resume",
    handle: "",
    href: portfolio.resumeHref,
    icon: IconFile,
  },
];

export const socialLinks = links.filter((link) => link.href.length > 0);
