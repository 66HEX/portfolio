<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type Props = {
    title?: string;
    children?: Snippet;
    header?: Snippet;
    class?: string;
    titleClass?: string;
  };

  let { title = "", children, header, class: className = "", titleClass = "" }: Props = $props();

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

<section class={cn("flex w-full flex-col gap-4 p-4", className)} aria-labelledby={sectionHeadingId}>
  {#if header}
    {@render header()}
  {:else if title}
    <h2 id={sectionHeadingId} class={cn("text-foreground text-lg leading-none font-medium", titleClass)}>{title}</h2>
  {/if}

  {@render children?.()}
</section>
