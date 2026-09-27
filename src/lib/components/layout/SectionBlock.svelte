<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import SectionSeparator from "./SectionSeparator.svelte";

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

  const sectionHeadingId = $derived(!header && title ? `section-${slugifyTitle(title) || "content"}` : undefined);
</script>

<section
  class={cn("w-full", className)}
  aria-labelledby={sectionHeadingId}
  aria-label={header && title ? title : undefined}
>
  {#if header || title}
    <header class="flex flex-col gap-4 p-4">
      {#if header}
        {@render header()}
      {:else}
        <h2
          id={sectionHeadingId}
          class={cn("text-foreground font-display text-lg leading-none font-medium tracking-tight", titleClass)}
        >
          {title}
        </h2>
      {/if}
    </header>
    <SectionSeparator />
  {/if}

  <div class="flex w-full flex-col gap-4 p-4">
    {@render children?.()}
  </div>
</section>
