// In-app notifications: a small banner at the top of the screen that never
// blocks anything (it disappears on its own, and a tap closes it), plus an
// inbox on the Home screen (the bell) that keeps the ones worth reading
// later, like achievements. Equipment tips are banner-only.
import { X } from "lucide-react";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InAppKind = "achievement" | "equipment" | "info";

export interface InAppItem {
  id: string;
  kind: InAppKind;
  title: string;
  body?: string;
  at: number;
  read: boolean;
}

interface InAppState {
  items: InAppItem[];
  add: (item: Pick<InAppItem, "kind" | "title" | "body">) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX_ITEMS = 50;

export const useInAppNotifications = create<InAppState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: [
            { ...item, id: crypto.randomUUID(), at: Date.now(), read: false },
            ...s.items,
          ].slice(0, MAX_ITEMS),
        })),
      markAllRead: () =>
        set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
    }),
    { name: "mbw_inapp_notifications" },
  ),
);

const ICON: Record<InAppKind, string> = {
  achievement: "🏆",
  equipment: "🏋️",
  info: "🔔",
};

export function InAppBanner({
  kind,
  title,
  body,
  onClose,
}: {
  kind: InAppKind;
  title: string;
  body?: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") onClose();
      }}
      tabIndex={-1}
      className="w-[min(92vw,400px)] rounded-2xl px-4 py-3 flex items-start gap-3 cursor-pointer"
      style={{
        background: "oklch(0.17 0.012 var(--neutral-hue) / 0.97)",
        border: "1px solid oklch(var(--primary) / 0.35)",
        boxShadow: "0 10px 30px oklch(0 0 0 / 0.5)",
      }}
      data-ocid={`inapp-banner.${kind}`}
    >
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">
        {ICON[kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-sm text-white leading-snug">
          {title}
        </p>
        {body && (
          <p className="font-body text-xs text-white/70 leading-snug mt-0.5">
            {body}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/60"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * Shows a top banner. `save` also keeps it in the Home inbox (default for
 * everything except equipment tips). A banner with the same `id` replaces
 * the previous one instead of stacking.
 */
export function notify({
  kind = "info",
  title,
  body,
  save = kind !== "equipment",
  duration = 4500,
  id,
}: {
  kind?: InAppKind;
  title: string;
  body?: string;
  save?: boolean;
  duration?: number;
  id?: string;
}) {
  if (save) useInAppNotifications.getState().add({ kind, title, body });
  toast.custom(
    (t) => (
      <InAppBanner
        kind={kind}
        title={title}
        body={body}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, id },
  );
}
