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

<td {...restProps} class={cn("text-gray-alpha-800 px-4 py-3 align-middle", className)}>
  {@render children?.()}
</td>
