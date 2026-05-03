import type { AboutListItem } from "../types";

export const aboutData: { title: string; items: AboutListItem[] } = {
  title: "About",
  items: [
    {
      content: [
        { type: "highlight", text: "Creative Developer" },
        {
          type: "text",
          text: " with 2,5+ years of experience, known for passion for design and strong attention to small details.",
        },
      ],
    },
    {
      content: [
        { type: "text", text: "Skilled in " },
        { type: "highlight", text: "Svelte" },
        { type: "text", text: ", " },
        { type: "highlight", text: "React" },
        { type: "text", text: ", " },
        { type: "highlight", text: "Typescript" },
        { type: "text", text: ", " },
        { type: "highlight", text: "Rust" },
        { type: "text", text: ", and " },
        { type: "highlight", text: "modern shading languages" },
        { type: "text", text: "; building high-quality web applications." },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Motion Core", href: "https://motion-core.dev/" },
        {
          type: "text",
          text: " - a Svelte 5 motion component library built on Three.js and GSAP, following a shadcn-inspired copy-paste architecture with a Rust-based CLI.",
        },
      ],
      nestedList: [
        {
          content: [
            { type: "highlight", text: "450+ stars" },
            { type: "text", text: " on GitHub" },
          ],
        },
        {
          content: [
            { type: "text", text: "Included in " },
            {
              type: "link",
              text: "Svelte Libraries, Tools & Components (Feb 2026)",
              href: "https://svelte.dev/blog/whats-new-in-svelte-february-2026",
            },
          ],
        },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Motion GPU", href: "https://motion-gpu.dev/" },
        {
          type: "text",
          text: " - a minimalist WebGPU framework with a Svelte, React 18/19 and Vue 3 adapters, emphasizing a predictable pipeline and clear boundaries for renderer re-rendering.",
        },
      ],
      nestedList: [
        {
          content: [
            { type: "text", text: "Recognized by " },
            { type: "link", text: "WebGPU.com", href: "https://www.webgpu.com/showcase/motion-gpu-webgpu-shaders/" },
          ],
        },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Frame", href: "https://framegui.app/" },
        {
          type: "text",
          text: " - a native FFmpeg GUI (Rust + Tauri v2) with Real-ESRGAN integration for AI upscaling.",
        },
      ],
      nestedList: [
        {
          content: [
            { type: "highlight", text: "700+ stars" },
            { type: "text", text: " on GitHub" },
          ],
        },
        {
          content: [
            { type: "text", text: "Included in " },
            {
              type: "link",
              text: "Svelte Community Showcase (Feb 2026)",
              href: "https://svelte.dev/blog/whats-new-in-svelte-february-2026",
            },
          ],
        },
      ],
    },
  ],
};
