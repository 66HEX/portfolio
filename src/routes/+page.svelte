<script lang="ts">
  import { page } from "$app/state";
  import Separator from "$lib/components/ui/Separator.svelte";
  import HeroBanner from "$lib/components/home/HeroBanner.svelte";
  import SocialLinksRow from "$lib/components/home/SocialLinksRow.svelte";
  import ProfileInfoGrid from "$lib/components/home/ProfileInfoGrid.svelte";
  import GitHubActivityCard from "$lib/components/home/GitHubActivityCard.svelte";
  import ProjectsSection from "$lib/components/home/ProjectsSection.svelte";
  import BlogSection from "$lib/components/home/BlogSection.svelte";
  import TestimonialsSection from "$lib/components/home/TestimonialsSection.svelte";
  import FaqSection from "$lib/components/home/FaqSection.svelte";
  import ContactSection from "$lib/components/home/ContactSection.svelte";
  import FooterSection from "$lib/components/home/FooterSection.svelte";
  import { homepageContent } from "$lib/content/homepage-content";
  import { buildPersonJsonLd, buildSeoMeta, buildWebsiteJsonLd, toJsonLdScript } from "$lib/seo/meta";
  import PageCard from "$lib/components/ui/PageCard.svelte";

  type GitHubContribution = {
    date: string;
    count: number;
  };

  type RouteData = {
    recentBlogPosts: {
      slug: string;
      title: string;
      description: string;
      date: string;
      tags: string[];
      thumbnail: string;
      published: boolean;
    }[];
    githubUsername: string;
    githubContributions: GitHubContribution[] | null;
    githubApiConfigured: boolean;
  };

  let { data }: { data: RouteData } = $props();

  const githubUsername = $derived(data.githubUsername);
  const githubContributions = $derived(data.githubContributions ?? undefined);
  const githubApiConfigured = $derived(data.githubApiConfigured);
  const recentBlogPosts = $derived(data.recentBlogPosts);

  const homeSeo = $derived(
    buildSeoMeta({
      title: "Marek Jozwiak | Frontend Developer",
      description:
        "Portfolio of Marek Jozwiak - frontend developer focused on product interfaces, front-end architecture, and performance-first SvelteKit development.",
      path: page.url.pathname,
      currentUrl: page.url,
      image: homepageContent.hero.avatarSrc,
      imageAlt: "Open Graph Image for Marek Jozwiak's Portfolio",
      type: "website",
      keywords: [
        "Marek Jozwiak",
        "Design Engineer",
        "Front-end Developer",
        "SvelteKit",
        "UI Engineering",
        "Product Design",
        "Web Performance",
        "Portfolio",
      ],
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

<PageCard>
  <h1 class="sr-only">Marek Jozwiak - Frontend Developer portfolio</h1>
  <HeroBanner avatarSrc={homepageContent.hero.avatarSrc} avatarAlt={homepageContent.hero.avatarAlt} />
  <SocialLinksRow
    name={homepageContent.socialRow.name}
    role={homepageContent.socialRow.role}
    links={homepageContent.socialRow.links}
  />
  <ProfileInfoGrid content={homepageContent.profileInfo} />
  <Separator class="my-4" />
  <GitHubActivityCard
    username={githubUsername}
    contributions={githubContributions}
    apiConfigured={githubApiConfigured}
    missingTokenMessage={homepageContent.githubCard.missingTokenMessage}
    graphText={homepageContent.githubCard.graphText}
  />
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
  <TestimonialsSection title={homepageContent.testimonials.title} items={homepageContent.testimonials.items} />
  <Separator class="my-4" />
  <FaqSection title={homepageContent.faq.title} items={homepageContent.faq.items} />
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
</PageCard>
