import { describe, expect, it } from "vitest";
import { toServerOnboarding } from "./onboardingSync";

describe("toServerOnboarding", () => {
  it("never sends body measurements to the account", () => {
    const out = toServerOnboarding({
      gender: "female",
      hasCompletedOnboarding: true,
      goals: ["strength"],
      fitnessLevel: 40,
      weightKg: 61,
      heightCm: 168,
      age: 29,
    });
    expect(out).not.toHaveProperty("weightKg");
    expect(out).not.toHaveProperty("heightCm");
    expect(out).not.toHaveProperty("age");
  });
  it("keeps the questionnaire answers and drops the local completion flag", () => {
    const out = toServerOnboarding({
      gender: "male",
      hasCompletedOnboarding: true,
      goals: ["muscle"],
      equipmentAccess: ["bodyweight"],
      selfAssessment: "beginner",
    });
    expect(out).toEqual({
      gender: "male",
      goals: ["muscle"],
      equipmentAccess: ["bodyweight"],
      selfAssessment: "beginner",
    });
  });
});
