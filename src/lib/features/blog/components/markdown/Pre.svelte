<script lang="ts">
  import "../code-block.css";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";
  import * as Card from "$lib/components/ui/card";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import CopyCodeButton from "./CopyCodeButton.svelte";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: Snippet;
    code?: string;
    unstyled?: boolean;
  };

  let { class: className, code = "", unstyled = false, children, ...restProps }: Props = $props();
</script>

<MarkdownCardWrapper>
  <Card.Root
    {...restProps}
    class={cn(
      "group/pre has-[[data-scrollable]:focus-visible]:ring-ring/50 relative gap-0 p-0 font-mono font-normal transition-shadow has-[[data-scrollable]:focus-visible]:ring-[3px] has-[[data-scrollable]:focus-visible]:outline-1",
      unstyled ? "bg-transparent ring-0" : "text-xs",
      className,
    )}
  >
    <ScrollArea
      orientation="horizontal"
      focusableWhenScrollable
      fadeHorizontalEdges
      class="min-w-0"
      viewportProps={{
        role: "region",
        "aria-label": "Code block",
        class: "focus-visible:ring-0 focus-visible:outline-none",
      }}
    >
      <div class={cn(!unstyled && "p-4")}>
        {@render children?.()}
      </div>
    </ScrollArea>
    {#if code}
      <div class="absolute top-2 right-2">
        <CopyCodeButton {code} />
      </div>
    {/if}
  </Card.Root>
</MarkdownCardWrapper>
