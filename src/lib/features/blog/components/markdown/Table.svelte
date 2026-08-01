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

<div class="card-outer bg-background-inset my-8 rounded-md p-1.5">
  <div class="card bg-background relative rounded-sm">
    <div class="w-full overflow-x-auto rounded-sm">
      <table {...restProps} class={cn("w-full text-sm [&_code]:text-xs", className)}>
        {@render children?.()}
      </table>
    </div>
  </div>
</div>
