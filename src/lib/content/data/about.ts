import type { AboutListItem } from "../types";

export const aboutData: { title: string; items: AboutListItem[] } = {
  title: "About",
  items: [
    {
      content: [
        { type: "highlight", text: "Creative Developer" },
        {
          type: "text",
          text: " with 2+ years of experience, known for passion for design and strong attention to small details.",
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
        { type: "text", text: ", and " },
        { type: "highlight", text: "modern shading languages" },
        { type: "text", text: "; building high-quality web applications." },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Motion Core", href: "https://motion-core.dev/" },
        { type: "text", text: " - motion component library for Svelte." },
      ],
    },
    {
      content: [
        { type: "text", text: "Creator of " },
        { type: "link", text: "Motion GPU", href: "https://motion-gpu.dev/" },
        {
          type: "text",
          text: " - a minimalist WebGPU framework with a Svelte 5 adapter, emphasizing a predictable pipeline and clear boundaries for renderer re-rendering.",
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
            { type: "highlight", text: "650+ stars" },
            { type: "text", text: " on GitHub" },
          ],
        },
      ],
    },
  ],
};
