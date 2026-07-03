import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, Repository, EntityManager  } from "typeorm";
import { Account } from "../entities/account.entity";
import { JournalLine } from "../entities/journal-line.entity";
import {
  AccountNormalBalance,
  AccountStatus,
  AccountType,
} from "../enums/account.enums";
import { CreateAccountDto } from "../dto/accounts/create-account.dto";
import { UpdateAccountDto } from "../dto/accounts/update-account.dto";
import { ListAccountsQueryDto } from "../dto/accounts/list-accounts.query.dto";
import { AccountingOutboxService } from "./accounting-outbox.service";
import { AccountingSettings } from "../entities/accounting-settings.entity";

@Injectable()
export class AccountsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Account)
    private readonly accountsRepo: Repository<Account>,

    private readonly accountingOutboxService: AccountingOutboxService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAccountDto,
    actorUserId?: string,
  ): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const code = dto.code.trim().toUpperCase();
      const name = dto.name.trim();

      this.assertNormalBalanceMatchesType(dto.type, dto.normalBalance);

      const existing = await manager.findOne(Account, {
        where: { tenantId, code },
      });

      if (existing) {
        throw new ConflictException(
          "An account with this code already exists in this tenant.",
        );
      }

      let account = manager.create(Account, {
        tenantId,
        code,
        name,
        description: dto.description?.trim() || null,
        type: dto.type,
        normalBalance: dto.normalBalance,
        status: AccountStatus.ACTIVE,
        isSystem: false,
      });

      account = await manager.save(Account, account);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: account.id,
        aggregateType: "account",
        eventType: "account.created.v1",
        actorUserId,
        payload: {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          status: account.status,
          isSystem: account.isSystem,
        },
      });

      return account;
    });
  }

  async findAll(
    tenantId: string,
    query: ListAccountsQueryDto,
  ): Promise<[Account[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseWhere: Record<string, unknown> = { tenantId };

    if (query.type) {
      baseWhere.type = query.type;
    }

    if (query.status) {
      baseWhere.status = query.status;
    }

    const where = query.search?.trim()
      ? [
          {
            ...baseWhere,
            code: ILike(`%${query.search.trim()}%`),
          },
          {
            ...baseWhere,
            name: ILike(`%${query.search.trim()}%`),
          },
        ]
      : [baseWhere];

    return this.accountsRepo.findAndCount({
      where,
      order: {
        code: "ASC",
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(tenantId: string, id: string): Promise<Account> {
    const account = await this.accountsRepo.findOne({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException("Account not found.");
    }

    return account;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAccountDto,
    actorUserId?: string,
  ): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(Account, {
        where: { id, tenantId },
      });

      if (!account) {
        throw new NotFoundException("Account not found.");
      }

      if (account.status === AccountStatus.ARCHIVED) {
        throw new BadRequestException("Archived accounts cannot be updated.");
      }

      if (account.isSystem) {
        if (dto.code !== undefined) {
          throw new BadRequestException("System account code cannot be changed.");
        }

        if (dto.type !== undefined) {
          throw new BadRequestException("System account type cannot be changed.");
        }

        if (dto.normalBalance !== undefined) {
          throw new BadRequestException(
            "System account normal balance cannot be changed.",
          );
        }
      }

      const before = {
        code: account.code,
        name: account.name,
        description: account.description,
        type: account.type,
        normalBalance: account.normalBalance,
        status: account.status,
      };

      const nextType = dto.type ?? account.type;
      const nextNormalBalance = dto.normalBalance ?? account.normalBalance;

      this.assertNormalBalanceMatchesType(nextType, nextNormalBalance);

      if (dto.code !== undefined) {
        const nextCode = dto.code.trim().toUpperCase();

        const duplicate = await manager.findOne(Account, {
          where: { tenantId, code: nextCode },
        });

        if (duplicate && duplicate.id !== account.id) {
          throw new ConflictException(
            "An account with this code already exists in this tenant.",
          );
        }

        account.code = nextCode;
      }

      if (dto.name !== undefined) account.name = dto.name.trim();
      if (dto.description !== undefined) {
        account.description = dto.description?.trim() || null;
      }
      if (dto.type !== undefined) account.type = dto.type;
      if (dto.normalBalance !== undefined) {
        account.normalBalance = dto.normalBalance;
      }

      const saved = await manager.save(Account, account);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "account",
        eventType: "account.updated.v1",
        actorUserId,
        payload: {
          accountId: saved.id,
          before,
          after: {
            code: saved.code,
            name: saved.name,
            description: saved.description,
            type: saved.type,
            normalBalance: saved.normalBalance,
            status: saved.status,
          },
        },
      });

      return saved;
    });
  }

  async deactivate(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<Account> {
    return this.transitionStatus(
      tenantId,
      id,
      AccountStatus.INACTIVE,
      "account.deactivated.v1",
      actorUserId,
    );
  }

  async archive(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<Account> {
    return this.dataSource.transaction(async (manager) => {
      const usageCount = await manager.count(JournalLine, {
        where: {
          tenantId,
          accountId: id,
        },
      });

      if (usageCount > 0) {
        throw new BadRequestException(
          "Accounts with journal activity cannot be archived.",
        );
      }

      return this.transitionStatusWithManager(
        manager,
        tenantId,
        id,
        AccountStatus.ARCHIVED,
        "account.archived.v1",
        actorUserId,
      );
    });
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    nextStatus: AccountStatus,
    eventType: string,
    actorUserId?: string,
  ): Promise<Account> {
    return this.dataSource.transaction((manager) =>
      this.transitionStatusWithManager(
        manager,
        tenantId,
        id,
        nextStatus,
        eventType,
        actorUserId,
      ),
    );
  }

  private async transitionStatusWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
    nextStatus: AccountStatus,
    eventType: string,
    actorUserId?: string,
  ): Promise<Account> {
    const account = await manager.findOne(Account, {
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException("Account not found.");
    }

    if (account.status === AccountStatus.ARCHIVED) {
      throw new BadRequestException("Archived accounts cannot change status.");
    }

    if (
      nextStatus === AccountStatus.INACTIVE ||
      nextStatus === AccountStatus.ARCHIVED
    ) {
      await this.assertAccountNotConfiguredAsSystemAccount(
        manager,
        tenantId,
        id,
      );
    }

    const previousStatus = account.status;
    account.status = nextStatus;

    const saved = await manager.save(Account, account);

    await this.accountingOutboxService.publish({
      manager,
      tenantId,
      aggregateId: saved.id,
      aggregateType: "account",
      eventType,
      actorUserId,
      payload: {
        accountId: saved.id,
        previousStatus,
        status: saved.status,
      },
    });

    return saved;
  }

  private assertNormalBalanceMatchesType(
    type: AccountType,
    normalBalance: AccountNormalBalance,
  ): void {
    const expected =
      type === AccountType.ASSET || type === AccountType.EXPENSE
        ? AccountNormalBalance.DEBIT
        : AccountNormalBalance.CREDIT;

    if (normalBalance !== expected) {
      throw new BadRequestException(
        `${type} accounts must have ${expected} normal balance.`,
      );
    }
  }

  private async assertAccountNotConfiguredAsSystemAccount(
    manager: EntityManager,
    tenantId: string,
    accountId: string,
  ): Promise<void> {
    const settings = await manager.findOne(AccountingSettings, {
      where: { tenantId },
    });

    if (!settings) {
      return;
    }

    const configuredFields = [
      ["cashAccountId", settings.cashAccountId],
      [
        "memberSavingsLiabilityAccountId",
        settings.memberSavingsLiabilityAccountId,
      ],
      ["loanReceivableAccountId", settings.loanReceivableAccountId],
      ["interestIncomeAccountId", settings.interestIncomeAccountId],
      ["penaltyIncomeAccountId", settings.penaltyIncomeAccountId],
    ];

    const match = configuredFields.find(([, configuredId]) => {
      return configuredId === accountId;
    });

    if (match) {
      throw new BadRequestException(
        `This account is currently configured as ${match[0]} and cannot be deactivated or archived.`,
      );
    }
  }
}