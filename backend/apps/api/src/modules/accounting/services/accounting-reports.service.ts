import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TrialBalanceQueryDto } from "../dto/reports/trial-balance.query.dto";
import { AccountLedgerQueryDto } from "../dto/reports/account-ledger.query.dto";
import { AccountingSummaryQueryDto } from "../dto/reports/accounting-summary.query.dto";

@Injectable()
export class AccountingReportsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Trial balance is derived from posted journal lines.
   *
   * It is not stored because balances are derived financial state.
   * This report helps prove that total debits equal total credits.
   */
  async getTrialBalance(tenantId: string, query: TrialBalanceQueryDto) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const params: unknown[] = [tenantId];
    let dateFilter = "";

    if (query.dateFrom) {
      params.push(query.dateFrom);
      dateFilter += ` AND je."transactionDate" >= $${params.length}`;
    }

    if (query.dateTo) {
      params.push(query.dateTo);
      dateFilter += ` AND je."transactionDate" <= $${params.length}`;
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        a.id AS "accountId",
        a.code AS "accountCode",
        a.name AS "accountName",
        a.type AS "accountType",
        a."normalBalance" AS "normalBalance",
        COALESCE(
          SUM(
            CASE WHEN jl."lineType" = 'DEBIT'
            THEN jl.amount ELSE 0 END
          ), 0
        ) AS "debitTotal",
        COALESCE(
          SUM(
            CASE WHEN jl."lineType" = 'CREDIT'
            THEN jl.amount ELSE 0 END
          ), 0
        ) AS "creditTotal"
      FROM accounts a
      LEFT JOIN journal_lines jl
        ON jl."accountId" = a.id
       AND jl."tenantId" = a."tenantId"
      LEFT JOIN journal_entries je
        ON je.id = jl."journalEntryId"
       AND je."tenantId" = a."tenantId"
       AND je.status = 'POSTED'
       ${dateFilter}
      WHERE a."tenantId" = $1
        AND a.status = 'ACTIVE'
      GROUP BY
        a.id,
        a.code,
        a.name,
        a.type,
        a."normalBalance"
      ORDER BY a.code ASC
      `,
      params,
    );

    const lines = rows.map((row: any) => {
      const debitTotal = this.normalizeMoney(row.debitTotal);
      const creditTotal = this.normalizeMoney(row.creditTotal);

      return {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        accountType: row.accountType,
        normalBalance: row.normalBalance,
        debitTotal,
        creditTotal,
        netDebit:
          Number(debitTotal) > Number(creditTotal)
            ? this.subtractMoney(debitTotal, creditTotal)
            : "0.00",
        netCredit:
          Number(creditTotal) > Number(debitTotal)
            ? this.subtractMoney(creditTotal, debitTotal)
            : "0.00",
      };
    });

    const totalDebits = this.sumMoney(lines.map((line) => line.debitTotal));
    const totalCredits = this.sumMoney(lines.map((line) => line.creditTotal));

    return {
      tenantId,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced: totalDebits === totalCredits,
        difference: this.subtractMoney(totalDebits, totalCredits),
      },
      lines,
    };
  }

  private normalizeMoney(value: string | number): string {
    return Number(value).toFixed(2);
  }

  private sumMoney(values: string[]): string {
    const cents = values.reduce(
      (sum, value) => sum + Math.round(Number(value) * 100),
      0,
    );

    return (cents / 100).toFixed(2);
  }

  private subtractMoney(left: string, right: string): string {
    const cents =
      Math.round(Number(left) * 100) - Math.round(Number(right) * 100);

    return Math.abs(cents / 100).toFixed(2);
  }

  async getAccountLedger(
    tenantId: string,
    accountId: string,
    query: AccountLedgerQueryDto,
    ) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
        throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const params: unknown[] = [tenantId, accountId];
    let dateFilter = "";

    if (query.dateFrom) {
        params.push(query.dateFrom);
        dateFilter += ` AND je."transactionDate" >= $${params.length}`;
    }

    if (query.dateTo) {
        params.push(query.dateTo);
        dateFilter += ` AND je."transactionDate" <= $${params.length}`;
    }

    const accountRows = await this.dataSource.query(
        `
        SELECT
        id,
        code,
        name,
        type,
        "normalBalance",
        status
        FROM accounts
        WHERE "tenantId" = $1
        AND id = $2
        `,
        [tenantId, accountId],
    );

    if (!accountRows.length) {
        throw new BadRequestException("Account not found.");
    }

    const rows = await this.dataSource.query(
        `
        SELECT
        je.id AS "journalEntryId",
        je."entryNumber" AS "entryNumber",
        je."transactionDate" AS "transactionDate",
        je.description AS "description",
        je."sourceModule" AS "sourceModule",
        je."sourceReference" AS "sourceReference",
        jl.id AS "journalLineId",
        jl."lineType" AS "lineType",
        jl.amount AS "amount",
        jl.memo AS "memo"
        FROM journal_lines jl
        INNER JOIN journal_entries je
        ON je.id = jl."journalEntryId"
        AND je."tenantId" = jl."tenantId"
        WHERE jl."tenantId" = $1
        AND jl."accountId" = $2
        AND je.status = 'POSTED'
        ${dateFilter}
        ORDER BY je."transactionDate" ASC, je."createdAt" ASC, jl."createdAt" ASC
        `,
        params,
    );

    let runningDebitCents = 0;
    let runningCreditCents = 0;

    const lines = rows.map((row: any) => {
        const amountCents = Math.round(Number(row.amount) * 100);

        if (row.lineType === "DEBIT") {
        runningDebitCents += amountCents;
        } else {
        runningCreditCents += amountCents;
        }

        return {
        journalEntryId: row.journalEntryId,
        journalLineId: row.journalLineId,
        entryNumber: row.entryNumber,
        transactionDate: row.transactionDate,
        description: row.description,
        sourceModule: row.sourceModule,
        sourceReference: row.sourceReference,
        lineType: row.lineType,
        debit: row.lineType === "DEBIT" ? this.normalizeMoney(row.amount) : "0.00",
        credit:
            row.lineType === "CREDIT" ? this.normalizeMoney(row.amount) : "0.00",
        memo: row.memo,
        runningDebitTotal: (runningDebitCents / 100).toFixed(2),
        runningCreditTotal: (runningCreditCents / 100).toFixed(2),
        runningNetDebit:
            runningDebitCents > runningCreditCents
            ? ((runningDebitCents - runningCreditCents) / 100).toFixed(2)
            : "0.00",
        runningNetCredit:
            runningCreditCents > runningDebitCents
            ? ((runningCreditCents - runningDebitCents) / 100).toFixed(2)
            : "0.00",
        };
    });

    const totalDebits = (runningDebitCents / 100).toFixed(2);
    const totalCredits = (runningCreditCents / 100).toFixed(2);

    return {
        tenantId,
        account: {
        id: accountRows[0].id,
        code: accountRows[0].code,
        name: accountRows[0].name,
        type: accountRows[0].type,
        normalBalance: accountRows[0].normalBalance,
        status: accountRows[0].status,
        },
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
        totals: {
        totalDebits,
        totalCredits,
        netDebit:
            runningDebitCents > runningCreditCents
            ? ((runningDebitCents - runningCreditCents) / 100).toFixed(2)
            : "0.00",
        netCredit:
            runningCreditCents > runningDebitCents
            ? ((runningCreditCents - runningDebitCents) / 100).toFixed(2)
            : "0.00",
        },
        lines,
    };
  }

  async getAccountingSummary(
    tenantId: string,
    query: AccountingSummaryQueryDto,
    ) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
        throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const params: unknown[] = [tenantId];
    let dateFilter = "";

    if (query.dateFrom) {
        params.push(query.dateFrom);
        dateFilter += ` AND je."transactionDate" >= $${params.length}`;
    }

    if (query.dateTo) {
        params.push(query.dateTo);
        dateFilter += ` AND je."transactionDate" <= $${params.length}`;
    }

    const rows = await this.dataSource.query(
        `
        SELECT
        a.type AS "accountType",
        COALESCE(
            SUM(CASE WHEN jl."lineType" = 'DEBIT' THEN jl.amount ELSE 0 END),
            0
        ) AS "debitTotal",
        COALESCE(
            SUM(CASE WHEN jl."lineType" = 'CREDIT' THEN jl.amount ELSE 0 END),
            0
        ) AS "creditTotal"
        FROM accounts a
        LEFT JOIN journal_lines jl
        ON jl."accountId" = a.id
        AND jl."tenantId" = a."tenantId"
        LEFT JOIN journal_entries je
        ON je.id = jl."journalEntryId"
        AND je."tenantId" = a."tenantId"
        AND je.status = 'POSTED'
        ${dateFilter}
        WHERE a."tenantId" = $1
        AND a.status = 'ACTIVE'
        GROUP BY a.type
        `,
        params,
    );

    const byType = new Map<string, { debitTotal: string; creditTotal: string }>(
        rows.map((row: any) => [
        row.accountType,
        {
            debitTotal: this.normalizeMoney(row.debitTotal),
            creditTotal: this.normalizeMoney(row.creditTotal),
        },
        ]),
    );

    const assets = this.netDebit(byType.get("ASSET"));
    const liabilities = this.netCredit(byType.get("LIABILITY"));
    const equity = this.netCredit(byType.get("EQUITY"));
    const income = this.netCredit(byType.get("INCOME"));
    const expenses = this.netDebit(byType.get("EXPENSE"));

    return {
        tenantId,
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
        totals: {
        assets,
        liabilities,
        equity,
        income,
        expenses,
        netSurplus: this.subtractMoney(income, expenses),
        },
    };
  }

  private netDebit(
    totals?: { debitTotal: string; creditTotal: string },
  ): string {
    if (!totals) return "0.00";

    const debit = Math.round(Number(totals.debitTotal) * 100);
    const credit = Math.round(Number(totals.creditTotal) * 100);

    return debit > credit ? ((debit - credit) / 100).toFixed(2) : "0.00";
  }

  private netCredit(
    totals?: { debitTotal: string; creditTotal: string },
  ): string {
    if (!totals) return "0.00";

    const debit = Math.round(Number(totals.debitTotal) * 100);
    const credit = Math.round(Number(totals.creditTotal) * 100);

    return credit > debit ? ((credit - debit) / 100).toFixed(2) : "0.00";
  }
}