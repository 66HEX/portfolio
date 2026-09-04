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
      imageSrcset:
        "/images/works/motioncore-480.webp 480w, /images/works/motioncore-768.webp 768w, /images/works/motioncore.webp 1440w",
      href: "https://motion-core.dev/",
      githubHref: "https://github.com/motion-core/motion-core",
    },
    {
      title: "Spektral",
      description: "Minimalist WebGPU framework.",
      image: "/images/works/spektral.webp",
      imageSrcset:
        "/images/works/spektral-480.webp 480w, /images/works/spektral-768.webp 768w, /images/works/spektral.webp 1440w",
      href: "https://spektral.madebyhex.com/",
      githubHref: "https://github.com/kaltwrk/spektral",
    },
    {
      title: "Frame",
      description: "Aesthetic media converter.",
      image: "/images/works/frame.webp",
      imageSrcset:
        "/images/works/frame-480.webp 480w, /images/works/frame-768.webp 768w, /images/works/frame.webp 1440w",
      href: "https://framegui.app/",
      githubHref: "https://github.com/66HEX/frame/",
    },
  ],
};
