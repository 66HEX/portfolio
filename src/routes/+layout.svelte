<script lang="ts">
  import "./layout.css";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { faviconLinks, seoConfig } from "$lib/seo/meta";

  let { children } = $props();
</script>

<svelte:head>
  {#each faviconLinks as link (`favicon-${link.href}`)}
    <link rel={link.rel} href={link.href} type={link.type} sizes={link.sizes} crossorigin={link.crossorigin} />
  {/each}
  <meta name="theme-color" content={seoConfig.themeColorLight} />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<Tooltip.Provider delayDuration={300} skipDelayDuration={300}>
  <div class="@container/page mx-auto max-w-3xl overflow-hidden sm:border-x">
    <main
      id="main-content"
      class="mx-auto flex w-full max-w-2xl flex-col items-center justify-start gap-2 border-dashed sm:border-x"
    >
      {@render children()}
    </main>
  </div>
</Tooltip.Provider>
