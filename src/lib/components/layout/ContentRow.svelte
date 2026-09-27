<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Card from "$lib/components/ui/card";

  let {
    title,
    description,
    metadata,
    actions,
  }: {
    title: string;
    description: string;
    metadata?: Snippet;
    actions: Snippet;
  } = $props();
</script>

<article class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4">
  <Card.Header class="min-w-0 gap-2 px-0">
    {@render metadata?.()}
    <Card.Title><h3 class="line-clamp-1 text-base leading-tight text-pretty wrap-break-word">{title}</h3></Card.Title>
    <Card.Description class="line-clamp-2 text-sm text-pretty">{description}</Card.Description>
  </Card.Header>
  <Card.Footer class="gap-1 p-0 has-[>:nth-child(2)]:[--hit-area-width:32px]">{@render actions()}</Card.Footer>
</article>
