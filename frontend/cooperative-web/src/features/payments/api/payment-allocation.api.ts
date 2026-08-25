import { apiClient } from "@/lib/api/api-client";
import type {
  OutstandingObligations,
  AllocatePaymentRequest,
  AllocatePaymentResult,
} from "../types/payment-allocation.types";

export async function getOutstandingObligations(
  tenantUserId: string,
): Promise<OutstandingObligations> {
  const response = await apiClient.get<OutstandingObligations>(
    `/tenant-users/${tenantUserId}/outstanding-obligations`,
  );
  return response.data;
}

export async function allocatePayment(
  tenantUserId: string,
  payload: AllocatePaymentRequest,
): Promise<AllocatePaymentResult> {
  const response = await apiClient.post<AllocatePaymentResult>(
    `/tenant-users/${tenantUserId}/allocate-payment`,
    payload,
  );
  return response.data;
}
