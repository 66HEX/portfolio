<script lang="ts">
  import { env as publicEnv } from "$env/dynamic/public";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconCheck, IconClose, IconSend, IconWarningCircle } from "$lib/components/icons/data";
  import { onMount } from "svelte";
  import type { HomepageContent } from "$lib/homepage";
  import { submitContactForm } from "$lib/features/contact/client/api";
  import {
    loadTurnstileApi,
    renderTurnstileWidget,
    TURNSTILE_LAZY_ANCHOR_SELECTOR,
    TURNSTILE_LAZY_ROOT_MARGIN,
    type TurnstileApi,
    type TurnstileTheme,
  } from "$lib/features/contact/client/turnstile";
  import { validateContactPayload } from "$lib/features/contact/client/validation";
  import {
    contactFieldNames,
    createEmptyContactForm,
    type ContactField,
    type ContactFieldErrors,
    type ContactPayload,
  } from "$lib/features/contact/shared";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Input } from "$lib/components/ui/input";
  import SectionBlock from "../../layout/SectionBlock.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";

  type Props = {
    content: HomepageContent["contact"];
  };

  type SubmitFeedback = "idle" | "success" | "error";

  const turnstileSiteKey = publicEnv.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  let { content }: Props = $props();

  let pending = $state(false);
  let form = $state(createEmptyContactForm());
  let turnstileToken = $state("");
  let turnstileError = $state("");
  let fieldErrors = $state<ContactFieldErrors>({});
  let submitFeedback = $state<SubmitFeedback>("idle");
  let successAnnouncement = $state("");
  let errorAnnouncement = $state("");

  let turnstileContainer: HTMLDivElement | null = null;
  let turnstileWidgetId: string | null = null;
  let turnstileApi: TurnstileApi | null = null;
  let turnstileInitStarted = false;
  let mountedTurnstileTheme: TurnstileTheme | null = null;
  let feedbackResetTimer: ReturnType<typeof setTimeout> | undefined;

  function clearSubmitFeedback(): void {
    if (feedbackResetTimer) {
      clearTimeout(feedbackResetTimer);
      feedbackResetTimer = undefined;
    }
    submitFeedback = "idle";
    successAnnouncement = "";
    errorAnnouncement = "";
  }

  function showSubmitError(message: string): void {
    clearSubmitFeedback();
    submitFeedback = "error";
    errorAnnouncement = message;
  }

  function showSubmitSuccess(): void {
    clearSubmitFeedback();
    submitFeedback = "success";
    successAnnouncement = content.form.successLabel;
    feedbackResetTimer = setTimeout(clearSubmitFeedback, 5000);
  }

  function setTurnstileError(message: string): void {
    turnstileToken = "";
    turnstileError = message;
    showSubmitError(message);
  }

  function resetTurnstileWidget(): void {
    turnstileToken = "";
    if (turnstileApi && turnstileWidgetId) {
      turnstileApi.reset(turnstileWidgetId);
    }
  }

  function clearFieldError(field: ContactField): void {
    delete fieldErrors[field];
    if (submitFeedback === "error") {
      clearSubmitFeedback();
    }
  }

  function clearValidationErrors(): void {
    fieldErrors = {};
  }

  function applyValidationErrors(errors: ContactFieldErrors, formMessages: string[]): void {
    fieldErrors = { ...errors };
    const firstInvalidField = contactFieldNames.find((field) => Boolean(errors[field]));
    showSubmitError(firstInvalidField ? "" : (formMessages[0] ?? content.form.validationErrorLabel));

    if (firstInvalidField) {
      requestAnimationFrame(() => {
        document.getElementById(`contact-${firstInvalidField}`)?.focus();
      });
    }
  }

  function mountTurnstileWidget(theme: TurnstileTheme): void {
    if (!turnstileApi || !turnstileContainer || turnstileSiteKey.length === 0) {
      return;
    }

    if (turnstileWidgetId) {
      turnstileApi.remove(turnstileWidgetId);
      turnstileWidgetId = null;
    }

    turnstileToken = "";
    turnstileError = "";
    turnstileWidgetId = renderTurnstileWidget(
      turnstileApi,
      turnstileContainer,
      turnstileSiteKey,
      {
        onToken: (token: string) => {
          turnstileToken = token;
          turnstileError = "";
          if (submitFeedback === "error") {
            clearSubmitFeedback();
          }
        },
        onReset: () => {
          resetTurnstileWidget();
        },
        onError: () => {
          setTurnstileError("Verification failed. Please retry the challenge.");
        },
      },
      theme,
    );
    mountedTurnstileTheme = theme;
  }

  function getCurrentTurnstileTheme(): TurnstileTheme {
    if (typeof document === "undefined") {
      return "light";
    }
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  onMount(() => {
    if (turnstileSiteKey.length === 0) {
      setTurnstileError("Anti-bot verification is not configured.");
      return;
    }

    let active = true;
    let observer: IntersectionObserver | null = null;
    let themeObserver: MutationObserver | null = null;

    const syncTurnstileTheme = (): void => {
      if (!turnstileApi || !turnstileWidgetId) {
        return;
      }

      const nextTheme = getCurrentTurnstileTheme();
      if (mountedTurnstileTheme === nextTheme) {
        return;
      }

      mountTurnstileWidget(nextTheme);
    };

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

        mountTurnstileWidget(getCurrentTurnstileTheme());

        // In case container ref was not ready in the same frame.
        if (!turnstileWidgetId) {
          requestAnimationFrame(() => {
            if (!active) return;
            mountTurnstileWidget(getCurrentTurnstileTheme());
          });
        }
      } catch {
        setTurnstileError("Couldn't load anti-bot verification. Refresh and try again.");
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

    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver(() => {
        syncTurnstileTheme();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => {
      active = false;
      observer?.disconnect();
      themeObserver?.disconnect();
      if (turnstileApi && turnstileWidgetId) {
        turnstileApi.remove(turnstileWidgetId);
      }
      turnstileWidgetId = null;
      mountedTurnstileTheme = null;
      if (feedbackResetTimer) {
        clearTimeout(feedbackResetTimer);
      }
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

    clearValidationErrors();
    const validation = validateContactPayload(payload);
    if (Object.keys(validation.fieldErrors).length > 0 || validation.formErrors.length > 0) {
      applyValidationErrors(validation.fieldErrors, validation.formErrors);
      return;
    }

    pending = true;

    try {
      const result = await submitContactForm(payload, content.form.errorLabel);
      if (!result.ok) {
        if (Object.keys(result.fieldErrors).length > 0 || result.validationErrors.length > 0) {
          applyValidationErrors(result.fieldErrors, result.validationErrors);
        } else {
          showSubmitError(result.message);
        }
        resetTurnstileWidget();
        return;
      }

      showSubmitSuccess();
      resetTurnstileWidget();
      form = createEmptyContactForm();
      clearValidationErrors();
    } finally {
      pending = false;
    }
  }
</script>

{#snippet fieldErrorIndicator(message: string | undefined, placement: "center" | "top")}
  {#if message}
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            class={`text-destructive absolute right-1 z-10 [--hit-area-height:32px] [--hit-area-width:32px] ${placement === "top" ? "top-1" : "top-1/2 -translate-y-1/2"}`}
            aria-label="Validation error"
          >
            <IconRenderer icon={IconWarningCircle} size={16} />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="left" sideOffset={6}>{message}</Tooltip.Content>
    </Tooltip.Root>
  {/if}
{/snippet}

<SectionBlock title={content.title}>
  <CardWrapper>
    <Card.Root>
      <Card.Content>
        <form class="flex flex-col gap-3" data-turnstile-lazy-anchor novalidate onsubmit={handleSubmit}>
          <Input
            type="text"
            name="website"
            class="pointer-events-none absolute h-0 w-0 border-0 p-0 opacity-0"
            tabindex={-1}
            autocomplete="off"
            bind:value={form.website}
            aria-hidden="true"
          />

          <div class="flex flex-col gap-2">
            <Label for="contact-name" class="text-muted-foreground text-xs leading-none font-medium">
              {content.form.nameLabel}
            </Label>
            <div class="relative">
              <Input
                id="contact-name"
                type="text"
                name="name"
                autocomplete="name"
                class="h-8 pr-9 text-sm"
                placeholder="Jane Smith"
                minlength={2}
                maxlength={80}
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                oninput={() => clearFieldError("name")}
                bind:value={form.name}
              />
              {@render fieldErrorIndicator(fieldErrors.name, "center")}
            </div>
            {#if fieldErrors.name}
              <p
                id="contact-name-error"
                class="text-destructive text-xs [@media(hover:hover)_and_(pointer:fine)]:sr-only"
              >
                {fieldErrors.name}
              </p>
            {/if}
          </div>

          <div class="flex flex-col gap-2">
            <Label for="contact-email" class="text-muted-foreground text-xs leading-none font-medium">
              {content.form.emailLabel}
            </Label>
            <div class="relative">
              <Input
                id="contact-email"
                type="email"
                name="email"
                autocomplete="email"
                class="h-8 pr-9 text-sm"
                placeholder="jane@company.com"
                maxlength={160}
                required
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                oninput={() => clearFieldError("email")}
                bind:value={form.email}
              />
              {@render fieldErrorIndicator(fieldErrors.email, "center")}
            </div>
            {#if fieldErrors.email}
              <p
                id="contact-email-error"
                class="text-destructive text-xs [@media(hover:hover)_and_(pointer:fine)]:sr-only"
              >
                {fieldErrors.email}
              </p>
            {/if}
          </div>

          <div class="flex flex-col gap-2">
            <Label for="contact-subject" class="text-muted-foreground text-xs leading-none font-medium">
              {content.form.subjectLabel}
            </Label>
            <div class="relative">
              <Input
                id="contact-subject"
                type="text"
                name="subject"
                class="h-8 pr-9 text-sm"
                placeholder="New landing page for SaaS product"
                minlength={3}
                maxlength={140}
                required
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
                oninput={() => clearFieldError("subject")}
                bind:value={form.subject}
              />
              {@render fieldErrorIndicator(fieldErrors.subject, "center")}
            </div>
            {#if fieldErrors.subject}
              <p
                id="contact-subject-error"
                class="text-destructive text-xs [@media(hover:hover)_and_(pointer:fine)]:sr-only"
              >
                {fieldErrors.subject}
              </p>
            {/if}
          </div>

          <div class="flex flex-col gap-2">
            <Label for="contact-message" class="text-muted-foreground text-xs leading-none font-medium">
              {content.form.messageLabel}
            </Label>
            <div class="relative">
              <Textarea
                id="contact-message"
                name="message"
                class="min-h-30 resize-y pr-9"
                placeholder="Briefly describe your project, scope, and timeline."
                minlength={20}
                maxlength={3000}
                required
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                oninput={() => clearFieldError("message")}
                bind:value={form.message}
              />
              {@render fieldErrorIndicator(fieldErrors.message, "top")}
            </div>
            {#if fieldErrors.message}
              <p
                id="contact-message-error"
                class="text-destructive text-xs [@media(hover:hover)_and_(pointer:fine)]:sr-only"
              >
                {fieldErrors.message}
              </p>
            {/if}
          </div>

          <div class="relative z-20 mt-1 flex flex-col items-center gap-2 overflow-hidden rounded-md p-px shadow-xs">
            {@render fieldErrorIndicator(turnstileError || undefined, "top")}
            <div class="turnstile-clip relative h-15 w-full overflow-hidden rounded-[7px]">
              <div
                class="turnstile-layer mt-2.5 flex h-full w-full items-end justify-center [&>*:first-child]:w-full"
                bind:this={turnstileContainer}
              ></div>
              <div class="bg-foreground dark:bg-background pointer-events-none absolute inset-0 mix-blend-color"></div>
            </div>
          </div>

          <div class="mt-1 flex flex-col gap-2">
            <Button type="submit" size="lg" class="w-full" disabled={pending}>
              <span class="inline-flex" aria-hidden="true">
                <IconRenderer
                  icon={submitFeedback === "success" ? IconCheck : submitFeedback === "error" ? IconClose : IconSend}
                  size={16}
                />
              </span>
              <span>
                {pending
                  ? content.form.sendingLabel
                  : submitFeedback === "success"
                    ? content.form.sentLabel
                    : submitFeedback === "error"
                      ? content.form.retryLabel
                      : content.form.submitLabel}
              </span>
            </Button>

            <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{successAnnouncement}</p>
            <p
              class="text-destructive text-xs empty:sr-only [@media(hover:hover)_and_(pointer:fine)]:sr-only"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {errorAnnouncement}
            </p>

            <p class="text-muted-foreground text-center text-xs text-balance">
              {content.form.privacyNote}
            </p>
          </div>
        </form>
      </Card.Content>
    </Card.Root>
  </CardWrapper>
</SectionBlock>

<style>
  .turnstile-clip {
    overflow: hidden;
    overflow: clip;
    clip-path: inset(0 round var(--radius-sm));
    mask-image: radial-gradient(white, black);
    -webkit-mask-image: -webkit-radial-gradient(white, black);
    isolation: isolate;
    contain: paint;
  }

  .turnstile-layer {
    backface-visibility: hidden;
    transform: translateZ(0) scale(1.01);
    transform-origin: center bottom;
  }
</style>
