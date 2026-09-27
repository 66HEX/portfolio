<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();
</script>

<MarkdownCardWrapper class="mt-6">
  <Card.Root>
    <blockquote {...restProps} class={cn("text-muted-foreground px-5 text-base font-normal italic", className)}>
      {@render children?.()}
    </blockquote>
  </Card.Root>
</MarkdownCardWrapper>
