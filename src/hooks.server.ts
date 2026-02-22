import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";

function buildCspHeaderValue(): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"];
  if (dev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com https://api.github.com https://api.resend.com",
    "frame-src https://challenges.cloudflare.com",
    "form-action 'self'",
  ];

  if (!dev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const cspHeaderValue = buildCspHeaderValue();

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", cspHeaderValue);
  }

  return response;
};
