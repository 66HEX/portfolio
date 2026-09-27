<script lang="ts">
  import type { RecognitionItem } from "$lib/types/portfolio";
  import ContentRow from "$lib/components/layout/ContentRow.svelte";
  import IconLinkButton from "$lib/components/layout/IconLinkButton.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconLink } from "$lib/components/icons/data";
  import { Badge } from "$lib/components/ui/badge";
  import { portfolio } from "$portfolio/config";

  let { item, learnMoreLabel }: { item: RecognitionItem; learnMoreLabel: string } = $props();

  const dateFormatter = new Intl.DateTimeFormat(portfolio.language, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
</script>

<ContentRow title={item.title} description={item.description}>
  {#snippet metadata()}
    <div class="flex flex-wrap items-center gap-2">
      <time class="text-muted-foreground text-xs leading-none" datetime={item.date}>
        {dateFormatter.format(new Date(item.date))}
      </time>
      <Badge variant="secondary">{item.organization}</Badge>
    </div>
  {/snippet}
  {#snippet actions()}
    <IconLinkButton
      href={item.href}
      ariaLabel={`${item.title} — ${learnMoreLabel} (opens in a new tab)`}
      tooltip={learnMoreLabel}
    >
      <IconRenderer icon={IconLink} size={16} />
    </IconLinkButton>
  {/snippet}
</ContentRow>
