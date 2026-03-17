<script lang="ts">
  type Props = {
    avatarSrc: string;
    avatarAlt: string;
  };

  let { avatarSrc, avatarAlt }: Props = $props();
</script>

<div class="bg-background border-border relative h-38 w-full rounded-2xl border sm:h-54">
  <div class="bg-background-inset absolute inset-0 overflow-hidden rounded-2xl">
    <img
      class="h-full w-full object-cover object-left"
      src="/images/ventura-light-hero.webp"
      alt="Ventura wallpaper background"
      width="2048"
      height="2048"
      loading="eager"
      decoding="async"
      fetchpriority="high"
    />
  </div>
  <div class="border-border absolute bottom-0 left-4 z-500 size-24 translate-y-1/2 rounded-full border sm:size-32">
    <img
      class="rounded-full object-cover"
      src={avatarSrc}
      alt={avatarAlt}
      width="460"
      height="460"
      decoding="async"
      fetchpriority="high"
    />
  </div>
</div>
