<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import { Badge } from "$lib/components/ui/badge";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import type { HomepageContent } from "$lib/homepage";

  type Props = {
    content: HomepageContent["experience"];
  };

  let { content }: Props = $props();
</script>

<SectionBlock title={content.title}>
  <ol class="flex flex-col gap-6 py-1">
    {#each content.items as item, index (`${item.company}-${item.period}`)}
      <li class="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
        {#if index < content.items.length - 1}
          <div class="bg-border absolute top-7 -bottom-6 left-[calc(0.875rem-0.5px)] w-px" aria-hidden="true"></div>
        {/if}

        <Avatar.Root class="bg-card relative z-10 size-7 items-center justify-center rounded-md after:rounded-md">
          {#if item.darkLogoSrc}
            <img
              src={item.logoSrc}
              alt=""
              class="block size-3.5 object-contain dark:hidden"
              width="14"
              height="14"
              loading="lazy"
            />
            <img
              src={item.darkLogoSrc}
              alt=""
              class="hidden size-3.5 object-contain dark:block"
              width="14"
              height="14"
              loading="lazy"
            />
          {:else}
            <Avatar.Image
              src={item.logoSrc}
              alt=""
              class="size-3.5 rounded-none object-contain"
              width="14"
              height="14"
              loading="lazy"
            />
            <Avatar.Fallback class="size-3.5 rounded-none text-xs">{item.company[0]}</Avatar.Fallback>
          {/if}
        </Avatar.Root>

        <div class="min-w-0">
          <div class="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <a
              href={item.companyHref}
              target="_blank"
              rel="external noreferrer noopener"
              class="text-foreground focus-visible:ring-ring/50 focus-visible:ring-offset-background w-fit rounded-xs text-base leading-none font-medium tracking-tight underline decoration-dotted underline-offset-3 transition-[opacity,box-shadow] duration-150 ease-out outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              {item.company}
            </a>

            <p class="text-muted-foreground text-xs leading-snug text-pretty sm:max-w-64 sm:text-right">
              {item.location} | {item.workMode}
            </p>
          </div>

          <div class="mt-3">
            <h3 class="text-foreground text-base leading-none font-medium tracking-tight text-balance">{item.role}</h3>
            <p class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-none">
              <span>{item.employmentType}</span>
              <span aria-hidden="true">|</span>
              <span class="tabular-nums">{item.period}</span>
            </p>
          </div>

          <ul class="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm text-pretty leading-relaxed">
            {#each item.highlights as highlight (`${item.company}-${highlight}`)}
              <li>{highlight}</li>
            {/each}
          </ul>

          <ul class="mt-3 flex flex-wrap gap-1" aria-label={`${item.company} technologies`}>
            {#each item.technologies as technology (`${item.company}-${technology}`)}
              <li>
                <Badge variant="secondary" class="font-mono">{technology}</Badge>
              </li>
            {/each}
          </ul>
        </div>
      </li>
    {/each}
  </ol>
</SectionBlock>
