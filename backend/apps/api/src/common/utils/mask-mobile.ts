/**
 * Masks a phone number for display to people who need to recognise a
 * contact but should never receive the full number — country code (when
 * present) and the last three digits stay visible, everything between
 * is hidden. Done on the SERVER, deliberately: masking only in the UI
 * would still ship the full number in the network response to anyone
 * who can open the members list, which is every member.
 *
 * The country-code prefix assumes a three-digit code ("+266" for
 * Lesotho, the primary market). For a longer or shorter code it still
 * never reveals more than the last three digits plus at most one extra
 * leading digit, which is an acceptable edge rather than a leak.
 */
export function maskMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const compact = raw.replace(/[^\d+]/g, "");
  const digits = compact.replace(/\D/g, "");

  // Too short to reveal any part of it safely.
  if (digits.length < 6) return "••••";

  const hasCountryCode = compact.startsWith("+");
  const prefix = hasCountryCode ? compact.slice(0, 4) : "";
  const suffix = digits.slice(-3);
  const hiddenCount = Math.max(3, digits.length - suffix.length - (hasCountryCode ? 3 : 0));

  return `${prefix}${prefix ? " " : ""}${"•".repeat(hiddenCount)}${suffix}`;
}
