<script lang="ts">
  import * as Table from "$lib/components/ui/table";

  import { cn } from "$lib/utils";
  import type { HTMLThAttributes } from "svelte/elements";

  let { children, align, class: className, ...restProps }: HTMLThAttributes = $props();
</script>

<Table.Head
  {...restProps}
  {align}
  class={cn(
    "px-4 py-2 text-sm",
    {
      "text-left": align === "left",
      "text-center": align === "center",
      "text-right": align === "right",
      "text-justify": align === "justify",
    },
    className,
  )}
>
  {@render children?.()}
</Table.Head>
