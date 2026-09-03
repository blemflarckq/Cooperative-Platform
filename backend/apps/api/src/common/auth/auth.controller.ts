import { Body, Controller, Post, Get, Headers, Res, HttpStatus } from "@nestjs/common";
import { type Response } from 'express';
import { AuthService, AuthResult, LoginResponse } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SelectTenantDto } from "./dto/select-tenant.dto";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { Public } from "./public.decorator";
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './current-user.decorator';
import { TenantUserInvitationsService } from '../../modules/identity/services/tenant-user-invitations.service';
import { TenantUsersService } from '../../modules/identity/services/tenant-users.service'
import { AcceptInvitationDto } from '../../modules/identity/dto/accept-invitation.dto';

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitationsService: TenantUserInvitationsService,
    private readonly tenantUsersService: TenantUsersService,
  ) {}

  /**
   * No tenant slug required — identity alone. Returns one of three
   * shapes (see AuthResult): straight in, pick a tenant, or no tenant
   * yet. The frontend branches on `status`.
   */
  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  /**
   * Second step for the multi-tenant case — exchanges a pre-auth token
   * plus a chosen tenant for a real session.
   */
  @Public()
  @Post("select-tenant")
  async selectTenant(@Body() dto: SelectTenantDto): Promise<LoginResponse> {
    return this.auth.selectTenant(dto.preAuthToken, dto.tenantId);
  }

  /**
   * Setup, step one — exchanges a pre-auth token (no tenant yet) plus a
   * chosen name for a brand new tenant, landing the caller inside it as
   * its admin.
   */
  @Public()
  @Post("create-tenant")
  async createTenant(@Body() dto: CreateTenantDto): Promise<LoginResponse> {
    return this.auth.createTenant(dto.preAuthToken, dto.name);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Res() res: Response) {
    const result = await this.auth.refresh(dto.refreshToken);
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
}