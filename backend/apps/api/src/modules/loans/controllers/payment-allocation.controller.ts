import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { PaymentAllocationService } from "../services/payment-allocation.service";
import { AllocatePaymentDto } from "../dto/allocate-payment.dto";

@Controller("tenant-users/:tenantUserId")
export class PaymentAllocationController {
  constructor(
    private readonly paymentAllocationService: PaymentAllocationService,
  ) {}

  @Get("outstanding-obligations")
  @RequirePermissions("contribution:create")
  async getOutstandingObligations(
    @TenantId() tenantId: string,
    @Param("tenantUserId") tenantUserId: string,
  ) {
    return this.paymentAllocationService.getOutstandingObligations(
      tenantId,
      tenantUserId,
    );
  }

  @Post("allocate-payment")
  @RequirePermissions("contribution:create")
  async allocatePayment(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("tenantUserId") tenantUserId: string,
    @Body() dto: AllocatePaymentDto,
  ) {
    return this.paymentAllocationService.allocatePayment(
      tenantId,
      tenantUserId,
      dto,
      actorUserId,
    );
  }
}
