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

<li
  {...restProps}
  class={cn("text-foreground-muted text-sm leading-relaxed font-normal tracking-normal text-pretty", className)}
>
  {@render children?.()}
</li>
