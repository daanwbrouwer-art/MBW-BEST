import { ensureSupabaseSession, supabase } from "@/lib/supabaseClient";
import type { EquipmentTier } from "@/types/equipment";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_TIER: EquipmentTier = "bodyweight";

function isEquipmentTier(
  value: string | null | undefined,
): value is EquipmentTier {
  return value === "bodyweight" || value === "basic" || value === "advanced";
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Reads/writes the current user's `preferred_equipment_tier` (Bodyweight /
 * Basic / Advanced) from the Supabase `profiles` table — drives the
 * equipment-suggestion chips shown on every workout card.
 *
 * Deliberately separate from the granular per-item EquipmentProfile toggles
 * in useOnboarding() (localStorage-only, used for card auto-substitution) —
 * this one is account-scoped on purpose, per the design doc, so the choice
 * follows the user across devices. Guests with no Supabase session yet read
 * as the "bodyweight" default; the first setTier() call transparently opens
 * an anonymous session (same convention as adding a park) so the choice
 * still persists rather than silently no-opping.
 */
export function useEquipmentTier() {
  const [tier, setTierState] = useState<EquipmentTier>(DEFAULT_TIER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("preferred_equipment_tier")
        .eq("id", userId)
        .single();
      if (!cancelled) {
        if (isEquipmentTier(data?.preferred_equipment_tier)) {
          setTierState(data.preferred_equipment_tier);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTier = useCallback(async (next: EquipmentTier) => {
    // Optimistic — the profile screen and every workout card's chips
    // should reflect the new tier immediately, not after a round trip.
    setTierState(next);
    const userId =
      (await getCurrentUserId()) ?? (await ensureSupabaseSession());
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ preferred_equipment_tier: next })
      .eq("id", userId);
  }, []);

  return { tier, loading, setTier };
}
