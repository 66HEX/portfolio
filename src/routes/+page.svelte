<script lang="ts">
  import { page } from "$app/state";
  import SectionSeparator from "$lib/components/layout/SectionSeparator.svelte";
  import HeroSection from "$lib/components/home/sections/HeroSection.svelte";
  import GitHubActivityCard from "$lib/features/github/components/GitHubActivityCard.svelte";
  import ProjectsSection from "$lib/components/home/sections/ProjectsSection.svelte";
  import RecognitionSection from "$lib/components/home/sections/RecognitionSection.svelte";
  import WritingSection from "$lib/components/home/sections/WritingSection.svelte";
  import TestimonialsSection from "$lib/components/home/sections/TestimonialsSection.svelte";
  import ContactSection from "$lib/components/home/sections/ContactSection.svelte";
  import FooterSection from "$lib/components/home/sections/FooterSection.svelte";
  import { homepageContent } from "$lib/homepage";
  import { buildPersonJsonLd, buildSeoMeta, buildWebsiteJsonLd, toJsonLdScript } from "$lib/seo/meta";
  import AboutSection from "$lib/components/home/sections/AboutSection.svelte";
  import ExperienceSection from "$lib/components/home/sections/ExperienceSection.svelte";

  import { portfolio } from "$portfolio/config";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const githubUsername = $derived(data.githubUsername);
  const githubContributions = $derived(data.githubContributions ?? undefined);
  const githubApiConfigured = $derived(data.githubApiConfigured);
  const recentWritingPosts = $derived(data.recentWritingPosts);
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
  {#each portfolio.sections as section (section)}
    {@const visible =
      section === "writing"
        ? recentWritingPosts.length > 0
        : section === "testimonials"
          ? tweets.length > 0
          : section === "projects"
            ? homepageContent.projects.items.length > 0
            : section === "recognition"
              ? homepageContent.recognition.items.length > 0
              : section === "experience"
                ? homepageContent.experience.items.length > 0
                : section === "about"
                  ? homepageContent.about.items.length > 0
                  : true}
    {#if visible}
      <SectionSeparator />
      {#if section === "about"}
        <AboutSection content={homepageContent.about} />
      {:else if section === "github"}
        <GitHubActivityCard
          username={githubUsername}
          contributions={githubContributions}
          apiConfigured={githubApiConfigured}
          missingTokenMessage={homepageContent.githubCard.missingTokenMessage}
          graphText={homepageContent.githubCard.graphText}
        />
      {:else if section === "experience"}
        <ExperienceSection content={homepageContent.experience} />
      {:else if section === "testimonials"}
        <TestimonialsSection title={homepageContent.testimonials.title} items={tweets} />
      {:else if section === "projects"}
        <ProjectsSection content={homepageContent.projects} />
      {:else if section === "recognition"}
        <RecognitionSection content={homepageContent.recognition} />
      {:else if section === "writing"}
        <WritingSection posts={recentWritingPosts} content={homepageContent.writing} />
      {:else if section === "contact"}
        <ContactSection content={homepageContent.contact} />
      {/if}
    {/if}
  {/each}
  <SectionSeparator />
  <FooterSection content={homepageContent.footer} />
</div>
