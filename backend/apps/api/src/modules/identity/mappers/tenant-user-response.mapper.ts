import { TenantUser } from '../entities/tenant-user.entity';
import { maskMobile } from '../../../common/utils/mask-mobile';

export class TenantUserResponseMapper {
  static toResponse(entity: TenantUser, schemeNames: string[] = []) {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      userId: entity.userId,
      isActive: entity.isActive,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      user: entity.user
        ? {
            id: entity.user.id,
            email: entity.user.email,
            firstName: entity.user.firstName,
            lastName: entity.user.lastName,
            // Masked here, on the server — this endpoint is readable by
            // every member (user:read), so the raw number must never be
            // in the response at all, not merely hidden by the UI.
            mobileMasked: maskMobile(entity.user.mobile),
            isActive: entity.user.isActive,
          }
        : null,
      roles:
        entity.roles?.map((tur) => ({
          id: tur.role?.id,
          name: tur.role?.name,
          code: tur.role?.code,
          description: tur.role?.description,
        })) ?? [],
      schemeNames,
    };
  }
}
