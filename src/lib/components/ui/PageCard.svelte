<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
  };

  let { children, class: className = "" }: Props = $props();
</script>

<div class={cn("bg-background border-border w-full border p-4 shadow-md sm:rounded-3xl", className)}>
  {@render children?.()}
</div>
