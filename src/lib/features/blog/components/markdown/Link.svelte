<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

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
    "text-foreground hover:text-foreground-muted focus-visible:ring-accent focus-visible:ring-offset-background rounded-xs text-sm font-medium tracking-normal underline decoration-dotted underline-offset-4 transition-[color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none",
    className,
  )}
>
  {@render children?.()}
</a>
