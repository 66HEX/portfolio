<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();
</script>

<a
  {...restProps}
  class={cn(
    "text-foreground hover:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-offset-background rounded-xs text-sm font-medium tracking-normal underline decoration-dotted underline-offset-4 transition-[color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-offset-2 motion-reduce:transition-none",
    "has-[[data-slot=markdown-image]]:block has-[[data-slot=markdown-image]]:rounded-xl has-[[data-slot=markdown-image]]:no-underline has-[[data-slot=markdown-image]]:focus-visible:ring-0 has-[[data-slot=markdown-image]]:focus-visible:ring-offset-0",
    className,
  )}
>
  {@render children?.()}
</a>
