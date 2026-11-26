import { z } from "zod";

/** Names only — see UpdateTenantUserRequest. */
export const tenantUserSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(120, "That name is too long"),
  lastName: z.string().trim().min(1, "Enter a last name").max(120, "That name is too long"),
});

export type TenantUserFormValues = z.infer<typeof tenantUserSchema>;
