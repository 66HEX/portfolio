<script lang="ts">
  import { env as publicEnv } from "$env/dynamic/public";
  import IconSend from "carbon-icons-svelte/lib/Send.svelte";
  import { onMount } from "svelte";
  import type { HomepageContent } from "$lib/content/homepage-content";
  import { submitContactForm } from "$lib/features/contact/client/api";
  import { showContactToast, showValidationToasts } from "$lib/features/contact/client/toast";
  import {
    loadTurnstileApi,
    renderTurnstileWidget,
    TURNSTILE_LAZY_ANCHOR_SELECTOR,
    TURNSTILE_LAZY_ROOT_MARGIN,
    type TurnstileApi,
  } from "$lib/features/contact/client/turnstile";
  import { collectValidationMessages } from "$lib/features/contact/client/validation";
  import { createEmptyContactForm, type ContactPayload } from "$lib/features/contact/shared";
  import Button from "../ui/Button.svelte";
  import ContentCard from "../ui/ContentCard.svelte";
  import Input from "../ui/Input.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    content: HomepageContent["contact"];
  };

  const turnstileSiteKey = publicEnv.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  let { content }: Props = $props();

  let pending = $state(false);
  let form = $state(createEmptyContactForm());
  let turnstileToken = $state("");
  let turnstileError = $state("");

  let turnstileContainer: HTMLDivElement | null = null;
  let turnstileWidgetId: string | null = null;
  let turnstileApi: TurnstileApi | null = null;
  let turnstileInitStarted = false;

  $effect(() => {
    const message = turnstileError.trim();
    if (message.length === 0) {
      return;
    }

    showContactToast("error", content.form.errorLabel, message, 6500);
  });

  function resetTurnstileWidget(): void {
    turnstileToken = "";
    if (turnstileApi && turnstileWidgetId) {
      turnstileApi.reset(turnstileWidgetId);
    }
  }

  function mountTurnstileWidget(): void {
    if (!turnstileApi || !turnstileContainer || turnstileSiteKey.length === 0) {
      return;
    }

    if (turnstileWidgetId) {
      turnstileApi.remove(turnstileWidgetId);
      turnstileWidgetId = null;
    }

    turnstileToken = "";
    turnstileError = "";
    turnstileWidgetId = renderTurnstileWidget(turnstileApi, turnstileContainer, turnstileSiteKey, {
      onToken: (token: string) => {
        turnstileToken = token;
        turnstileError = "";
      },
      onReset: () => {
        resetTurnstileWidget();
      },
      onError: () => {
        turnstileToken = "";
        turnstileError = "Verification failed. Please retry the challenge.";
      },
    });
  }

  onMount(() => {
    if (turnstileSiteKey.length === 0) {
      turnstileError = "Anti-bot verification is not configured.";
      return;
    }

    let active = true;
    let observer: IntersectionObserver | null = null;

    const initTurnstile = async (): Promise<void> => {
      if (turnstileInitStarted) {
        return;
      }

      turnstileInitStarted = true;

      try {
        turnstileApi = await loadTurnstileApi();
        if (!active) {
          return;
        }

        mountTurnstileWidget();

        // In case container ref was not ready in the same frame.
        if (!turnstileWidgetId) {
          requestAnimationFrame(() => {
            if (!active) return;
            mountTurnstileWidget();
          });
        }
      } catch {
        turnstileError = "Couldn't load anti-bot verification. Refresh and try again.";
      }
    };

    const requestTurnstileInit = (): void => {
      void initTurnstile();
    };

    const lazyAnchor = document.querySelector<HTMLElement>(TURNSTILE_LAZY_ANCHOR_SELECTOR);

    if (typeof IntersectionObserver === "undefined" || !lazyAnchor) {
      requestTurnstileInit();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
            return;
          }

          observer?.disconnect();
          observer = null;
          requestTurnstileInit();
        },
        { rootMargin: TURNSTILE_LAZY_ROOT_MARGIN },
      );

      observer.observe(lazyAnchor);
    }

    return () => {
      active = false;
      observer?.disconnect();
      if (turnstileApi && turnstileWidgetId) {
        turnstileApi.remove(turnstileWidgetId);
      }
      turnstileWidgetId = null;
    };
  });

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (pending) {
      return;
    }

    const payload: ContactPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      website: form.website,
      turnstileToken,
    };

    const validationMessages = collectValidationMessages(payload);
    if (validationMessages.length > 0) {
      showValidationToasts(validationMessages, content.form.validationErrorLabel);
      return;
    }

    pending = true;

    try {
      const result = await submitContactForm(payload, content.form.errorLabel);
      if (!result.ok) {
        if (result.validationErrors.length > 0) {
          showValidationToasts(result.validationErrors, content.form.validationErrorLabel);
        } else {
          showContactToast("error", content.form.errorLabel, result.message, 6500);
        }
        resetTurnstileWidget();
        return;
      }

      showContactToast("success", content.form.submitLabel, content.form.successLabel, 5000);
      resetTurnstileWidget();
      form = createEmptyContactForm();
    } finally {
      pending = false;
    }
  }
