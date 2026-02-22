<script lang="ts">
  import { env as publicEnv } from "$env/dynamic/public";
  import IconSend from "$lib/components/icons/IconSend.svelte";
  import { onMount } from "svelte";
  import { toast } from "varsel";
  import type { HomepageContent } from "$lib/content/homepage-content";
  import { contactFormSchema } from "$lib/validation/contact";
  import Button from "../ui/Button.svelte";
  import ContactToast from "../ui/ContactToast.svelte";
  import ContentCard from "../ui/ContentCard.svelte";
  import Input from "../ui/Input.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    content: HomepageContent["contact"];
  };

  type ContactForm = {
    name: string;
    email: string;
    subject: string;
    message: string;
    website: string;
  };

  type ContactPayload = ContactForm & {
    turnstileToken: string;
  };

  type ThemePreference = "light" | "dark";

  type TurnstileRenderOptions = {
    sitekey: string;
    size: "flexible";
    theme: ThemePreference;
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "timeout-callback": () => void;
    "error-callback": () => void;
  };
  type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
  };

  const TURNSTILE_SCRIPT_ID = "cf-turnstile-api-script";
  const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const TURNSTILE_LAZY_ROOT_MARGIN = "320px 0px";
  const TURNSTILE_LAZY_ANCHOR_SELECTOR = "[data-turnstile-lazy-anchor]";
  const TURNSTILE_THEME_CHANGE_EVENT = "themechange";
  const DARK_CLASS = "dark";
  const turnstileSiteKey = publicEnv.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  let { content }: Props = $props();

  let pending = $state(false);
  let form = $state<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
  });
  let turnstileToken = $state("");
  let turnstileError = $state("");

  let turnstileContainer: HTMLDivElement | null = null;
  let turnstileWidgetId: string | null = null;
  let turnstileApi: TurnstileApi | null = null;
  let turnstileApiPromise: Promise<TurnstileApi> | null = null;
  let turnstileInitStarted = false;
  let turnstileTheme = $state<ThemePreference>("light");

  type ToastKind = "success" | "error" | "info";

  function collectValidationMessages(payload: ContactPayload): string[] {
    const parsed = contactFormSchema.safeParse(payload);
    if (parsed.success) {
      return [];
    }

    const messages = parsed.error.issues.map((issue) => issue.message.trim()).filter((message) => message.length > 0);

    return [...new Set(messages)];
  }

  function showContactToast(kind: ToastKind, title: string, message: string, duration = 5000): void {
    toast.custom(ContactToast, {
      duration,
      position: "bottom-center",
      componentProps: {
        kind,
        title,
        message,
      },
    });
  }

  function showValidationToasts(messages: string[]): void {
    for (const message of messages) {
      showContactToast("error", content.form.validationErrorLabel, message, 6000);
    }
  }

  $effect(() => {
    const message = turnstileError.trim();
    if (message.length === 0) {
      return;
    }

    showContactToast("error", content.form.errorLabel, message, 6500);
  });

  function getTurnstileFromWindow(): TurnstileApi | undefined {
    return (window as Window & { turnstile?: TurnstileApi }).turnstile;
  }

  function loadTurnstileApi(): Promise<TurnstileApi> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Turnstile can only load in the browser."));
    }

    const existing = getTurnstileFromWindow();
    if (existing) {
      return Promise.resolve(existing);
    }

    if (turnstileApiPromise) {
      return turnstileApiPromise;
    }

    turnstileApiPromise = new Promise((resolve, reject) => {
      const resolveApiWithRetry = (remainingAttempts = 80): void => {
        const instance = getTurnstileFromWindow();
        if (instance) {
          resolve(instance);
          return;
        }
        if (remainingAttempts <= 0) {
          reject(new Error("Turnstile API loaded without exposing window.turnstile."));
          return;
        }
        window.setTimeout(() => resolveApiWithRetry(remainingAttempts - 1), 50);
      };
      const rejectApi = (): void => reject(new Error("Failed to load Turnstile API script."));

      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (existingScript instanceof HTMLScriptElement) {
        resolveApiWithRetry();
        existingScript.addEventListener("error", rejectApi, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolveApiWithRetry(), { once: true });
      script.addEventListener("error", rejectApi, { once: true });
      document.head.append(script);
    });

    return turnstileApiPromise;
  }

  function readThemeFromDom(): ThemePreference {
    if (typeof document === "undefined") {
      return "light";
    }

    return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";
  }

  function resetTurnstileWidget(): void {
    turnstileToken = "";
    if (turnstileApi && turnstileWidgetId) {
      turnstileApi.reset(turnstileWidgetId);
    }
  }

  function renderTurnstileWidget(): void {
    if (!turnstileApi || !turnstileContainer || turnstileSiteKey.length === 0) {
      return;
    }

    if (turnstileWidgetId) {
      turnstileApi.remove(turnstileWidgetId);
      turnstileWidgetId = null;
    }

    turnstileToken = "";
    turnstileError = "";
    turnstileWidgetId = turnstileApi.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      size: "flexible",
      theme: turnstileTheme,
      action: "contact_form",
      callback: (token: string) => {
        turnstileToken = token;
        turnstileError = "";
      },
      "expired-callback": () => {
        resetTurnstileWidget();
      },
      "timeout-callback": () => {
        resetTurnstileWidget();
      },
      "error-callback": () => {
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

    turnstileTheme = readThemeFromDom();

    const handleThemeChange = (event: Event): void => {
      const nextThemeFromEvent =
        event instanceof CustomEvent && event.detail && typeof event.detail === "object" && "theme" in event.detail
          ? event.detail.theme
          : undefined;

      const nextTheme =
        nextThemeFromEvent === "light" || nextThemeFromEvent === "dark" ? nextThemeFromEvent : readThemeFromDom();

      if (nextTheme === turnstileTheme) {
        return;
      }

      turnstileTheme = nextTheme;
      if (turnstileApi && turnstileContainer) {
        renderTurnstileWidget();
      }
    };

    window.addEventListener(TURNSTILE_THEME_CHANGE_EVENT, handleThemeChange);

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

        renderTurnstileWidget();

        // In case container ref was not ready in the same frame.
        if (!turnstileWidgetId) {
          requestAnimationFrame(() => {
            if (!active) return;
            renderTurnstileWidget();
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
      window.removeEventListener(TURNSTILE_THEME_CHANGE_EVENT, handleThemeChange);
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

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      website: form.website,
      turnstileToken,
    };

    const validationMessages = collectValidationMessages(payload);
    if (validationMessages.length > 0) {
      showValidationToasts(validationMessages);
      return;
    }

    pending = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = content.form.errorLabel;
        let validationErrors: string[] = [];

        try {
          const errorBody = (await response.json()) as { message?: string; errors?: string[] };
          if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
            validationErrors = [
              ...new Set(errorBody.errors.map((item) => item.trim()).filter((item) => item.length > 0)),
            ];
          } else if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
            errorMessage = errorBody.message;
          }
        } catch {
          // Keep fallback message.
        }

        if (validationErrors.length > 0) {
          showValidationToasts(validationErrors);
        } else {
          showContactToast("error", content.form.errorLabel, errorMessage, 6500);
        }

        resetTurnstileWidget();
        return;
      }

      showContactToast("success", content.form.submitLabel, content.form.successLabel, 5000);
      resetTurnstileWidget();

      form = {
        name: "",
        email: "",
        subject: "",
        message: "",
        website: "",
      };
    } catch {
      showContactToast("error", content.form.errorLabel, content.form.errorLabel, 6500);
      resetTurnstileWidget();
    } finally {
      pending = false;
    }
  }
