<script lang="ts">
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";

  type Props = {
    avatarSrc: string;
    avatarAlt: string;
    backgroundSrc: string;
    backgroundDarkSrc: string;
    backgroundAlt: string;
  };

  let { avatarSrc, avatarAlt, backgroundSrc, backgroundDarkSrc, backgroundAlt }: Props = $props();
</script>

<SectionBlock>
  <div class="bg-background inset-shadow relative h-54 w-full rounded-xl">
    <div class="absolute inset-0 overflow-hidden rounded-lg">
      <img
        class="hero-bg-light h-full w-full object-cover object-[35%25%]"
        src={backgroundSrc}
        alt={backgroundAlt}
        width="2048"
        height="2048"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
      <img
        class="hero-bg-dark h-full w-full object-cover object-[35%25%]"
        src={backgroundDarkSrc}
        alt={backgroundAlt}
        width="2048"
        height="2048"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
    </div>

    <div class="bg-background-inset inset-shadow absolute bottom-0 left-4 z-5 size-32 translate-y-1/2 rounded-full p-1">
      <img
        class="card rounded-full object-cover"
        src={avatarSrc}
        alt={avatarAlt}
        width="460"
        height="460"
        decoding="async"
        fetchpriority="high"
      />
    </div>
  </div>
</SectionBlock>

<style>
  .hero-bg-dark {
    display: none;
  }

  :global(html.dark) .hero-bg-light {
    display: none;
  }

  :global(html.dark) .hero-bg-dark {
    display: block;
  }
</style>
