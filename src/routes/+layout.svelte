<script lang="ts">
  import "varsel/styles.css";
  import "./layout.css";
  import { faviconLinks, seoConfig } from "$lib/seo/meta";
  import { VarselToaster } from "varsel";
  import CommandPalette from "$lib/features/blog/components/search/CommandPalette.svelte";

  let { children } = $props();
</script>

<svelte:head>
  {#each faviconLinks as link (`favicon-${link.href}`)}
    <link rel={link.rel} href={link.href} type={link.type} sizes={link.sizes} crossorigin={link.crossorigin} />
  {/each}
  <meta name="theme-color" content={seoConfig.themeColorLight} />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="preload" href="/fonts/FKGroteskNeue.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="preload" href="/fonts/BerkeleyMono-Regular.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="border-border mx-auto max-w-4xl overflow-hidden sm:border-x">
  <main
    id="main-content"
    class="border-border mx-auto flex w-full max-w-3xl flex-col items-center justify-start gap-2 border-dashed sm:border-x"
  >
    {@render children()}
  </main>
</div>

<VarselToaster position="bottom-center" offset={12} visibleToasts={3} />
<CommandPalette />
