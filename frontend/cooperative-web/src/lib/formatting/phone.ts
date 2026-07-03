export function normalizeInternationalMobile(
  value: string,
  defaultCountryCode = "+266",
): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/[^\d]/g, "")}`;
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, "");

  // If user types 58000000, convert to +26658000000
  return `${defaultCountryCode}${digitsOnly}`;
}

export function isValidInternationalMobile(value: string): boolean {
  // E.164-style: + followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(value);
}