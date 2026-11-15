<script lang="ts">
  import type { Snippet } from "svelte";

  let { as = "p", children }: { as?: "p" | "figcaption"; children?: Snippet } = $props();
</script>

<svelte:element
  this={as}
  data-media-caption
  class="text-muted-foreground text-center text-xs leading-relaxed tracking-[0.01em] text-pretty italic [counter-increment:media-caption]"
>
  <span class="before:content-[counter(media-caption)]">.</span>&nbsp;{@render children?.()}
</svelte:element>

<style>
  :global([data-doc-content] .markdown-media:has(+ [data-media-caption])),
  :global([data-doc-content] p:has(.markdown-media):has(+ [data-media-caption])) {
    margin-bottom: calc(var(--spacing) * 2);
  }

  /* Markdown wraps images in paragraphs; the paragraph owns the caption gap. */
  :global([data-doc-content] p:has(+ [data-media-caption]) .markdown-media) {
    margin-bottom: 0;
  }
</style>
