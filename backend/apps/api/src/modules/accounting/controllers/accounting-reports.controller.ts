import { Controller, Get, Query } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { AccountingReportsService } from "../services/accounting-reports.service";
import { TrialBalanceQueryDto } from "../dto/reports/trial-balance.query.dto";
import { Param } from "@nestjs/common";
import { AccountLedgerQueryDto } from "../dto/reports/account-ledger.query.dto";
import { AccountingSummaryQueryDto } from "../dto/reports/accounting-summary.query.dto";

@Controller("reports")
export class AccountingReportsController {
  constructor(
    private readonly accountingReportsService: AccountingReportsService,
  ) {}

  @Get("trial-balance")
  @RequirePermissions("report:trial_balance:read")
  getTrialBalance(
    @TenantId() tenantId: string,
    @Query() query: TrialBalanceQueryDto,
  ) {
    return this.accountingReportsService.getTrialBalance(tenantId, query);
  }

  @Get("accounts/:accountId/ledger")
  @RequirePermissions("report:account_ledger:read")
  getAccountLedger(
    @TenantId() tenantId: string,
    @Param("accountId") accountId: string,
    @Query() query: AccountLedgerQueryDto,
  ) {
    return this.accountingReportsService.getAccountLedger(
      tenantId,
      accountId,
      query,
    );
  }

  @Get("accounting-summary")
  @RequirePermissions("report:accounting_summary:read")
  getAccountingSummary(
    @TenantId() tenantId: string,
    @Query() query: AccountingSummaryQueryDto,
  ) {
    return this.accountingReportsService.getAccountingSummary(
      tenantId,
      query,
    );
  }
}