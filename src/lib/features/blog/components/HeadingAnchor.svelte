<script lang="ts">
  import { onDestroy } from "svelte";
  import ActionTooltip from "$lib/components/action-tooltip/ActionTooltip.svelte";
  import CopyFeedbackIcon from "$lib/components/copy-feedback/CopyFeedbackIcon.svelte";
  import { Button } from "$lib/components/ui/button";
  import { IconLink } from "$lib/components/icons/data";

  let { id }: { id: string } = $props();

  let copied = $state(false);
  let failed = $state(false);
  let announcement = $state("");
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const tooltipLabel = $derived(
    failed ? "Could not copy the section link" : copied ? "Section link copied" : "Copy link to this section",
  );

  async function copyLink() {
    try {
      const url = new URL(`#${encodeURIComponent(id)}`, window.location.href);
      await navigator.clipboard.writeText(url.toString());
      copied = true;
      failed = false;
      announcement = "Section link copied to clipboard.";
    } catch {
      copied = false;
      failed = true;
      announcement = "Could not copy the section link.";
    }

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copied = false;
      failed = false;
      announcement = "";
    }, 3000);
  }

  onDestroy(() => clearTimeout(resetTimer));
</script>

<ActionTooltip content={tooltipLabel} disableCloseOnTriggerClick>
  {#snippet trigger({ props })}
    <Button
      {...props}
      variant="ghost"
      size="icon"
      class="text-muted-foreground hover:text-foreground ms-1 align-middle opacity-0 transition-[opacity,color,background-color,box-shadow] duration-150 group-hover/heading:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
      data-heading-anchor
      data-copied={copied}
      aria-label={tooltipLabel}
      onclick={copyLink}
    >
      <CopyFeedbackIcon {copied} idleIcon={IconLink} />
    </Button>
  {/snippet}
</ActionTooltip>
<span class="sr-only" role="status" aria-atomic="true">{announcement}</span>
