import { useMutation, useQueryClient } from "@tanstack/react-query";
import { allocatePayment } from "../api/payment-allocation.api";
import type { AllocatePaymentRequest } from "../types/payment-allocation.types";

export function useAllocatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantUserId,
      payload,
    }: {
      tenantUserId: string;
      payload: AllocatePaymentRequest;
    }) => allocatePayment(tenantUserId, payload),

    onSuccess: async () => {
      // Broad invalidation — this single action can touch multiple loans
      // plus a contribution, spanning query keys we don't want to
      // enumerate one by one here.
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-allocation"] });
    },
  });
}
