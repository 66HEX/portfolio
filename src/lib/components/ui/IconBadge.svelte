<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
  };

  let { children, class: className = "" }: Props = $props();
</script>

<div class={cn("btn-secondary card-shadow flex size-6 items-center justify-center rounded-sm", className)}>
  {@render children?.()}
</div>
