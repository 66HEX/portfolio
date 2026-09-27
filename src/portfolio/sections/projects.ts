import type { ProjectItem } from "../../lib/types/portfolio";

export const projectsData: { title: string; ctaLabel: string; githubCtaLabel: string; items: ProjectItem[] } = {
  title: "Projects",
  ctaLabel: "View project",
  githubCtaLabel: "GitHub",
  items: [
    {
      title: "Motion Core",
      description: "Motion Components for Svelte.",
      href: "https://motion-core.dev/",
      githubHref: "https://github.com/kaltwrk/motion-core",
    },
    {
      title: "Spektral",
      description: "Minimalist WebGPU framework.",
      href: "https://spektral.madebyhex.com/",
      githubHref: "https://github.com/kaltwrk/spektral",
    },
    {
      title: "Frame",
      description: "Aesthetic media converter.",
      href: "https://framegui.app/",
      githubHref: "https://github.com/66HEX/frame/",
    },
    {
      title: "Tensum",
      description: "Analytical spring solver for GSAP.",
      href: "https://tensum.madebyhex.com/",
      githubHref: "https://github.com/kaltwrk/tensum",
    },
  ],
};
