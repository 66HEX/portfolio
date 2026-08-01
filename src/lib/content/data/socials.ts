import { IconFile, IconGitHub, IconLinkedIn, IconX } from "$lib/content/icons";
import type { HomeSocialLink } from "../types";

export const socialLinks: HomeSocialLink[] = [
  {
    platform: "GitHub",
    handle: "@66HEX",
    href: "https://github.com/66HEX",
    icon: IconGitHub,
  },
  {
    platform: "LinkedIn",
    handle: "",
    href: "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
    icon: IconLinkedIn,
  },
  {
    platform: "X",
    handle: "@madebyhex",
    href: "https://x.com/madebyhex",
    icon: IconX,
  },
  {
    platform: "Resume",
    handle: "",
    href: "/resume.pdf",
    icon: IconFile,
  },
];
