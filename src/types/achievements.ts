export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

/**
 * Which real, already-tracked stat an achievement's progress is measured
 * against. Computed live by `src/lib/achievementEngine.ts` — nothing here
 * is persisted except the resulting unlocked/claimed state.
 */
export type AchievementMetric =
  | "cardsDrawnTotal"
  | "maxCardsInSession"
  | "fullDeckSessionsCount"
  | "kingCardsDrawnTotal"
  | "aceCardsDrawnTotal"
  | "jokerCardsDrawnTotal"
  | "royalFlushSessionsCount"
  | "twoOfSpadesTotal"
  | "firstCardIsSevenHearts"
  | "consecutiveDuplicateSessionsCount"
  | "totalReps"
  | "longestDayStreak"
  | "identicalSessionDayStreak"
  | "ghostDayStreak"
  | "validSessionsCount"
  | "fullDeckNoSkipCount"
  | "hasComebackGap"
  | "earlyBirdCount"
  | "nightOwlCount"
  | "lunchGrindCount"
  | "speedDemonCount"
  | "marathonerCount"
  | "graveyardShiftCount"
  | "consecutiveMondayWeeks"
  | "christmasSessionCount"
  | "newYearSessionCount"
  | "fridaySessionCount"
  | "patienceFlag"
  | "weightVestSessionCount"
  | "bandSessionCount"
  | "ringsFullSessionCount"
  | "uniqueDeckCategoriesCount"
  | "proDeckSessionCount"
  | "consecutiveSameDeckCount"
  | "minimalistSessionCount"
  | "referralSuccessCount"
  | "referredActiveFriendsCount"
  | "otherAchievementsUnlockedCount"
  | "totalSkipsExact"
  | "mirrorImageSessionCount";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  metric: AchievementMetric;
  /** Numeric goal — achievement unlocks once current_progress >= target (or === target when `exactMatch`). */
  target: number;
  /** Unit shown next to the progress numbers, e.g. "reps", "sessions", "King cards". */
  unitLabel: string;
  /** Not shown anywhere in the UI (name, icon, progress) until unlocked. */
  hidden: boolean;
  /** Unlock requires progress === target exactly, not >= target (only mt_02 "Superstitious"). */
  exactMatch?: boolean;
}

export type AchievementCategory =
  | "card-draw"
  | "special-cards"
  | "reps"
  | "streaks"
  | "sessions"
  | "equipment"
  | "time"
  | "social"
  | "secret";

export const RARITY_CONFIG: Record<
  AchievementRarity,
  {
    label: string;
    glowColor: string;
    glowClass: string;
    animationType:
      | "pop"
      | "slide-shine"
      | "particle-burst"
      | "screen-flash"
      | "cinematic";
  }
> = {
  common: {
    label: "Common",
    glowColor: "#9ca3af",
    glowClass: "glow-common",
    animationType: "pop",
  },
  uncommon: {
    label: "Uncommon",
    glowColor: "#22c55e",
    glowClass: "glow-uncommon",
    animationType: "slide-shine",
  },
  rare: {
    label: "Rare",
    glowColor: "#3b82f6",
    glowClass: "glow-rare",
    animationType: "particle-burst",
  },
  epic: {
    label: "Epic",
    glowColor: "#a855f7",
    glowClass: "glow-epic",
    animationType: "screen-flash",
  },
  legendary: {
    label: "Legendary",
    glowColor: "#f59e0b",
    glowClass: "glow-legendary",
    animationType: "cinematic",
  },
};

