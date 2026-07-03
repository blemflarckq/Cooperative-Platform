import {
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';
import { TenantUserInvitationsService } from '../services/tenant-user-invitations.service';
import { InviteTenantUserDto } from '../dto/invite-tenant-user.dto';

import { TenantId } from '../../../common/tenancy/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/rbac/require-permissions.decorator';
import { TenantUserResponseMapper } from '../mappers/tenant-user-response.mapper';

@Controller('tenant-users/invitations')
export class TenantUserInvitationsController {
  constructor(
    private readonly invitationsService: TenantUserInvitationsService,
  ) {}

  @Post()
  @RequirePermissions('user:create')
  invite(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Body() dto: InviteTenantUserDto,
  ) {
    console.log("The request from the frontend has the following", dto);
    return this.invitationsService.inviteTenantUser({
      tenantId,
      actorUserId,
      dto,
    });
  }
  
  @Post(':invitationId/revoke')
  @RequirePermissions('user:create')
  revoke(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationsService.revokeInvitation({
      tenantId,
      actorUserId,
      invitationId,
    });
  }
}