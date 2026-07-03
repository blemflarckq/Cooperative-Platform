import { Body, Controller, Get, Put, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { AccountingSettingsService } from "../services/accounting-settings.service";
import { UpdateAccountingSettingsDto } from "../dto/settings/update-accounting-settings.dto";
import { AccountingSettingsResponseMapper } from "../mappers/accounting-settings-response.mapper";
import { ProvisionDefaultAccountsDto } from "../dto/settings/provision-default-accounts.dto";

@Controller("accounting-settings")
export class AccountingSettingsController {
  constructor(
    private readonly accountingSettingsService: AccountingSettingsService,
  ) {}

  @Get()
  @RequirePermissions("accounting_settings:read")
  async get(@TenantId() tenantId: string) {
    const settings = await this.accountingSettingsService.getOrCreate(tenantId);
    return AccountingSettingsResponseMapper.toResponse(settings);
  }

  @Put()
  @RequirePermissions("accounting_settings:update")
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: UpdateAccountingSettingsDto,
  ) {
    const settings = await this.accountingSettingsService.update(
      tenantId,
      dto,
      actorUserId,
    );

    return AccountingSettingsResponseMapper.toResponse(settings);
  }

  @Post("provision-defaults")
  @RequirePermissions("accounting_settings:update")
  async provisionDefaults(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: ProvisionDefaultAccountsDto,
  ) {
    const settings = await this.accountingSettingsService.provisionDefaults(
      tenantId,
      actorUserId,
      dto.cashAccountName,
    );

    return AccountingSettingsResponseMapper.toResponse(settings);
  }
}