import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/react";

interface AuthFormShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText?: string;
  footerLink?: {
    text: string;
    href: string;
  };
}

/**
 * Wrapper component for auth forms with consistent layout and styling
 * Used across login, register, and password reset pages
 */
export function AuthFormShell({ title, subtitle, children, footerText, footerLink }: AuthFormShellProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Form Container */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">{children}</div>

        {/* Footer Link */}
        {footerText && footerLink && (
          <p className="text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <a href={footerLink.href} className="font-medium text-primary hover:underline">
              {footerLink.text}
            </a>
          </p>
        )}

        {/* Legal Links */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground">
            {t("legal.privacy")}
          </a>
          <span>•</span>
          <a href="/terms" className="hover:text-foreground">
            {t("legal.terms")}
          </a>
        </div>
      </div>
    </div>
  );
}
