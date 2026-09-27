<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { portfolio } from "$portfolio/config";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconArrowLeft } from "$lib/components/icons/data";
  import SectionSeparator from "$lib/components/layout/SectionSeparator.svelte";
  import { Button } from "$lib/components/ui/button";

  const title = $derived(page.status === 404 ? "Page not found" : "Unable to load this page");
  const description = $derived(
    page.status === 404 ? "Check the address or head back to the homepage." : "Please try again in a moment.",
  );
</script>

<svelte:head>
  <title>{page.status} · {title} | {portfolio.name}</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section aria-labelledby="error-title" class="flex min-h-svh w-full flex-col justify-center">
  <SectionSeparator />
  <div class="flex flex-col items-start gap-6 px-4 py-8">
    <div class="space-y-3">
      <p class="text-muted-foreground font-mono text-xs tabular-nums">{page.status}</p>
      <div class="space-y-2">
        <h1 id="error-title" class="text-foreground font-display text-xl leading-tight font-medium tracking-tight">
          {title}
        </h1>
        <p class="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
    <Button href={resolve("/")} variant="outline" size="sm" data-sveltekit-reload>
      <IconRenderer icon={IconArrowLeft} size={12} />
      Back to home
    </Button>
  </div>
  <SectionSeparator />
</section>
