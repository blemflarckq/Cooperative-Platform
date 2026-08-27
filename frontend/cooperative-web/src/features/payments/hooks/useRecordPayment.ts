import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordPayment } from "../api/payment-allocation.api";
import type { RecordPaymentRequest } from "../types/payment-allocation.types";

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecordPaymentRequest) => recordPayment(payload),
    onSuccess: async (payment) => {
      await queryClient.invalidateQueries({
        queryKey: ["payment-allocation", "unallocated", payment.tenantUserId],
      });
    },
  });
}
