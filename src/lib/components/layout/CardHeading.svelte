<script lang="ts">
  import { cn } from "$lib/utils/cn";

  type TitleTag = "h1" | "h2" | "h3" | "h4" | "p" | "span";

  type Props = {
    title: string;
    description?: string;
    titleTag?: TitleTag;
    class?: string;
    titleClass?: string;
    descriptionClass?: string;
    descriptionSpacingClass?: string;
  };

  let {
    title,
    description = "",
    titleTag = "h3",
    class: className = "",
    titleClass = "",
    descriptionClass = "",
    descriptionSpacingClass = "",
  }: Props = $props();
</script>

<div class={cn("flex flex-col gap-1", className)}>
  <svelte:element this={titleTag} class={cn("text-foreground text-base leading-none font-medium", titleClass)}>
    {title}
  </svelte:element>

  {#if description}
    <p class={cn("text-foreground-muted text-sm", descriptionSpacingClass, descriptionClass)}>
      {description}
    </p>
  {/if}
</div>
