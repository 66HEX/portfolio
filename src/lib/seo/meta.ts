export type LinkTag = {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
  crossorigin?: "" | "anonymous" | "use-credentials";
};

export type MetaTag = {
  name?: string;
  property?: string;
  content: string;
};

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  currentUrl?: URL;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  robots?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  keywords?: string[];
};

type BlogPostingJsonLdInput = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
};

export const seoConfig = {
  siteName: "Marek Jozwiak",
  siteUrl: "https://madebyhex.com",
  locale: "en_US",
  twitterHandle: "@madebyhex",
  defaultOgImage: "/og-image.jpg",
  defaultOgImageAlt: "Marek Jozwiak portfolio banner",
  themeColorDark: "oklch(0.1648 0.0075 264.38)",
  themeColorLight: "oklch(0.712 0.0085 264.38)",
};

export const faviconLinks: LinkTag[] = [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }];

function toAbsoluteUrl(value: string, currentUrl?: URL): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = currentUrl?.origin ?? seoConfig.siteUrl;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return new URL(normalizedPath, base).toString();
}

function normalizeDateToIso(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = dateOnlyPattern.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function buildSeoMeta(input: SeoInput) {
  const canonicalPath = input.path ?? input.currentUrl?.pathname ?? "/";
  const canonicalUrl = toAbsoluteUrl(canonicalPath, input.currentUrl);
  const ogImageUrl = toAbsoluteUrl(seoConfig.defaultOgImage, input.currentUrl);
  const imageAlt = input.imageAlt ?? seoConfig.defaultOgImageAlt;
  const robots = input.robots ?? "index,follow";
  const type = input.type ?? "website";
  const keywords = input.keywords?.filter(Boolean) ?? [];
  const tags = input.tags?.filter(Boolean) ?? [];
  const publishedTime = normalizeDateToIso(input.publishedTime);
  const modifiedTime = normalizeDateToIso(input.modifiedTime);

  const tagsContent = tags.length > 0 ? tags : (input.keywords?.filter(Boolean) ?? []);

  const metaTags: MetaTag[] = [
    { name: "description", content: input.description },
    { name: "robots", content: robots },
    { property: "og:type", content: type },
    { property: "og:site_name", content: seoConfig.siteName },
    { property: "og:locale", content: seoConfig.locale },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: ogImageUrl },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: ogImageUrl },
    { name: "twitter:image:alt", content: imageAlt },
    { name: "twitter:site", content: seoConfig.twitterHandle },
    { name: "twitter:creator", content: seoConfig.twitterHandle },
  ];

  if (keywords.length > 0) {
    metaTags.push({ name: "keywords", content: keywords.join(", ") });
  }

  if (type === "article") {
    if (publishedTime) {
      metaTags.push({
        property: "article:published_time",
        content: publishedTime,
      });
    }
    if (modifiedTime) {
      metaTags.push({
        property: "article:modified_time",
        content: modifiedTime,
      });
    }

    for (const tag of tagsContent) {
      metaTags.push({ property: "article:tag", content: tag });
    }
  }

  return {
    title: input.title,
    description: input.description,
    canonicalUrl,
    ogImageUrl,
    imageAlt,
    metaTags,
  };
}

export function buildWebsiteJsonLd(currentUrl?: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seoConfig.siteName,
    url: toAbsoluteUrl("/", currentUrl),
    inLanguage: "en",
  };
}

export function buildPersonJsonLd(currentUrl?: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: seoConfig.siteName,
    url: toAbsoluteUrl("/", currentUrl),
    image: toAbsoluteUrl(seoConfig.defaultOgImage, currentUrl),
    jobTitle: "Frontend Developer",
    sameAs: [
      "https://github.com/66HEX",
      "https://www.linkedin.com/in/marek-j%C3%B3%C5%BAwiak-29958132a/",
      "https://x.com/madebyhex",
      "https://21st.dev/66hex",
    ],
  };
}

export function buildBlogPostingJsonLd(input: BlogPostingJsonLdInput) {
  const publishedTime = normalizeDateToIso(input.publishedTime);
  const modifiedTime = normalizeDateToIso(input.modifiedTime);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: publishedTime,
    dateModified: modifiedTime ?? publishedTime,
    image: [input.imageUrl],
    mainEntityOfPage: input.canonicalUrl,
    author: {
      "@type": "Person",
      name: seoConfig.siteName,
    },
    publisher: {
      "@type": "Person",
      name: seoConfig.siteName,
    },
    keywords: input.tags?.join(", "),
  };
}

export function toJsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function toJsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${toJsonLdString(data)}</script>`;
}
