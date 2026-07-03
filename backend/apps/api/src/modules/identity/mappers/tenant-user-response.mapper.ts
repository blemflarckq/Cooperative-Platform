import { TenantUser } from '../entities/tenant-user.entity';

export class TenantUserResponseMapper {
  static toResponse(entity: TenantUser) {
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
    };
  }
}