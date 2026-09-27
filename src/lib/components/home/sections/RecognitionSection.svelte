<script lang="ts">
  import type { HomepageContent } from "$lib/types/portfolio";
  import CardList from "$lib/components/layout/CardList.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import IconLinkButton from "$lib/components/layout/IconLinkButton.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconLink } from "$lib/components/icons/data";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { portfolio } from "$portfolio/config";

  let { content }: { content: HomepageContent["recognition"] } = $props();

  const dateFormatter = new Intl.DateTimeFormat(portfolio.language, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
</script>

<SectionBlock title={content.title}>
  <CardList items={content.items} getKey={(item) => `${item.href}-${item.date}`}>
    {#snippet children(item)}
      <article class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4">
        <Card.Header class="min-w-0 gap-2 px-0">
          <div class="flex flex-wrap items-center gap-2">
            <time class="text-muted-foreground text-xs leading-none" datetime={item.date}>
              {dateFormatter.format(new Date(item.date))}
            </time>
            <Badge variant="secondary">{item.organization}</Badge>
          </div>
          <Card.Title><h3 class="text-base leading-tight text-pretty wrap-break-word">{item.title}</h3></Card.Title>
          <Card.Description class="line-clamp-2 text-sm leading-relaxed text-pretty">{item.description}</Card.Description>
        </Card.Header>
        <Card.Footer class="p-0">
          <IconLinkButton
            href={item.href}
            ariaLabel={`${item.title} — ${content.learnMoreLabel} (opens in a new tab)`}
            tooltip={content.learnMoreLabel}
          >
            <IconRenderer icon={IconLink} size={16} />
          </IconLinkButton>
        </Card.Footer>
      </article>
    {/snippet}
  </CardList>
</SectionBlock>