</script>

<SectionBlock title={content.title}>
  <ContentCard class="mx-auto w-full max-w-md">
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
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.nameLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
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
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.emailLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
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
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.subjectLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
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
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.messageLabel}</span>
        <div class="input-highlight bg-background rounded-sm">
          <textarea
            name="message"
            class="text-foreground placeholder:text-gray-alpha-800 block min-h-30 w-full rounded-sm px-2 py-1.5 text-sm leading-relaxed transition-shadow duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="Briefly describe your project, scope, and timeline."
            minlength="20"
            maxlength="3000"
            required
            bind:value={form.message}
          ></textarea>
        </div>
      </label>

      <div
        class="btn-secondary relative z-20 mt-1 flex flex-col items-center gap-2 overflow-hidden rounded-md hover:filter-none!"
      >
        <div class="relative h-15 w-full overflow-hidden rounded-md">
          <div
            class="light:brightness-62 mt-1 flex h-full w-full scale-101 items-end justify-center dark:brightness-55 [&>*:first-child]:w-full"
            bind:this={turnstileContainer}
          ></div>
        </div>
        <div class="bg-background pointer-events-none absolute inset-0 rounded-md mix-blend-color"></div>
      </div>

      <div class="mt-1 flex flex-col gap-2">
        <Button type="submit" variant="primary" size="form" disabled={pending || turnstileToken.length === 0}>
          <IconSend size={12} strokeWidth={2.25} />
          <span>{pending ? content.form.sendingLabel : content.form.submitLabel}</span>
        </Button>

        <p class="text-gray-alpha-800 text-center text-xs text-balance">
          {content.form.privacyNote}
        </p>
      </div>
    </form>
  </ContentCard>
</SectionBlock>
