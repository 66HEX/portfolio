<script lang="ts">
  import IconLink from "carbon-icons-svelte/lib/Link.svelte";
  import IconGithub from "carbon-icons-svelte/lib/LogoGithub.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import type { ProjectItem } from "$lib/content/homepage-content";
  import ContentCard from "../ui/ContentCard.svelte";
  import IconLinkButton from "../ui/IconLinkButton.svelte";
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
  <div class="grid grid-cols-1 gap-3">
    {#each items as project (`project-${project.title}-${project.href}`)}
      <ContentCard class="relative flex flex-col pb-14">
        <div class="bg-background-inset inset-shadow h-96 rounded-md object-cover">
          <img
            src={project.image}
            alt={`${project.title} preview`}
            class="h-full w-full rounded-md object-cover"
            loading="lazy"
            decoding="async"
            width="1280"
            height="720"
          />
        </div>

        <h3 class="text-foreground mt-3 text-base leading-none font-medium">
          {project.title}
        </h3>
        <p class="text-foreground-muted mt-3 text-sm leading-relaxed">
          {project.description}
        </p>

        <div class="absolute right-3 bottom-3 flex items-center gap-1">
          <Tooltip content={ctaLabel} delay={120}>
            <IconLinkButton href={project.href} ariaLabel={`${ctaLabel}: ${project.title}`}>
              <IconLink size={16} />
            </IconLinkButton>
          </Tooltip>

          {#if project.githubHref}
            <Tooltip content={githubCtaLabel} delay={120}>
              <IconLinkButton href={project.githubHref} ariaLabel={`${githubCtaLabel}: ${project.title}`}>
                <IconGithub width={16} height={16} />
              </IconLinkButton>
            </Tooltip>
          {/if}
        </div>
      </ContentCard>
    {/each}
  </div>
</SectionBlock>
