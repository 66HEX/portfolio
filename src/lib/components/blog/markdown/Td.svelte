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

<td {...restProps} class={cn("text-foreground-muted px-4 py-2 align-middle font-normal tracking-normal", className)}>
  {@render children?.()}
</td>
