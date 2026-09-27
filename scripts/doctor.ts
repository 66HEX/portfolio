import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { portfolio } from "../src/portfolio/config.ts";
import { validatePortfolio } from "./validate.ts";

try {
  await validatePortfolio();
  const environment: Record<string, string | undefined> = {};
  for (const file of [".env", ".env.local", ".dev.vars"]) {
    try {
      Object.assign(environment, parseEnv(await readFile(file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  Object.assign(environment, process.env);
  const configured = (key: string) => Boolean(environment[key]?.trim()) && !/your_|_here/.test(environment[key] ?? "");
  if (portfolio.sections.includes("github")) {
    console.log(
      `[github] ${configured("GITHUB_TOKEN") ? "Token configured." : "No token. The graph uses its existing fallback. Add GITHUB_TOKEN for live data."}`,
    );
  }
  if (portfolio.sections.includes("contact")) {
    const missing = ["RESEND_API_KEY", "CONTACT_TO_EMAIL", "PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"].filter(
      (key) => !configured(key),
    );
    console.log(
      `[contact] ${missing.length ? `Missing ${missing.join(", ")}. Configure them to send mail, or remove contact from portfolio.sections.` : "Required variables configured."}`,
    );
  }
  console.log(
    "[deploy] Set your worker name and domains in wrangler.jsonc. This check does not inspect or change remote secrets.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
