import type { IconData } from "./icons";

export type HomeSocialLink = {
  platform: string;
  handle: string;
  href: string;
  icon: IconData;
};

export type ProjectItem = {
  title: string;
  description: string;
  image: string;
  href: string;
  githubHref?: string;
};

export type ExperienceItem = {
  company: string;
  companyHref: string;
  logoSrc: string;
  darkLogoSrc?: string;
  role: string;
  period: string;
  employmentType: string;
  workMode: string;
  location: string;
  technologies: string[];
  highlights: string[];
};

export type TweetData = {
  id_str: string;
  text: string;
  user: {
    id_str: string;
    name: string;
    screen_name: string;
    profile_image_url_https: string;
    verified: boolean;
    is_blue_verified: boolean;
  };
};

export type AboutTextNode = {
  type: "text";
  text: string;
};

export type AboutHighlightNode = {
  type: "highlight";
  text: string;
};

export type AboutLinkNode = {
  type: "link";
  text: string;
  href: string;
};

export type AboutNode = AboutTextNode | AboutHighlightNode | AboutLinkNode;

export type AboutListItem = {
  content: AboutNode[];
  nestedList?: AboutListItem[];
};

export type HomepageContent = {
  site: {
    siteName: string;
    siteUrl: string;
    locale: string;
    twitterHandle: string;
    defaultOgImage: string;
    defaultOgImageAlt: string;
    jobTitle: string;
    sameAsLinks: string[];
  };
  seo: {
    title: string;
    description: string;
    imageAlt: string;
    keywords: string[];
  };
  header: {
    h1: string;
  };
  hero: {
    avatarSrc: string;
    avatarAlt: string;
  };
  about: {
    title: string;
    items: AboutListItem[];
  };
  profile: {
    name: string;
    role: string;
  };
  githubCard: {
    username: string;
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
  experience: {
    title: string;
    items: ExperienceItem[];
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
    tweetIds: string[];
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
