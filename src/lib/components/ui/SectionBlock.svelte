<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";
  import InsetPanel from "./InsetPanel.svelte";

  type Props = {
    title?: string;
    children?: Snippet;
    header?: Snippet;
    class?: string;
    panelClass?: string;
    titleClass?: string;
  };

  let { title = "", children, header, class: className = "", panelClass = "", titleClass = "" }: Props = $props();

  function slugifyTitle(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const sectionHeadingId = $derived(title ? `section-${slugifyTitle(title) || "content"}` : undefined);
</script>

<section class={cn("flex w-full flex-col gap-4", className)} aria-labelledby={sectionHeadingId}>
  {#if header}
    {@render header()}
  {:else if title}
    <h2 id={sectionHeadingId} class={cn("text-foreground text-sm font-medium", titleClass)}>{title}</h2>
  {/if}

  <InsetPanel class={panelClass}>
    {@render children?.()}
  </InsetPanel>
</section>
