<script lang="ts">
  import IconCheck from "$lib/components/icons/IconCheck.svelte";
  import IconClose from "$lib/components/icons/IconClose.svelte";
  import IconInfo from "$lib/components/icons/IconInfo.svelte";
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
  class="card-highlight card-shadow bg-toast relative w-[min(25rem,calc(100vw-1.25rem))] rounded-md select-none"
  {role}
  aria-live={live}
  aria-atomic="true"
>
  <button
    type="button"
    class="text-gray-alpha-800 hover:text-foreground absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors duration-100 ease-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    onclick={dismissToast}
    aria-label="Dismiss notification"
  >
    <IconClose size={14} strokeWidth={2.2} />
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
          <IconClose size={16} strokeWidth={2} />
        {:else}
          <IconInfo size={16} strokeWidth={1.5} />
        {/if}
      </span>

      <div class="min-w-0">
        <span class="sr-only">{iconLabel} notification.</span>
        <p class="text-foreground mb-2 text-sm leading-none font-medium">{title}</p>

        {#if message.length > 0}
          <p class="text-gray-alpha-800 text-xs leading-relaxed text-balance">{message}</p>
        {/if}
      </div>
    </div>
  </div>
</article>
