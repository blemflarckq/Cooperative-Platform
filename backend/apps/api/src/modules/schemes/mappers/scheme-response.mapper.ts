import { CooperativeScheme } from "../entities/cooperative-scheme.entity";

export class SchemeResponseMapper {
  static toResponse(scheme: CooperativeScheme) {
    return {
      id: scheme.id,
      tenantId: scheme.tenantId,
      name: scheme.name,
      code: scheme.code,
      description: scheme.description,
      status: scheme.status,
      cycleMode: scheme.cycleMode,
      contributionMode: scheme.contributionMode,
      loanMode: scheme.loanMode,
      payoutMode: scheme.payoutMode,
      isActive: scheme.isActive,
      activatedAt: scheme.activatedAt,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt,
    };
  }

  static toList(schemes: CooperativeScheme[]) {
    return schemes.map((scheme) => this.toResponse(scheme));
  }
}