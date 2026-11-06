import { describe, expect, it } from "vitest";
import {
  formatParkPlace,
  parkDisplayName,
  parkEquipmentLabels,
  parkPinLabel,
} from "./parkLabels";

describe("formatParkPlace", () => {
  it("uses the enclosing park, else the street, plus the area", () => {
    expect(
      formatParkPlace({ park: "Wilhelminapark", road: "Parkweg", town: "Wageningen" }),
    ).toBe("Near Wilhelminapark, Wageningen");
    expect(formatParkPlace({ road: "Hoofdstraat", suburb: "Noord", city: "Utrecht" })).toBe(
      "Near Hoofdstraat, Utrecht",
    );
    expect(formatParkPlace({ road: "Hoofdstraat", suburb: "Noord" })).toBe(
      "Near Hoofdstraat, Noord",
    );
  });
  it("falls back to street only, district + town, or town only", () => {
    expect(formatParkPlace({ footway: "Dijkpad" })).toBe("Near Dijkpad");
    expect(formatParkPlace({ suburb: "Lozenets", city: "Sofia" })).toBe("In Lozenets, Sofia");
    expect(formatParkPlace({ city: "Sofia", country: "Bulgaria" })).toBe("In Sofia");
  });
  it("returns null when nothing useful is known", () => {
    expect(formatParkPlace({ country: "Bulgaria" })).toBeNull();
    expect(formatParkPlace(null)).toBeNull();
  });
});

describe("parkPinLabel", () => {
  it("names the pin with up to three equipment labels", () => {
    expect(parkPinLabel("Unnamed park", ["horizontal_bar;parallel_bars"])).toBe(
      "Outdoor workout spot: Pull-up bar, Parallel bars",
    );
    expect(parkPinLabel("Street Workout", [])).toBe("Street Workout");
  });
});

describe("parkDisplayName", () => {
  it("replaces the imported placeholder name", () => {
    expect(parkDisplayName("Unnamed Calisthenics Park")).toBe(
      "Outdoor workout spot",
    );
  });
  it("falls back for empty or missing names", () => {
    expect(parkDisplayName("")).toBe("Outdoor workout spot");
    expect(parkDisplayName("   ")).toBe("Outdoor workout spot");
    expect(parkDisplayName(null)).toBe("Outdoor workout spot");
  });
  it("keeps real names, trimmed", () => {
    expect(parkDisplayName("  Street Workout  ")).toBe("Street Workout");
  });
});

describe("parkEquipmentLabels", () => {
  it("translates OSM keys into plain names", () => {
    expect(parkEquipmentLabels(["horizontal_ladder", "horizontal_bar"])).toEqual(
      ["Monkey bars", "Pull-up bar"],
    );
  });
  it("splits combined values and removes duplicates", () => {
    expect(
      parkEquipmentLabels([
        "horizontal_bar;parallel_bars",
        "horizontal_bar, horizontal_ladder",
        "pull_up_bar",
      ]),
    ).toEqual(["Pull-up bar", "Parallel bars", "Monkey bars"]);
  });
  it("hides filler and tags it can't name", () => {
    expect(
      parkEquipmentLabels(["yes", "sign", "*", "lauko_treniruoklių_aikštelė"]),
    ).toEqual([]);
  });
  it("handles fitness_station= prefixes, spaces and case", () => {
    expect(
      parkEquipmentLabels(["fitness_station=chest_press", "Elliptical Trainer"]),
    ).toEqual(["Chest press", "Cross-trainer"]);
  });
  it("accepts null", () => {
    expect(parkEquipmentLabels(null)).toEqual([]);
  });
});
