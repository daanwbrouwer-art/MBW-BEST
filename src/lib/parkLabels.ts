// Turns imported OpenStreetMap park data into something readable.
//
// Most parks came from OSM with no name ("Unnamed Calisthenics Park") and
// with raw `fitness_station` tags: machine-style keys ("horizontal_ladder"),
// several in one value ("horizontal_bar;parallel_bars"), filler ("yes",
// "sign") and free text in many languages. We show only the tags we can name
// in plain English and hide the rest.

const UNNAMED = /^\s*unnamed\b/i;

/** The park's display name, with a friendly fallback for unnamed parks. */
export function parkDisplayName(name: string | null | undefined): string {
  if (!name || !name.trim() || UNNAMED.test(name)) return "Outdoor workout spot";
  return name.trim();
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
