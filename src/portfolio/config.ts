export const sectionIds = ["about", "github", "experience", "testimonials", "projects", "writing", "contact"] as const;
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
    shader: { enabled: boolean; scale: number; blur: number; grain: number; chromaticAberration: number };
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
  sections: ["about", "github", "experience", "testimonials", "projects", "writing", "contact"],
  writing: { limit: 5 },
  hero: {
    // The shader clamps scale to 2.5; this preserves the previous effective value.
    shader: { enabled: true, scale: 2.5, blur: 0.5, grain: 0, chromaticAberration: 0 },
  },
};
