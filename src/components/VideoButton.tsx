import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayCircle } from "lucide-react";

interface VideoButtonProps {
  url: string;
  className?: string;
}

export function VideoButton({ url, className }: VideoButtonProps) {
  const handleOpen = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleOpen}
      className={cn(
        "gap-1.5 font-body text-xs rounded-xl shrink-0",
        "border-primary/30 text-primary/80",
        "hover:border-primary/60 hover:text-primary hover:bg-primary/10",
        "transition-smooth",
        className,
      )}
      style={{
        boxShadow: "0 0 0 0 oklch(0.68 0.25 180 / 0)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 14px oklch(0.68 0.25 180 / 0.35)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 0 0 oklch(0.68 0.25 180 / 0)";
      }}
      data-ocid="video-button"
    >
      <PlayCircle className="w-3.5 h-3.5" />
      Tutorial
    </Button>
  );
}
