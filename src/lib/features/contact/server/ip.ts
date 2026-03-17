export function resolveIp(headers: Headers, getClientAddress: () => string): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim().length > 0) {
    return cfIp.trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  try {
    return getClientAddress();
  } catch {
    return "unknown";
  }
}
