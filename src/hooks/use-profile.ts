import type { UserProfile } from "@/backend";
import { useActor } from "@/hooks/use-local-actor";
import { useWorkoutStore } from "@/store/workout";
import { useQuery } from "@tanstack/react-query";

export function useProfile() {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["profile", guestMode],
    queryFn: async () => {
      if (guestMode) return null;
      if (!actor) return null;
      const result = await actor.getMyProfile();
      if (result && result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !guestMode && !!actor && !isFetching,
  });
}
