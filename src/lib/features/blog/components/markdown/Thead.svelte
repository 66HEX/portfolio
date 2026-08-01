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

<thead
  {...restProps}
  class={cn(
    "bg-background after:bg-border dark:after:bg-background-inset dark:after:shadow-border relative overflow-hidden rounded-t-lg after:absolute after:inset-x-0 after:bottom-0 after:h-px after:shadow-2xs after:shadow-white after:content-['']",
    className,
  )}
>
  {@render children?.()}
</thead>
