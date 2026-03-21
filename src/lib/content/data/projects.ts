import type { ProjectItem } from "../types";

export const projectsData: { title: string; ctaLabel: string; githubCtaLabel: string; items: ProjectItem[] } = {
  title: "Projects",
  ctaLabel: "View project",
  githubCtaLabel: "GitHub",
  items: [
    {
      title: "Motion Core",
      description: "Motion Components for Svelte.",
      image: "/images/works/motioncore.webp",
      href: "https://motion-core.dev/",
      githubHref: "https://github.com/motion-core/motion-core",
    },
    {
      title: "Motion GPU",
      description: "Minimal WebGPU framework.",
      image: "/images/works/motiongpu.webp",
      href: "https://motion-gpu.dev/",
      githubHref: "https://github.com/motion-core/motion-gpu",
    },
    {
      title: "Frame",
      description: "Aesthetically pleasing media converter.",
      image: "/images/works/frame.webp",
      href: "https://framegui.app/",
      githubHref: "https://github.com/66HEX/frame/",
    },
  ],
};
