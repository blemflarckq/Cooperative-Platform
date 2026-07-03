import { Controller, Get, Param, Query } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { SavingsStatementsService } from "../services/savings-statements.service";
import { SavingsStatementQueryDto } from "../dto/statements/savings-statement.query.dto";

@Controller()
export class SavingsStatementsController {
  constructor(
    private readonly savingsStatementsService: SavingsStatementsService,
  ) {}

  @Get("tenant-users/:tenantUserId/savings-statement")
  @RequirePermissions("savings_statement:read")
  getMemberSavingsStatement(
    @TenantId() tenantId: string,
    @Param("tenantUserId") tenantUserId: string,
    @Query() query: SavingsStatementQueryDto,
  ) {
    return this.savingsStatementsService.getMemberSavingsStatement(
      tenantId,
      tenantUserId,
      query,
    );
  }

  @Get("cycles/:cycleId/savings-summary")
  @RequirePermissions("savings_summary:read")
  getCycleSavingsSummary(
    @TenantId() tenantId: string,
    @Param("cycleId") cycleId: string,
    @Query() query: SavingsStatementQueryDto,
  ) {
    return this.savingsStatementsService.getCycleSavingsSummary(
      tenantId,
      cycleId,
      query,
    );
  }
}