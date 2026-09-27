<script lang="ts">
  import type { HTMLImgAttributes } from "svelte/elements";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";
  import { cn } from "$lib/utils";

  let { alt = "", class: className, ...restProps }: HTMLImgAttributes = $props();
</script>

<!-- Markdown images can appear inside paragraphs and links, so the wrapper must stay phrasing content. -->
<MarkdownCardWrapper as="span" class="my-6 block">
  <img
    {...restProps}
    {alt}
    data-slot="markdown-image"
    class={cn(
      "bg-card [a:focus-visible_&]:ring-ring/50 block h-auto w-full rounded-lg shadow-md transition-shadow [a:focus-visible_&]:ring-2",
      className,
    )}
  />
</MarkdownCardWrapper>
