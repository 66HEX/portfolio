<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import * as Card from "$lib/components/ui/card";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn } from "$lib/utils";
  import type { HTMLTableAttributes } from "svelte/elements";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";

  let { children, class: className, ...restProps }: HTMLTableAttributes = $props();
</script>

<MarkdownCardWrapper class="my-8">
  <Card.Root
    class="has-[[data-scrollable]:focus-visible]:ring-ring/50 gap-0 py-0 transition-shadow has-[[data-scrollable]:focus-visible]:ring-[3px] has-[[data-scrollable]:focus-visible]:outline-1"
  >
    <ScrollArea
      orientation="horizontal"
      focusableWhenScrollable
      fadeHorizontalEdges
      class="min-w-0"
      viewportProps={{
        role: "region",
        "aria-label": "Scrollable table",
        class: "focus-visible:ring-0 focus-visible:outline-none",
      }}
    >
      <Table.Root {...restProps} containerClass="overflow-visible" class={cn("text-sm [&_code]:text-xs", className)}>
        {@render children?.()}
      </Table.Root>
    </ScrollArea>
  </Card.Root>
</MarkdownCardWrapper>
