import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showIcon?: boolean;
  iconOnly?: boolean;
}

const iconSizes = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export function Logo({
  size = "md",
  className,
  showIcon = false,
  iconOnly = false,
}: LogoProps) {
  return (
    <div
      className={cn("flex items-center gap-2 select-none", className)}
      data-ocid="logo"
    >
      {(showIcon || iconOnly) && (
        <img
          src="/assets/images/mbw-logo-white-icon.png"
          alt="MyBodyWeight emblem"
          className={cn("object-contain shrink-0", iconSizes[size])}
        />
      )}
      {!iconOnly && (
        <span
          className={cn(
            "font-display font-black tracking-tight leading-none",
            textSizes[size],
          )}
        >
          <span className="text-foreground">My</span>
          <span className="text-primary">Body</span>
          <span className="text-foreground">Weight</span>
        </span>
      )}
    </div>
  );
}
