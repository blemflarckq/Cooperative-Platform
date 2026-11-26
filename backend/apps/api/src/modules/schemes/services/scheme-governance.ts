import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { EntityManager, In, Not } from "typeorm";
import { Loan } from "../../loans/entities/loan.entity";
import { LoanStatus } from "../../loans/enums/loan.enums";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { OperatingCycle } from "../entities/operating-cycle.entity";
import { OperatingCycleStatus } from "../enums/scheme.enums";
import {
  ArchiveBlockers,
  checkAcceptsNewActivity,
  SchemeViolation,
} from "./scheme-rules";

/**
 * The database half of the scheme rules: gathering the facts that
 * scheme-rules.ts judges. Everything takes the caller's transaction
 * manager so the facts and the change they justify are read and written
 * under the same lock on the scheme's row.
 */

/** Turns a rule's refusal into the right HTTP error, message untouched. */
export function throwSchemeViolation(violation: SchemeViolation): never {
  if (violation.kind === "conflict") throw new ConflictException(violation.message);
  throw new BadRequestException(violation.message);
}

/**
 * Loads a scheme and takes its row lock for the rest of the transaction.
 * "write" is for changes to the scheme itself (edit, activate, suspend,
 * archive); it waits for anyone currently doing new activity under it.
 */
export async function lockScheme(
  manager: EntityManager,
  tenantId: string,
  schemeId: string,
  mode: "write" | "read",
): Promise<CooperativeScheme> {
  const scheme = await manager.findOne(CooperativeScheme, {
    where: { id: schemeId, tenantId },
    lock: { mode: mode === "write" ? "pessimistic_write" : "pessimistic_read" },
    loadEagerRelations: false,
  });
  if (!scheme) throw new NotFoundException("Scheme not found.");
  return scheme;
}

/**
 * The one question every "new money in / new loan / new member / open a
 * cycle" path asks first. It takes a shared lock on the scheme, so if an
 * administrator is archiving at the same moment, one of the two waits for
 * the other and then sees the result — a contribution can't slip in after
 * the archive counted what was open.
 */
export async function assertSchemeAcceptsNewActivity(
  manager: EntityManager,
  tenantId: string,
  schemeId: string,
): Promise<CooperativeScheme> {
  const scheme = await lockScheme(manager, tenantId, schemeId, "read");
  const violation = checkAcceptsNewActivity(scheme);
  if (violation) throwSchemeViolation(violation);
  return scheme;
}

export async function countArchiveBlockers(
  manager: EntityManager,
  tenantId: string,
  schemeId: string,
): Promise<ArchiveBlockers> {
  const [runningCycles, unpaidLoans] = await Promise.all([
    manager.count(OperatingCycle, {
      where: {
        tenantId,
        schemeId,
        status: In([OperatingCycleStatus.OPEN, OperatingCycleStatus.PAUSED]),
      },
    }),
    manager.count(Loan, {
      where: { tenantId, schemeId, status: Not(LoanStatus.REPAID) },
    }),
  ]);

  return { runningCycles, unpaidLoans };
}
