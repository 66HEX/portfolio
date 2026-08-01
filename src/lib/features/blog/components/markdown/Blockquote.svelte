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

<div class="card-outer bg-background-inset mt-6 rounded-md p-1.5">
  <blockquote
    {...restProps}
    class={cn(
      "card border-l-accent bg-background text-foreground-muted relative rounded-sm border-l-2 px-5 py-3 text-base font-normal italic",
      className,
    )}
  >
    {@render children?.()}
  </blockquote>
</div>
