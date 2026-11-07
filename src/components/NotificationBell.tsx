import { Bell } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useInAppNotifications } from "@/lib/inAppNotifications";

const ICON = { achievement: "🏆", equipment: "🏋️", info: "🔔" } as const;

function timeAgo(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Home screen bell: unread count + the in-app notification inbox. */
export function NotificationBell() {
  const items = useInAppNotifications((s) => s.items);
  const markAllRead = useInAppNotifications((s) => s.markAllRead);
  const clear = useInAppNotifications((s) => s.clear);
  const [open, setOpen] = useState(false);
  const unread = items.filter((i) => !i.read).length;

  return (
    <>
      <button
        type="button"
        className="relative w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-white hover:border-primary/50 hover:text-primary transition-smooth"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        data-ocid="home.notifications_button"
      >
        <Bell className="w-[20px] h-[20px]" />
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{
              background: "oklch(var(--primary))",
              color: "oklch(0.1 0 0)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) markAllRead();
        }}
      >
        <SheetContent
          side="right"
          className="w-[88vw] max-w-sm flex flex-col"
          data-ocid="home.notifications_sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
            {items.length === 0 ? (
              <p className="text-sm text-white/60 font-body mt-6 text-center">
                Nothing yet. Finish a workout and your achievements show up
                here.
              </p>
            ) : (
              items.map((i) => (
                <div
                  key={i.id}
                  className="rounded-xl px-3 py-2.5 flex gap-3"
                  style={{
                    background: i.read
                      ? "oklch(0.17 0.01 var(--neutral-hue))"
                      : "oklch(var(--primary) / 0.1)",
                    border: "1px solid oklch(0.28 0.01 var(--neutral-hue) / 0.6)",
                  }}
                >
                  <span className="text-base leading-none mt-0.5">
                    {ICON[i.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-sm text-white leading-snug">
                      {i.title}
                    </p>
                    {i.body && (
                      <p className="font-body text-xs text-white/70 leading-snug mt-0.5">
                        {i.body}
                      </p>
                    )}
                    <p className="font-body text-[11px] text-white/40 mt-1">
                      {timeAgo(i.at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="mx-4 mb-4 h-10 rounded-xl text-sm font-body text-white/70 border border-border/40"
            >
              Clear all
            </button>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
