import * as bcrypt from "bcryptjs";

/**
 * Centralize hashing rules in one file for easy policy upgrades later.
 */
export async function hashPassword(raw: string): Promise<string> {
  return await bcrypt.hash(raw, 12);
}

export async function verifyPassword(raw: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(raw, hash);
}