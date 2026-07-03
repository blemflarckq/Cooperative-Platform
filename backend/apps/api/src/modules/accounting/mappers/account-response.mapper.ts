import { Account } from "../entities/account.entity";

export class AccountResponseMapper {
  static toResponse(account: Account) {
    return {
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      description: account.description,
      type: account.type,
      normalBalance: account.normalBalance,
      status: account.status,
      isSystem: account.isSystem,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  static toList(accounts: Account[]) {
    return accounts.map((account) => this.toResponse(account));
  }
}