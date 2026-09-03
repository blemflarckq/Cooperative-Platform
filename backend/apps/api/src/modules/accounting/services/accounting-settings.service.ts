import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountingSettings } from "../entities/accounting-settings.entity";
import {
  AccountNormalBalance,
  AccountStatus,
  AccountType,
} from "../enums/account.enums";
import { UpdateAccountingSettingsDto } from "../dto/settings/update-accounting-settings.dto";
import { AccountingOutboxService } from "./accounting-outbox.service";

@Injectable()
export class AccountingSettingsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(AccountingSettings)
    private readonly settingsRepo: Repository<AccountingSettings>,

    private readonly accountingOutboxService: AccountingOutboxService,
  ) {}

  async getOrCreate(tenantId: string): Promise<AccountingSettings> {
    return this.dataSource.transaction(async (manager) => {
      return this.getOrCreateWithManager(manager, tenantId);
    });
  }

  async update(
    tenantId: string,
    dto: UpdateAccountingSettingsDto,
    actorUserId?: string,
  ): Promise<AccountingSettings> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await this.getOrCreateWithManager(manager, tenantId);

      const before = {
        cashAccountId: settings.cashAccountId,
        memberSavingsLiabilityAccountId:
          settings.memberSavingsLiabilityAccountId,
        loanReceivableAccountId: settings.loanReceivableAccountId,
        interestIncomeAccountId: settings.interestIncomeAccountId,
        penaltyIncomeAccountId: settings.penaltyIncomeAccountId,
        strictPeriodEnforcement: settings.strictPeriodEnforcement,
      };

      await this.validateConfiguredAccounts(manager, tenantId, dto);

      if (dto.cashAccountId !== undefined) {
        settings.cashAccountId = dto.cashAccountId;
      }

      if (dto.memberSavingsLiabilityAccountId !== undefined) {
        settings.memberSavingsLiabilityAccountId =
          dto.memberSavingsLiabilityAccountId;
      }

      if (dto.loanReceivableAccountId !== undefined) {
        settings.loanReceivableAccountId = dto.loanReceivableAccountId;
      }

      if (dto.interestIncomeAccountId !== undefined) {
        settings.interestIncomeAccountId = dto.interestIncomeAccountId;
      }

      if (dto.penaltyIncomeAccountId !== undefined) {
        settings.penaltyIncomeAccountId = dto.penaltyIncomeAccountId;
      }

      if (dto.strictPeriodEnforcement !== undefined) {
        settings.strictPeriodEnforcement = dto.strictPeriodEnforcement;
      }

      const saved = await manager.save(AccountingSettings, settings);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "accounting_settings",
        eventType: "accounting_settings.updated.v1",
        actorUserId,
        payload: {
          settingsId: saved.id,
          before,
          after: {
            cashAccountId: saved.cashAccountId,
            memberSavingsLiabilityAccountId:
              saved.memberSavingsLiabilityAccountId,
            loanReceivableAccountId: saved.loanReceivableAccountId,
            interestIncomeAccountId: saved.interestIncomeAccountId,
            penaltyIncomeAccountId: saved.penaltyIncomeAccountId,
            strictPeriodEnforcement: saved.strictPeriodEnforcement,
          },
        },
      });

      return this.findOneOrFail(manager, tenantId);
    });
  }

  private async getOrCreateWithManager(
    manager: EntityManager,
    tenantId: string,
  ): Promise<AccountingSettings> {
    let settings = await manager.findOne(AccountingSettings, {
      where: { tenantId },
      relations: {
        cashAccount: true,
        memberSavingsLiabilityAccount: true,
        loanReceivableAccount: true,
        interestIncomeAccount: true,
        penaltyIncomeAccount: true,
      },
    });

    if (settings) {
      return settings;
    }

    settings = manager.create(AccountingSettings, {
      tenantId,
      cashAccountId: null,
      memberSavingsLiabilityAccountId: null,
      loanReceivableAccountId: null,
      interestIncomeAccountId: null,
      penaltyIncomeAccountId: null,
    });

    await manager.save(AccountingSettings, settings);

    return this.findOneOrFail(manager, tenantId);
  }

  private async findOneOrFail(
    manager: EntityManager,
    tenantId: string,
  ): Promise<AccountingSettings> {
    const settings = await manager.findOne(AccountingSettings, {
      where: { tenantId },
      relations: {
        cashAccount: true,
        memberSavingsLiabilityAccount: true,
        loanReceivableAccount: true,
        interestIncomeAccount: true,
        penaltyIncomeAccount: true,
      },
    });

    if (!settings) {
      throw new NotFoundException("Accounting settings not found.");
    }

    return settings;
  }

  private async validateConfiguredAccounts(
    manager: EntityManager,
    tenantId: string,
    dto: UpdateAccountingSettingsDto,
  ): Promise<void> {
    const accountRequirements: {
      id: string | null | undefined;
      field: string;
      requiredType: AccountType;
    }[] = [
      {
        id: dto.cashAccountId,
        field: "cashAccountId",
        requiredType: AccountType.ASSET,
      },
      {
        id: dto.memberSavingsLiabilityAccountId,
        field: "memberSavingsLiabilityAccountId",
        requiredType: AccountType.LIABILITY,
      },
      {
        id: dto.loanReceivableAccountId,
        field: "loanReceivableAccountId",
        requiredType: AccountType.ASSET,
      },
      {
        id: dto.interestIncomeAccountId,
        field: "interestIncomeAccountId",
        requiredType: AccountType.INCOME,
      },
      {
        id: dto.penaltyIncomeAccountId,
        field: "penaltyIncomeAccountId",
        requiredType: AccountType.INCOME,
      },
    ].filter((item) => item.id !== undefined && item.id !== null);

    if (!accountRequirements.length) {
      return;
    }

    const ids = accountRequirements.map((item) => item.id!) ;

    const accounts = await manager.find(Account, {
      where: {
        id: In(ids),
        tenantId,
        status: AccountStatus.ACTIVE,
      },
    });

    const byId = new Map(accounts.map((account) => [account.id, account]));

    for (const requirement of accountRequirements) {
      const account = byId.get(requirement.id!);

      if (!account) {
        throw new BadRequestException(
          `${requirement.field} must reference an active account in this tenant.`,
        );
      }

      if (account.type !== requirement.requiredType) {
        throw new BadRequestException(
          `${requirement.field} must reference a ${requirement.requiredType} account.`,
        );
      }
    }
  }

  private async getOrCreateSystemAccount(
    manager: EntityManager,
    tenantId: string,
    input: {
        code: string;
        name: string;
        type: AccountType;
        normalBalance: AccountNormalBalance;
    },
    ): Promise<Account> {
    const existing = await manager.findOne(Account, {
        where: {
        tenantId,
        code: input.code,
        },
    });

    if (existing) {
        if (existing.status !== AccountStatus.ACTIVE) {
        throw new BadRequestException(
            `Default account ${input.code} exists but is not active.`,
        );
        }

        if (
        existing.type !== input.type ||
        existing.normalBalance !== input.normalBalance
        ) {
        throw new BadRequestException(
            `Default account ${input.code} exists but has the wrong accounting type.`,
        );
        }

        return existing;
    }

    const account = manager.create(Account, {
        tenantId,
        code: input.code,
        name: input.name,
        description: "System-provisioned default account",
        type: input.type,
        normalBalance: input.normalBalance,
        status: AccountStatus.ACTIVE,
        isSystem: true,
    });

        return manager.save(Account, account);
    }


  async provisionDefaults(
    tenantId: string,
    actorUserId?: string,
    cashAccountName = "Cash at Bank",
    existingManager?: EntityManager,
    ): Promise<AccountingSettings> {
    const run = async (manager: EntityManager): Promise<AccountingSettings> => {
        const settings = await this.getOrCreateWithManager(manager, tenantId);

        const cash = await this.getOrCreateSystemAccount(manager, tenantId, {
        code: "1000",
        name: cashAccountName.trim() || "Cash at Bank",
        type: AccountType.ASSET,
        normalBalance: AccountNormalBalance.DEBIT,
        });

        const memberSavings = await this.getOrCreateSystemAccount(
        manager,
        tenantId,
        {
            code: "2000",
            name: "Member Savings Liability",
            type: AccountType.LIABILITY,
            normalBalance: AccountNormalBalance.CREDIT,
        },
        );

        const loanReceivable = await this.getOrCreateSystemAccount(
        manager,
        tenantId,
        {
            code: "1100",
            name: "Member Loans Receivable",
            type: AccountType.ASSET,
            normalBalance: AccountNormalBalance.DEBIT,
        },
        );

        const interestIncome = await this.getOrCreateSystemAccount(
        manager,
        tenantId,
        {
            code: "4000",
            name: "Interest Income",
            type: AccountType.INCOME,
            normalBalance: AccountNormalBalance.CREDIT,
        },
        );

        const penaltyIncome = await this.getOrCreateSystemAccount(
        manager,
        tenantId,
        {
            code: "4100",
            name: "Penalty Income",
            type: AccountType.INCOME,
            normalBalance: AccountNormalBalance.CREDIT,
        },
        );

        const before = {
        cashAccountId: settings.cashAccountId,
        memberSavingsLiabilityAccountId:
            settings.memberSavingsLiabilityAccountId,
        loanReceivableAccountId: settings.loanReceivableAccountId,
        interestIncomeAccountId: settings.interestIncomeAccountId,
        penaltyIncomeAccountId: settings.penaltyIncomeAccountId,
        };

        settings.cashAccountId = settings.cashAccountId ?? cash.id;
        settings.memberSavingsLiabilityAccountId =
        settings.memberSavingsLiabilityAccountId ?? memberSavings.id;
        settings.loanReceivableAccountId =
        settings.loanReceivableAccountId ?? loanReceivable.id;
        settings.interestIncomeAccountId =
        settings.interestIncomeAccountId ?? interestIncome.id;
        settings.penaltyIncomeAccountId =
        settings.penaltyIncomeAccountId ?? penaltyIncome.id;

        const saved = await manager.save(AccountingSettings, settings);

        await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "accounting_settings",
        eventType: "accounting_settings.defaults_provisioned.v1",
        actorUserId,
        payload: {
            settingsId: saved.id,
            before,
            after: {
            cashAccountId: saved.cashAccountId,
            memberSavingsLiabilityAccountId:
                saved.memberSavingsLiabilityAccountId,
            loanReceivableAccountId: saved.loanReceivableAccountId,
            interestIncomeAccountId: saved.interestIncomeAccountId,
            penaltyIncomeAccountId: saved.penaltyIncomeAccountId,
            },
        },
        });

        return this.findOneOrFail(manager, tenantId);
    };

    if (existingManager) {
      return run(existingManager);
    }

    return this.dataSource.transaction(run);
    }

  
}