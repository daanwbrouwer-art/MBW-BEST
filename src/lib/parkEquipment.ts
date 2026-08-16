// Shared between AddParkSheet (checklist) and ParkDetailSheet (tag display)
// so the two stay in sync — equipment values stored in parks.equipment are
// exactly these strings.
export const PARK_EQUIPMENT_OPTIONS = [
  "Pull-up bar",
  "Dip bars",
  "Monkey bars",
  "Parallel bars",
  "Rings",
  "Climbing rope",
  "Wall bars",
  "Balance beam",
] as const;

export type ParkEquipment = (typeof PARK_EQUIPMENT_OPTIONS)[number];
