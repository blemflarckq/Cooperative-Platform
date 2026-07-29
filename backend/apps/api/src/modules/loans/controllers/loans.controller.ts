import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { LoansService } from "../services/loans.service";
import { LoanDisbursementService } from "../services/loan-disbursement.service";
import { LoanRepaymentsService } from "../services/loan-repayments.service";
import { LoanRateEscalationService } from "../services/loan-rate-escalation.service";
import { RequestLoanDto } from "../dto/request-loan.dto";
import { PledgeLoanDto } from "../dto/pledge-loan.dto";
import { RecordRepaymentDto } from "../dto/record-repayment.dto";

/**
 * Every route here is scheme-scoped, not cycle-scoped — a member or
 * Treasurer never needs to know or supply a cycleId. LoansService
 * resolves "the current cycle" internally via
 * OperatingCyclesService.resolveCurrentCycle().
 */
@Controller()
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly loanDisbursementService: LoanDisbursementService,
    private readonly loanRepaymentsService: LoanRepaymentsService,
    private readonly loanRateEscalationService: LoanRateEscalationService,
  ) {}

  @Get("schemes/:schemeId/loans")
  @RequirePermissions("loan:read")
  async findAllForScheme(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
  ) {
    return this.loansService.findAllForScheme(tenantId, schemeId);
  }

  @Get("loans/:loanId")
  @RequirePermissions("loan:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("loanId") loanId: string,
  ) {
    return this.loansService.findOne(tenantId, loanId);
  }

  @Post("schemes/:schemeId/loans")
  @RequirePermissions("loan:request")
  async requestLoan(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: RequestLoanDto,
  ) {
    return this.loansService.requestLoan(tenantId, schemeId, dto, actorUserId);
  }

  @Post("loans/:loanId/pledges")
  @RequirePermissions("loan:pledge")
  async pledge(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("loanId") loanId: string,
    @Body() dto: PledgeLoanDto,
  ) {
    return this.loansService.pledge(tenantId, loanId, dto.pledgedAmount, actorUserId);
  }

  @Post("loans/:loanId/disburse")
  @RequirePermissions("loan:disburse")
  async disburse(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("loanId") loanId: string,
  ) {
    return this.loanDisbursementService.disburse(tenantId, loanId, actorUserId);
  }

  @Post("loans/:loanId/repayments")
  @RequirePermissions("loan:record-repayment")
  async recordRepayment(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("loanId") loanId: string,
    @Body() dto: RecordRepaymentDto,
  ) {
    return this.loanRepaymentsService.recordRepayment(
      tenantId,
      loanId,
      dto.amount,
      actorUserId,
    );
  }

  @Post("loans/:loanId/escalate-rate")
  @RequirePermissions("loan:escalate-rate")
  async escalateRate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("loanId") loanId: string,
  ) {
    return this.loanRateEscalationService.escalateOne(tenantId, loanId, actorUserId);
  }
}
