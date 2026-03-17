import { env } from "$env/dynamic/private";
import type { PlatformEnv } from "./types";

export function resolvePrivateValue(platformEnv: PlatformEnv | undefined, key: keyof PlatformEnv): string | undefined {
  const fromPlatform = platformEnv?.[key];
  if (typeof fromPlatform === "string" && fromPlatform.trim().length > 0) {
    return fromPlatform.trim();
  }

  const fromProcess = env[key];
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return undefined;
}
