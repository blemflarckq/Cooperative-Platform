import { BadRequestException } from "@nestjs/common";

/**
 * Validates a positive money amount represented as a string.
 *
 * Rules:
 * - must be numeric
 * - must be greater than zero
 * - max 18 total digits including decimals
 * - max 2 decimal places
 *
 * We keep money as string because TypeORM numeric/decimal fields return strings.
 */
export function assertPositiveMoneyString(
  value: string | null | undefined,
  fieldName: string,
): void {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const normalized = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BadRequestException(
      `${fieldName} must be a positive monetary amount with up to 2 decimal places.`,
    );
  }

  const [wholePart] = normalized.split(".");
  const digitsOnly = normalized.replace(".", "");

  if (wholePart.length > 16 || digitsOnly.length > 18) {
    throw new BadRequestException(
      `${fieldName} exceeds the maximum supported monetary precision.`,
    );
  }

  if (Number(normalized) <= 0) {
    throw new BadRequestException(`${fieldName} must be greater than zero.`);
  }
}