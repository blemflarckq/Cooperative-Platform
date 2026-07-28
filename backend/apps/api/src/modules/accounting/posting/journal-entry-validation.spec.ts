import { BadRequestException } from '@nestjs/common';
import { JournalLineType } from '../enums/journal.enums';
import {
  validateJournalEntry,
  toCents,
  normalizeMoney,
  JournalLineInput,
} from './journal-entry-validation';
import { describe, expect, it } from '@jest/globals';

/**
 * This is the core invariant of the whole accounting system: a journal
 * entry can only post if total debits exactly equal total credits. If
 * this is ever wrong, the ledger can drift silently — a cooperative's
 * books stop being trustworthy and nobody finds out until a member
 * disputes a number months later. These tests exist to make that
 * impossible to break by accident.
 */
describe('validateJournalEntry', () => {
  const baseHeader = {
    tenantId: 'tenant-1',
    transactionDate: '2026-07-07',
    description: 'Test entry',
  };

  const debit = (accountId: string, amount: string): JournalLineInput => ({
    accountId,
    lineType: JournalLineType.DEBIT,
    amount,
  });

  const credit = (accountId: string, amount: string): JournalLineInput => ({
    accountId,
    lineType: JournalLineType.CREDIT,
    amount,
  });

  describe('the balance invariant', () => {
    it('accepts a simple balanced entry', () => {
      const result = validateJournalEntry({
        ...baseHeader,
        lines: [debit('cash', '100.00'), credit('savings', '100.00')],
      });

      expect(result.debitTotalCents).toBe(10000);
      expect(result.creditTotalCents).toBe(10000);
    });

    it('rejects an unbalanced entry where debits exceed credits', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '100.00'), credit('savings', '99.00')],
        }),
      ).toThrow(/not balanced/);
    });

    it('rejects an unbalanced entry where credits exceed debits', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '50.00'), credit('savings', '100.00')],
        }),
      ).toThrow(/not balanced/);
    });

    it('rejects an entry that is off by a single cent', () => {
      // The exact failure mode that a naive floating-point comparison
      // could miss — this must be caught.
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '100.00'), credit('savings', '100.01')],
        }),
      ).toThrow(/not balanced/);
    });

    it('accepts a balanced entry split across multiple lines on each side', () => {
      const result = validateJournalEntry({
        ...baseHeader,
        lines: [
          debit('cash', '60.00'),
          debit('fees', '40.00'),
          credit('savings', '75.00'),
          credit('interest', '25.00'),
        ],
      });

      expect(result.debitTotalCents).toBe(10000);
      expect(result.creditTotalCents).toBe(10000);
    });

    it('correctly balances amounts prone to classic floating-point drift', () => {
      // 0.1 + 0.2 !== 0.3 in raw floating point — this is the textbook
      // trap. Splitting a debit across lines that sum to a value with
      // this exact issue proves the cents-based comparison actually
      // protects against it.
      const result = validateJournalEntry({
        ...baseHeader,
        lines: [
          debit('cash', '0.10'),
          debit('cash', '0.20'),
          credit('savings', '0.30'),
        ],
      });

      expect(result.debitTotalCents).toBe(30);
      expect(result.creditTotalCents).toBe(30);
    });
  });

  describe('structural requirements', () => {
    it('rejects an entry with fewer than two lines', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '100.00')],
        }),
      ).toThrow(/at least two lines/);
    });

    it('rejects an entry with zero lines', () => {
      expect(() =>
        validateJournalEntry({ ...baseHeader, lines: [] }),
      ).toThrow(/at least two lines/);
    });

    it('rejects an entry that is all debits with no credits', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '50.00'), debit('fees', '50.00')],
        }),
      ).toThrow(/requires both debit and credit/);
    });

    it('rejects an entry that is all credits with no debits', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [credit('cash', '50.00'), credit('fees', '50.00')],
        }),
      ).toThrow(/requires both debit and credit/);
    });

    it('rejects a line missing an accountId', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [
            { accountId: '', lineType: JournalLineType.DEBIT, amount: '10.00' },
            credit('savings', '10.00'),
          ],
        }),
      ).toThrow(/requires accountId/);
    });

    it('rejects a line with an invalid lineType', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [
            {
              accountId: 'cash',
              lineType: 'SIDEWAYS' as JournalLineType,
              amount: '10.00',
            },
            credit('savings', '10.00'),
          ],
        }),
      ).toThrow(/DEBIT or CREDIT/);
    });

    it('rejects a line with a missing amount rather than silently treating it as zero', () => {
      // Regression test for a real bug found during Phase 1 hardening:
      // the underlying money validator used to silently accept
      // null/undefined/empty amounts, which meant a line with no real
      // amount could slip into a posted, immutable journal entry.
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [
            {
              accountId: 'cash',
              lineType: JournalLineType.DEBIT,
              amount: undefined as unknown as string,
            },
            credit('savings', '10.00'),
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects a negative amount', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          lines: [debit('cash', '-10.00'), credit('savings', '10.00')],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects missing tenantId', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          tenantId: '',
          lines: [debit('cash', '10.00'), credit('savings', '10.00')],
        }),
      ).toThrow(/tenantId is required/);
    });

    it('rejects missing description', () => {
      expect(() =>
        validateJournalEntry({
          ...baseHeader,
          description: '   ',
          lines: [debit('cash', '10.00'), credit('savings', '10.00')],
        }),
      ).toThrow(/description is required/);
    });
  });
});

describe('toCents', () => {
  it('converts whole numbers correctly', () => {
    expect(toCents(100)).toBe(10000);
  });

  it('converts decimal values correctly', () => {
    expect(toCents(99.99)).toBe(9999);
  });

  it('rounds correctly to avoid floating-point drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe('normalizeMoney', () => {
  it('formats a whole number with two decimal places', () => {
    expect(normalizeMoney('100')).toBe('100.00');
  });

  it('preserves two decimal places', () => {
    expect(normalizeMoney('99.99')).toBe('99.99');
  });

  it('rounds a value with more than two decimal places', () => {
    expect(normalizeMoney('10.999')).toBe('11.00');
  });
});
