<script lang="ts">
  import IconCheck from "carbon-icons-svelte/lib/Checkmark.svelte";
  import IconClose from "carbon-icons-svelte/lib/Close.svelte";
  import IconInfo from "carbon-icons-svelte/lib/Information.svelte";
  import { toast as toastApi } from "varsel";
  import { cn } from "$lib/utils/cn";

  type ToastKind = "success" | "error" | "info";

  type Props = {
    id: string;
    kind?: ToastKind;
    title: string;
    message?: string;
  };

  let { id, kind = "info", title, message = "" }: Props = $props();

  const iconColorClass = $derived(
    kind === "success" ? "text-green-600" : kind === "error" ? "text-red-600" : "text-blue-600",
  );
  const iconLabel = $derived(kind === "success" ? "Success" : kind === "error" ? "Error" : "Info");

  const role = $derived(kind === "error" ? "alert" : "status");
  const live = $derived(kind === "error" ? "assertive" : "polite");

  function dismissToast(): void {
    toastApi.dismiss(id);
  }
</script>

<article
  class="bg-background border-border relative w-[min(25rem,calc(100vw-1.25rem))] rounded-lg border shadow-md select-none"
  {role}
  aria-live={live}
  aria-atomic="true"
>
  <button
    type="button"
    class="text-foreground-muted hover:text-foreground focus-visible:ring-accent absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-100 ease-out outline-none focus-visible:ring-2"
    onclick={dismissToast}
    aria-label="Dismiss notification"
  >
    <IconClose width={14} height={14} />
  </button>

  <div class="p-4 pr-9">
    <div class="flex gap-3">
      <span
        class={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", iconColorClass)}
        aria-hidden="true"
      >
        {#if kind === "success"}
          <IconCheck size={16} />
        {:else if kind === "error"}
          <IconClose size={16} />
        {:else}
          <IconInfo size={16} />
        {/if}
      </span>

      <div class="min-w-0">
        <span class="sr-only">{iconLabel} notification.</span>
        <p class="text-foreground mb-2 text-sm leading-none font-medium">{title}</p>

        {#if message.length > 0}
          <p class="text-foreground-muted text-xs leading-relaxed text-balance">{message}</p>
        {/if}
      </div>
    </div>
  </div>
</article>
