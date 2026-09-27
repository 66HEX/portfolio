<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLTableAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    containerClass,
    children,
    ...restProps
  }: WithElementRef<HTMLTableAttributes> & { containerClass?: string } = $props();
</script>

<div data-slot="table-container" class={cn("relative w-full overflow-x-auto", containerClass)}>
  <table bind:this={ref} data-slot="table" class={cn("w-full caption-bottom text-xs", className)} {...restProps}>
    {@render children?.()}
  </table>
</div>
