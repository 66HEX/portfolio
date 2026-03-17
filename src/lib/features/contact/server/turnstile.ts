import { TURNSTILE_TIMEOUT_MS, TURNSTILE_VERIFY_URL } from "./constants";

export type TurnstileVerificationResult = {
  success: boolean;
  action?: string;
  errorCodes: string[];
};

export async function verifyTurnstileToken(
  fetchFn: typeof fetch,
  secret: string,
  token: string,
  remoteIp: string,
): Promise<TurnstileVerificationResult> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: remoteIp,
    });

    const response = await fetchFn(TURNSTILE_VERIFY_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      return { success: false, errorCodes: [`turnstile-http-${response.status}`] };
    }

    const verification = (await response.json()) as {
      success?: boolean;
      action?: string;
      "error-codes"?: string[];
    };

    return {
      success: verification.success === true,
      action: verification.action,
      errorCodes: Array.isArray(verification["error-codes"]) ? verification["error-codes"] : [],
    };
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return { success: false, errorCodes: ["turnstile-network-error"] };
  } finally {
    clearTimeout(timeoutId);
  }
}
