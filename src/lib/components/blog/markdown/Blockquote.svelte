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

<blockquote
  {...restProps}
  class={cn(
    "border-gray-alpha-100 bg-background text-gray-alpha-800 input-highlight mt-4 rounded-md border px-3 py-2 text-xs italic",
    className,
  )}
>
  {@render children?.()}
</blockquote>
