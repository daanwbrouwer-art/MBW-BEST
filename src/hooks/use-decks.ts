import { useActor } from "@/hooks/use-local-actor";
import { useWorkoutStore } from "@/store/workout";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";
import type { Deck } from "@/types/workout";
import { useQuery } from "@tanstack/react-query";

export function useDecks() {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const { actor, isFetching } = useActor();

  return useQuery<Deck[]>({
    queryKey: ["decks", guestMode],
    queryFn: async () => {
      if (guestMode) return [];
      if (!actor) return [];
      return actor.getDecks();
    },
    enabled: !guestMode && !!actor && !isFetching,
  });
}

export function useDeck(id: bigint | null) {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["deck", id?.toString(), guestMode],
    queryFn: async () => {
      if (guestMode) return null;
      if (!actor || id === null) return null;
      return actor.getDeck(id);
    },
    enabled: !guestMode && !!actor && !isFetching && id !== null,
  });
}

/** Filter decks client-side by category + difficulty label convention: "<Category> <Difficulty>" */
export function useDeckByFilter(
  category: DeckCategory | null,
  difficulty: DeckDifficulty | null,
) {
  const { data: decks = [], ...rest } = useDecks();

  const deck =
    decks.find((d) => {
      const nameLower = d.name.toLowerCase();
      const catMatch = category
        ? nameLower.includes(
            category
              .toLowerCase()
              .replace("upperbody", "upper body")
              .replace("lowerbody", "lower body")
              .replace("fullbody", "full body"),
          )
        : true;
      const diffMatch = difficulty
        ? nameLower.includes(difficulty.toLowerCase())
        : true;
      return catMatch && diffMatch;
    }) ?? null;

  return { deck, ...rest };
}
