import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

/**
 * Custom decorator to extract the active Tenant ID from the request.
 * Expects a Guard or Interceptor to have previously validated and 
 * attached the tenantId to the request object.
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // We look for 'tenantId' which we will attach in the Guard below
    const tenantId = request.user.tenantId;

    if (!tenantId) {
      throw new InternalServerErrorException(
        'TenantId decorator used but no tenant context found. Ensure TenantContextGuard is applied.'
      );
    }

    return tenantId;
  },
);