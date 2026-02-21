<script lang="ts">
  import CopyCodeButton from "./markdown/CopyCodeButton.svelte";

  type Props = {
    code: string;
    htmlDark?: string;
    lang?: string;
  };

  let { code, htmlDark: _htmlDark, lang }: Props = $props();
</script>

<div class="group/pre bg-background input-highlight relative mt-5 rounded-md">
  <div class="p-3">
    <pre class="text-xs"><code data-language={lang}>{code}</code></pre>
  </div>
  {#if code}
    <div class="pointer-events-none absolute top-2 right-2">
      <CopyCodeButton {code} class="pointer-events-auto" />
    </div>
  {/if}
</div>

<style>
  :global(.shiki) {
    background: transparent !important;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  :global(.shiki code) {
    font-family: var(--font-sfmono), monospace;
  }
</style>
