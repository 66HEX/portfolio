<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
  };

  let { children, class: className = "" }: Props = $props();
</script>

<div class={cn("bg-card card-highlight card-shadow w-full rounded-xl p-4", className)}>
  {@render children?.()}
</div>
