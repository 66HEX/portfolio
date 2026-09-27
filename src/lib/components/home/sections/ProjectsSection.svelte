<script lang="ts">
  import type { HomepageContent } from "$lib/types/portfolio";
  import CardList from "$lib/components/layout/CardList.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import ProjectCard from "../cards/ProjectCard.svelte";

  let { content }: { content: HomepageContent["projects"] } = $props();
</script>

<SectionBlock title={content.title}>
  <CardList items={content.items} getKey={(project) => `${project.title}-${project.href}`}>
    {#snippet children(project)}
      <ProjectCard {project} ctaLabel={content.ctaLabel} githubCtaLabel={content.githubCtaLabel} />
    {/snippet}
  </CardList>
</SectionBlock>
