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

<ul
  {...restProps}
  class={cn("text-gray-alpha-800 mt-3 list-disc space-y-3 pl-5 text-xs leading-relaxed [&>li]:pl-1", className)}
>
  {@render children?.()}
</ul>
