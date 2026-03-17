<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    children?: Snippet;
    class?: string;
  };

  let { children, class: className = "" }: Props = $props();
</script>

<div class="bg-background-inset border-border inset-shadow rounded-md border p-0.5">
  <div
    class={cn(
      "bg-background border-border flex size-6 items-center justify-center rounded-sm border shadow-md",
      className,
    )}
  >
    {@render children?.()}
  </div>
</div>
