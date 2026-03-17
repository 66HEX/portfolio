import { RATE_LIMIT_MS } from "./constants";

const submissionByIp = new Map<string, number>();

export function hasRecentSubmission(ip: string): boolean {
  const now = Date.now();
  const lastSubmission = submissionByIp.get(ip) ?? 0;
  const isRateLimited = now - lastSubmission < RATE_LIMIT_MS;

  if (!isRateLimited) {
    submissionByIp.set(ip, now);
  }

  if (submissionByIp.size > 256) {
    const staleCutoff = now - RATE_LIMIT_MS * 4;
    for (const [key, value] of submissionByIp.entries()) {
      if (value < staleCutoff) {
        submissionByIp.delete(key);
      }
    }
  }

  return isRateLimited;
}
