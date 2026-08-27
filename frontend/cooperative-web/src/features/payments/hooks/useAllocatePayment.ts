import { useMutation, useQueryClient } from "@tanstack/react-query";
import { allocatePayment } from "../api/payment-allocation.api";
import type { AllocatePaymentRequest } from "../types/payment-allocation.types";

export function useAllocatePayment(tenantUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordedPaymentId,
      payload,
    }: {
      recordedPaymentId: string;
      payload: AllocatePaymentRequest;
    }) => allocatePayment(recordedPaymentId, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-allocation", "unallocated", tenantUserId],
      });
    },
  });
}
