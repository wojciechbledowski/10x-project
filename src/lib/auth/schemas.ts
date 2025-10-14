/**
 * Authentication Validation Schemas
 *
 * Shared Zod schemas for auth forms (client & server validation)
 * Aligned with auth-spec.md requirements
 */

import { z } from "zod";

/**
 * Password validation regex
 * Requires: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Email schema with custom error messages
 */
export const emailSchema = z.string().min(1, "auth.errors.emailRequired").email("auth.errors.invalidEmail");

/**
 * Password schema with complexity requirements
 */
export const passwordSchema = z
  .string()
  .min(1, "auth.errors.passwordRequired")
  .min(8, "auth.errors.passwordTooShort")
  .regex(PASSWORD_REGEX, "auth.errors.passwordComplexity");

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "auth.errors.passwordRequired"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema
 */
export const registerSchema = z
  .object({
    name: z.string().min(1, "auth.errors.nameRequired").max(100, "auth.errors.nameTooLong"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "auth.errors.confirmPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Password reset request schema
 */
export const resetRequestSchema = z.object({
  email: emailSchema,
});

export type ResetRequestFormData = z.infer<typeof resetRequestSchema>;

/**
 * Password reset schema (with token)
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "auth.errors.confirmPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Update password schema (requires current password)
 */
export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "auth.errors.currentPasswordRequired"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "auth.errors.confirmPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "auth.errors.passwordMismatch",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "auth.errors.newPasswordDifferent",
    path: ["newPassword"],
  });

export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
