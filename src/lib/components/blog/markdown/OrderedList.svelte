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

<ol
  {...restProps}
  class={cn(
    "text-foreground-muted mt-6 list-decimal space-y-2 pl-6 text-sm leading-relaxed font-normal tracking-normal text-pretty [&>li]:pl-1",
    className,
  )}
>
  {@render children?.()}
</ol>
