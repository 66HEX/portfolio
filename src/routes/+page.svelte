<script lang="ts">
  import { page } from "$app/state";
  import Separator from "$lib/components/ui/Separator.svelte";
  import HeroBanner from "$lib/components/home/hero/HeroBanner.svelte";
  import SocialLinksRow from "$lib/components/home/hero/SocialLinksRow.svelte";
  import GitHubActivityCard from "$lib/features/github/components/GitHubActivityCard.svelte";
  import ProjectsSection from "$lib/components/home/sections/ProjectsSection.svelte";
  import BlogSection from "$lib/components/home/sections/BlogSection.svelte";
  import TestimonialsSection from "$lib/components/home/sections/TestimonialsSection.svelte";
  import ContactSection from "$lib/components/home/sections/ContactSection.svelte";
  import FooterSection from "$lib/components/home/sections/FooterSection.svelte";
  import { homepageContent } from "$lib/content/homepage-content";
  import { buildPersonJsonLd, buildSeoMeta, buildWebsiteJsonLd, toJsonLdScript } from "$lib/seo/meta";
  import AboutSection from "$lib/components/home/sections/AboutSection.svelte";
  import Menubar from "$lib/components/layout/Menubar.svelte";

  type GitHubContribution = {
    date: string;
    count: number;
  };

  import type { TweetData } from "$lib/content/types";

  type RouteData = {
    recentBlogPosts: {
      slug: string;
      title: string;
      description: string;
      date: string;
      tags: string[];
      published: boolean;
    }[];
    githubUsername: string;
    githubContributions: GitHubContribution[] | null;
    githubApiConfigured: boolean;
    tweets: TweetData[];
  };

  let { data }: { data: RouteData } = $props();

  const githubUsername = $derived(data.githubUsername);
  const githubContributions = $derived(data.githubContributions ?? undefined);
  const githubApiConfigured = $derived(data.githubApiConfigured);
  const recentBlogPosts = $derived(data.recentBlogPosts);
  const tweets = $derived(data.tweets);

  const homeSeo = $derived(
    buildSeoMeta({
      title: homepageContent.seo.title,
      description: homepageContent.seo.description,
      path: page.url.pathname,
      currentUrl: page.url,
      image: homepageContent.hero.avatarSrc,
      imageAlt: homepageContent.seo.imageAlt,
      type: "website",
      keywords: homepageContent.seo.keywords,
    }),
  );

  const websiteJsonLdScript = $derived(toJsonLdScript(buildWebsiteJsonLd(page.url)));
  const personJsonLdScript = $derived(toJsonLdScript(buildPersonJsonLd(page.url)));
</script>

<svelte:head>
  <title>{homeSeo.title}</title>
  <link rel="canonical" href={homeSeo.canonicalUrl} />
  {#each homeSeo.metaTags as tag, index (`${tag.name ?? tag.property ?? "meta"}-${index}-${tag.content}`)}
    {#if tag.name}
      <meta name={tag.name} content={tag.content} />
    {:else if tag.property}
      <meta property={tag.property} content={tag.content} />
    {/if}
  {/each}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html websiteJsonLdScript}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html personJsonLdScript}
</svelte:head>

<div class="w-full">
  <h1 class="sr-only">{homepageContent.header.h1}</h1>
  <Menubar />
  <HeroBanner
    avatarSrc={homepageContent.hero.avatarSrc}
    avatarAlt={homepageContent.hero.avatarAlt}
    backgroundSrc={homepageContent.hero.backgroundSrc}
    backgroundDarkSrc={homepageContent.hero.backgroundDarkSrc}
    backgroundAlt={homepageContent.hero.backgroundAlt}
  />
  <SocialLinksRow
    name={homepageContent.socialRow.name}
    role={homepageContent.socialRow.role}
    links={homepageContent.socialRow.links}
  />
  <Separator class="my-4" />
  <AboutSection content={homepageContent.about} />
  <Separator class="my-4" />
  <GitHubActivityCard
    username={githubUsername}
    contributions={githubContributions}
    apiConfigured={githubApiConfigured}
    missingTokenMessage={homepageContent.githubCard.missingTokenMessage}
    graphText={homepageContent.githubCard.graphText}
  />
  <Separator class="my-4" />
  <TestimonialsSection title={homepageContent.testimonials.title} items={tweets} />

  <Separator class="my-4" />
  <ProjectsSection
    title={homepageContent.projects.title}
    ctaLabel={homepageContent.projects.ctaLabel}
    githubCtaLabel={homepageContent.projects.githubCtaLabel}
    items={homepageContent.projects.items}
  />
  <Separator class="my-4" />
  <BlogSection
    posts={recentBlogPosts}
    title={homepageContent.blog.title}
    emptyStateLabel={homepageContent.blog.emptyStateLabel}
    readArticleLabel={homepageContent.blog.readArticleLabel}
  />
  <Separator class="my-4" />
  <ContactSection content={homepageContent.contact} />
  <Separator class="my-4" />
  <FooterSection
    headline={homepageContent.footer.headline}
    description={homepageContent.footer.description}
    socialLinks={homepageContent.footer.socialLinks}
    copyrightName={homepageContent.footer.copyrightName}
    copyrightSuffix={homepageContent.footer.copyrightSuffix}
  />
</div>
