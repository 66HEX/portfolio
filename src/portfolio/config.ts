export const sectionIds = [
  "about",
  "github",
  "experience",
  "testimonials",
  "projects",
  "recognition",
  "writing",
  "contact",
] as const;
export type SectionId = (typeof sectionIds)[number];

type PortfolioConfig = {
  name: string;
  role: string;
  url: `https://${string}`;
  language: string;
  locale: string;
  githubUsername: string;
  xHandle: string;
  linkedInUrl: string;
  resumeHref: string;
  sections: SectionId[];
  writing: { limit: number };
  hero: {
    shader: {
      enabled: boolean;
      svgSource: string;
      fontUrl: string;
      scale: number;
      offsetX: number;
      offsetY: number;
      panX: number;
      panY: number;
      logoScale: number;
      legendScale: number;
      letterSpacing: number;
      roughness: number;
      lightAngle: number;
      lightElevation: number;
      lightIntensity: number;
      lightSize: number;
      environmentRotation: number;
      environmentIntensity: number;
      exposure: number;
      interactive: boolean;
      sound: { enabled: boolean; src: string; volume: number };
    };
  };
};

/** Public settings only. Credentials belong in environment variables. */
export const portfolio: PortfolioConfig = {
  name: "Marek Jóźwiak",
  role: "Creative Developer",
  url: "https://madebyhex.com",
  language: "en",
  locale: "en_US",
  githubUsername: "66HEX",
  xHandle: "madebyhex",
  linkedInUrl: "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
  resumeHref: "/resume.pdf",
  // Reorder these IDs or remove one to hide its section and skip its data loading.
  // Hero and footer stay outside this list.
  sections: ["about", "github", "experience", "testimonials", "projects", "recognition", "writing", "contact"],
  writing: { limit: 5 },
  hero: {
    // Keycap Logo settings from Godsend. Material colors follow the active theme.
    shader: {
      enabled: true,
      svgSource: "/favicon.svg",
      fontUrl: "/fonts/StackSansText-Regular.woff2",
      scale: 1.2, // [0.1, 1.8]
      offsetX: 0.3, // [-0.3, 0.3], fraction of canvas width
      offsetY: 0, // [-0.5, 0.5], fraction of canvas height
      panX: 1, // [-14, 26], scene units
      panY: 0, // [-8, 20], scene units
      logoScale: 1.15, // [0.3, 1.15]
      legendScale: 1.6, // [0.5, 1.6]
      letterSpacing: 0.05, // [-0.1, 0.5] em, step 0.005
      roughness: 0.5, // [0.3, 0.85]
      lightAngle: -10, // [-180, 180] degrees
      lightElevation: 35, // [10, 85] degrees
      lightIntensity: 2, // [0, 3]
      lightSize: 2, // [0.25, 3]
      environmentRotation: 0, // [-180, 180] degrees
      environmentIntensity: 1, // [0, 3]
      exposure: 1, // [0, 2]
      interactive: true,
      sound: {
        enabled: true,
        src: "/sounds/keycap-press.wav",
        volume: 0.35, // [0, 1]; 0 is silent
      },
    },
  },
};
