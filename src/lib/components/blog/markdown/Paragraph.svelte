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

<p
  {...restProps}
  class={cn(
    "text-foreground-muted mt-4 text-sm leading-relaxed font-normal tracking-normal text-pretty first:mt-0",
    className,
  )}
>
  {@render children?.()}
</p>
