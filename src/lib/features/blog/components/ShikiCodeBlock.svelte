<script lang="ts">
  import Pre from "./markdown/Pre.svelte";

  type Props = {
    code: string;
    htmlLight: string;
    htmlDark?: string;
    lang?: string;
    class?: string;
    unstyled?: boolean;
  };

  let { code, htmlLight, htmlDark, lang, class: className, unstyled = false }: Props = $props();
</script>

<Pre {code} class={className} data-language={lang} {unstyled}>
  <div class="shiki-theme dark:hidden">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html htmlLight}
  </div>
  {#if htmlDark}
    <div class="shiki-theme hidden dark:block">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html htmlDark}
    </div>
  {/if}
</Pre>
