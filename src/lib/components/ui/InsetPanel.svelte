<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
  };

  let { children, class: className = "" }: Props = $props();
</script>

<div class={cn("bg-background-inset border-border inset-shadow w-full rounded-2xl border p-3", className)}>
  {@render children?.()}
</div>
