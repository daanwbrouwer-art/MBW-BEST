import { describe, expect, it } from "vitest";
import { deckEquipment } from "@/data/deckEquipment";

describe("deckEquipment", () => {
  it("flags bars and benches only where the deck uses them", () => {
    expect(deckEquipment("UpperBody", "Pro", "female")).toContain("pull-up bar");
    expect(deckEquipment("UpperBody", "Pro", "female")).toContain("dip bars");
    expect(deckEquipment("LowerBody", "Beginner", "female")).toEqual(["bench or step"]);
    expect(deckEquipment("Core", "Beginner", "female")).not.toContain("dip bars");
  });
  it("prints every level for review", () => {
    for (const g of ["female", "male"] as const)
      for (const c of ["UpperBody", "LowerBody", "Core", "FullBody"] as const)
        for (const l of ["Beginner", "Advanced", "Pro"] as const)
          console.log(g, c, l, deckEquipment(c, l, g).join(", ") || "none");
  });
});
