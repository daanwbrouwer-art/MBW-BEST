// Anti-cheat time validation (Prompt 15, Part 1). A session's data only
// counts toward achievements if the average time spent per card drawn
// meets this floor — fast enough to suggest cards were skipped without
// actually doing the reps.
export const MIN_SECONDS_PER_CARD = 3;

export function computeAvgTimePerCard(
  durationSeconds: number,
  cardsDrawn: number,
): number {
  if (cardsDrawn <= 0) return 0;
  return durationSeconds / cardsDrawn;
}

export function isSessionValid(
  durationSeconds: number,
  cardsDrawn: number,
): boolean {
  if (cardsDrawn <= 0) return false;
  return computeAvgTimePerCard(durationSeconds, cardsDrawn) >= MIN_SECONDS_PER_CARD;
}
