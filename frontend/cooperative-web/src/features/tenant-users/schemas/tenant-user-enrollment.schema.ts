import { z } from "zod";
import {
  isValidInternationalMobile,
  normalizeInternationalMobile,
} from "@/lib/formatting/phone";

export const tenantUserEnrollmentSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    email: z.email("Enter a valid email address"),
    
    mobile: z
      .string()
      .trim()
      .min(1, "Mobile number is required")
      .transform((value) => normalizeInternationalMobile(value))
      .refine((value) => isValidInternationalMobile(value), {
        message: "Enter a valid mobile number with country code, e.g. +26658000000",
      }),
    
    enrollmentMethod: z.enum(["invitation", "temporary-password"]),
    temporaryPassword: z.string().optional(),
    roleIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    if (values.enrollmentMethod === "temporary-password") {
      if (!values.temporaryPassword || values.temporaryPassword.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message: "Temporary password must be at least 8 characters",
        });
      }
    }
  });

export type TenantUserEnrollmentFormValues = z.infer<
  typeof tenantUserEnrollmentSchema
>;