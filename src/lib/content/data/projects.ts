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
      title: "Motion GPU",
      description: "Minimal WebGPU framework.",
      image: "/images/works/motiongpu.webp",
      imageSrcset:
        "/images/works/motiongpu-480.webp 480w, /images/works/motiongpu-768.webp 768w, /images/works/motiongpu.webp 1440w",
      href: "https://motion-gpu.dev/",
      githubHref: "https://github.com/motion-core/motion-gpu",
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
