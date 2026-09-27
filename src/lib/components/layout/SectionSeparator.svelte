<script lang="ts">
  import type { ComponentProps } from "svelte";
  import { Separator } from "$lib/components/ui/separator";
  import { cn } from "$lib/utils";

  let { class: className, ...restProps }: ComponentProps<typeof Separator> = $props();
</script>

<Separator
  {...restProps}
  orientation="horizontal"
  data-slot="section-separator"
  class={cn(
    "border-border relative left-1/2 -translate-x-1/2 border-t border-dashed bg-transparent data-horizontal:h-0 data-horizontal:w-[100cqw]",
    className,
  )}
/>
