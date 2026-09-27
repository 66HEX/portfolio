<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import ActionTooltip from "$lib/components/action-tooltip/ActionTooltip.svelte";
  import CopyFeedbackIcon from "$lib/components/copy-feedback/CopyFeedbackIcon.svelte";
  import { onDestroy } from "svelte";
  import { IconCopy } from "$lib/components/icons/data";

  type Props = {
    code: string;
    class?: string;
  };

  const props = $props();
  const className = $derived((props as Props).class ?? "");
  const code = $derived((props as Props).code ?? "");

  let copied = $state(false);
  let timeoutId: number | null = null;
  let lastCode: string | null = null;

  async function handleCopy(value: string) {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        copied = false;
        timeoutId = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code snippet", error);
    }
  }

  onDestroy(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  $effect(() => {
    if (lastCode === code) {
      return;
    }

    lastCode = code;
    copied = false;
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
</script>

<ActionTooltip content={copied ? "Copied code" : "Copy code"} disableCloseOnTriggerClick>
  {#snippet trigger({ props })}
    <Button
      {...props}
      variant="ghost"
      size="icon"
      class={className}
      onclick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        handleCopy(code);
      }}
      aria-label={copied ? "Copied code" : "Copy code"}
    >
      <CopyFeedbackIcon {copied} idleIcon={IconCopy} />
    </Button>
  {/snippet}
</ActionTooltip>
