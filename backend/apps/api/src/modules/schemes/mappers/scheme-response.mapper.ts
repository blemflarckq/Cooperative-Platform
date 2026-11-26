import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { ArchiveBlockers } from "../services/scheme-rules";

export class SchemeResponseMapper {
  /**
   * `archiveBlockers` is only passed for the single-scheme response, where
   * the page needs to say what stands in the way of archiving. The list
   * omits it rather than paying for two counts per row.
   */
  static toResponse(scheme: CooperativeScheme, archiveBlockers?: ArchiveBlockers) {
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
      ...(archiveBlockers ? { archiveBlockers } : {}),
    };
  }

  static toList(schemes: CooperativeScheme[]) {
    return schemes.map((scheme) => this.toResponse(scheme));
  }
}