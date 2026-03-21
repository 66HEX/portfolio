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

<div class="bg-background-inset inset-shadow rounded-lg p-1.5">
  <article {...restProps} class={cn("bg-background  card h-full  rounded-md p-4", className)}>
    {@render children?.()}
  </article>
</div>
