import type { AboutListItem } from "../types";

export const aboutData: { title: string; items: AboutListItem[] } = {
  title: "About",
  items: [
    {
      content: [
        { type: "highlight", text: "Creative developer" },
        {
          type: "text",
          text: " with 2.5+ years of experience and a strong eye for detail.",
        },
      ],
    },
    {
      content: [
        { type: "text", text: "I build polished web applications with " },
        { type: "highlight", text: "Svelte" },
        { type: "text", text: ", " },
        { type: "highlight", text: "React" },
        { type: "text", text: ", " },
        { type: "highlight", text: "TypeScript" },
        { type: "text", text: ", " },
        { type: "highlight", text: "Rust" },
        { type: "text", text: ", " },
        { type: "highlight", text: "WGSL" },
        { type: "text", text: ", and " },
        { type: "highlight", text: "GLSL" },
        { type: "text", text: "." },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Motion Core", href: "https://motion-core.dev/" },
        {
          type: "text",
          text: " - a Svelte 5 motion component library built on OGL and GSAP, following a shadcn-inspired copy-paste architecture with a Rust-based CLI.",
        },
      ],
      nestedList: [
        {
          content: [
            { type: "highlight", text: "500+ stars" },
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
          text: " - a Rust-native FFmpeg desktop app built with GPUI-CE, with granular video, audio, image, subtitle, and metadata workflows.",
        },
      ],
      nestedList: [
        {
          content: [
            { type: "highlight", text: "1800+ stars" },
            { type: "link", text: " on GitHub", href: "https://github.com/66HEX/frame" },
          ],
        },
      ],
    },
  ],
};
