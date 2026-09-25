import { DataSource } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { SchemeStatus } from "../../schemes/enums/scheme.enums";

export interface TenantSummaryCounts {
  activeMemberCount: number;
  activeSchemeCount: number;
}

/**
 * Both the admin and member dashboards show the same two tenant-wide
 * counts — one definition, not two independently written queries that
 * could drift (exactly the kind of duplication this whole session has
 * been actively removing elsewhere, not adding to here).
 */
export async function getTenantSummaryCounts(
  dataSource: DataSource,
  tenantId: string,
): Promise<TenantSummaryCounts> {
  const [activeMemberCount, activeSchemeCount] = await Promise.all([
    dataSource.getRepository(TenantUser).count({ where: { tenantId, isActive: true } }),
    dataSource
      .getRepository(CooperativeScheme)
      .count({ where: { tenantId, status: SchemeStatus.ACTIVE } }),
  ]);

  return { activeMemberCount, activeSchemeCount };
}
