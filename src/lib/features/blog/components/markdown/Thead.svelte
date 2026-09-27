<script lang="ts">
  import * as Table from "$lib/components/ui/table";

  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";

  let { children, class: className, ...restProps }: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<Table.Header {...restProps} class={cn("", className)}>
  {@render children?.()}
</Table.Header>
