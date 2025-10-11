import { Toaster } from "./ui/sonner";

/**
 * ToasterProvider component that wraps Sonner Toaster
 * for use in Astro layouts
 */
export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          error: "border-destructive",
          success: "border-primary",
          warning: "border-accent",
          info: "border-muted",
        },
      }}
    />
  );
}
