import { TURNSTILE_ACTION } from "../shared";

export type TurnstileTheme = "light" | "dark";

export type TurnstileRenderOptions = {
  sitekey: string;
  size: "flexible";
  theme: TurnstileTheme;
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "error-callback": () => void;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

export const TURNSTILE_LAZY_ROOT_MARGIN = "320px 0px";
export const TURNSTILE_LAZY_ANCHOR_SELECTOR = "[data-turnstile-lazy-anchor]";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-api-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileApiPromise: Promise<TurnstileApi> | null = null;

function getTurnstileFromWindow(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function loadTurnstileApi(): Promise<TurnstileApi> {
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

export function renderTurnstileWidget(
  api: TurnstileApi,
  container: HTMLElement,
  siteKey: string,
  handlers: {
    onToken: (token: string) => void;
    onReset: () => void;
    onError: () => void;
  },
  theme: TurnstileTheme,
): string {
  return api.render(container, {
    sitekey: siteKey,
    size: "flexible",
    theme,
    action: TURNSTILE_ACTION,
    callback: handlers.onToken,
    "expired-callback": handlers.onReset,
    "timeout-callback": handlers.onReset,
    "error-callback": handlers.onError,
  });
}
