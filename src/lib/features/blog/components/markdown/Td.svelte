<script lang="ts">
  import * as Table from "$lib/components/ui/table";

  import { cn } from "$lib/utils";
  import type { HTMLTdAttributes } from "svelte/elements";

  let { children, align, class: className, ...restProps }: HTMLTdAttributes = $props();
</script>

<Table.Cell
  {...restProps}
  {align}
  class={cn(
    "text-muted-foreground px-4 py-2 font-normal",
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
</Table.Cell>
