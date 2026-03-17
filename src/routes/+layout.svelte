<script lang="ts">
  import "varsel/styles.css";
  import "./layout.css";
  import { faviconLinks, seoConfig } from "$lib/seo/meta";
  import { VarselToaster } from "varsel";
  import fontRegular from "$lib/assets/fonts/aeonikpro.woff2";
  import fontMonoRegular from "$lib/assets/fonts/aeonikmono.woff2";

  let { children } = $props();
</script>

<svelte:head>
  {#each faviconLinks as link (`favicon-${link.href}`)}
    <link rel={link.rel} href={link.href} type={link.type} sizes={link.sizes} crossorigin={link.crossorigin} />
  {/each}
  <meta name="theme-color" content={seoConfig.themeColorLight} />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="preload" href={fontRegular} as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="preload" href={fontMonoRegular} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="mx-auto w-full max-w-3xl sm:p-3">
  <main id="main-content" class="mx-auto flex flex-col items-center justify-start gap-2">
    {@render children()}
  </main>
</div>

<VarselToaster position="bottom-center" offset={12} visibleToasts={3} />
