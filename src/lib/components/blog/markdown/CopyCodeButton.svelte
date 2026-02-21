<script lang="ts">
  import Check from "lucide-svelte/icons/check";
  import Copy from "lucide-svelte/icons/copy";
  import { onDestroy } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils/cn";

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
    } catch {
      // Ignore clipboard errors in unsupported contexts.
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

<Button
  type="button"
  variant="highlight"
  size="icon"
  class={className}
  onclick={(event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    handleCopy(code);
  }}
  aria-label={copied ? "Copied code" : "Copy code"}
>
  <span class="sr-only">{copied ? "Copied code" : "Copy code"}</span>
  <span class={cn("transition-transform duration-150 ease-out", copied && "scale-0")}>
    <Copy aria-hidden="true" size={15} strokeWidth={2.25} />
  </span>
  <span class={cn("absolute transition-transform duration-150 ease-out", !copied && "scale-0")}>
    <Check aria-hidden="true" size={15} strokeWidth={2.5} />
  </span>
</Button>
