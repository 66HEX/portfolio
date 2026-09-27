<script lang="ts">
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    class: className,
    children,
    title,
  } = $props<{
    class?: string;
    children?: Snippet;
    title?: string;
  }>();
</script>

<div class={cn("relative min-h-10 pl-8", className)}>
  {#if title}
    <div class="mb-4 flex min-h-10 items-center">
      <CardWrapper class="absolute -left-5 size-10 rounded-full">
        <Badge
          variant="outline"
          class="bg-card! h-full w-full rounded-full text-xs shadow-md [counter-increment:step] before:content-[counter(step)]"
        />
      </CardWrapper>
      <h3 class="text-foreground relative z-10 text-base leading-tight font-medium tracking-tight">
        {title}
      </h3>
    </div>
  {:else}
    <CardWrapper class="absolute -left-5 size-10 rounded-full">
      <Badge
        variant="outline"
        class="bg-card! h-full w-full rounded-full text-xs shadow-md [counter-increment:step] before:content-[counter(step)]"
      />
    </CardWrapper>
  {/if}
  <div class={cn("text-muted-foreground space-y-4 text-sm tracking-normal [&>:first-child]:mt-0", !title && "pt-2")}>
    {@render children?.()}
  </div>
</div>
