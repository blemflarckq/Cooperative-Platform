import { Body, Controller, Post, Get, Headers, Req, Res, UseGuards, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { type Response, type Request } from 'express';
import { AuthService, AuthResult, LoginResponse } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { SelectTenantDto } from "./dto/select-tenant.dto";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { OAuthCompleteDto } from "./dto/oauth-complete.dto";
import { Public } from "./public.decorator";
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './current-user.decorator';
import { TenantUserInvitationsService } from '../../modules/identity/services/tenant-user-invitations.service';
import { TenantUsersService } from '../../modules/identity/services/tenant-users.service'
import { AcceptInvitationDto } from '../../modules/identity/dto/accept-invitation.dto';
import { getOptionalEnv } from '../../config/env';
import type { OAuthProfileResult } from './google.strategy';

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

  @Public()
  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
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

  // ---- OAuth (Google, Facebook) ----
  //
  // The initiate routes just trigger Passport's redirect to the
  // provider's consent screen — no body needed here. The callback
  // routes are where Passport has already validated the provider's
  // response and populated req.user via the strategy's validate();
  // from there, resolveOAuthLogin runs the exact same find-or-create +
  // tenant-resolution path email login uses. The result is handed to
  // the frontend as a short-lived one-time code via redirect, never as
  // real tokens sitting in a URL.

  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleAuth() {
    // Empty — the guard alone triggers the redirect to Google.
  }

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as OAuthProfileResult;
    const result = await this.auth.resolveOAuthLogin(profile);
    const code = await this.auth.issueOAuthResultCode(result);
    const frontendUrl = getOptionalEnv("FRONTEND_URL", "http://localhost:5173");
    res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
  }

  @Public()
  @Get("facebook")
  @UseGuards(AuthGuard("facebook"))
  facebookAuth() {
    // Empty — the guard alone triggers the redirect to Facebook.
  }

  @Public()
  @Get("facebook/callback")
  @UseGuards(AuthGuard("facebook"))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as OAuthProfileResult;
    const result = await this.auth.resolveOAuthLogin(profile);
    const code = await this.auth.issueOAuthResultCode(result);
    const frontendUrl = getOptionalEnv("FRONTEND_URL", "http://localhost:5173");
    res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
  }

  /**
   * The frontend's /oauth/callback page calls this with the code from
   * the redirect to get the real AuthResult — normal POST body, never a
   * URL, and the code is single-purpose and expires in 60 seconds.
   */
  @Public()
  @Post("oauth-complete")
  async oauthComplete(@Body() dto: OAuthCompleteDto): Promise<AuthResult> {
    return this.auth.completeOAuth(dto.code);
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