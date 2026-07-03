import { OperatingCycle } from "../entities/operating-cycle.entity";

export class OperatingCycleResponseMapper {
  static toResponse(cycle: OperatingCycle) {
    return {
      id: cycle.id,
      tenantId: cycle.tenantId,
      schemeId: cycle.schemeId,
      name: cycle.name,
      code: cycle.code,
      description: cycle.description,
      status: cycle.status,
      startsOn: cycle.startsOn,
      endsOn: cycle.endsOn,
      targetAmount: cycle.targetAmount,
      openedAt: cycle.openedAt,
      closedAt: cycle.closedAt,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
      scheme: cycle.scheme
        ? {
            id: cycle.scheme.id,
            name: cycle.scheme.name,
            code: cycle.scheme.code,
            status: cycle.scheme.status,
            cycleMode: cycle.scheme.cycleMode,
            contributionMode: cycle.scheme.contributionMode,
            loanMode: cycle.scheme.loanMode,
            payoutMode: cycle.scheme.payoutMode,
          }
        : undefined,
    };
  }

  static toList(cycles: OperatingCycle[]) {
    return cycles.map((cycle) => this.toResponse(cycle));
  }
}