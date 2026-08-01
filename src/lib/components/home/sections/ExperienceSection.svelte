<script lang="ts">
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import type { HomepageContent } from "$lib/content/homepage-content";
  import { themeStore } from "$lib/stores/theme.svelte";

  type Props = {
    content: HomepageContent["experience"];
  };

  let { content }: Props = $props();
  const isDark = $derived(themeStore.isDark);
</script>

<SectionBlock title={content.title}>
  <ol class="flex flex-col gap-6 py-1">
    {#each content.items as item, index (`${item.company}-${item.period}`)}
      <li class="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
        {#if index < content.items.length - 1}
          <div class="bg-border absolute top-8 -bottom-6 left-[calc(1rem-0.5px)] w-px" aria-hidden="true"></div>
        {/if}

        <div
          class="bg-background-inset inset-shadow relative z-10 flex size-8 items-center justify-center rounded-sm p-1"
        >
          <div
            class="bg-background card flex size-6 items-center justify-center overflow-hidden rounded-[calc(var(--radius-base)*1.25)] p-1"
          >
            <img
              src={isDark && item.darkLogoSrc ? item.darkLogoSrc : item.logoSrc}
              alt=""
              class="size-full object-contain"
              width="24"
              height="24"
              loading="lazy"
            />
          </div>
        </div>

        <div class="min-w-0">
          <div class="flex flex-col gap-1 mt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <a
              href={item.companyHref}
              target="_blank"
              rel="external noreferrer noopener"
              class="text-foreground w-fit text-base leading-none font-medium underline decoration-dotted underline-offset-3 transition-opacity duration-150 ease-out hover:opacity-80"
            >
              {item.company}
            </a>

            <p class="text-foreground-muted text-xs leading-snug text-pretty sm:max-w-56 sm:text-right">
              {item.location} | {item.workMode}
            </p>
          </div>

          <div class="mt-3">
            <h3 class="text-foreground text-base leading-none font-medium text-balance">{item.role}</h3>
            <p class="text-foreground-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-none">
              <span>{item.employmentType}</span>
              <span aria-hidden="true">|</span>
              <span class="tabular-nums">{item.period}</span>
            </p>
          </div>

          <ul class="text-foreground-muted mt-3 list-disc space-y-2 pl-5 text-sm text-pretty">
            {#each item.highlights as highlight (`${item.company}-${highlight}`)}
              <li>{highlight}</li>
            {/each}
          </ul>

          <ul class="mt-3 flex flex-wrap gap-1" aria-label={`${item.company} technologies`}>
            {#each item.technologies as technology (`${item.company}-${technology}`)}
              <li
                class="card-outer bg-background-inset text-foreground relative inline-flex w-fit rounded-sm p-1 font-mono text-xs font-medium whitespace-nowrap"
              >
                <span class="bg-background card rounded-[calc(var(--radius-base)*1.25)] px-1.5 py-0.5">
                  {technology}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      </li>
    {/each}
  </ol>
</SectionBlock>
