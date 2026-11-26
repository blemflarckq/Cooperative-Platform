import type { ArchiveBlockers, SchemeStatus } from "../types/scheme.types";

/**
 * Once a scheme has been activated its code and four rules are fixed,
 * because its cycles, contributions and loans are built on them. The
 * server enforces this; the screens use it to say so up front instead of
 * offering a form that would be refused.
 */
export function isStructureLocked(status: SchemeStatus): boolean {
  return status !== "DRAFT";
}

/** "1 cycle is still running", "2 loans aren't fully repaid" — whatever is in the way, as plain phrases. */
export function describeArchiveBlockers(blockers: ArchiveBlockers | undefined): string[] {
  if (!blockers) return [];
  const parts: string[] = [];
  if (blockers.runningCycles > 0) {
    parts.push(
      blockers.runningCycles === 1
        ? "1 cycle is still running"
        : `${blockers.runningCycles} cycles are still running`,
    );
  }
  if (blockers.unpaidLoans > 0) {
    parts.push(
      blockers.unpaidLoans === 1
        ? "1 loan isn't fully repaid"
        : `${blockers.unpaidLoans} loans aren't fully repaid`,
    );
  }
  return parts;
}

/** "a", "a and b" — for joining the phrases above into one sentence. */
export function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What suspending does, said once so the page and its confirmation agree. */
export const SUSPEND_EFFECT =
  "Suspending pauses new contributions, loan requests and members. Repayments and loans already approved carry on.";
