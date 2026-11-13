<script lang="ts">
  import type { Snippet } from "svelte";

  let { as = "p", children }: { as?: "p" | "figcaption"; children?: Snippet } = $props();
</script>

<svelte:element
  this={as}
  data-media-caption
  class="text-muted-foreground text-center text-xs leading-relaxed text-balance italic [counter-increment:media-caption]"
>
  <span class="before:content-[counter(media-caption)]">.</span>&nbsp;{@render children?.()}
</svelte:element>
