import type { Exercise } from "@/backend";
import { useActor } from "@/hooks/use-local-actor";
import { useQuery } from "@tanstack/react-query";

export function useExerciseInfo(exerciseName: string | null | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Exercise | null>({
    queryKey: ["exercise", exerciseName],
    queryFn: async () => {
      if (!actor || !exerciseName || exerciseName.trim() === "") return null;
      try {
        return await actor.getExercise(exerciseName);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!exerciseName,
    staleTime: 1000 * 60 * 10,
  });
}
