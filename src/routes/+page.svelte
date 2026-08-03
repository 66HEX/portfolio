<script lang="ts">
  import { page } from "$app/state";
  import Separator from "$lib/components/ui/Separator.svelte";
  import HeroSection from "$lib/components/home/sections/HeroSection.svelte";
  import GitHubActivityCard from "$lib/features/github/components/GitHubActivityCard.svelte";
  import ProjectsSection from "$lib/components/home/sections/ProjectsSection.svelte";
  import BlogSection from "$lib/components/home/sections/BlogSection.svelte";
  import TestimonialsSection from "$lib/components/home/sections/TestimonialsSection.svelte";
  import ContactSection from "$lib/components/home/sections/ContactSection.svelte";
  import FooterSection from "$lib/components/home/sections/FooterSection.svelte";
  import { homepageContent } from "$lib/content/homepage-content";
  import { buildPersonJsonLd, buildSeoMeta, buildWebsiteJsonLd, toJsonLdScript } from "$lib/seo/meta";
  import AboutSection from "$lib/components/home/sections/AboutSection.svelte";
  import ExperienceSection from "$lib/components/home/sections/ExperienceSection.svelte";

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
      image: homepageContent.site.defaultOgImage,
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
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html websiteJsonLdScript}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html personJsonLdScript}
</svelte:head>

<div class="w-full">
  <HeroSection hero={homepageContent.hero} profile={homepageContent.profile} />
  <Separator />
  <AboutSection content={homepageContent.about} />
  <Separator />
  <GitHubActivityCard
    username={githubUsername}
    contributions={githubContributions}
    apiConfigured={githubApiConfigured}
    missingTokenMessage={homepageContent.githubCard.missingTokenMessage}
    graphText={homepageContent.githubCard.graphText}
  />
  <Separator />
  <ExperienceSection content={homepageContent.experience} />
  <Separator />
  <TestimonialsSection title={homepageContent.testimonials.title} items={tweets} />

  <Separator />
  <ProjectsSection
    title={homepageContent.projects.title}
    ctaLabel={homepageContent.projects.ctaLabel}
    githubCtaLabel={homepageContent.projects.githubCtaLabel}
    items={homepageContent.projects.items}
  />
  {#if recentBlogPosts.length > 0}
    <Separator />
    <BlogSection
      posts={recentBlogPosts}
      title={homepageContent.blog.title}
      readArticleLabel={homepageContent.blog.readArticleLabel}
    />
  {/if}
  <Separator />
  <ContactSection content={homepageContent.contact} />
  <Separator />
  <FooterSection
    headline={homepageContent.footer.headline}
    description={homepageContent.footer.description}
    socialLinks={homepageContent.footer.socialLinks}
    copyrightName={homepageContent.footer.copyrightName}
    copyrightSuffix={homepageContent.footer.copyrightSuffix}
  />
</div>