export const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; emoji: string }
> = {
  "card-draw": { label: "Card Drawing", emoji: "🃏" },
  "special-cards": { label: "Special Cards", emoji: "👑" },
  reps: { label: "Reps", emoji: "💪" },
  streaks: { label: "Streaks", emoji: "🔥" },
  sessions: { label: "Sessions", emoji: "⏱" },
  equipment: { label: "Equipment", emoji: "🎽" },
  time: { label: "Time", emoji: "⏰" },
  social: { label: "Social", emoji: "🤝" },
  secret: { label: "Secret", emoji: "❓" },
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ─── Card Drawing ─────────────────────────────────────────────────────
  {
    id: "cd_01",
    name: "First Draw",
    description: "Draw your very first card",
    rarity: "common",
    category: "card-draw",
    metric: "cardsDrawnTotal",
    target: 1,
    unitLabel: "cards",
    hidden: false,
  },
  {
    id: "cd_02",
    name: "On a Roll",
    description: "Draw 10 cards in a single session",
    rarity: "common",
    category: "card-draw",
    metric: "maxCardsInSession",
    target: 10,
    unitLabel: "cards",
    hidden: false,
  },
  {
    id: "cd_03",
    name: "Half the Deck",
    description: "Make it halfway through a deck in one session",
    rarity: "uncommon",
    category: "card-draw",
    metric: "maxCardsInSession",
    target: 26,
    unitLabel: "cards",
    hidden: false,
  },
  {
    id: "cd_04",
    name: "Full Deck",
    description: "Complete an entire 52-card deck in one session",
    rarity: "rare",
    category: "card-draw",
    metric: "fullDeckSessionsCount",
    target: 1,
    unitLabel: "full decks",
    hidden: false,
  },
  {
    id: "cd_05",
    name: "Deck Destroyer",
    description: "Complete 10 full decks across all sessions",
    rarity: "epic",
    category: "card-draw",
    metric: "fullDeckSessionsCount",
    target: 10,
    unitLabel: "full decks",
    hidden: false,
  },
  {
    id: "cd_06",
    name: "Card Shark",
    description: "Complete 50 full decks across all sessions",
    rarity: "legendary",
    category: "card-draw",
    metric: "fullDeckSessionsCount",
    target: 50,
    unitLabel: "full decks",
    hidden: false,
  },

  // ─── Special Cards ────────────────────────────────────────────────────
  {
    id: "sc_01",
    name: "Double or Nothing",
    description: "Draw your first King card",
    rarity: "uncommon",
    category: "special-cards",
    metric: "kingCardsDrawnTotal",
    target: 1,
    unitLabel: "King cards",
    hidden: false,
  },
  {
    id: "sc_02",
    name: "Cut in Half",
    description: "Draw your first Ace card",
    rarity: "uncommon",
    category: "special-cards",
    metric: "aceCardsDrawnTotal",
    target: 1,
    unitLabel: "Ace cards",
    hidden: false,
  },
  {
    id: "sc_03",
    name: "Wild Card",
    description: "Draw your first Joker challenge card",
    rarity: "uncommon",
    category: "special-cards",
    metric: "jokerCardsDrawnTotal",
    target: 1,
    unitLabel: "Joker cards",
    hidden: false,
  },
  {
    id: "sc_04",
    name: "King's Court",
    description: "Draw 10 King cards across all sessions",
    rarity: "rare",
    category: "special-cards",
    metric: "kingCardsDrawnTotal",
    target: 10,
    unitLabel: "King cards",
    hidden: false,
  },
  {
    id: "sc_05",
    name: "Ace Up Your Sleeve",
    description: "Draw 10 Ace cards across all sessions",
    rarity: "rare",
    category: "special-cards",
    metric: "aceCardsDrawnTotal",
    target: 10,
    unitLabel: "Ace cards",
    hidden: false,
  },
  {
    id: "sc_06",
    name: "Joker's Wild",
    description: "Draw 10 Joker cards across all sessions",
    rarity: "rare",
    category: "special-cards",
    metric: "jokerCardsDrawnTotal",
    target: 10,
    unitLabel: "Joker cards",
    hidden: false,
  },
  {
    id: "sc_07",
    name: "Royal Flush",
    description:
      "Draw a King, Queen, Jack, Ace, and Joker all in the same session",
    rarity: "epic",
    category: "special-cards",
    metric: "royalFlushSessionsCount",
    target: 1,
    unitLabel: "sessions",
    hidden: true,
  },
  {
    id: "sc_08",
    name: "Unlucky",
    description: "Draw the 2 of Spades 10 times across all sessions",
    rarity: "rare",
    category: "special-cards",
    metric: "twoOfSpadesTotal",
    target: 10,
    unitLabel: "draws",
    hidden: true,
  },
  {
    id: "sc_09",
    name: "Lucky Number",
    description: "Draw the 7 of Hearts as your very first card ever",
    rarity: "epic",
    category: "special-cards",
    metric: "firstCardIsSevenHearts",
    target: 1,
    unitLabel: "",
    hidden: true,
  },
  {
    id: "sc_10",
    name: "Déjà Vu",
    description: "Draw the exact same card twice in a row in a single session",
    rarity: "rare",
    category: "special-cards",
    metric: "consecutiveDuplicateSessionsCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },

  // ─── Rep Completion ───────────────────────────────────────────────────
  {
    id: "rc_01",
    name: "First Blood",
    description: "Complete your first rep",
    rarity: "common",
    category: "reps",
    metric: "totalReps",
    target: 1,
    unitLabel: "reps",
    hidden: false,
  },
  {
    id: "rc_02",
    name: "Century",
    description: "Complete 100 total reps",
    rarity: "common",
    category: "reps",
    metric: "totalReps",
    target: 100,
    unitLabel: "reps",
    hidden: false,
  },
  {
    id: "rc_03",
    name: "Grinder",
    description: "Complete 1,000 total reps",
    rarity: "uncommon",
    category: "reps",
    metric: "totalReps",
    target: 1000,
    unitLabel: "reps",
    hidden: false,
  },
  {
    id: "rc_04",
    name: "Iron Will",
    description: "Complete 10,000 total reps",
    rarity: "rare",
    category: "reps",
    metric: "totalReps",
    target: 10_000,
    unitLabel: "reps",
    hidden: false,
  },
  {
    id: "rc_05",
    name: "Unstoppable",
    description: "Complete 50,000 total reps",
    rarity: "epic",
    category: "reps",
    metric: "totalReps",
    target: 50_000,
    unitLabel: "reps",
    hidden: false,
  },
  {
    id: "rc_06",
    name: "Legend",
    description: "Complete 100,000 total reps",
    rarity: "legendary",
    category: "reps",
    metric: "totalReps",
    target: 100_000,
    unitLabel: "reps",
    hidden: false,
  },

  // ─── Streaks ──────────────────────────────────────────────────────────
  {
    id: "st_01",
    name: "Just Getting Started",
    description: "Complete a 3-day streak",
    rarity: "common",
    category: "streaks",
    metric: "longestDayStreak",
    target: 3,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_02",
    name: "Week Warrior",
    description: "Complete a 7-day streak",
    rarity: "uncommon",
    category: "streaks",
    metric: "longestDayStreak",
    target: 7,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_03",
    name: "Two Week Grind",
    description: "Complete a 14-day streak",
    rarity: "uncommon",
    category: "streaks",
    metric: "longestDayStreak",
    target: 14,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_04",
    name: "Monthly Warrior",
    description: "Complete a 30-day streak",
    rarity: "rare",
    category: "streaks",
    metric: "longestDayStreak",
    target: 30,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_05",
    name: "Dedicated",
    description: "Complete a 60-day streak",
    rarity: "epic",
    category: "streaks",
    metric: "longestDayStreak",
    target: 60,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_06",
    name: "Obsessed",
    description: "Complete a 90-day streak",
    rarity: "legendary",
    category: "streaks",
    metric: "longestDayStreak",
    target: 90,
    unitLabel: "days",
    hidden: false,
  },
  {
    id: "st_07",
    name: "Groundhog Day",
    description:
      "Complete the exact same deck and card count 7 days in a row",
    rarity: "epic",
    category: "streaks",
    metric: "identicalSessionDayStreak",
    target: 7,
    unitLabel: "days",
    hidden: true,
  },
  {
    id: "st_08",
    name: "Ghost",
    description:
      "Open the app every day for a week without completing a single workout",
    rarity: "uncommon",
    category: "streaks",
    metric: "ghostDayStreak",
    target: 7,
    unitLabel: "days",
    hidden: true,
  },

  // ─── Session Milestones ───────────────────────────────────────────────
  {
    id: "sm_01",
    name: "Rookie",
    description: "Complete your first session",
    rarity: "common",
    category: "sessions",
    metric: "validSessionsCount",
    target: 1,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_02",
    name: "Getting Serious",
    description: "Complete 10 sessions",
    rarity: "common",
    category: "sessions",
    metric: "validSessionsCount",
    target: 10,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_03",
    name: "Committed",
    description: "Complete 25 sessions",
    rarity: "uncommon",
    category: "sessions",
    metric: "validSessionsCount",
    target: 25,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_04",
    name: "Veteran",
    description: "Complete 50 sessions",
    rarity: "rare",
    category: "sessions",
    metric: "validSessionsCount",
    target: 50,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_05",
    name: "Elite",
    description: "Complete 100 sessions",
    rarity: "epic",
    category: "sessions",
    metric: "validSessionsCount",
    target: 100,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_06",
    name: "Hall of Fame",
    description: "Complete 250 sessions",
    rarity: "legendary",
    category: "sessions",
    metric: "validSessionsCount",
    target: 250,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "sm_07",
    name: "Perfectionist",
    description: "Complete a Full Deck without skipping a single exercise",
    rarity: "rare",
    category: "sessions",
    metric: "fullDeckNoSkipCount",
    target: 1,
    unitLabel: "sessions",
    hidden: true,
  },
  {
    id: "sm_08",
    name: "Comeback Kid",
    description: "Return to training after a 30-day absence",
    rarity: "uncommon",
    category: "sessions",
    metric: "hasComebackGap",
    target: 1,
    unitLabel: "",
    hidden: true,
  },

  // ─── Time-Based ───────────────────────────────────────────────────────
  {
    id: "tb_01",
    name: "Early Bird",
    description: "Complete a workout before 7:00 AM",
    rarity: "uncommon",
    category: "time",
    metric: "earlyBirdCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "tb_02",
    name: "Night Owl",
    description: "Complete a workout after 22:00",
    rarity: "uncommon",
    category: "time",
    metric: "nightOwlCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "tb_03",
    name: "Lunch Grind",
    description: "Complete a workout between 12:00–13:00",
    rarity: "common",
    category: "time",
    metric: "lunchGrindCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "tb_04",
    name: "Speed Demon",
    description:
      "Complete a 20-card session in under 10 minutes (must still pass time validation)",
    rarity: "rare",
    category: "time",
    metric: "speedDemonCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "tb_05",
    name: "Marathoner",
    description: "Spend over 60 minutes in a single session",
    rarity: "uncommon",
    category: "time",
    metric: "marathonerCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "tb_06",
    name: "The Graveyard Shift",
    description: "Complete a workout between 00:00 and 04:00 AM",
    rarity: "epic",
    category: "time",
    metric: "graveyardShiftCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },
  {
    id: "tb_07",
    name: "Monday Motivation",
    description: "Complete a workout every Monday for 4 consecutive weeks",
    rarity: "rare",
    category: "time",
    metric: "consecutiveMondayWeeks",
    target: 4,
    unitLabel: "Mondays",
    hidden: true,
  },
  {
    id: "tb_08",
    name: "No Days Off",
    description: "Complete a workout on December 25th",
    rarity: "epic",
    category: "time",
    metric: "christmasSessionCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },
  {
    id: "tb_09",
    name: "New Year New Me",
    description: "Complete a workout on January 1st",
    rarity: "epic",
    category: "time",
    metric: "newYearSessionCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },
  {
    id: "tb_10",
    name: "Friday Feeling",
    description: "Complete 10 workouts on a Friday",
    rarity: "rare",
    category: "time",
    metric: "fridaySessionCount",
    target: 10,
    unitLabel: "Fridays",
    hidden: true,
  },
  {
    id: "tb_11",
    name: "Patience",
    description: "Stay on the warm-up screen for 60 seconds without starting",
    rarity: "uncommon",
    category: "time",
    metric: "patienceFlag",
    target: 1,
    unitLabel: "",
    hidden: true,
  },

  // ─── Equipment ────────────────────────────────────────────────────────
  {
    id: "eq_01",
    name: "Suited Up",
    description: "Complete a workout with a weighted vest equipped",
    rarity: "common",
    category: "equipment",
    metric: "weightVestSessionCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "eq_02",
    name: "Band Together",
    description: "Complete 10 sessions using a resistance band",
    rarity: "uncommon",
    category: "equipment",
    metric: "bandSessionCount",
    target: 10,
    unitLabel: "sessions",
    hidden: false,
  },
  {
    id: "eq_03",
    name: "Ring Master",
    description: "Complete a full session using gymnastic rings",
    rarity: "rare",
    category: "equipment",
    metric: "ringsFullSessionCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "eq_04",
    name: "Jack of All Decks",
    description: "Complete a session in every available deck category",
    rarity: "rare",
    category: "equipment",
    metric: "uniqueDeckCategoriesCount",
    target: 4,
    unitLabel: "categories",
    hidden: false,
  },
  {
    id: "eq_05",
    name: "Explorer",
    description: "Play a Pro deck for the first time",
    rarity: "uncommon",
    category: "equipment",
    metric: "proDeckSessionCount",
    target: 1,
    unitLabel: "",
    hidden: false,
  },
  {
    id: "eq_06",
    name: "Creature of Habit",
    description: "Complete 10 sessions with the exact same deck",
    rarity: "rare",
    category: "equipment",
    metric: "consecutiveSameDeckCount",
    target: 10,
    unitLabel: "sessions",
    hidden: true,
  },
  {
    id: "eq_07",
    name: "The Minimalist",
    description:
      "Complete a full session where all cards belong to only 2 different exercises",
    rarity: "rare",
    category: "equipment",
    metric: "minimalistSessionCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },

  // ─── Social & Referral ────────────────────────────────────────────────
  {
    id: "so_01",
    name: "Spread the Word",
    description: "Refer your first friend who completes registration",
    rarity: "uncommon",
    category: "social",
    metric: "referralSuccessCount",
    target: 1,
    unitLabel: "friends",
    hidden: false,
  },
  {
    id: "so_02",
    name: "Team Captain",
    description: "Refer 5 friends who each complete at least one workout",
    rarity: "rare",
    category: "social",
    metric: "referredActiveFriendsCount",
    target: 5,
    unitLabel: "friends",
    hidden: false,
  },
  {
    id: "so_03",
    name: "Ambassador",
    description: "Refer 10 friends",
    rarity: "epic",
    category: "social",
    metric: "referralSuccessCount",
    target: 10,
    unitLabel: "friends",
    hidden: false,
  },

  // ─── Meta & Secret ────────────────────────────────────────────────────
  {
    id: "mt_01",
    name: "The Collector",
    description: "Unlock 20 other achievements",
    rarity: "legendary",
    category: "secret",
    metric: "otherAchievementsUnlockedCount",
    target: 20,
    unitLabel: "achievements",
    hidden: true,
  },
  {
    id: "mt_02",
    name: "Superstitious",
    description:
      "Skip exactly 13 cards across all sessions (not more, not less)",
    rarity: "epic",
    category: "secret",
    metric: "totalSkipsExact",
    target: 13,
    unitLabel: "skips",
    hidden: true,
    exactMatch: true,
  },
  {
    id: "mt_03",
    name: "Mirror Image",
    description:
      "Draw a matching number in all 4 suits in a single session (e.g. 7♠ 7♥ 7♦ 7♣)",
    rarity: "legendary",
    category: "secret",
    metric: "mirrorImageSessionCount",
    target: 1,
    unitLabel: "",
    hidden: true,
  },
];
