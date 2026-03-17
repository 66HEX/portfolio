<script lang="ts">
  import Pre from "./markdown/Pre.svelte";

  type Props = {
    code: string;
    htmlLight: string;
    lang?: string;
    class?: string;
    unstyled?: boolean;
  };

  let { code, htmlLight, lang, class: className, unstyled = false }: Props = $props();
</script>

<Pre {code} class={className} data-language={lang} {unstyled}>
  <div class="shiki-theme">
    {@html htmlLight}
  </div>
</Pre>