</script>

<SectionBlock title={content.title}>
  <ContentCard class="">
    <form class="flex flex-col gap-3" data-turnstile-lazy-anchor novalidate onsubmit={handleSubmit}>
      <Input
        type="text"
        name="website"
        variant="hidden"
        tabindex="-1"
        autocomplete="off"
        bind:value={form.website}
        aria-hidden="true"
      />

      <label class="flex flex-col gap-2">
        <span class="text-foreground-muted text-xs leading-none font-medium">{content.form.nameLabel}</span>
        <div class="bg-background-inset inset-shadow border-border h-7.5 rounded-md border">
          <Input
            type="text"
            name="name"
            variant="field"
            size="field"
            placeholder="Jane Smith"
            minlength="2"
            maxlength="80"
            required
            bind:value={form.name}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-foreground-muted text-xs leading-none font-medium">{content.form.emailLabel}</span>
        <div class="bg-background-inset inset-shadow border-border h-7.5 rounded-md border">
          <Input
            type="email"
            name="email"
            variant="field"
            size="field"
            placeholder="jane@company.com"
            maxlength="160"
            required
            bind:value={form.email}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-foreground-muted text-xs leading-none font-medium">{content.form.subjectLabel}</span>
        <div class="bg-background-inset inset-shadow border-border h-7.5 rounded-md border">
          <Input
            type="text"
            name="subject"
            variant="field"
            size="field"
            placeholder="New landing page for SaaS product"
            minlength="3"
            maxlength="140"
            required
            bind:value={form.subject}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-foreground-muted text-xs leading-none font-medium">{content.form.messageLabel}</span>
        <div class="bg-background-inset inset-shadow border-border rounded-md border">
          <textarea
            name="message"
            class="text-foreground placeholder:text-foreground-muted focus-visible:ring-accent block min-h-30 w-full rounded-sm px-2 py-1.5 text-sm leading-relaxed transition-shadow duration-150 ease-out outline-none focus-visible:ring-2"
            placeholder="Briefly describe your project, scope, and timeline."
            minlength="20"
            maxlength="3000"
            required
            bind:value={form.message}
          ></textarea>
        </div>
      </label>

      <div class="relative z-20 mt-1 flex flex-col items-center gap-2 overflow-hidden rounded-md hover:filter-none!">
        <div class="border-border relative h-15 w-full overflow-hidden rounded-lg border">
          <div
            class="mt-0.5 flex h-full w-full scale-101 items-end justify-center [&>*:first-child]:w-full"
            bind:this={turnstileContainer}
          ></div>
        </div>
      </div>

      <div class="mt-1 flex flex-col gap-2">
        <Button type="submit" variant="primary" size="form" disabled={pending || turnstileToken.length === 0}>
          <IconSend width={12} height={12} />
          <span>{pending ? content.form.sendingLabel : content.form.submitLabel}</span>
        </Button>

        <p class="text-foreground-muted text-center text-xs text-balance">
          {content.form.privacyNote}
        </p>
      </div>
    </form>
  </ContentCard>
</SectionBlock>
