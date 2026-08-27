import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { PaymentAllocationService } from "../services/payment-allocation.service";
import { RecordPaymentDto } from "../dto/record-payment.dto";
import { AllocatePaymentDto } from "../dto/allocate-payment.dto";

@Controller()
export class PaymentAllocationController {
  constructor(
    private readonly paymentAllocationService: PaymentAllocationService,
  ) {}

  /**
   * Step 1 — staff only (payment:record: tenant_admin, treasurer,
   * secretary). Just captures that money arrived; no allocation decision
   * made here.
   */
  @Post("payments/record")
  @RequirePermissions("payment:record")
  async recordPayment(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.paymentAllocationService.recordPayment(tenantId, dto, actorUserId);
  }

  /**
   * What a member sees when they log in — their own recorded-but-
   * unallocated payments, waiting for them to decide where the money
   * goes. payment:allocate is granted broadly (every role, including
   * "member") since this is fundamentally self-service.
   */
  @Get("tenant-users/:tenantUserId/unallocated-payments")
  @RequirePermissions("payment:allocate")
  async getUnallocatedPayments(
    @TenantId() tenantId: string,
    @Param("tenantUserId") tenantUserId: string,
  ) {
    return this.paymentAllocationService.getUnallocatedPayments(tenantId, tenantUserId);
  }

  @Get("tenant-users/:tenantUserId/outstanding-obligations")
  @RequirePermissions("payment:allocate")
  async getOutstandingObligations(
    @TenantId() tenantId: string,
    @Param("tenantUserId") tenantUserId: string,
  ) {
    return this.paymentAllocationService.getOutstandingObligations(tenantId, tenantUserId);
  }

  /**
   * Step 2 — the payer's own action primarily; staff can call this too,
   * but the service enforces that only a staff role may allocate on
   * someone else's behalf (see PaymentAllocationService.assertIsStaff).
   */
  @Post("recorded-payments/:recordedPaymentId/allocate")
  @RequirePermissions("payment:allocate")
  async allocatePayment(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("recordedPaymentId") recordedPaymentId: string,
    @Body() dto: AllocatePaymentDto,
  ) {
    return this.paymentAllocationService.allocatePayment(
      tenantId,
      recordedPaymentId,
      dto,
      actorUserId,
    );
  }
}
