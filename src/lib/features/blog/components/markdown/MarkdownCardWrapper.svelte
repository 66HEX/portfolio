<script lang="ts">
  import type { ComponentProps } from "svelte";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";
  import { cn } from "$lib/utils";

  let { class: className, ...props }: ComponentProps<typeof CardWrapper> = $props();
</script>

<CardWrapper {...props} class={cn("[li_&]:my-4", className)} />
