"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Top of the screen, below the status bar: never over the bottom
      // buttons/navigation. A close button on every toast.
      position="top-center"
      offset={{ top: "calc(12px + env(safe-area-inset-top))" }}
      mobileOffset={{ top: "calc(12px + env(safe-area-inset-top))" }}
      closeButton
      visibleToasts={3}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
