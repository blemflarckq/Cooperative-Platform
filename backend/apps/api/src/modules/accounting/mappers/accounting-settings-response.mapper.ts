import { AccountingSettings } from "../entities/accounting-settings.entity";

export class AccountingSettingsResponseMapper {
  static toResponse(settings: AccountingSettings) {
    return {
      id: settings.id,
      tenantId: settings.tenantId,

      cashAccountId: settings.cashAccountId,
      memberSavingsLiabilityAccountId:
        settings.memberSavingsLiabilityAccountId,
      loanReceivableAccountId: settings.loanReceivableAccountId,
      interestIncomeAccountId: settings.interestIncomeAccountId,
      penaltyIncomeAccountId: settings.penaltyIncomeAccountId,
      strictPeriodEnforcement: settings.strictPeriodEnforcement,

      accounts: {
        cash: settings.cashAccount
          ? {
              id: settings.cashAccount.id,
              code: settings.cashAccount.code,
              name: settings.cashAccount.name,
              type: settings.cashAccount.type,
            }
          : null,

        memberSavingsLiability: settings.memberSavingsLiabilityAccount
          ? {
              id: settings.memberSavingsLiabilityAccount.id,
              code: settings.memberSavingsLiabilityAccount.code,
              name: settings.memberSavingsLiabilityAccount.name,
              type: settings.memberSavingsLiabilityAccount.type,
            }
          : null,

        loanReceivable: settings.loanReceivableAccount
          ? {
              id: settings.loanReceivableAccount.id,
              code: settings.loanReceivableAccount.code,
              name: settings.loanReceivableAccount.name,
              type: settings.loanReceivableAccount.type,
            }
          : null,

        interestIncome: settings.interestIncomeAccount
          ? {
              id: settings.interestIncomeAccount.id,
              code: settings.interestIncomeAccount.code,
              name: settings.interestIncomeAccount.name,
              type: settings.interestIncomeAccount.type,
            }
          : null,

        penaltyIncome: settings.penaltyIncomeAccount
          ? {
              id: settings.penaltyIncomeAccount.id,
              code: settings.penaltyIncomeAccount.code,
              name: settings.penaltyIncomeAccount.name,
              type: settings.penaltyIncomeAccount.type,
            }
          : null,
      },

      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}