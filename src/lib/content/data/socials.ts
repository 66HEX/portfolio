import IconFile from "carbon-icons-svelte/lib/Document.svelte";
import IconGithub from "carbon-icons-svelte/lib/LogoGithub.svelte";
import IconLinkedin from "carbon-icons-svelte/lib/LogoLinkedin.svelte";
import IconX from "carbon-icons-svelte/lib/LogoX.svelte";
import type { HomeSocialLink } from "../types";

export const socialLinks: HomeSocialLink[] = [
  {
    platform: "GitHub",
    handle: "@66HEX",
    href: "https://github.com/66HEX",
    icon: IconGithub,
  },
  {
    platform: "LinkedIn",
    handle: "",
    href: "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
    icon: IconLinkedin,
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
