import { describe, expect, it } from "vitest";
import { buildSessionRecord } from "@/lib/achievementSessionLog";
import { computeRecap, previousPeriod } from "@/lib/recap";

const NO_GEAR = { weightVest: false, resistanceBandLong: false, resistanceBandShort: false, rings: false };

function session(date: string, opts: { reps?: number; deck?: string; level?: string } = {}) {
  return buildSessionRecord({
    id: date,
    completedAt: new Date(date).getTime(),
    durationSeconds: 600,
    totalCardsInSession: 2,
    deckCategory: opts.deck ?? "UpperBody",
    deckDifficulty: opts.level ?? "Beginner",
    deckGender: "male",
    playedCards: [
      { rank: "5", suit: "Hearts", exercise: "Push-up", reps: opts.reps ?? 5 },
      { rank: "6", suit: "Spades", exercise: "Squat", reps: 6 },
    ],
    equipmentSnapshot: NO_GEAR,
    caloriesBurned: 40,
  });
}

describe("recap", () => {
  const log = [
    session("2026-10-30T10:00:00"),
    session("2026-11-02T09:00:00"),
    session("2026-11-03T18:00:00", { deck: "Custom", level: "Custom" }),
    session("2026-11-03T19:00:00", { deck: "Custom", level: "Custom" }),
    session("2026-03-10T12:00:00", { level: "Pro" }),
  ];

  it("monthly recap counts only that month, with a vs-last-month comparison", () => {
    const r = computeRecap(log, [new Date("2026-11-03T20:00:00").getTime()], {
      kind: "month",
      year: 2026,
      month: 10,
    });
    expect(r.workouts).toBe(3);
    expect(r.trainingDays).toBe(2);
    expect(r.longestDayRun).toBe(2);
    expect(r.reps).toBe(33);
    expect(r.minutes).toBe(30);
    expect(r.calories).toBe(120);
    expect(r.achievements).toBe(1);
    expect(r.topDeck).toBe("Custom decks");
    expect(r.previousWorkouts).toBe(1);
  });

  it("year in review adds month-by-month data and the best month", () => {
    const r = computeRecap(log, [], { kind: "year", year: 2026 });
    expect(r.workouts).toBe(5);
    expect(r.perMonth[10]).toBe(3);
    expect(r.perMonth[2]).toBe(1);
    expect(r.bestMonth).toBe("November");
    expect(r.proSessions).toBe(1);
    expect(r.exercisesTried).toBe(2);
  });

  it("previous period wraps the year", () => {
    expect(previousPeriod({ kind: "month", year: 2026, month: 0 })).toEqual({
      kind: "month",
      year: 2025,
      month: 11,
    });
  });
});
