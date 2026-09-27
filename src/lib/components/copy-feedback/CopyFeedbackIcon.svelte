<script lang="ts">
  import "./copy-feedback.css";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconCheck, type IconData } from "$lib/components/icons/data";

  let { copied, idleIcon }: { copied: boolean; idleIcon: IconData } = $props();
</script>

<span
  class="copy-feedback-icon relative flex size-4 shrink-0 items-center justify-center leading-none"
  aria-hidden="true"
>
  <span class="icon-state" data-visible={!copied}>
    <IconRenderer icon={idleIcon} size={16} class="size-4" />
  </span>
  <span class="icon-state text-emerald-500" data-visible={copied}>
    <IconRenderer icon={IconCheck} size={16} class="size-4" />
  </span>
</span>
