import { z } from "zod";

export const tenantUserSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  email: z.email("Enter a valid email address"),
});

export type TenantUserFormValues = z.infer<typeof tenantUserSchema>;