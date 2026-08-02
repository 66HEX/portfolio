<script lang="ts">
  import { onDestroy } from "svelte";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  import IconRenderer from "$lib/content/IconRenderer.svelte";
  import { IconCheck, IconCopy } from "$lib/content/icons";

  type ComponentProps = {
    id?: string;
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, id, class: className = "", ...restProps }: ComponentProps = $props();

  let copied = $state(false);
  let timeoutId: number | null = null;

  async function copyHeadingUrl(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!id || typeof window === "undefined") return;

    const hash = `#${encodeURIComponent(id)}`;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;

    window.history.pushState(null, "", hash);

    try {
      await navigator.clipboard.writeText(url);

      copied = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        copied = false;
        timeoutId = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy heading link", error);
    }
  }

  onDestroy(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
</script>

<h2
  {id}
  {...restProps}
  class={cn(
    "group text-foreground mt-8 w-fit scroll-m-24 text-lg font-medium tracking-tight [&_code]:text-base",
    className,
  )}
>
  <span class="inline-flex items-center gap-2 align-baseline leading-none">
    <span class="min-w-0 [&_a]:text-lg">
      {@render children?.()}
    </span>

    {#if id}
      <span
        class="card-outer flex items-center rounded-sm p-1 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none"
      >
        <button
          type="button"
          class={cn(
            "hit-target bg-background text-foreground card focus-visible:ring-accent focus-visible:ring-offset-background relative inline-flex size-5 shrink-0 items-center justify-center rounded-[calc(var(--radius-base)*1.25)] transition-[scale,box-shadow] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100",
          )}
          onclick={copyHeadingUrl}
          aria-label={copied ? "Copied heading link" : "Copy heading link"}
        >
          <span
            class={cn(
              "absolute inline-flex items-center justify-center transition-[opacity,filter,scale] duration-150 ease-out will-change-[opacity,filter,scale] motion-reduce:transition-none motion-reduce:will-change-auto",
              copied ? "scale-[0.25] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100",
            )}
          >
            <IconRenderer icon={IconCopy} class="size-3" />
          </span>

          <span
            class={cn(
              "absolute inline-flex items-center justify-center transition-[opacity,filter,scale] duration-150 ease-out will-change-[opacity,filter,scale] motion-reduce:transition-none motion-reduce:will-change-auto",
              copied ? "blur-0 scale-100 opacity-100" : "scale-[0.25] opacity-0 blur-xs",
            )}
          >
            <IconRenderer icon={IconCheck} class="size-3" />
          </span>
        </button>
      </span>
    {/if}
  </span>
</h2>
