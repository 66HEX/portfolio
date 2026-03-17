<script lang="ts">
  import type { ProjectItem } from "$lib/content/homepage-content";
  import LandingContentCard from "./LandingContentCard.svelte";
  import CardGrid from "../ui/CardGrid.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    title: string;
    ctaLabel: string;
    githubCtaLabel: string;
    items: ProjectItem[];
  };

  let { title, ctaLabel, githubCtaLabel, items }: Props = $props();
</script>

<SectionBlock {title}>
  <CardGrid>
    {#each items as project (`project-${project.title}-${project.href}`)}
      <LandingContentCard
        card={{
          variant: "project",
          title: project.title,
          description: project.description,
          image: project.image,
          href: project.href,
          ctaLabel,
          githubHref: project.githubHref,
          githubCtaLabel,
        }}
      />
    {/each}
  </CardGrid>
</SectionBlock>
