import { Body, Controller, Post, Get, Headers, Res, HttpStatus } from "@nestjs/common";
import { type Response } from 'express';
import { AuthService, LoginResponse } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './current-user.decorator';
import { TenantUserInvitationsService } from '../../modules/identity/services/tenant-user-invitations.service';
import { TenantUsersService } from '../../modules/identity/services/tenant-users.service'
import { TenantId } from '../../common/tenancy/tenant-id.decorator';
import { AcceptInvitationDto } from '../../modules/identity/dto/accept-invitation.dto';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
//import { CreateTempPasswordUserDto } from '../../modules/identity/dto/create-temp-password-user.dto';


/**
 * Auth endpoints are intentionally small for Phase 1.
 * We'll extend later with refresh/logout/session tracking if needed.
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitationsService: TenantUserInvitationsService,
    private readonly tenantUsersService: TenantUsersService,
  ) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    const result = await this.auth.login(dto);
    //console.log('controller received result, sending to Postman', result.user.tenantName)
    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Res() res: Response) {
    const result = await this.auth.refresh(dto.refreshToken);
    console.log('Sending refresh results', result);
    //return result;
    res.status(HttpStatus.OK).json(result);
  }

  @Get('me')
  me(
    @CurrentUser('sub') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.auth.me(userId, tenantId);
  }


  @Public()
  @Post('accept-invitation')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.auth.changePassword({
      userId, 
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }
  

  
/*  @Post('temp-password')
  @RequirePermissions('tenant_users:create_temp_password')
  createTempPasswordUser(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Body() dto: CreateTempPasswordUserDto,
  ) {
    return this.tenantUsersService.createWithTemporaryPassword({
      tenantId,
      actorUserId,
      dto,
    });
  }
*/
}