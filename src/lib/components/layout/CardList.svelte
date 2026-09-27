<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import CardWrapper from "./CardWrapper.svelte";

  let { items, getKey, children }: { items: T[]; getKey: (item: T) => string; children: Snippet<[T]> } = $props();
</script>

<CardWrapper>
  <Card.Root class="gap-0 py-0">
    {#each items as item, index (getKey(item))}
      {#if index > 0}<Separator />{/if}
      {@render children(item)}
    {/each}
  </Card.Root>
</CardWrapper>
