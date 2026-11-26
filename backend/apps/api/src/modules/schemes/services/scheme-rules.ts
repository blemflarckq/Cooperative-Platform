import { SchemeStatus } from "../enums/scheme.enums";

/**
 * The rules about what may be done to a scheme, as pure functions: facts
 * in, a refusal (or null) out. The service gathers the facts inside its
 * transaction and under the scheme's row lock; this file only judges them,
 * so every rule can be tested without a database and the wording lives in
 * one place.
 *
 * Refusals come in two kinds, which the service maps to HTTP errors:
 *   - "conflict": the request is fine in itself, but the scheme's current
 *     state forbids it (409).
 *   - "invalid": the request asks for something that makes no sense from
 *     the scheme's state (400).
 */
export type SchemeViolationKind = "conflict" | "invalid";

export interface SchemeViolation {
  kind: SchemeViolationKind;
  message: string;
}

/**
 * Fields the rest of the system is built on. Cycles are validated against
 * the cycle mode, contributions against the contribution mode, loans and
 * policies against the loan mode, and the code is the stable identifier
 * people use in imports and reports — so none of them change once the
 * scheme has been activated. Name and description always can.
 */
export const STRUCTURE_FIELDS = [
  "code",
  "cycleMode",
  "contributionMode",
  "loanMode",
  "payoutMode",
] as const;
export type StructureField = (typeof STRUCTURE_FIELDS)[number];

const STRUCTURE_FIELD_LABELS: Record<StructureField, string> = {
  code: "code",
  cycleMode: "cycle mode",
  contributionMode: "contribution mode",
  loanMode: "loan mode",
  payoutMode: "payout mode",
};

/** Which structure fields an update would actually change (same value = no change). */
export function changedStructureFields(
  current: Record<StructureField, string>,
  next: Partial<Record<StructureField, string | undefined>>,
): StructureField[] {
  return STRUCTURE_FIELDS.filter(
    (field) => next[field] !== undefined && next[field] !== current[field],
  );
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export function checkSchemeUpdate(input: {
  status: SchemeStatus;
  changedStructure: StructureField[];
}): SchemeViolation | null {
  if (input.status === SchemeStatus.ARCHIVED) {
    return { kind: "invalid", message: "Archived schemes cannot be updated." };
  }

  if (input.status !== SchemeStatus.DRAFT && input.changedStructure.length > 0) {
    const what = joinWords(
      input.changedStructure.map((field) => STRUCTURE_FIELD_LABELS[field]),
    );
    return {
      kind: "conflict",
      message:
        `The ${what} can't be changed once a scheme has been activated, because its cycles, ` +
        `contributions and loans are built on it. The name and description can still be changed.`,
    };
  }

  return null;
}

const TRANSITIONS: Record<SchemeStatus, SchemeStatus[]> = {
  [SchemeStatus.DRAFT]: [SchemeStatus.ACTIVE, SchemeStatus.ARCHIVED],
  [SchemeStatus.ACTIVE]: [SchemeStatus.SUSPENDED, SchemeStatus.ARCHIVED],
  [SchemeStatus.SUSPENDED]: [SchemeStatus.ACTIVE, SchemeStatus.ARCHIVED],
  [SchemeStatus.ARCHIVED]: [],
};

const STATE_WORD: Record<SchemeStatus, string> = {
  [SchemeStatus.DRAFT]: "a draft",
  [SchemeStatus.ACTIVE]: "active",
  [SchemeStatus.SUSPENDED]: "suspended",
  [SchemeStatus.ARCHIVED]: "archived",
};

export function checkTransition(
  current: SchemeStatus,
  next: SchemeStatus,
): SchemeViolation | null {
  if (TRANSITIONS[current].includes(next)) return null;

  if (current === next) {
    return { kind: "invalid", message: `This scheme is already ${STATE_WORD[current]}.` };
  }

  if (current === SchemeStatus.ARCHIVED) {
    return {
      kind: "invalid",
      message: "An archived scheme is closed for good and can't be changed.",
    };
  }

  if (next === SchemeStatus.SUSPENDED) {
    return { kind: "invalid", message: "Only an active scheme can be suspended." };
  }

  return {
    kind: "invalid",
    message: `A scheme that is ${STATE_WORD[current]} can't be made ${STATE_WORD[next]}.`,
  };
}

export interface ArchiveBlockers {
  /** Cycles that are open or paused. Draft cycles don't block: they can't be opened once the scheme is archived. */
  runningCycles: number;
  /** Loans not yet fully repaid, including requests still being approved. */
  unpaidLoans: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function describeArchiveBlockers(blockers: ArchiveBlockers): string[] {
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
        : `${plural(blockers.unpaidLoans, "loan", "loans")} aren't fully repaid`,
    );
  }
  return parts;
}

export function checkArchive(
  schemeName: string,
  blockers: ArchiveBlockers,
): SchemeViolation | null {
  const parts = describeArchiveBlockers(blockers);
  if (parts.length === 0) return null;

  return {
    kind: "conflict",
    message:
      `"${schemeName}" can't be archived yet: ${joinWords(parts)}. ` +
      `Close the cycles and settle the loans first.`,
  };
}

/**
 * Suspending a scheme pauses new money in, new loan requests and new
 * members. It deliberately does NOT stop repayments or loans already
 * approved — nobody should be unable to pay back what they owe because a
 * scheme was paused. Callers for repayments simply don't ask this question.
 */
export function checkAcceptsNewActivity(scheme: {
  name: string;
  status: SchemeStatus;
}): SchemeViolation | null {
  switch (scheme.status) {
    case SchemeStatus.ACTIVE:
      return null;
    case SchemeStatus.SUSPENDED:
      return {
        kind: "invalid",
        message:
          `"${scheme.name}" is suspended, so it isn't taking new contributions, loan requests ` +
          `or members right now. Resume it first.`,
      };
    case SchemeStatus.ARCHIVED:
      return {
        kind: "invalid",
        message: `"${scheme.name}" is archived and no longer takes any new activity.`,
      };
    default:
      return {
        kind: "invalid",
        message: `"${scheme.name}" hasn't been activated yet.`,
      };
  }
}
