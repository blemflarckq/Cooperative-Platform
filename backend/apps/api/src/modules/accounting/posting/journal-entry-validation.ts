import { BadRequestException } from "@nestjs/common";
import { JournalLineType } from "../enums/journal.enums";
import { assertPositiveMoneyString } from "../../../common/validation/money";

export interface JournalLineInput {
  accountId: string;
  lineType: JournalLineType;
  amount: string;
  memo?: string | null;
}

export interface JournalEntryHeaderInput {
  tenantId: string;
  transactionDate: string;
  description: string;
  lines: JournalLineInput[];
}

/**
 * Converts a decimal money string to integer cents. Comparing totals as
 * integer cents (rather than floating-point numbers) is what makes the
 * balance check below correct — comparing floats directly is exactly the
 * kind of thing that looks fine in a demo and then fails intermittently in
 * production the first time rounding doesn't land the way you'd expect.
 */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function normalizeMoney(value: string): string {
  return Number(value).toFixed(2);
}

/**
 * Validates that a journal entry is well-formed and balanced — this is the
 * core double-entry accounting invariant: total debits must always equal
 * total credits, or the entry is not allowed to post. This is pure,
 * DB-independent business logic, deliberately extracted from
 * PostingEngineService so it can be unit tested directly without a real
 * database connection.
 *
 * Throws BadRequestException on any violation. Returns the computed totals
 * (in cents) on success, in case a caller wants them.
 */
export function validateJournalEntry(input: JournalEntryHeaderInput): {
  debitTotalCents: number;
  creditTotalCents: number;
} {
  if (!input.tenantId) {
    throw new BadRequestException("tenantId is required.");
  }

  if (!input.transactionDate) {
    throw new BadRequestException("transactionDate is required.");
  }

  if (!input.description?.trim()) {
    throw new BadRequestException("description is required.");
  }

  if (!input.lines || input.lines.length < 2) {
    throw new BadRequestException(
      "A journal entry requires at least two lines.",
    );
  }

  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of input.lines) {
    if (!line.accountId) {
      throw new BadRequestException("Each journal line requires accountId.");
    }

    if (
      line.lineType !== JournalLineType.DEBIT &&
      line.lineType !== JournalLineType.CREDIT
    ) {
      throw new BadRequestException(
        "Each journal line must be either DEBIT or CREDIT.",
      );
    }

    assertPositiveMoneyString(line.amount, "line amount");

    const amount = Number(normalizeMoney(line.amount));

    if (line.lineType === JournalLineType.DEBIT) {
      debitTotal += amount;
    } else {
      creditTotal += amount;
    }
  }

  if (debitTotal <= 0 || creditTotal <= 0) {
    throw new BadRequestException(
      "Journal entry requires both debit and credit lines.",
    );
  }

  const debitTotalCents = toCents(debitTotal);
  const creditTotalCents = toCents(creditTotal);

  if (debitTotalCents !== creditTotalCents) {
    throw new BadRequestException(
      "Journal entry is not balanced. Total debits must equal total credits.",
    );
  }

  return { debitTotalCents, creditTotalCents };
}
