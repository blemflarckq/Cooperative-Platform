/**
 * A person following an invite link usually has to sign in or register
 * first — and the Google/Facebook buttons leave the app entirely, which
 * wipes any router state. sessionStorage is what survives that round
 * trip. Entries older than the invite's own 4-hour life are ignored: a
 * stale one left behind by an abandoned attempt must never hijack a
 * later, unrelated sign-in.
 */
const KEY = "kopano.pendingInvite";
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

export function rememberPendingInvite(token: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ token, savedAt: Date.now() }));
  } catch {
    // Storage unavailable — the invite simply won't survive a detour.
  }
}

export function readPendingInvite(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { token?: string; savedAt?: number };
    if (!parsed.token || !parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
