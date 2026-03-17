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
    "text-foreground hover:text-foreground-muted text-sm font-medium tracking-normal underline decoration-dotted underline-offset-4 transition-[color] duration-150 ease-out",
    className,
  )}
>
  {@render children?.()}
</a>
