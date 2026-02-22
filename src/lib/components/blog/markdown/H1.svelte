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

<h1 {...restProps} class={cn("text-foreground mt-1 scroll-m-24 text-xl leading-none font-medium", className)}>
  {@render children?.()}
</h1>
