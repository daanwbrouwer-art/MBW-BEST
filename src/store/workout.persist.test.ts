import { beforeEach, describe, expect, it } from "vitest";
import { useWorkoutStore } from "./workout";

const KEY = "mbw_workout_store";

describe("workout ids", () => {
  beforeEach(() => {
    useWorkoutStore.setState({ savedWorkoutId: null, recordedWorkoutId: null });
    useWorkoutStore.getState().reset();
  });

  it("gives every started workout a new uuid", () => {
    const { setWorkoutStartTime } = useWorkoutStore.getState();
    setWorkoutStartTime(Date.now());
    const first = useWorkoutStore.getState().workoutId;
    setWorkoutStartTime(Date.now());
    const second = useWorkoutStore.getState().workoutId;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });

  it("remembers which workout was saved and recorded, even after a reset", () => {
    const store = useWorkoutStore.getState();
    store.setWorkoutStartTime(Date.now());
    const id = useWorkoutStore.getState().workoutId!;
    store.markWorkoutSaved(id);
    store.markWorkoutRecorded(id);
    useWorkoutStore.getState().reset();
    const after = useWorkoutStore.getState();
    expect(after.workoutId).toBeNull();
    expect(after.savedWorkoutId).toBe(id);
    expect(after.recordedWorkoutId).toBe(id);
  });
});

describe("resuming after a reload", () => {
  const stored = (startedAgoMs: number) =>
    JSON.stringify({
      state: {
        guestMode: false,
        shuffledDeck: [{ id: "a" }],
        deckIndex: 1,
        totalCards: 10,
        isSummary: false,
        workoutStartTime: Date.now() - startedAgoMs,
        workoutId: "11111111-1111-4111-8111-111111111111",
        savedWorkoutId: "22222222-2222-4222-8222-222222222222",
      },
      version: 0,
    });

  it("restores a recent workout in progress", async () => {
    localStorage.setItem(KEY, stored(10 * 60 * 1000));
    await useWorkoutStore.persist.rehydrate();
    const s = useWorkoutStore.getState();
    expect(s.deckIndex).toBe(1);
    expect(s.totalCards).toBe(10);
    expect(s.workoutId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("drops a workout older than 6 hours but keeps the saved marker", async () => {
    useWorkoutStore.getState().reset();
    localStorage.setItem(KEY, stored(7 * 60 * 60 * 1000));
    await useWorkoutStore.persist.rehydrate();
    const s = useWorkoutStore.getState();
    expect(s.shuffledDeck).toEqual([]);
    expect(s.workoutStartTime).toBeNull();
    expect(s.savedWorkoutId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("accepts the old stored shape that only had guestMode", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { guestMode: true }, version: 0 }),
    );
    await useWorkoutStore.persist.rehydrate();
    const s = useWorkoutStore.getState();
    expect(s.guestMode).toBe(true);
    expect(s.shuffledDeck).toEqual([]);
  });

  it("doesn't count the time the app was closed as training time", async () => {
    const start = Date.now() - 60 * 60 * 1000; // started an hour ago
    const lastUsed = Date.now() - 50 * 60 * 1000; // app closed 50 min ago
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          shuffledDeck: [{ id: "a" }],
          deckIndex: 0,
          totalCards: 10,
          isSummary: false,
          workoutStartTime: start,
          lastActivityAt: lastUsed,
          workoutId: "33333333-3333-4333-8333-333333333333",
        },
        version: 0,
      }),
    );
    await useWorkoutStore.persist.rehydrate();
    const s = useWorkoutStore.getState();
    const trainedMs = Date.now() - (s.workoutStartTime ?? 0);
    expect(trainedMs).toBeGreaterThan(9 * 60 * 1000);
    expect(trainedMs).toBeLessThan(11 * 60 * 1000);
  });

  it("fixes the end time when the last card is done", () => {
    const store = useWorkoutStore.getState();
    store.reset();
    store.setWorkoutStartTime(Date.now());
    store.setIsSummary(true);
    const end = useWorkoutStore.getState().workoutEndTime;
    expect(end).not.toBeNull();
    store.setIsSummary(true);
    expect(useWorkoutStore.getState().workoutEndTime).toBe(end);
  });
});
