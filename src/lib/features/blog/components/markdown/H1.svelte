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

<h1
  {...restProps}
  class={cn("text-foreground scroll-m-24 text-xl font-medium tracking-tight [&_code]:text-2xl", className)}
>
  {@render children?.()}
</h1>
