<script lang="ts">
  import type { WritingPost } from "$lib/features/writing/types";
  import ContentRow from "$lib/components/layout/ContentRow.svelte";
  import IconLinkButton from "$lib/components/layout/IconLinkButton.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconChevronRight, IconLink } from "$lib/components/icons/data";
  import { Badge } from "$lib/components/ui/badge";

  let { post, readArticleLabel }: { post: WritingPost; readArticleLabel: string } = $props();
  const external = $derived(post.kind === "external");
  const label = $derived(post.kind === "external" ? `Read on ${post.source}` : readArticleLabel);
</script>

<ContentRow title={post.title} description={post.description}>
  {#snippet metadata()}
    <div class="flex flex-wrap items-center gap-2">
      <time class="text-muted-foreground text-xs leading-none" datetime={post.date}>{post.date}</time>
      {#if post.kind === "external"}<Badge variant="secondary">{post.source}</Badge>{/if}
    </div>
  {/snippet}
  {#snippet actions()}
    <IconLinkButton
      href={post.href}
      ariaLabel={external ? `${post.title} — ${label} (opens in a new tab)` : post.title}
      tooltip={label}
      target={external ? "_blank" : "_self"}
      rel={external ? "noopener noreferrer" : ""}
    >
      <IconRenderer icon={external ? IconLink : IconChevronRight} size={16} />
    </IconLinkButton>
  {/snippet}
</ContentRow>
