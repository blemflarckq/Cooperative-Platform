import { AccountingPeriod } from "../entities/accounting-period.entity";

export class AccountingPeriodResponseMapper {
  static toResponse(period: AccountingPeriod) {
    return {
      id: period.id,
      tenantId: period.tenantId,
      code: period.code,
      name: period.name,
      startsOn: period.startsOn,
      endsOn: period.endsOn,
      status: period.status,
      isClosed: period.isClosed,
      closedAt: period.closedAt,
      closedByUserId: period.closedByUserId,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  static toList(periods: AccountingPeriod[]) {
    return periods.map((period) => this.toResponse(period));
  }
}