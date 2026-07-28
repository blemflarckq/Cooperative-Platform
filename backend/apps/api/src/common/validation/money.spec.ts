import { BadRequestException } from '@nestjs/common';
import { assertPositiveMoneyString } from './money';
import { describe, expect, it } from '@jest/globals';

describe('assertPositiveMoneyString', () => {
  describe('missing values (the bug this test suite exists to catch)', () => {
    it('rejects null by default', () => {
      expect(() => assertPositiveMoneyString(null, 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects undefined by default', () => {
      expect(() => assertPositiveMoneyString(undefined, 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects empty string by default', () => {
      expect(() => assertPositiveMoneyString('', 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('allows null when allowEmpty is explicitly passed', () => {
      expect(() =>
        assertPositiveMoneyString(null, 'targetAmount', { allowEmpty: true }),
      ).not.toThrow();
    });

    it('allows undefined when allowEmpty is explicitly passed', () => {
      expect(() =>
        assertPositiveMoneyString(undefined, 'targetAmount', {
          allowEmpty: true,
        }),
      ).not.toThrow();
    });
  });

  describe('valid amounts', () => {
    it('accepts a whole number', () => {
      expect(() => assertPositiveMoneyString('100', 'amount')).not.toThrow();
    });

    it('accepts two decimal places', () => {
      expect(() => assertPositiveMoneyString('99.99', 'amount')).not.toThrow();
    });

    it('accepts one decimal place', () => {
      expect(() => assertPositiveMoneyString('10.5', 'amount')).not.toThrow();
    });

    it('accepts a small positive amount', () => {
      expect(() => assertPositiveMoneyString('0.01', 'amount')).not.toThrow();
    });
  });

  describe('invalid amounts', () => {
    it('rejects zero', () => {
      expect(() => assertPositiveMoneyString('0', 'amount')).toThrow(
        /greater than zero/,
      );
    });

    it('rejects zero with decimals', () => {
      expect(() => assertPositiveMoneyString('0.00', 'amount')).toThrow(
        /greater than zero/,
      );
    });

    it('rejects negative amounts', () => {
      expect(() => assertPositiveMoneyString('-5', 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects non-numeric strings', () => {
      expect(() => assertPositiveMoneyString('abc', 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects more than 2 decimal places', () => {
      expect(() => assertPositiveMoneyString('10.999', 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects scientific notation', () => {
      expect(() => assertPositiveMoneyString('1e5', 'amount')).toThrow(
        BadRequestException,
      );
    });

    it('rejects a value with more than 16 whole-number digits', () => {
      expect(() =>
        assertPositiveMoneyString('12345678901234567', 'amount'),
      ).toThrow(BadRequestException);
    });

    it('rejects whitespace-only string', () => {
      expect(() => assertPositiveMoneyString('   ', 'amount')).toThrow(
        BadRequestException,
      );
    });
  });
});