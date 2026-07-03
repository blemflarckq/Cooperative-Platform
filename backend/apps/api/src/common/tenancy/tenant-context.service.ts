import { Injectable, Scope } from "@nestjs/common";

/**
 * TenantContextService holds the active tenantId for the current request.
 * Request-scoped provider ensures each HTTP request gets its own instance.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: string | string[] | null = null;

  setTenantId(id: string | string[]) {
    this.tenantId = id;
  }

  getTenantId(): string | string[] {
    if (!this.tenantId) throw new Error("Tenant context not initialized");
    return this.tenantId;
  }
}