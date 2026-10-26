import { z } from "zod";
import { COURIERS, ROLES } from "./types";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const inspectionSchema = z
  .object({
    result: z.enum(["pass", "fail"]),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.result === "fail" && !value.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "A note is required when inspection fails",
      });
    }
  });

export const shipSchema = z
  .object({
    courier: z.enum(COURIERS),
    courierOther: z.string().optional(),
    tracking_number: z
      .string()
      .min(6, "Tracking number must be 6–30 characters")
      .max(30, "Tracking number must be 6–30 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Letters and digits only"),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.courier === "Other" && !value.courierOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courierOther"],
        message: "Enter the courier name",
      });
    }
  });

export const inviteSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(ROLES),
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
});

export const adminActionSchema = z.object({
  action: z.enum(["reinspect", "resolve"]),
  note: z.string().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type InspectionValues = z.infer<typeof inspectionSchema>;
export type ShipValues = z.infer<typeof shipSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;
