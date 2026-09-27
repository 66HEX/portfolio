<script lang="ts">
  import * as Table from "$lib/components/ui/table";

  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";

  let { children, class: className, ...restProps }: HTMLAttributes<HTMLTableRowElement> = $props();
</script>

<Table.Row {...restProps} class={cn("text-sm", className)}>
  {@render children?.()}
</Table.Row>
