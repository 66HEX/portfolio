<script lang="ts">
  import "./layout.css";
  import apkAvionicaUrl from "$lib/assets/fonts/APK-Avionica.woff2?url";
  import apkGaleriaRegularUrl from "$lib/assets/fonts/APK-Galeria-Regular.woff2?url";
  import { faviconLinks, seoConfig } from "$lib/seo/meta";

  let { children } = $props();
</script>

<svelte:head>
  {#each faviconLinks as link (`favicon-${link.href}`)}
    <link rel={link.rel} href={link.href} type={link.type} sizes={link.sizes} crossorigin={link.crossorigin} />
  {/each}
  <meta name="theme-color" content={seoConfig.themeColorLight} />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="preload" href={apkGaleriaRegularUrl} as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="preload" href={apkAvionicaUrl} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="border-border mx-auto max-w-4xl overflow-hidden sm:border-x">
  <main
    id="main-content"
    class="border-border mx-auto flex w-full max-w-3xl flex-col items-center justify-start gap-2 border-dashed sm:border-x"
  >
    {@render children()}
  </main>
</div>
