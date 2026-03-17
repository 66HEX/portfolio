import type { Component, ComponentType } from "svelte";
import IconClock from "carbon-icons-svelte/lib/Time.svelte";
import IconFile from "carbon-icons-svelte/lib/Document.svelte";
import IconGithub from "carbon-icons-svelte/lib/LogoGithub.svelte";
import IconLink from "carbon-icons-svelte/lib/Link.svelte";
import IconLinkedin from "carbon-icons-svelte/lib/LogoLinkedin.svelte";
import IconMail from "carbon-icons-svelte/lib/Email.svelte";
import IconPhone from "carbon-icons-svelte/lib/Phone.svelte";
import IconPin from "carbon-icons-svelte/lib/Location.svelte";
import IconUser from "carbon-icons-svelte/lib/User.svelte";
import IconX from "carbon-icons-svelte/lib/LogoX.svelte";

export type IconComponent = Component<Record<string, unknown>> | ComponentType;

export type HomeSocialLink = {
  platform: string;
  handle: string;
  href: string;
  icon: IconComponent;
};

export type ProfileInfoItem = {
  icon: IconComponent;
  text: string;
  kind?: "static" | "time";
};

export type ProjectItem = {
  title: string;
  description: string;
  image: string;
  href: string;
  githubHref?: string;
};

