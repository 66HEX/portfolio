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

<p {...restProps} class={cn("text-gray-alpha-800 mt-6 text-xs leading-relaxed first:mt-0", className)}>
  {@render children?.()}
</p>
