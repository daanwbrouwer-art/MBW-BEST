import { useLocation } from "@/hooks/use-location";
import { motion } from "motion/react";

interface LocationPermissionSheetProps {
  /**
   * Called once the user has made a choice — `granted` reflects whether
   * permission actually ended up granted (false for "Not now", and false if
   * the OS/browser prompt itself was denied).
   */
  onClose: (granted: boolean) => void;
}

/**
 * Contextual, bottom-anchored permission primer — NOT an onboarding page.
 * Mount this the first time a screen actually needs the user's location
 * (parks map, nearby-people), never at app launch; see useLocation() in
 * src/hooks/use-location.ts for the underlying permission calls.
 * Styled consistent with the full-screen PaywallModal (same color tokens,
 * border, shadow), but anchored to the bottom edge as a sheet.
 */
export function LocationPermissionSheet({
  onClose,
}: LocationPermissionSheetProps) {
  const { requestPermission, isRequesting } = useLocation();

  const handleAllow = async () => {
    const granted = await requestPermission();
    onClose(granted);
  };

  const handleNotNow = () => {
    onClose(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.92)" }}
      data-ocid="location-permission.sheet"
      onClick={handleNotNow}
    >
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className="w-full max-w-[430px] rounded-t-3xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          borderBottom: "none",
          boxShadow: "0 -20px 60px oklch(0 0 0 / 0.6)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-3 pb-8">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-6"
            style={{ background: "oklch(0.4 0.01 260)" }}
          />

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "oklch(0.68 0.25 180 / 0.18)" }}
          >
            <span className="text-2xl" aria-hidden="true">
              📍
            </span>
          </div>

          <h2 className="font-display font-black text-xl text-white text-center leading-tight mb-2">
            Find parks and training partners near you
          </h2>
          <p className="text-sm text-white/70 font-body text-center mb-7">
            MyBodyWeight uses your location to show nearby calisthenics parks
            and other people training close by. You can turn this off anytime.
          </p>

          <button
            type="button"
            onClick={handleAllow}
            disabled={isRequesting}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mb-3"
            data-ocid="location-permission.allow_button"
          >
            {isRequesting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Requesting...
              </span>
            ) : (
              "Allow location access"
            )}
          </button>
          <button
            type="button"
            onClick={handleNotNow}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
            data-ocid="location-permission.dismiss_button"
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