export type TestimonialItem = {
  name: string;
  role: string;
  text: string;
  avatar: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type HomepageContent = {
  hero: {
    avatarSrc: string;
    avatarAlt: string;
  };
  socialRow: {
    name: string;
    role: string;
    links: HomeSocialLink[];
  };
  profileInfo: {
    timeZone: string;
    timeFallbackText: string;
    left: ProfileInfoItem[];
    right: ProfileInfoItem[];
  };
  githubCard: {
    missingTokenMessage: string;
    graphText: {
      monthNames: string[];
      dayLabels: string[];
      legendLessLabel: string;
      legendMoreLabel: string;
      summaryMiddleLabel: string;
      summaryDaysLabel: string;
      contributionSingularLabel: string;
      contributionPluralLabel: string;
      tooltipOnLabel: string;
    };
  };
  projects: {
    title: string;
    ctaLabel: string;
    githubCtaLabel: string;
    items: ProjectItem[];
  };
  blog: {
    title: string;
    emptyStateLabel: string;
    readArticleLabel: string;
  };
  testimonials: {
    title: string;
    items: TestimonialItem[];
  };
  faq: {
    title: string;
    items: FaqItem[];
  };
  contact: {
    title: string;
    form: {
      nameLabel: string;
      emailLabel: string;
      subjectLabel: string;
      messageLabel: string;
      submitLabel: string;
      sendingLabel: string;
      successLabel: string;
      errorLabel: string;
      validationErrorLabel: string;
      privacyNote: string;
    };
  };
  footer: {
    headline: string;
    description: string;
    socialLinks: HomeSocialLink[];
    copyrightName: string;
    copyrightSuffix: string;
  };
};

const socialLinks: HomeSocialLink[] = [
  {
    platform: "GitHub",
    handle: "@66HEX",
    href: "https://github.com/66HEX",
    icon: IconGithub,
  },
  {
    platform: "LinkedIn",
    handle: "",
    href: "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
    icon: IconLinkedin,
  },
  {
    platform: "X",
    handle: "@madebyhex",
    href: "https://x.com/madebyhex",
    icon: IconX,
  },
  {
    platform: "Resume",
    handle: "",
    href: "/resume.pdf",
    icon: IconFile,
  },
];

export const homepageContent: HomepageContent = {
  hero: {
    avatarSrc: "/images/avatar.webp",
    avatarAlt: "Profile avatar",
  },
  socialRow: {
    name: "Marek Jóźwiak",
    role: "Frontend Developer",
    links: socialLinks,
  },
  profileInfo: {
    timeZone: "Europe/Warsaw",
    timeFallbackText: "Warsaw time",
    left: [
      { icon: IconUser, text: "Frontend Developer" },
      { icon: IconPin, text: "Warsaw, Poland" },
      { icon: IconClock, text: "Warsaw time", kind: "time" },
    ],
    right: [
      { icon: IconPhone, text: "+48 792 015 696" },
      { icon: IconMail, text: "hexthecoder@gmail.com" },
      { icon: IconLink, text: "madebyhex.com" },
    ],
  },
  githubCard: {
    missingTokenMessage: "Add `GITHUB_TOKEN` in `.env` to load live GitHub data.",
    graphText: {
      monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
      legendLessLabel: "Less",
      legendMoreLabel: "More",
      summaryMiddleLabel: "contributions in the last",
      summaryDaysLabel: "days",
      contributionSingularLabel: "contribution",
      contributionPluralLabel: "contributions",
      tooltipOnLabel: "on",
    },
  },
  projects: {
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
  },
  blog: {
    title: "Blog",
    emptyStateLabel: "No blog posts yet.",
    readArticleLabel: "Read article",
  },
  testimonials: {
    title: "Testimonials",
    items: [
      {
        name: "Angelika Grzejdziak",
        role: "Personal Trainer & Nutritionist",
        text: "Working with this developer has significantly improved my digital presence. His attention to detail and creative approach exceeded my expectations.",
        avatar: "/images/testimonials/testimonials-angelika.webp",
      },
      {
        name: "Łukasz Klugiewicz",
        role: "Lean Bulls Gym Co-Founder",
        text: "His technical expertise and creativity are exceptional. He didn't just meet our goals – he helped us see the project from a new perspective.",
        avatar: "/images/testimonials/testimonials-lukasz.webp",
      },
      {
        name: "Natalia Jasińska",
        role: "Personal Trainer & Nutritionist",
        text: "His innovative approach to problem-solving and commitment to the project made a strong impression. The results speak for themselves.",
        avatar: "/images/testimonials/testimonials-natalia.webp",
      },
      {
        name: "Ben Ashlin",
        role: "Identity Security Consultant",
        text: "Working with Marek has been seamless and professional. His responsiveness and ability to deliver beyond expectations set him apart.",
        avatar: "/images/testimonials/testimonials-ben.webp",
      },
      {
        name: "Arkadiusz Jasiński",
        role: "Husarz Gym Co-Founder",
        text: "Great collaboration and clear communication throughout. His input on design was invaluable, and the results exceeded expectations.",
        avatar: "/images/testimonials/testimonials-arek.webp",
      },
    ],
  },
  faq: {
    title: "FAQ",
    items: [
      {
        question: "What kind of projects do you usually take on?",
        answer:
          "Mostly product websites and web apps where design quality and front-end execution both matter from day one.",
      },
      {
        question: "Do you work on both design and development?",
        answer:
          "Yes. I can shape UI systems, prototype interactions, and ship production-ready front-end in SvelteKit.",
      },
      {
        question: "What is a typical project timeline?",
        answer:
          "Smaller scopes usually take 2-4 weeks. Larger product initiatives are typically structured in monthly iterations.",
      },
      {
        question: "Can you improve an existing codebase?",
        answer:
          "Yes. I often join existing products to refactor UI architecture, improve performance, and tighten consistency.",
      },
      {
        question: "How can I get in touch?",
        answer: "The fastest way is email at hexthecoder@gmail.com or a direct message on LinkedIn.",
      },
    ],
  },
  contact: {
    title: "Contact",
    form: {
      nameLabel: "Name",
      emailLabel: "Email",
      subjectLabel: "Subject",
      messageLabel: "Message",
      submitLabel: "Send message",
      sendingLabel: "Sending...",
      successLabel: "Message sent successfully. Thanks for reaching out.",
      errorLabel: "Couldn't send the message right now. Try again in a moment.",
      validationErrorLabel: "Please fill all fields with valid details before sending.",
      privacyNote: "By sending this form, you agree to be contacted back about your inquiry.",
    },
  },
  footer: {
    headline: "Let's build something useful.",
    description: "Available for product design and front-end engineering projects.",
    socialLinks: socialLinks,
    copyrightName: "Marek Jóźwiak",
    copyrightSuffix: "Crafted with SvelteKit.",
  },
};
