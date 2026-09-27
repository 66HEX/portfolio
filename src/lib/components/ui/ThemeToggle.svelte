<script lang="ts">
  import { themeStore } from "$lib/stores/theme.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconMoon, IconSun } from "$lib/components/icons/data";

  let { class: className }: { class?: string } = $props();
  const isDark = $derived(themeStore.isDark);
  const ariaLabel = $derived(isDark ? "Switch to light mode" : "Switch to dark mode");
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="icon"
        class={className}
        onclick={themeStore.toggle}
        aria-label={ariaLabel}
        aria-pressed={isDark}
      >
        <IconRenderer icon={isDark ? IconMoon : IconSun} size={16} />
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content sideOffset={6}>{ariaLabel}</Tooltip.Content>
</Tooltip.Root>
