import { apiClient } from "@/lib/api/api-client";
import type {
  RecordedPayment,
  RecordPaymentRequest,
  OutstandingObligations,
  AllocatePaymentRequest,
  AllocatePaymentResult,
} from "../types/payment-allocation.types";

/** Step 1 — staff only. */
export async function recordPayment(
  payload: RecordPaymentRequest,
): Promise<RecordedPayment> {
  const response = await apiClient.post<RecordedPayment>("/payments/record", payload);
  return response.data;
}

export async function getUnallocatedPayments(
  tenantUserId: string,
): Promise<RecordedPayment[]> {
  const response = await apiClient.get<RecordedPayment[]>(
    `/tenant-users/${tenantUserId}/unallocated-payments`,
  );
  return response.data;
}

export async function getOutstandingObligations(
  tenantUserId: string,
): Promise<OutstandingObligations> {
  const response = await apiClient.get<OutstandingObligations>(
    `/tenant-users/${tenantUserId}/outstanding-obligations`,
  );
  return response.data;
}

/** Step 2 — the payer's own action primarily; staff may assist. */
export async function allocatePayment(
  recordedPaymentId: string,
  payload: AllocatePaymentRequest,
): Promise<AllocatePaymentResult> {
  const response = await apiClient.post<AllocatePaymentResult>(
    `/recorded-payments/${recordedPaymentId}/allocate`,
    payload,
  );
  return response.data;
}
