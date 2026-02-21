<script lang="ts">
  import "./layout.css";
  import "varsel/styles.css";
  import { faviconLinks, seoConfig } from "$lib/seo/meta";
  import { VarselToaster } from "varsel";
  import fontRegular from "$lib/assets/fonts/SFPro/SFPro-Regular-en.woff2";
  import fontMonoRegular from "$lib/assets/fonts/SFMono/SFMono-Regular-en.woff2";

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

<figure class="bg-noise" style="--pos: fixed; --z: 1;" aria-hidden="true">
  <svg class="noise-filter-defs" aria-hidden="true" focusable="false">
    <defs>
      <filter id="noise-bg-fx">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" stitchTiles="stitch" />
      </filter>
    </defs>
  </svg>
</figure>

<div class="mx-auto w-full max-w-3xl p-3">
  <main id="main-content" class="mx-auto flex flex-col items-center justify-start gap-2 rounded-lg">
    {@render children()}
  </main>
</div>

<VarselToaster position="bottom-center" offset={12} visibleToasts={3} />
