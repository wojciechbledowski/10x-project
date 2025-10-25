/**
 * Auth Schemas Unit Tests
 *
 * Tests for authentication validation schemas including login, registration,
 * and password reset forms.
 */

import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
  resetRequestSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  type LoginFormData,
  type RegisterFormData,
  type ResetRequestFormData,
  type ResetPasswordFormData,
  type UpdatePasswordFormData,
} from "../schemas";

describe("Auth Schemas", () => {
  describe("emailSchema", () => {
    it("should accept valid email addresses", () => {
      const validEmails = ["user@example.com", "test.email+tag@gmail.com", "user@subdomain.example.org", "a@b.co"];

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
        expect(result.data).toBe(email);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "invalid",
        "@example.com",
        "user@",
        "user.example.com",
        "user@.com",
        "user..user@example.com",
      ];

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("auth.errors.invalidEmail");
      });
    });

    it("should reject empty string", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.emailRequired");
    });

    it("should reject non-string types", () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      invalidInputs.forEach((input) => {
        const result = emailSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("passwordSchema", () => {
    it("should accept valid passwords meeting complexity requirements", () => {
      const validPasswords = ["Password123", "MySecurePass1", "Complex!Pass2", "Str0ngP@ssw0rd"];

      validPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
        expect(result.data).toBe(password);
      });
    });

    it("should reject passwords shorter than 8 characters", () => {
      const shortPasswords = ["Pass1", "Short", "123"];

      shortPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordTooShort");
      });
    });

    it("should reject passwords without uppercase letters", () => {
      const passwords = ["password123", "lowercaseonly"];

      passwords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordComplexity");
      });
    });

    it("should reject passwords without lowercase letters", () => {
      const passwords = ["PASSWORD123", "UPPERCASEONLY"];

      passwords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordComplexity");
      });
    });

    it("should reject passwords without numbers", () => {
      const passwords = ["PasswordOnly", "NoNumbersHere"];

      passwords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordComplexity");
      });
    });

    it("should reject empty passwords", () => {
      const result = passwordSchema.safeParse("");
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordRequired");
    });

    it("should reject non-string types", () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      invalidInputs.forEach((input) => {
        const result = passwordSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const validData: LoginFormData = {
        email: "user@example.com",
        password: "ValidPass123",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "invalid-email",
        password: "ValidPass123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.invalidEmail");
    });

    it("should reject empty password", () => {
      const invalidData = {
        email: "user@example.com",
        password: "",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordRequired");
    });

    it("should reject missing email field", () => {
      const invalidData = {
        password: "ValidPass123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Required");
    });

    it("should reject missing password field", () => {
      const invalidData = {
        email: "user@example.com",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Required");
    });

    it("should allow extra properties (not strict)", () => {
      const invalidData = {
        email: "user@example.com",
        password: "ValidPass123",
        extraField: "allowed",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
    });
  });

  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const validData: RegisterFormData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject name shorter than 1 character", () => {
      const invalidData = {
        name: "",
        email: "john@example.com",
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.nameRequired");
    });

    it("should reject name longer than 100 characters", () => {
      const longName = "a".repeat(101);
      const invalidData = {
        name: longName,
        email: "john@example.com",
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.nameTooLong");
    });

    it("should reject invalid email", () => {
      const invalidData = {
        name: "John Doe",
        email: "invalid-email",
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.invalidEmail");
    });

    it("should reject weak password", () => {
      const invalidData = {
        name: "John Doe",
        email: "john@example.com",
        password: "weak",
        confirmPassword: "weak",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordTooShort");
    });

    it("should reject mismatched passwords", () => {
      const invalidData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
        confirmPassword: "DifferentPass123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordMismatch");
    });

    it("should reject missing confirmPassword", () => {
      const invalidData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
        confirmPassword: "",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.confirmPasswordRequired");
    });
  });

  describe("resetRequestSchema", () => {
    it("should accept valid email for password reset request", () => {
      const validData: ResetRequestFormData = {
        email: "user@example.com",
      };

      const result = resetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "invalid-email",
      };

      const result = resetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.invalidEmail");
    });

    it("should reject missing email", () => {
      const invalidData = {};

      const result = resetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Required");
    });
  });

  describe("resetPasswordSchema", () => {
    it("should accept valid password reset data", () => {
      const validData: ResetPasswordFormData = {
        password: "NewSecurePass123",
        confirmPassword: "NewSecurePass123",
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject weak password", () => {
      const invalidData = {
        password: "weak",
        confirmPassword: "weak",
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordTooShort");
    });

    it("should reject mismatched passwords", () => {
      const invalidData = {
        password: "NewSecurePass123",
        confirmPassword: "DifferentPass123",
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordMismatch");
    });

    it("should reject missing confirmPassword", () => {
      const invalidData = {
        password: "NewSecurePass123",
        confirmPassword: "",
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.confirmPasswordRequired");
    });
  });

  describe("updatePasswordSchema", () => {
    it("should accept valid password update data", () => {
      const validData: UpdatePasswordFormData = {
        currentPassword: "CurrentPass123",
        newPassword: "NewSecurePass123",
        confirmNewPassword: "NewSecurePass123",
      };

      const result = updatePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject weak new password", () => {
      const invalidData = {
        currentPassword: "CurrentPass123",
        newPassword: "weak",
        confirmNewPassword: "weak",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordTooShort");
    });

    it("should reject mismatched new passwords", () => {
      const invalidData = {
        currentPassword: "CurrentPass123",
        newPassword: "NewSecurePass123",
        confirmNewPassword: "DifferentPass123",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["confirmNewPassword"]);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.passwordMismatch");
    });

    it("should reject same current and new password", () => {
      const invalidData = {
        currentPassword: "SamePassword123",
        newPassword: "SamePassword123",
        confirmNewPassword: "SamePassword123",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["newPassword"]);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.newPasswordDifferent");
    });

    it("should reject missing current password", () => {
      const invalidData = {
        currentPassword: "",
        newPassword: "NewSecurePass123",
        confirmNewPassword: "NewSecurePass123",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("auth.errors.currentPasswordRequired");
    });
  });
});
