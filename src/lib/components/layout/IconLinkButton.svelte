<script lang="ts">
  import type { Snippet } from "svelte";
  import { resolve } from "$app/paths";
  import { Button, type ButtonVariant } from "$lib/components/ui/button";
  import ActionTooltip from "$lib/components/action-tooltip/ActionTooltip.svelte";

  type Props = {
    href: string;
    ariaLabel: string;
    tooltip?: string;
    target?: string;
    rel?: string;
    children?: Snippet;
    class?: string;
    tabindex?: 0 | -1;
    variant?: ButtonVariant;
  };

  let {
    href,
    ariaLabel,
    tooltip = ariaLabel,
    target = "_blank",
    rel = "noreferrer noopener",
    children,
    class: className,
    tabindex,
    variant = "outline",
  }: Props = $props();

  const linkHref = $derived(href.startsWith("http") || href.startsWith("mailto:") ? href : resolve(href as "/"));
</script>

<ActionTooltip content={tooltip} sideOffset={6}>
  {#snippet trigger({ props })}
    <Button
      {...props}
      href={linkHref}
      {target}
      {rel}
      {tabindex}
      aria-label={ariaLabel}
      {variant}
      size="icon"
      class={className}
    >
      {@render children?.()}
    </Button>
  {/snippet}
</ActionTooltip>
