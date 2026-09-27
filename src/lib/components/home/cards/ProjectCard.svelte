<script lang="ts">
  import type { ProjectItem } from "$lib/types/portfolio";
  import ContentRow from "$lib/components/layout/ContentRow.svelte";
  import IconLinkButton from "$lib/components/layout/IconLinkButton.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconGitHub, IconLink } from "$lib/components/icons/data";

  let { project, ctaLabel, githubCtaLabel }: { project: ProjectItem; ctaLabel: string; githubCtaLabel: string } =
    $props();
</script>

<ContentRow title={project.title} description={project.description}>
  {#snippet actions()}
    <IconLinkButton href={project.href} ariaLabel={project.title} tooltip={ctaLabel}>
      <IconRenderer icon={IconLink} size={16} />
    </IconLinkButton>
    {#if project.githubHref}
      <IconLinkButton href={project.githubHref} ariaLabel={`${project.title} on GitHub`} tooltip={githubCtaLabel}>
        <IconRenderer icon={IconGitHub} size={16} />
      </IconLinkButton>
    {/if}
  {/snippet}
</ContentRow>
