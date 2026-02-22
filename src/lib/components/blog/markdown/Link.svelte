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
  target="_blank"
  rel="noreferrer noopener"
  {...restProps}
  class={cn(
    "text-foreground hover:text-gray-alpha-800 transition-[color,box-shadowduration-150 rounded-sm text-sm underline decoration-dotted underline-offset-2 ease-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    className,
  )}
>
  {@render children?.()}
</a>
