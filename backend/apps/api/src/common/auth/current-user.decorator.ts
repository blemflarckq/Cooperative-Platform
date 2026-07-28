import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

/**
 * Custom decorator to extract the active Tenant ID from the request.
 * Expects a Guard or Interceptor to have previously validated and 
 * attached the tenantId to the request object.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // We look for 'tenantId' which we will attach in the Guard below
    const currentUser = request.user.sub;

    if (!currentUser) {
      throw new InternalServerErrorException(
        'This request has not been authenticated.'
      );
    }

    return currentUser;
  },
);