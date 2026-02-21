<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
    [prop: string]: unknown;
  };

  let { children, class: className = "", ...restProps }: Props = $props();
</script>

<article {...restProps} class={cn("card-highlight card-shadow bg-card rounded-md p-3", className)}>
  {@render children?.()}
</article>
