import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountingSettings } from "../entities/accounting-settings.entity";
import { AccountStatus } from "../enums/account.enums";


export enum SystemAccountKey {
  CASH = "CASH",
  MEMBER_SAVINGS_LIABILITY = "MEMBER_SAVINGS_LIABILITY",
  LOAN_RECEIVABLE = "LOAN_RECEIVABLE",
  INTEREST_INCOME = "INTEREST_INCOME",
  PENALTY_INCOME = "PENALTY_INCOME",
}

@Injectable()
export class AccountResolverService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Resolves a configured system account outside an existing transaction.
   */
  async resolve(
    tenantId: string,
    key: SystemAccountKey,
  ): Promise<Account> {
    return this.dataSource.transaction((manager) =>
      this.resolveWithManager(manager, tenantId, key),
    );
  }

  /**
   * Resolves a configured system account inside an existing transaction.
   *
   * Business modules should prefer this method when they are already
   * performing a financial workflow transaction, so account resolution and
   * journal posting happen atomically.
   */
  async resolveWithManager(
    manager: EntityManager,
    tenantId: string,
    key: SystemAccountKey,
  ): Promise<Account> {
    const settings = await manager.findOne(AccountingSettings, {
      where: { tenantId },
    });

    if (!settings) {
      throw new BadRequestException(
        "Accounting settings have not been configured for this tenant.",
      );
    }

    const accountId = this.getAccountId(settings, key);

    if (!accountId) {
      throw new BadRequestException(
        `${key} account has not been configured for this tenant.`,
      );
    }

    const account = await manager.findOne(Account, {
      where: {
        id: accountId,
        tenantId,
        status: AccountStatus.ACTIVE,
      },
    });

    if (!account) {
      throw new BadRequestException(
        `${key} account is invalid, inactive, or does not belong to this tenant.`,
      );
    }

    return account;
  }

  private getAccountId(
    settings: AccountingSettings,
    key: SystemAccountKey,
  ): string | null {
    switch (key) {
      case SystemAccountKey.CASH:
        return settings.cashAccountId;

      case SystemAccountKey.MEMBER_SAVINGS_LIABILITY:
        return settings.memberSavingsLiabilityAccountId;

      case SystemAccountKey.LOAN_RECEIVABLE:
        return settings.loanReceivableAccountId;

      case SystemAccountKey.INTEREST_INCOME:
        return settings.interestIncomeAccountId;

      case SystemAccountKey.PENALTY_INCOME:
        return settings.penaltyIncomeAccountId;

      default:
        return null;
    }
  }
}