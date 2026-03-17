<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();
</script>

<div class="inset-shadow border-border bg-background-inset my-8 rounded-lg border p-1">
  <div class="border-border bg-background relative rounded-md border shadow-md">
    <div class="w-full overflow-x-auto rounded-md">
      <table {...restProps} class={cn("w-full text-sm [&_code]:text-xs", className)}>
        {@render children?.()}
      </table>
    </div>
  </div>
</div>
