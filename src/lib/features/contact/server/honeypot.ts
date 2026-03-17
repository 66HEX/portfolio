export function extractWebsiteField(body: unknown): string {
  return typeof body === "object" &&
    body !== null &&
    "website" in body &&
    typeof (body as { website?: unknown }).website === "string"
    ? (body as { website: string }).website.trim()
    : "";
}
