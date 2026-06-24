import crypto from "crypto";

/**
 * Generate a stable, unguessable share ID from an analysis ID.
 * Must match the implementation in src/app/api/share/[shareId]/route.ts.
 *
 * Uses HMAC-SHA256 with a static project salt so links persist across
 * server restarts. 24-char hex (192-bit) entropy makes enumeration
 * infeasible.
 */
const SHARE_SALT = "sentimentsense-group38-share-v1";

export function generateShareId(analysisId: string): string {
  return crypto
    .createHmac("sha256", SHARE_SALT)
    .update(analysisId)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Build the full public share URL for an analysis.
 *
 * On the client, `window.location.origin` is used. On the server,
 * the absolute URL cannot be determined without request context, so
 * we return a relative path (which still works for navigation).
 */
export function buildShareUrl(analysisId: string): string {
  const shareId = generateShareId(analysisId);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/?share=${shareId}`;
  }
  return `/?share=${shareId}`;
}
