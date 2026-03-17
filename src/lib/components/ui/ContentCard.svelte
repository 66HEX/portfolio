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

<div class="bg-background-inset border-border inset-shadow rounded-xl border p-1">
  <article {...restProps} class={cn("bg-background border-border h-full rounded-lg border p-3 shadow-md", className)}>
    {@render children?.()}
  </article>
</div>
