<script lang="ts">
  import { cn } from "$lib/utils/cn";
  import type { Snippet } from "svelte";

  let { class: className, children } = $props<{
    class?: string;
    children?: Snippet;
  }>();
</script>

<div class={cn("border-gray-alpha-200 relative mb-8 ml-4 border-l [counter-reset:step]", className)}>
  {@render children?.()}
</div>
