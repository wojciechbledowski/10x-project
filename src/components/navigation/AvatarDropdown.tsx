import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { I18nProvider, useI18n } from "@/lib/i18n/react";
import type { Language } from "@/lib/i18n/config";

interface AvatarDropdownProps {
  userName: string;
  userEmail?: string;
  lang?: Language;
}

/**
 * Dropdown menu for authenticated users
 * Shows user avatar with menu containing Profile and Logout options
 */
function AvatarDropdownInner({ userName, userEmail }: Omit<AvatarDropdownProps, "lang">) {
  const { t } = useI18n();

  // Get user initials for avatar
  const userInitials = (userName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="User menu"
        >
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName || "User"}</p>
            {userEmail && <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile" className="flex cursor-pointer items-center">
            <User className="mr-2 h-4 w-4" />
            <span>{t("nav.profile")}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/auth/logout" className="flex cursor-pointer items-center text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("auth.logout")}</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AvatarDropdown({ userName, userEmail, lang = "en" }: AvatarDropdownProps) {
  return (
    <I18nProvider lang={lang}>
      <AvatarDropdownInner userName={userName} userEmail={userEmail} />
    </I18nProvider>
  );
}
