<script lang="ts">
  import { cn } from "$lib/utils/cn";
  import type { Snippet } from "svelte";

  let { class: className, children } = $props<{
    class?: string;
    children?: Snippet;
  }>();
</script>

<div class={cn("border-border relative mb-12 ml-4 space-y-10 border-l [counter-reset:step]", className)}>
  {@render children?.()}
</div>
