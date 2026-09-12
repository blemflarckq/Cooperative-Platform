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

  /**
   * Non-throwing check for callers that need to know "is there a tenant
   * here at all" before deciding whether to act — the audit interceptor
   * being the case that motivated this. Public, pre-tenant routes
   * (login, register, select-tenant, create-tenant, OAuth, set-mobile,
   * and any future one) never have tenant context set, and that's
   * correct, not an error condition for a caller that's prepared to
   * check first.
   */
  hasTenantId(): boolean {
    return this.tenantId !== null;
  }
}