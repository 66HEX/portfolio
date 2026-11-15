<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type Props = {
    children?: Snippet;
    class?: string;
    as?: "div" | "span";
  };

  let { children, class: className = "", as: tag = "div" }: Props = $props();
</script>

<svelte:element
  this={tag}
  class={cn("bg-muted overflow-hidden rounded-[calc(var(--radius-xl)+0.25rem)] p-1.25", className)}
>
  {@render children?.()}
</svelte:element>
