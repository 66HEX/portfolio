import type { HomepageContent } from "../types";

export const experienceData: HomepageContent["experience"] = {
  title: "Experience",
  items: [
    {
      company: "Moda",
      companyHref: "https://moda.app/",
      logoSrc: "/images/experience/moda.svg",
      role: "WebGPU Shader Developer",
      period: "May 2026–present",
      employmentType: "Contract",
      workMode: "Remote",
      location: "New York, United States",
      technologies: ["WebGPU", "WGSL", "Real-Time Graphics"],
      highlights: [
        "Develop real-time shader effects for Moda.app’s browser-based AI design canvas.",
        "Build GPU-driven visuals that enhance editable presentations, social assets, and branded design workflows.",
        "Shape the product’s creative motion layer through production-ready WebGPU and WGSL shader work.",
      ],
    },
    {
      company: "shadcnblocks.com",
      companyHref: "https://www.shadcnblocks.com/",
      logoSrc: "/images/experience/shadcnblocks.svg",
      darkLogoSrc: "/images/experience/shadcnblocks-dark.svg",
      role: "Creative Developer",
      period: "Sep 2025–Dec 2025",
      employmentType: "Contract",
      workMode: "Remote",
      location: "Brisbane, Australia",
      technologies: ["React", "React Three Fiber", "GLSL", "Tailwind CSS"],
      highlights: [
        "Built 20 immersive, reusable full-screen React hero blocks for production use.",
        "Combined React Three Fiber, Three.js, and raw GLSL shaders to deliver real-time depth and motion.",
        "Delivered modular components compatible with shadcn/ui and Tailwind CSS.",
      ],
    },
    {
      company: "21st.dev",
      companyHref: "https://21st.dev/",
      logoSrc: "/images/experience/21st.svg",
      role: "Partner",
      period: "Aug 2025–Dec 2025",
      employmentType: "Contract",
      workMode: "Remote",
      location: "Dover, Delaware, United States",
      technologies: ["React", "React Three Fiber", "GLSL", "Tailwind CSS"],
      highlights: [
        "Collaborated on reusable, production-ready React components for a community-driven UI registry.",
        "Designed component building blocks used by the MCP-powered generation workflow.",
        "Delivered modular components compatible with shadcn/ui and Tailwind CSS.",
      ],
    },
  ],
};
