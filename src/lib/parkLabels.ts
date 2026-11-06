// Turns imported OpenStreetMap park data into something readable.
//
// Most parks came from OSM with no name ("Unnamed Calisthenics Park") and
// with raw `fitness_station` tags: machine-style keys ("horizontal_ladder"),
// several in one value ("horizontal_bar;parallel_bars"), filler ("yes",
// "sign") and free text in many languages. We show only the tags we can name
// in plain English and hide the rest.

const UNNAMED = /^\s*unnamed\b/i;

export const UNNAMED_PARK_LABEL = "Outdoor workout spot";

/** True when the park has no real name of its own. */
export function isUnnamedPark(name: string | null | undefined): boolean {
  return !name || !name.trim() || UNNAMED.test(name);
}

/** The park's display name, with a friendly fallback for unnamed parks. */
export function parkDisplayName(name: string | null | undefined): string {
  if (isUnnamedPark(name)) return UNNAMED_PARK_LABEL;
  return (name as string).trim();
}

/** The accessible name of a park's map pin. */
export function parkPinLabel(
  name: string | null | undefined,
  equipment: readonly string[] | null | undefined,
): string {
  const labels = parkEquipmentLabels(equipment).slice(0, 3);
  const base = parkDisplayName(name);
  return labels.length > 0 ? `${base}: ${labels.join(", ")}` : base;
}

/** The parts of a Nominatim reverse-geocode `address` we use. */
export type PlaceAddress = Partial<Record<string, string>>;

const STREET_KEYS = ["road", "pedestrian", "footway", "path", "square"];
const DISTRICT_KEYS = ["neighbourhood", "quarter", "suburb", "city_district"];
const TOWN_KEYS = ["village", "town", "city", "municipality"];

/**
 * A short place for an unnamed park, e.g. "Near Hoofdstraat, Wageningen":
 * the enclosing park if OSM names one, else the street, plus the town;
 * without either, the district and town ("In Lozenets, Sofia").
 * Null when the address has none of these.
 */
export function formatParkPlace(address: PlaceAddress | null | undefined): string | null {
  if (!address) return null;
  const pick = (keys: string[]) =>
    keys.map((k) => address[k]?.trim()).find((v): v is string => !!v);
  const spot = address.park?.trim() || address.leisure?.trim() || pick(STREET_KEYS);
  const district = pick(DISTRICT_KEYS);
  const town = pick(TOWN_KEYS);
  const join = (a: string, b: string | undefined) => (b && b !== a ? `${a}, ${b}` : a);
  if (spot) return `Near ${join(spot, town ?? district)}`;
  if (district) return `In ${join(district, town)}`;
  if (town) return `In ${town}`;
  return null;
}

const LABELS: Record<string, string> = {
  horizontal_bar: "Pull-up bar",
  horizontal_bars: "Pull-up bar",
  pull_up_bar: "Pull-up bar",
  pull_up_bars: "Pull-up bar",
  pull_up: "Pull-up bar",
  "pull-up_bar": "Pull-up bar",
  "pull-up": "Pull-up bar",
  mid_high_horizontal_bar: "Pull-up bar",
  "mid-high_horizontal_bar": "Pull-up bar",
  horizontal_ladder: "Monkey bars",
  monkey_bars: "Monkey bars",
  parallel_bars: "Parallel bars",
  parallel_bar: "Parallel bars",
  paralell_bars: "Parallel bars",
  parrallel_bars: "Parallel bars",
  "p-bars": "Parallel bars",
  dip_station: "Dip bars",
  dip_bars: "Dip bars",
  dip_bench: "Dip bars",
  dips: "Dip bars",
  rings: "Rings",
  gymnast_rings: "Rings",
  wall_bars: "Wall bars",
  "push-up": "Push-up bars",
  push_up: "Push-up bars",
  push_up_bars: "Push-up bars",
  parallettes: "Push-up bars",
  "sit-up": "Sit-up bench",
  sit_up: "Sit-up bench",
  abs_bench: "Sit-up bench",
  captains_chair: "Leg-raise station",
  leg_raise: "Leg-raise station",
  hyperextension: "Back-extension bench",
  balance_beam: "Balance beam",
  box: "Plyo box",
  "jump-box": "Plyo box",
  climbing_pole: "Climbing pole",
  climbing_rope: "Climbing rope",
  stepping_stone: "Stepping stones",
  stepping_stones: "Stepping stones",
  stairs: "Stairs",
  stretch_bars: "Stretching bars",
  slackline: "Slackline",
  battling_ropes: "Battle ropes",
  air_walker: "Air walker",
  elliptical_trainer: "Cross-trainer",
  cross_trainer: "Cross-trainer",
  exercise_bike: "Exercise bike",
  rower: "Rower",
  chest_press: "Chest press",
  leg_press: "Leg press",
  pull_down: "Lat pull-down",
  ski_swing: "Ski swing",
  ab_twist: "Waist twister",
  trampoline: "Trampoline",
};

/** Readable equipment labels for a park, deduplicated, in a stable order. */
export function parkEquipmentLabels(tags: readonly string[] | null | undefined): string[] {
  const labels = new Set<string>();
  for (const raw of tags ?? []) {
    for (const piece of raw.split(/[;,]/)) {
      const key = piece
        .trim()
        .toLowerCase()
        .replace(/^fitness_station=/, "")
        .replace(/\s+/g, "_");
      const label = LABELS[key];
      if (label) labels.add(label);
    }
  }
  return [...labels];
}
