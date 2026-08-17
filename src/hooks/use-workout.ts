import { CardCount } from "@/backend";
import {
  UPPER_BODY_BEGINNER_ASSETS,
  resolveExerciseIllustration,
} from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import { estimateCardCalories } from "@/lib/calories";
import type { LocalCard, LocalSessionCard } from "@/store/workout";
import { useWorkoutStore } from "@/store/workout";
import type { EquipmentProfile } from "@/types/user";
import type {
  DeckCategory,
  DeckDifficulty,
  JokerChallenge,
} from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

// ─── Card Deck Builder ────────────────────────────────────────────────────────

function randChallenge(): JokerChallenge {
  return "DeadHang30" as JokerChallenge;
}
function randSingleLegWallSitHold(): number {
  return Math.floor(Math.random() * 46) + 15;
}

type SuitKey = "Hearts" | "Spades" | "Clubs" | "Diamonds";
export type WorkoutGender = "male" | "female";

const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "Ace",
  "King",
  "Queen",
];

// Each suit maps to 4 exercises (one per suit) with male/female variants.
// The exercise at index 0 is assigned to Hearts, 1→Spades, 2→Clubs, 3→Diamonds.
// male/female may be a simple 4-tuple (string[]), an empty array (cleared deck),
// or a rich DeckExerciseConfig (per-card mapping). Empty arrays are valid for
// cleared decks (e.g. male Upper Body).
interface DeckExerciseSet {
  male: string[] | DeckExerciseConfig;
  female: string[] | DeckExerciseConfig;
}

// --- Rich per-card exercise config (used for LB Beginner and future decks) ---

export interface SuitExerciseEntry {
  exerciseName: string;
  /** Omitted (with illustrationComingSoon: true) when no dedicated or
   * accurate photo exists yet for this exercise. */
  imagePath?: string;
  eachLeg?: boolean;
  eachSide?: boolean;
  holdSeconds?: number;
  isIsometric?: boolean;
  reps?: number;
  specialInstruction?: string;
  /** If set, this card only appears as-is when the user owns this equipment. */
  requiresEquipment?: keyof EquipmentProfile;
  /** Bodyweight-friendly stand-in used when requiresEquipment isn't met. */
  substitute?: {
    exerciseName: string;
    imagePath: string;
    specialInstruction?: string;
  };
  /** True when this exercise has no accurate illustration yet — rendering
   * shows an "Illustration coming soon" placeholder instead of a photo
   * (rather than a misleading reused/approximate image). */
  illustrationComingSoon?: boolean;
}

export interface SuitConfig2 {
  cardMap: Record<number, SuitExerciseEntry>;
  queen: SuitExerciseEntry;
  defaultImagePath: string;
}

export interface JokerComboStep {
  reps: number;
  exerciseName: string;
  eachLeg?: boolean;
  /** Explicit photo for this combo step — takes priority over the
   * keyword-based resolveExerciseIllustration() fallback so the Joker's
   * mini-illustration grid shows the same dedicated per-tier photo as the
   * exercise's real card elsewhere in the deck. */
  imagePath?: string;
}

export interface DeckExerciseConfig {
  suits: Record<string, SuitConfig2>;
  joker?: {
    exerciseName: string;
    imagePath: string;
    comboList: JokerComboStep[];
  };
  jokerCount?: number;
  /** Optional dedicated illustration for Ace (×2 previous) modifier cards. */
  aceImagePath?: string;
  /** Optional dedicated illustration for King (÷2 previous) modifier cards. */
  kingImagePath?: string;
}

/** Returns true when the entry contains a rich DeckExerciseConfig (not a simple 4-tuple).
 *  Checks both male and female — a cleared male (empty array) with a rich female
 *  still counts as a rich config deck. */
function isRichConfig(
  entry: DeckExerciseSet | Record<string, DeckExerciseConfig>,
): entry is Record<string, DeckExerciseConfig> {
  const m = (entry as Record<string, DeckExerciseConfig | string[]>).male;
  const f = (entry as Record<string, DeckExerciseConfig | string[]>).female;
  const isRich = (v: unknown): boolean =>
    !!v && typeof v === "object" && !Array.isArray(v);
  return isRich(m) || isRich(f);
}

// 12-deck exercise data: category → difficulty → exercise set
// Simple decks use DeckExerciseSet; rich decks use { male: DeckExerciseConfig, female: DeckExerciseConfig }.
const DECK_EXERCISES: Record<
  DeckCategory,
  Record<DeckDifficulty, DeckExerciseSet | Record<string, DeckExerciseConfig>>
> = {
  UpperBody: {
    Beginner: {
      male: {
        suits: {
          // Spades — Push-up family (Standard / Wide / Incline / Queen=Negative)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Standard Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
                eachLeg: false,
              },
              3: {
                exerciseName: "Standard Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
                eachLeg: false,
              },
              4: {
                exerciseName: "Wide Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.widePushUp,
                eachLeg: false,
              },
              5: {
                exerciseName: "Standard Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
                eachLeg: false,
              },
              6: {
                exerciseName: "Wide Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.widePushUp,
                eachLeg: false,
              },
              7: {
                exerciseName: "Incline Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.inclinePushUp,
                eachLeg: false,
                specialInstruction: "Hands on elevated surface",
              },
              8: {
                exerciseName: "Standard Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
                eachLeg: false,
              },
              9: {
                exerciseName: "Wide Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.widePushUp,
                eachLeg: false,
              },
              10: {
                exerciseName: "Incline Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.inclinePushUp,
                eachLeg: false,
                specialInstruction: "Hands on elevated surface",
              },
              11: {
                exerciseName: "Standard Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
                eachLeg: false,
              },
              12: {
                exerciseName: "Wide Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.widePushUp,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Push-up Negative",
              imagePath: UPPER_BODY_BEGINNER_ASSETS.negativePushUp,
              reps: 6,
              specialInstruction:
                "Push-up Negative - 6 reps, 5-second descent each",
            },
            defaultImagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
          },
          // Hearts — Shoulder push family (Shoulder Tap / Pike Hold / Queen=Pike Hold)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              3: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              4: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              5: {
                exerciseName: "Pike Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.pikeHold,
                isIsometric: true,
                eachLeg: false,
                holdSeconds: 20,
                specialInstruction:
                  "Pike Hold - hold top pike position for 20 seconds",
              },
              6: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              7: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              8: {
                exerciseName: "Pike Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.pikeHold,
                isIsometric: true,
                eachLeg: false,
                holdSeconds: 20,
                specialInstruction:
                  "Pike Hold - hold top pike position for 20 seconds",
              },
              9: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              10: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
              11: {
                exerciseName: "Pike Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.pikeHold,
                isIsometric: true,
                eachLeg: false,
                holdSeconds: 20,
                specialInstruction:
                  "Pike Hold - hold top pike position for 20 seconds",
              },
              12: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Pike Hold",
              imagePath: UPPER_BODY_BEGINNER_ASSETS.pikeHold,
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "Pike Hold - hold top pike position for 20 seconds",
            },
            defaultImagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
          },
          // Diamonds — Pull/hold family (Superman Hold / Incline Row / Horizontal Row / Queen=Row Hold)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Superman Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.supermanHold,
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              3: {
                exerciseName: "Incline Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body at 45 deg",
              },
              4: {
                exerciseName: "Horizontal Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body parallel",
              },
              5: {
                exerciseName: "Superman Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.supermanHold,
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              6: {
                exerciseName: "Incline Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body at 45 deg",
              },
              7: {
                exerciseName: "Horizontal Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body parallel",
              },
              8: {
                exerciseName: "Superman Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.supermanHold,
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              9: {
                exerciseName: "Incline Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body at 45 deg",
              },
              10: {
                exerciseName: "Horizontal Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body parallel",
              },
              11: {
                exerciseName: "Superman Hold",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.supermanHold,
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              12: {
                exerciseName: "Incline Row",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
                eachLeg: false,
                specialInstruction: "Body at 45 deg",
              },
            },
            queen: {
              exerciseName: "Row Hold",
              imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
              isIsometric: true,
              reps: 5,
              specialInstruction:
                "Row Hold - 5 reps with 2-second pause at top each rep",
            },
            defaultImagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
          },
          // Clubs — Dip family (Bench Dip / Elevated Bench Dip / Tricep Push-up / Queen=Bench Dip Slow Negative)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
              },
              3: {
                exerciseName: "Tricep Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
                eachLeg: false,
              },
              4: {
                exerciseName: "Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
              },
              5: {
                exerciseName: "Elevated Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
                specialInstruction: "Feet also elevated",
              },
              6: {
                exerciseName: "Tricep Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
                eachLeg: false,
              },
              7: {
                exerciseName: "Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
              },
              8: {
                exerciseName: "Elevated Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
                specialInstruction: "Feet also elevated",
              },
              9: {
                exerciseName: "Tricep Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
                eachLeg: false,
              },
              10: {
                exerciseName: "Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
              },
              11: {
                exerciseName: "Elevated Bench Dip",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
                eachLeg: false,
                specialInstruction: "Feet also elevated",
              },
              12: {
                exerciseName: "Tricep Push-up",
                imagePath: UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Bench Dip Slow Negative",
              imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
              reps: 5,
              specialInstruction:
                "Bench Dip Slow Negative - 5 reps, 5-second descent each",
            },
            defaultImagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
          },
        },
        joker: {
          exerciseName: "Joker",
          imagePath: UPPER_BODY_BEGINNER_ASSETS.jokerCombo,
          comboList: [
            {
              reps: 10,
              exerciseName: "Standard Push-up",
              eachLeg: false,
              imagePath: UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
            },
            {
              reps: 10,
              exerciseName: "Shoulder Tap Push-up",
              eachLeg: false,
              imagePath: UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
            },
            {
              reps: 10,
              exerciseName: "Incline Row",
              eachLeg: false,
              imagePath: UPPER_BODY_BEGINNER_ASSETS.invertedRow,
            },
            {
              reps: 10,
              exerciseName: "Bench Dip",
              eachLeg: false,
              imagePath: UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
            },
          ],
        },
        jokerCount: 1,
        aceImagePath: UPPER_BODY_BEGINNER_ASSETS.aceDouble,
        kingImagePath: UPPER_BODY_BEGINNER_ASSETS.kingHalf,
      } as DeckExerciseConfig,
      // Female Upper Body Beginner deck — mirrors the male config's shape.
      // Identity: name 'Upper Body — Beginner (Women)', subtitle 'Build your
      // foundation — push, hold and pull with perfect form', equipment 'None —
      // floor only'. Equipment: None — floor only.
      female: {
        suits: {
          // Spades — Push-up Progression
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Knee Push-up",
                imagePath: "/assets/exercises/knee push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Knee Push-up",
                imagePath: "/assets/exercises/knee push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Knee Push-up",
                imagePath: "/assets/exercises/knee push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Knee Push-up",
                imagePath: "/assets/exercises/knee push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Push-up Negative",
              imagePath: "/assets/exercises/negative push up.png",
              reps: 5,
              specialInstruction:
                "Lower for 5 seconds each rep — complete control. Use knees to reset.",
            },
            defaultImagePath: "/assets/exercises/normal push up.png",
          },
          // Hearts — Shoulder & Vertical Push
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Pike Push-up Slow",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "3-second descent",
              },
              11: {
                exerciseName: "Pike Push-up Slow",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "3-second descent",
              },
              12: {
                exerciseName: "Pike Push-up Slow",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "3-second descent",
              },
            },
            queen: {
              exerciseName: "Pike Hold",
              imagePath: "/assets/exercises/pike hold.png",
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "Arms locked, hips max elevated. Breathe steadily.",
            },
            defaultImagePath: "/assets/exercises/shoulder tap push up.png",
          },
          // Diamonds — Posterior Chain & Row
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              3: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              4: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              5: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              6: {
                exerciseName: "Incline Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body at 45 degrees",
              },
              7: {
                exerciseName: "Incline Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body at 45 degrees",
              },
              8: {
                exerciseName: "Incline Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body at 45 degrees",
              },
              9: {
                exerciseName: "Incline Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body at 45 degrees",
              },
              10: {
                exerciseName: "Horizontal Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body parallel to floor",
              },
              11: {
                exerciseName: "Horizontal Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body parallel to floor",
              },
              12: {
                exerciseName: "Horizontal Row",
                imagePath: "/assets/exercises/inverted row.png",
                eachLeg: false,
                specialInstruction: "Body parallel to floor",
              },
            },
            queen: {
              exerciseName: "Row Hold",
              imagePath: "/assets/exercises/inverted row.png",
              reps: 5,
              specialInstruction: "2-second pause at top, chest touching bar.",
            },
            defaultImagePath: "/assets/exercises/inverted row.png",
          },
          // Clubs — Tricep & Dip
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Elevated Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "feet also elevated",
              },
              7: {
                exerciseName: "Elevated Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "feet also elevated",
              },
              8: {
                exerciseName: "Elevated Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "feet also elevated",
              },
              9: {
                exerciseName: "Elevated Bench Dip",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "feet also elevated",
              },
              10: {
                exerciseName: "Tricep Push-up",
                imagePath: "/assets/exercises/tricep push up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Tricep Push-up",
                imagePath: "/assets/exercises/tricep push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Tricep Push-up",
                imagePath: "/assets/exercises/tricep push up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Bench Dip Slow Negative",
              imagePath: "/assets/exercises/bench dip.png",
              reps: 5,
              specialInstruction:
                "5-second descent each rep. Pause 1 second at bottom.",
            },
            defaultImagePath: "/assets/exercises/bench dip.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/female combo finisher beginner.png",
          comboList: [
            { reps: 8, exerciseName: "Knee Push-up", eachLeg: false },
            { reps: 8, exerciseName: "Pike Push-up", eachLeg: false },
            { reps: 8, exerciseName: "Incline Row", eachLeg: false },
            { reps: 8, exerciseName: "Bench Dip", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Advanced: {
      // Male Upper Body Advanced deck — mirrors the female Advanced config's shape.
      // Identity: name 'Upper Body — Advanced (Men)', subtitle 'Chin-ups, dips
      // and shoulder strength — earn every rep', equipment 'Pull-up bar + parallel bars'.
      male: {
        suits: {
          // Spades — Advanced Push-ups
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/male_ub_adv_decline_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              7: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/male_ub_adv_decline_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              8: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/male_ub_adv_decline_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              9: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/male_ub_adv_decline_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              10: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_adv_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              11: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_adv_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              12: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_adv_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
            },
            queen: {
              exerciseName: "Archer Push-up",
              illustrationComingSoon: true,
              eachSide: true,
              reps: 5,
              specialInstruction:
                "5 each side — 3-second descent. One arm presses while the other extends sideways.",
            },
            defaultImagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
          },
          // Hearts — Pike / Vertical Push
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              7: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              8: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              9: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              10: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/male_ub_adv_pike_push_up_decline.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
              11: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/male_ub_adv_pike_push_up_decline.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
              12: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/male_ub_adv_pike_push_up_decline.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
            },
            queen: {
              exerciseName: "Wall Handstand Hold",
              imagePath: "/assets/exercises/male_ub_adv_handstand_hold.png",
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "Kick to the wall, arms locked, hold 20 seconds.",
            },
            defaultImagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
          },
          // Diamonds — Pull-up Progression
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Assisted Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Pull-up",
                  imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              3: {
                exerciseName: "Assisted Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Pull-up",
                  imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              4: {
                exerciseName: "Assisted Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Pull-up",
                  imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              5: {
                exerciseName: "Assisted Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Pull-up",
                  imagePath: "/assets/exercises/male_ub_adv_chin_up.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              6: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              7: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              8: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              9: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              10: {
                exerciseName: "Pull-up with Pause",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
              11: {
                exerciseName: "Pull-up with Pause",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
              12: {
                exerciseName: "Pull-up with Pause",
                imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
            },
            queen: {
              exerciseName: "Commando Pull-up",
              illustrationComingSoon: true,
              eachSide: true,
              reps: 5,
              specialInstruction:
                "5 each side — one hand pronated + one supinated, alternate ear past bar.",
            },
            defaultImagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
          },
          // Clubs — Dip Progression
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              3: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              4: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              5: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              6: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              7: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              8: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              9: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              10: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
              11: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
              12: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
            },
            queen: {
              exerciseName: "Dip Slow Negative",
              imagePath: "/assets/exercises/male_ub_adv_dip_slow_negative.png",
              reps: 5,
              specialInstruction:
                "5 reps, 5-second descent, full lockout at top — 5-second descent",
            },
            defaultImagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/male_ub_adv_joker_combo.png",
          comboList: [
            {
              reps: 6,
              exerciseName: "Decline Push-up",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_adv_decline_push_up.png",
            },
            {
              reps: 6,
              exerciseName: "Pike Push-up",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_beg_pike_push_up.png",
            },
            {
              reps: 6,
              exerciseName: "Pull-up",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_adv_normal_pull_up.png",
            },
            {
              reps: 6,
              exerciseName: "Parallel Bar Dip",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_adv_deep_dip.png",
            },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
      // Female Upper Body Advanced deck — mirrors the Beginner female config's shape.
      // Identity: name 'Upper Body — Advanced (Women)', subtitle 'Chin-ups, dips
      // and shoulder strength — earn every rep', equipment 'Pull-up bar + parallel bars'.
      female: {
        suits: {
          // Spades — Advanced Push-ups
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Normal Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              7: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              8: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              9: {
                exerciseName: "Decline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a bench or step",
              },
              10: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/diamond_pushup.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              11: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/diamond_pushup.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              12: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/diamond_pushup.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
            },
            queen: {
              exerciseName: "Archer Push-up",
              imagePath: "/assets/exercises/normal push up.png",
              eachSide: true,
              reps: 5,
              specialInstruction:
                "5 each side — 3-second descent. One arm presses while the other extends sideways.",
            },
            defaultImagePath: "/assets/exercises/normal push up.png",
          },
          // Hearts — Pike / Vertical Push
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Pike Push-up Flat",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Pike Push-up Flat",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Pike Push-up Flat",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Pike Push-up Flat",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Pike Push-up Elevated",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              7: {
                exerciseName: "Pike Push-up Elevated",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              8: {
                exerciseName: "Pike Push-up Elevated",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              9: {
                exerciseName: "Pike Push-up Elevated",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated on a low surface",
              },
              10: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
              11: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
              12: {
                exerciseName: "Pike Push-up Decline",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "Feet elevated high — near-vertical pike",
              },
            },
            queen: {
              exerciseName: "Wall Handstand Hold",
              imagePath: "/assets/exercises/pike hold.png",
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "Kick to the wall, arms locked, hold 20 seconds.",
            },
            defaultImagePath: "/assets/exercises/pike push up.png",
          },
          // Diamonds — Chin-up Progression
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Assisted Chin-up",
                imagePath: "/assets/exercises/chinup_rows.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Chin-up",
                  imagePath: "/assets/exercises/chinup_rows.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              3: {
                exerciseName: "Assisted Chin-up",
                imagePath: "/assets/exercises/chinup_rows.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Chin-up",
                  imagePath: "/assets/exercises/chinup_rows.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              4: {
                exerciseName: "Assisted Chin-up",
                imagePath: "/assets/exercises/chinup_rows.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Chin-up",
                  imagePath: "/assets/exercises/chinup_rows.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              5: {
                exerciseName: "Assisted Chin-up",
                imagePath: "/assets/exercises/chinup_rows.png",
                eachLeg: false,
                specialInstruction: "use resistance band",
                requiresEquipment: "resistanceBandLong",
                substitute: {
                  exerciseName: "Negative Chin-up",
                  imagePath: "/assets/exercises/chinup_rows.png",
                  specialInstruction: "Jump to top, lower slowly (3-5 sec)",
                },
              },
              6: {
                exerciseName: "Full Chin-up",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              7: {
                exerciseName: "Full Chin-up",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              8: {
                exerciseName: "Full Chin-up",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              9: {
                exerciseName: "Full Chin-up",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction:
                  "Supinated grip, full dead hang between reps",
              },
              10: {
                exerciseName: "Chin-up with Pause",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
              11: {
                exerciseName: "Chin-up with Pause",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
              12: {
                exerciseName: "Chin-up with Pause",
                imagePath: "/assets/exercises/chinup_pullup.png",
                eachLeg: false,
                specialInstruction: "2 sec hold at top",
              },
            },
            queen: {
              exerciseName: "Commando Pull-up",
              imagePath: "/assets/exercises/normal_pullup.png",
              eachSide: true,
              reps: 5,
              specialInstruction:
                "5 each side — one hand pronated + one supinated, alternate ear past bar.",
            },
            defaultImagePath: "/assets/exercises/chinup_pullup.png",
          },
          // Clubs — Dip Progression
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Bench Dip Straight-leg",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              3: {
                exerciseName: "Bench Dip Straight-leg",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              4: {
                exerciseName: "Bench Dip Straight-leg",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              5: {
                exerciseName: "Bench Dip Straight-leg",
                imagePath: "/assets/exercises/bench dip.png",
                eachLeg: false,
                specialInstruction: "Legs fully extended on the floor",
              },
              6: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              7: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              8: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              9: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Upright torso, 90 degree depth",
              },
              10: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
              11: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
              12: {
                exerciseName: "Chest Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction:
                  "Slight forward lean, shoulders below elbows",
              },
            },
            queen: {
              exerciseName: "Dip Slow Negative",
              imagePath: "/assets/exercises/dips.png",
              reps: 5,
              specialInstruction:
                "5 reps, 5-second descent, full lockout at top — 5-second descent",
            },
            defaultImagePath: "/assets/exercises/dips.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/chinup_pullup.png",
          comboList: [
            { reps: 6, exerciseName: "Decline Push-up", eachLeg: false },
            { reps: 6, exerciseName: "Elevated Pike Push-up", eachLeg: false },
            { reps: 6, exerciseName: "Chin-up", eachLeg: false },
            { reps: 6, exerciseName: "Parallel Bar Dip", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Pro: {
      // Male Upper Body Pro deck — elite skill work.
      // Identity: name 'Upper Body — Pro (Men)', subtitle 'Archer push-ups,
      // pull-ups and elite skill work', equipment 'Pull-up bar + parallel bars'.
      male: {
        suits: {
          // Spades — Archer / Typewriter Push-up family
          Spades: {
            cardMap: {
              2: {
                exerciseName: "One-arm Push-up",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "One hand behind your back — press with the working arm",
              },
              3: {
                exerciseName: "One-arm Push-up",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "One hand behind your back — press with the working arm",
              },
              4: {
                exerciseName: "One-arm Push-up",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "One hand behind your back — press with the working arm",
              },
              5: {
                exerciseName: "One-arm Push-up",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "One hand behind your back — press with the working arm",
              },
              6: {
                exerciseName: "One-arm Push-up Deep",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              7: {
                exerciseName: "One-arm Push-up Deep",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              8: {
                exerciseName: "One-arm Push-up Deep",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              9: {
                exerciseName: "One-arm Push-up Deep",
                imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              10: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_pro_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              11: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_pro_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
              12: {
                exerciseName: "Diamond Push-up",
                imagePath: "/assets/exercises/male_ub_pro_diamond_push_up.png",
                eachLeg: false,
                specialInstruction: "Hands form a diamond under your chest",
              },
            },
            queen: {
              exerciseName: "One-arm Push-up Negative",
              imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
              eachSide: true,
              reps: 5,
              specialInstruction: "5-second descent",
            },
            defaultImagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
          },
          // Hearts — Handstand / Vertical Push family
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              3: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              4: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              5: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              6: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              7: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              8: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              9: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              10: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Freestanding Handstand Attempt",
              imagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
              isIsometric: true,
              specialInstruction:
                "Kick up from wall, hold max time — running timer counts up",
            },
            defaultImagePath: "/assets/exercises/male_ub_pro_handstand_hold.png",
          },
          // Diamonds — Pull-up family
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_wide_pull_up.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              7: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_wide_pull_up.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              8: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_wide_pull_up.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              9: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/male_ub_pro_wide_pull_up.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              10: {
                exerciseName: "Close Grip Pull-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
              11: {
                exerciseName: "Close Grip Pull-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
              12: {
                exerciseName: "Close Grip Pull-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
            },
            queen: {
              exerciseName: "L-sit Pull-up",
              imagePath: "/assets/exercises/male_ub_pro_l_sit_pull_up.png",
              reps: 3,
              specialInstruction: "3 reps — legs parallel",
            },
            defaultImagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
          },
          // Clubs — Dip / Ring family
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Ring Push-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                },
              },
              7: {
                exerciseName: "Ring Push-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                },
              },
              8: {
                exerciseName: "Ring Push-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                },
              },
              9: {
                exerciseName: "Ring Push-up",
                illustrationComingSoon: true,
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/male_ub_beg_normal_push_up.png",
                },
              },
              10: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/male_ub_pro_explosive_dip.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                },
              },
              11: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/male_ub_pro_explosive_dip.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                },
              },
              12: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/male_ub_pro_explosive_dip.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
                },
              },
            },
            queen: {
              exerciseName: "L-sit Hold",
              illustrationComingSoon: true,
              isIsometric: true,
              holdSeconds: 15,
              specialInstruction:
                "On floor or bars — legs parallel, hold 15 sec",
            },
            defaultImagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/male_ub_pro_joker_combo.png",
          comboList: [
            {
              reps: 5,
              exerciseName: "One-arm Push-up",
              eachSide: true,
              imagePath: "/assets/exercises/male_ub_pro_one_arm_push_up.png",
            },
            {
              reps: 5,
              exerciseName: "Handstand Push-up Negative",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_pro_handstand_push_up.png",
            },
            {
              reps: 5,
              exerciseName: "Pull-up",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_pro_normal_pull_up.png",
            },
            {
              reps: 5,
              exerciseName: "Parallel Bar Dip",
              eachLeg: false,
              imagePath: "/assets/exercises/male_ub_pro_deep_dip.png",
            },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
      // Female Upper Body Pro deck — elite skill work.
      // Identity: name 'Upper Body — Pro (Women)', subtitle 'Archer push-ups,
      // pull-ups and elite skill work', equipment 'Pull-up bar + parallel bars'.
      female: {
        suits: {
          // Spades — Archer / Typewriter Push-up family
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Archer Push-up Standard",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Shift weight side to side each rep — alternate working arm",
              },
              3: {
                exerciseName: "Archer Push-up Standard",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Shift weight side to side each rep — alternate working arm",
              },
              4: {
                exerciseName: "Archer Push-up Standard",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Shift weight side to side each rep — alternate working arm",
              },
              5: {
                exerciseName: "Archer Push-up Standard",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Shift weight side to side each rep — alternate working arm",
              },
              6: {
                exerciseName: "Archer Push-up Deep",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              7: {
                exerciseName: "Archer Push-up Deep",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              8: {
                exerciseName: "Archer Push-up Deep",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              9: {
                exerciseName: "Archer Push-up Deep",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction:
                  "Lower chest all the way to floor on the working arm",
              },
              10: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/wide_pushup.png",
                eachLeg: false,
                specialInstruction:
                  "At the bottom, slide chest side to side before rising",
              },
              11: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/wide_pushup.png",
                eachLeg: false,
                specialInstruction:
                  "At the bottom, slide chest side to side before rising",
              },
              12: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/wide_pushup.png",
                eachLeg: false,
                specialInstruction:
                  "At the bottom, slide chest side to side before rising",
              },
            },
            queen: {
              exerciseName: "One-arm Push-up Negative",
              imagePath: "/assets/exercises/normal push up.png",
              eachSide: true,
              reps: 5,
              specialInstruction: "5-second descent",
            },
            defaultImagePath: "/assets/exercises/normal push up.png",
          },
          // Hearts — Handstand / Vertical Push family
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              3: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              4: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              5: {
                exerciseName: "Wall Handstand Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                eachLeg: false,
                specialInstruction: "15 sec per rep",
              },
              6: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              7: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              8: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              9: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
                specialInstruction: "5-second descent",
              },
              10: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Freestanding Handstand Attempt",
              imagePath: "/assets/exercises/pike hold.png",
              isIsometric: true,
              specialInstruction:
                "Kick up from wall, hold max time — running timer counts up",
            },
            defaultImagePath: "/assets/exercises/pike hold.png",
          },
          // Diamonds — Pull-up family
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Pull-up Overhand",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Pull-up Overhand",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Pull-up Overhand",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Pull-up Overhand",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/wide_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              7: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/wide_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              8: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/wide_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              9: {
                exerciseName: "Wide Grip Pull-up",
                imagePath: "/assets/exercises/wide_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands 15 cm wider each side",
              },
              10: {
                exerciseName: "Close Grip Pull-up",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
              11: {
                exerciseName: "Close Grip Pull-up",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
              12: {
                exerciseName: "Close Grip Pull-up",
                imagePath: "/assets/exercises/normal_pullup.png",
                eachLeg: false,
                specialInstruction: "Hands nearly touching at bar centre",
              },
            },
            queen: {
              exerciseName: "L-sit Pull-up",
              imagePath: "/assets/exercises/normal_pullup.png",
              reps: 3,
              specialInstruction: "3 reps — legs parallel",
            },
            defaultImagePath: "/assets/exercises/normal_pullup.png",
          },
          // Clubs — Dip / Ring family
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Parallel Bar Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Ring Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/normal push up.png",
                },
              },
              7: {
                exerciseName: "Ring Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/normal push up.png",
                },
              },
              8: {
                exerciseName: "Ring Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/normal push up.png",
                },
              },
              9: {
                exerciseName: "Ring Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Feet on floor, hands in rings",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Standard Push-up",
                  imagePath: "/assets/exercises/normal push up.png",
                },
              },
              10: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/dips.png",
                },
              },
              11: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/dips.png",
                },
              },
              12: {
                exerciseName: "Ring Dip",
                imagePath: "/assets/exercises/dips.png",
                eachLeg: false,
                specialInstruction: "Full dip on rings — turn rings out at top",
                requiresEquipment: "rings",
                substitute: {
                  exerciseName: "Parallel Bar Dip",
                  imagePath: "/assets/exercises/dips.png",
                },
              },
            },
            queen: {
              exerciseName: "L-sit Hold",
              imagePath: "/assets/exercises/dips.png",
              isIsometric: true,
              holdSeconds: 15,
              specialInstruction:
                "On floor or bars — legs parallel, hold 15 sec",
            },
            defaultImagePath: "/assets/exercises/dips.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            {
              reps: 5,
              exerciseName: "Archer Push-up",
              eachSide: true,
            },
            {
              reps: 5,
              exerciseName: "Handstand Push-up Negative",
              eachLeg: false,
            },
            { reps: 5, exerciseName: "Pull-up", eachLeg: false },
            { reps: 5, exerciseName: "Parallel Bar Dip", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
  },
  LowerBody: {
    Beginner: {
      // Rich config for Outdoor Lower Body Beginner deck
      male: {
        suits: {
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Regular Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Squat Hold",
              imagePath: "/assets/exercises/squat_hold.png",
              holdSeconds: 15,
              specialInstruction: "HOLD 15 sec",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Slow Alternating Lunge",
              imagePath: "/assets/exercises/slow_lunge.png",
              eachLeg: true,
              reps: 8,
              specialInstruction: "8 reps — 3 sec down / 3 sec up",
            },
            defaultImagePath: "/assets/exercises/front_lunge.png",
          },
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "High Knee March",
              imagePath: "/assets/exercises/high_knee_march.png",
              eachLeg: true,
              reps: 10,
              specialInstruction: "10× High Knee March + 6× Step-Up (each leg)",
            },
            defaultImagePath: "/assets/exercises/step_up.png",
          },
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Wall Sit",
              imagePath: "/assets/exercises/wall_sit.png",
              holdSeconds: 20,
              specialInstruction: "HOLD 20 sec",
            },
            defaultImagePath: "/assets/exercises/calf_raise.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo (Lower Body)",
          imagePath: "/assets/exercises/lb_beginner_combo.png",
          comboList: [
            { reps: 6, exerciseName: "Regular Squat", eachLeg: false },
            { reps: 6, exerciseName: "Forward Lunge", eachLeg: true },
            { reps: 6, exerciseName: "Step-Up", eachLeg: true },
            { reps: 8, exerciseName: "Calf Raise", eachLeg: false },
          ],
        },
      } as DeckExerciseConfig,
      // Female Lower Body Beginner deck — mirrors LowerBody.Beginner.male shape.
      // Identity: name 'Lower Body — Beginner (Women)', subtitle 'Squats, glute
      // bridges and lunges — build from the ground up', equipment None (wall sit
      // uses a wall). 4 suits: Spades=Squat Progression, Hearts=Glute Bridge
      // Progression, Diamonds=Lunge Progression, Clubs=Calf & Stability.
      female: {
        suits: {
          // Spades — Squat Progression
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Narrow Squat",
                imagePath: "/assets/exercises/narrow squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Narrow Squat",
                imagePath: "/assets/exercises/narrow squat.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Narrow Squat",
                imagePath: "/assets/exercises/narrow squat.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Wall Sit",
              imagePath: "/assets/exercises/wall_sit.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction: "HOLD 30 sec — back flat against wall",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          // Hearts — Glute Bridge Progression
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Two-Leg Glute Bridge",
                imagePath: "/assets/exercises/glute bridge.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Two-Leg Glute Bridge",
                imagePath: "/assets/exercises/glute bridge.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Two-Leg Glute Bridge",
                imagePath: "/assets/exercises/glute bridge.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Two-Leg Glute Bridge",
                imagePath: "/assets/exercises/glute bridge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Single-Leg Glute Bridge",
                imagePath: "/assets/exercises/single leg bridge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Single-Leg Glute Bridge",
                imagePath: "/assets/exercises/single leg bridge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Single-Leg Glute Bridge",
                imagePath: "/assets/exercises/single leg bridge.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Single-Leg Glute Bridge",
                imagePath: "/assets/exercises/single leg bridge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
                specialInstruction: "shoulders on bench",
              },
              11: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
                specialInstruction: "shoulders on bench",
              },
              12: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
                specialInstruction: "shoulders on bench",
              },
            },
            queen: {
              exerciseName: "Glute Bridge Pulse",
              imagePath: "/assets/exercises/glute bridge.png",
              eachLeg: false,
              reps: 20,
              specialInstruction: "20 pulses at top — no full lowering",
            },
            defaultImagePath: "/assets/exercises/glute bridge.png",
          },
          // Diamonds — Lunge Progression
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Lateral Lunge",
                imagePath: "/assets/exercises/lateral_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Walking Lunge",
              imagePath: "/assets/exercises/front_lunge.png",
              eachLeg: true,
              reps: 10,
              specialInstruction: "10 steps forward",
            },
            defaultImagePath: "/assets/exercises/reverse_lunge.png",
          },
          // Clubs — Calf & Stability
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Standing Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Standing Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Standing Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Standing Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Single-Leg Balance Hold",
              imagePath: "/assets/exercises/calf_raise.png",
              isIsometric: true,
              holdSeconds: 20,
              eachSide: true,
              specialInstruction: "HOLD 20 sec each side — eyes fixed",
            },
            defaultImagePath: "/assets/exercises/calf_raise.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo (Lower Body)",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 10, exerciseName: "Sumo Squat", eachLeg: false },
            {
              reps: 10,
              exerciseName: "Single-Leg Glute Bridge",
              eachSide: true,
            },
            { reps: 10, exerciseName: "Reverse Lunge", eachSide: true },
            { reps: 10, exerciseName: "Step-Up", eachSide: true },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Advanced: {
      // Rich config for Outdoor Lower Body Advanced deck
      male: {
        suits: {
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat_advanced.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Squat Hold",
              imagePath: "/assets/exercises/squat_hold.png",
              holdSeconds: 30,
              specialInstruction: "HOLD 30 sec",
            },
            defaultImagePath: "/assets/exercises/jump_squat.png",
          },
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Lateral Lunge",
              imagePath: "/assets/exercises/lateral_lunge.png",
              eachLeg: true,
              reps: 12,
              specialInstruction: "12 reps each leg",
            },
            defaultImagePath: "/assets/exercises/walking_lunge.png",
          },
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              5: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              8: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              11: {
                exerciseName: "Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Tuck Jump",
              imagePath: "/assets/exercises/tuck_jump.png",
              eachLeg: false,
              reps: 10,
              specialInstruction: "10 reps",
            },
            defaultImagePath: "/assets/exercises/step_up.png",
          },
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Wall Sit",
                imagePath: "/assets/exercises/wall_sit.png",
                holdSeconds: Math.floor(Math.random() * 31) + 30,
              },
              5: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Wall Sit",
                imagePath: "/assets/exercises/wall_sit.png",
                holdSeconds: Math.floor(Math.random() * 31) + 30,
              },
              8: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Wall Sit",
                imagePath: "/assets/exercises/wall_sit.png",
                holdSeconds: Math.floor(Math.random() * 31) + 30,
              },
              11: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Wall Sit",
              imagePath: "/assets/exercises/wall_sit.png",
              holdSeconds: 45,
              specialInstruction: "HOLD 45 sec",
            },
            defaultImagePath: "/assets/exercises/calf_raise.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/broad_jump.png",
          comboList: [
            { reps: 10, exerciseName: "Jump Squat", eachLeg: false },
            { reps: 10, exerciseName: "Walking Lunge", eachLeg: false },
            { reps: 10, exerciseName: "Single-Leg Calf Raise", eachLeg: true },
            { reps: 10, exerciseName: "Broad Jump", eachLeg: false },
          ],
        },
      } as DeckExerciseConfig,
      female: {
        suits: {
          // Spades — Bulgarian Split Squat Progression
          Spades: {
            cardMap: {
              2: {
                exerciseName: "BSS Normal",
                imagePath: "/assets/exercises/bulgarian split squat.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "BSS Normal",
                imagePath: "/assets/exercises/bulgarian split squat.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "BSS Normal",
                imagePath: "/assets/exercises/bulgarian split squat.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "BSS Normal",
                imagePath: "/assets/exercises/bulgarian split squat.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "BSS Elevated",
                imagePath: "/assets/exercises/bss elevated.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "BSS Elevated",
                imagePath: "/assets/exercises/bss elevated.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "BSS Elevated",
                imagePath: "/assets/exercises/bss elevated.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "BSS Elevated",
                imagePath: "/assets/exercises/bss elevated.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "BSS Deficit",
                imagePath: "/assets/exercises/bss deficit.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "BSS Deficit",
                imagePath: "/assets/exercises/bss deficit.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "BSS Deficit",
                imagePath: "/assets/exercises/bss deficit.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "BSS Isometric Hold",
              imagePath: "/assets/exercises/bulgarian split squat.png",
              eachLeg: true,
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction: "Hold bottom position 20 seconds each leg",
            },
            defaultImagePath: "/assets/exercises/bulgarian split squat.png",
          },
          // Hearts — Hip Thrust & Hamstring Progression
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Elevated Hip Thrust",
                imagePath: "/assets/exercises/hip thrust.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Single-Leg Hip Thrust",
                imagePath: "/assets/exercises/single leg hip thrust.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Single-Leg Hip Thrust",
                imagePath: "/assets/exercises/single leg hip thrust.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Single-Leg Hip Thrust",
                imagePath: "/assets/exercises/single leg hip thrust.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Single-Leg Hip Thrust",
                imagePath: "/assets/exercises/single leg hip thrust.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Nordic Curl",
                imagePath: "/assets/exercises/nordic curl.png",
                eachLeg: false,
                specialInstruction: "Use hands to press back up",
              },
              11: {
                exerciseName: "Nordic Curl",
                imagePath: "/assets/exercises/nordic curl.png",
                eachLeg: false,
                specialInstruction: "Use hands to press back up",
              },
              12: {
                exerciseName: "Nordic Curl",
                imagePath: "/assets/exercises/nordic curl.png",
                eachLeg: false,
                specialInstruction: "Use hands to press back up",
              },
            },
            queen: {
              exerciseName: "Hip Thrust Pulse",
              imagePath: "/assets/exercises/hip thrust.png",
              eachLeg: false,
              reps: 20,
              specialInstruction: "20 pulses — no full lowering",
            },
            defaultImagePath: "/assets/exercises/hip thrust.png",
          },
          // Diamonds — Plyometric Lunge Progression
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Jumping Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Jumping Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jumping Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Jumping Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Single-Leg RDL",
                imagePath: "/assets/exercises/single leg rdl.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Single-Leg RDL",
                imagePath: "/assets/exercises/single leg rdl.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Single-Leg RDL",
                imagePath: "/assets/exercises/single leg rdl.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Continuous Jump Lunge",
              imagePath: "/assets/exercises/jump lunge.png",
              eachLeg: false,
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction: "30 seconds max reps",
            },
            defaultImagePath: "/assets/exercises/jump lunge.png",
          },
          // Clubs — Glute Isolation
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Glute Kickback",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
              },
              3: {
                exerciseName: "Glute Kickback",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
              },
              4: {
                exerciseName: "Glute Kickback",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
              },
              5: {
                exerciseName: "Glute Kickback",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
              },
              6: {
                exerciseName: "Fire Hydrant",
                imagePath: "/assets/exercises/fire hydrant.png",
                eachSide: true,
              },
              7: {
                exerciseName: "Fire Hydrant",
                imagePath: "/assets/exercises/fire hydrant.png",
                eachSide: true,
              },
              8: {
                exerciseName: "Fire Hydrant",
                imagePath: "/assets/exercises/fire hydrant.png",
                eachSide: true,
              },
              9: {
                exerciseName: "Fire Hydrant",
                imagePath: "/assets/exercises/fire hydrant.png",
                eachSide: true,
              },
              10: {
                exerciseName: "Donkey Kick Pulse",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
                specialInstruction: "Small pulses at top",
              },
              11: {
                exerciseName: "Donkey Kick Pulse",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
                specialInstruction: "Small pulses at top",
              },
              12: {
                exerciseName: "Donkey Kick Pulse",
                imagePath: "/assets/exercises/glute kickback.png",
                eachSide: true,
                specialInstruction: "Small pulses at top",
              },
            },
            queen: {
              exerciseName: "Clamshell",
              imagePath: "/assets/exercises/clamshell.png",
              eachSide: true,
              reps: 15,
            },
            defaultImagePath: "/assets/exercises/glute kickback.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/combo finisher advanced female.png",
          comboList: [
            {
              reps: 6,
              exerciseName: "BSS",
              eachSide: true,
            },
            {
              reps: 6,
              exerciseName: "Single-Leg Hip Thrust",
              eachSide: true,
            },
            {
              reps: 6,
              exerciseName: "Jump Lunge",
              eachLeg: false,
            },
            {
              reps: 10,
              exerciseName: "Glute Kickback",
              eachSide: true,
            },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Pro: {
      // Rich config for Outdoor Lower Body Pro deck
      // "Explosive, single-leg, and plyometric — maximum output"
      male: {
        suits: {
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol_squat_pro.png",
                eachLeg: true,
                reps: 5,
              },
              3: {
                exerciseName: "Sumo Jump Squat",
                imagePath: "/assets/exercises/sumo_jump_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol_squat_pro.png",
                eachLeg: true,
                reps: 5,
              },
              6: {
                exerciseName: "Sumo Jump Squat",
                imagePath: "/assets/exercises/sumo_jump_squat.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol_squat_pro.png",
                eachLeg: true,
                reps: 5,
              },
              9: {
                exerciseName: "Sumo Jump Squat",
                imagePath: "/assets/exercises/sumo_jump_squat.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol_squat_pro.png",
                eachLeg: true,
                reps: 5,
              },
              12: {
                exerciseName: "Sumo Jump Squat",
                imagePath: "/assets/exercises/sumo_jump_squat.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Squat Hold",
              imagePath: "/assets/exercises/squat_hold.png",
              holdSeconds: 45,
              isIsometric: true,
              specialInstruction: "SQUAT HOLD — 45 SECONDS",
            },
            defaultImagePath: "/assets/exercises/pistol_squat_pro.png",
          },
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Bulgarian Split Squat",
                imagePath: "/assets/exercises/bg_split_squat.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Curtsy Lunge",
                imagePath: "/assets/exercises/curtsy_lunge.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Bulgarian Split Squat",
                imagePath: "/assets/exercises/bg_split_squat.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Curtsy Lunge",
                imagePath: "/assets/exercises/curtsy_lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Bulgarian Split Squat",
                imagePath: "/assets/exercises/bg_split_squat.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Curtsy Lunge",
                imagePath: "/assets/exercises/curtsy_lunge.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Bulgarian Split Squat",
                imagePath: "/assets/exercises/bg_split_squat.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Lunge with Knee Drive",
              imagePath: "/assets/exercises/lunge_knee_drive_pro.png",
              eachLeg: true,
              reps: 12,
              specialInstruction: "LUNGE WITH KNEE DRIVE — 12 REPS EACH LEG",
            },
            defaultImagePath: "/assets/exercises/jumping_lunges.png",
          },
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              5: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              8: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral_bound.png",
                eachSide: true,
              },
              11: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Single-Leg Step-Up",
              imagePath: "/assets/exercises/one_leg_step_up.png",
              eachLeg: true,
              reps: 10,
              specialInstruction: "SINGLE-LEG STEP-UP — 10 REPS EACH LEG",
            },
            defaultImagePath: "/assets/exercises/tuck_jump.png",
          },
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Single-Leg Wall Sit",
                imagePath: "/assets/exercises/single_leg_wall_sit.png",
                eachLeg: true,
                isIsometric: true,
                holdSeconds: randSingleLegWallSitHold(),
              },
              4: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Single-Leg Wall Sit",
                imagePath: "/assets/exercises/single_leg_wall_sit.png",
                eachLeg: true,
                isIsometric: true,
                holdSeconds: randSingleLegWallSitHold(),
              },
              7: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Single-Leg Wall Sit",
                imagePath: "/assets/exercises/single_leg_wall_sit.png",
                eachLeg: true,
                isIsometric: true,
                holdSeconds: randSingleLegWallSitHold(),
              },
              10: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Single-Leg Calf Raise",
                imagePath: "/assets/exercises/single_leg_calf_raise.png",
                eachLeg: true,
              },
              12: {
                exerciseName: "Single-Leg Wall Sit",
                imagePath: "/assets/exercises/single_leg_wall_sit.png",
                eachLeg: true,
                isIsometric: true,
                holdSeconds: randSingleLegWallSitHold(),
              },
            },
            queen: {
              exerciseName: "Single-Leg Wall Sit",
              imagePath: "/assets/exercises/single_leg_wall_sit.png",
              eachLeg: true,
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction: "SINGLE-LEG WALL SIT — 30 SECONDS EACH LEG",
            },
            defaultImagePath: "/assets/exercises/single_leg_calf_raise.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 10, exerciseName: "Pistol Squat", eachLeg: true },
            { reps: 10, exerciseName: "Jumping Lunges", eachLeg: false },
            { reps: 10, exerciseName: "Tuck Jump", eachLeg: false },
            { reps: 10, exerciseName: "Single-Leg Calf Raise", eachLeg: true },
          ],
        },
      } as DeckExerciseConfig,
      // Female Lower Body Pro deck — pistol squats, explosive jumps and
      // single-leg mastery. Identity: name 'Lower Body — Pro (Women)',
      // difficulty Pro, gender female, subtitle 'Pistol squats, explosive jumps
      // and single-leg mastery'.
      female: {
        suits: {
          // Spades — Pistol Squat Progression (each leg)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Assisted Pistol Squat",
                imagePath: "/assets/exercises/assisted pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              3: {
                exerciseName: "Assisted Pistol Squat",
                imagePath: "/assets/exercises/assisted pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              4: {
                exerciseName: "Assisted Pistol Squat",
                imagePath: "/assets/exercises/assisted pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              5: {
                exerciseName: "Assisted Pistol Squat",
                imagePath: "/assets/exercises/assisted pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              6: {
                exerciseName: "Box Pistol Squat",
                imagePath: "/assets/exercises/box pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              7: {
                exerciseName: "Box Pistol Squat",
                imagePath: "/assets/exercises/box pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              8: {
                exerciseName: "Box Pistol Squat",
                imagePath: "/assets/exercises/box pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              9: {
                exerciseName: "Box Pistol Squat",
                imagePath: "/assets/exercises/box pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              10: {
                exerciseName: "Full Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              11: {
                exerciseName: "Full Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
              12: {
                exerciseName: "Full Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
                reps: 5,
              },
            },
            queen: {
              exerciseName: "Pistol Squat Isometric",
              imagePath: "/assets/exercises/pistol squat.png",
              eachLeg: true,
              isIsometric: true,
              holdSeconds: 15,
              specialInstruction:
                "PISTOL SQUAT ISOMETRIC — 15 SEC HOLD EACH LEG",
            },
            defaultImagePath: "/assets/exercises/pistol squat.png",
          },
          // Hearts — Explosive Jump Progression
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "30-second Max Jump Squats",
              imagePath: "/assets/exercises/jump_squat.png",
              eachLeg: false,
              holdSeconds: 30,
              reps: 0,
              specialInstruction: "MAX JUMP SQUATS — 30 SEC TIMER + COUNT REPS",
            },
            defaultImagePath: "/assets/exercises/jump_squat.png",
          },
          // Diamonds — Single-Leg Posterior Chain
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Assisted Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              3: {
                exerciseName: "Assisted Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              4: {
                exerciseName: "Assisted Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              5: {
                exerciseName: "Assisted Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              6: {
                exerciseName: "Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              7: {
                exerciseName: "Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              8: {
                exerciseName: "Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              9: {
                exerciseName: "Shrimp Squat",
                imagePath: "/assets/exercises/shrimp squat.png",
                eachLeg: true,
                reps: 5,
              },
              10: {
                exerciseName: "Single-Leg Nordic Curl",
                imagePath: "/assets/exercises/single leg nordic curl.png",
                eachLeg: true,
                reps: 5,
              },
              11: {
                exerciseName: "Single-Leg Nordic Curl",
                imagePath: "/assets/exercises/single leg nordic curl.png",
                eachLeg: true,
                reps: 5,
              },
              12: {
                exerciseName: "Single-Leg Nordic Curl",
                imagePath: "/assets/exercises/single leg nordic curl.png",
                eachLeg: true,
                reps: 5,
              },
            },
            queen: {
              exerciseName: "Single-Leg Good Morning",
              imagePath: "/assets/exercises/good morning.png",
              eachSide: true,
              reps: 8,
              specialInstruction: "SINGLE-LEG GOOD MORNING — 8 REPS EACH SIDE",
            },
            defaultImagePath: "/assets/exercises/shrimp squat.png",
          },
          // Clubs — Hip Abduction & Lateral Power
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Side-Lying Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              3: {
                exerciseName: "Side-Lying Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              4: {
                exerciseName: "Side-Lying Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              5: {
                exerciseName: "Side-Lying Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              6: {
                exerciseName: "Standing Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              7: {
                exerciseName: "Standing Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              8: {
                exerciseName: "Standing Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              9: {
                exerciseName: "Standing Hip Abduction",
                imagePath: "/assets/exercises/hip abduction.png",
                eachSide: true,
                reps: 10,
              },
              10: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral bound.png",
                eachSide: true,
                reps: 8,
              },
              11: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral bound.png",
                eachSide: true,
                reps: 8,
              },
              12: {
                exerciseName: "Lateral Bound",
                imagePath: "/assets/exercises/lateral bound.png",
                eachSide: true,
                reps: 8,
              },
            },
            queen: {
              exerciseName: "Lateral Bound Hold",
              imagePath: "/assets/exercises/lateral bound.png",
              eachSide: true,
              reps: 5,
              specialInstruction: "3 sec hold on landing",
            },
            defaultImagePath: "/assets/exercises/lateral bound.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 3, exerciseName: "Full Pistol Squat", eachLeg: true },
            { reps: 5, exerciseName: "Tuck Jump", eachLeg: false },
            { reps: 3, exerciseName: "Shrimp Squat", eachLeg: true },
            { reps: 5, exerciseName: "Lateral Bound", eachLeg: true },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
  },
  Core: {
    // Core decks — isometric holds, repetition core, dynamic core, and back/extension.
    // Spades=plank/side plank holds, Hearts=leg raise/crunch/sit-up reps,
    // Diamonds=mountain climber/bicycle crunch/v-up/russian twist dynamic,
    // Clubs=superman hold/pike hold back/extension holds.
    Beginner: {
      male: {
        suits: {
          // Spades — Plank family (Plank / Plank Hold / Queen=Plank Hold)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              3: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              4: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              5: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              6: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              7: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              8: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              9: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              10: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              11: {
                exerciseName: "Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              12: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Plank Hold",
              imagePath: "/assets/exercises/plank.png",
              isIsometric: true,
              holdSeconds: 40,
              specialInstruction:
                "Plank Hold - hold a perfect plank for 40 seconds",
            },
            defaultImagePath: "/assets/exercises/plank.png",
          },
          // Hearts — Repetition core (Crunch / Leg Raise / Queen=Sit-up)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              3: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              4: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 8,
                eachLeg: false,
              },
              5: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
              6: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 8,
                eachLeg: false,
              },
              7: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
              8: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              9: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
              10: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              11: {
                exerciseName: "Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 15,
                eachLeg: false,
              },
              12: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Sit-up",
              imagePath: "/assets/exercises/normal_squat.png",
              reps: 15,
              specialInstruction: "Sit-up - 15 reps, full range of motion",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          // Diamonds — Dynamic core (Mountain Climber / Queen=Bicycle Crunch)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 20,
                eachLeg: true,
              },
              3: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 20,
                eachLeg: true,
              },
              4: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 25,
                eachLeg: true,
              },
              5: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 25,
                eachLeg: true,
              },
              6: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 30,
                eachLeg: true,
              },
              7: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 30,
                eachLeg: true,
              },
              8: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 30,
                eachLeg: true,
              },
              9: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 35,
                eachLeg: true,
              },
              10: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 35,
                eachLeg: true,
              },
              11: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
              12: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Bicycle Crunch",
              imagePath: "/assets/exercises/normal_squat.png",
              reps: 20,
              eachSide: true,
              specialInstruction:
                "Bicycle Crunch - 20 reps each side, slow and controlled",
            },
            defaultImagePath: "/assets/exercises/high_knee_march.png",
          },
          // Clubs — Back/extension holds (Superman Hold / Queen=Superman Hold)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 10,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              3: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 10,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              4: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 15,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              5: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 15,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              6: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 15,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              7: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              8: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              9: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              10: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              11: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
              12: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
                specialInstruction: "2 sec hold per rep",
              },
            },
            queen: {
              exerciseName: "Superman Hold",
              imagePath: "/assets/exercises/superman hold.png",
              isIsometric: true,
              holdSeconds: 40,
              specialInstruction:
                "Superman Hold - hold for 40 seconds, lift chest and legs",
            },
            defaultImagePath: "/assets/exercises/superman hold.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/plank.png",
          comboList: [
            { reps: 15, exerciseName: "Crunch", eachLeg: false },
            { reps: 10, exerciseName: "Leg Raise", eachLeg: false },
            { reps: 20, exerciseName: "Mountain Climber", eachLeg: true },
            { reps: 20, exerciseName: "Superman Hold", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/plank.png",
        kingImagePath: "/assets/exercises/superman hold.png",
      } as DeckExerciseConfig,
      // Female Core Beginner deck — mirrors LowerBody.Beginner.female shape.
      // Identity: name 'Core — Beginner (Women)', subtitle 'Planks, crunches and
      // stability — build a strong, balanced core', equipment None. 4 suits:
      // Spades=Plank Progression, Hearts=Crunch Progression, Diamonds=Stability
      // & Anti-Rotation, Clubs=Lower Core.
      female: {
        suits: {
          // Spades — Plank Progression
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank hold.png",
                reps: 2,
                specialInstruction: "5 sec per hold",
              },
              3: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank hold.png",
                reps: 3,
                specialInstruction: "5 sec per hold",
              },
              4: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank hold.png",
                reps: 4,
                specialInstruction: "5 sec per hold",
              },
              5: {
                exerciseName: "Plank Hold",
                imagePath: "/assets/exercises/plank hold.png",
                reps: 5,
                specialInstruction: "5 sec per hold",
              },
              6: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/side plank.png",
                isIsometric: true,
                holdSeconds: 6,
                specialInstruction: "hold for rep-count seconds",
              },
              7: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/side plank.png",
                isIsometric: true,
                holdSeconds: 7,
                specialInstruction: "hold for rep-count seconds",
              },
              8: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/side plank.png",
                isIsometric: true,
                holdSeconds: 8,
                specialInstruction: "hold for rep-count seconds",
              },
              9: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/side plank.png",
                isIsometric: true,
                holdSeconds: 9,
                specialInstruction: "hold for rep-count seconds",
              },
              10: {
                exerciseName: "Plank with Shoulder Tap",
                imagePath: "/assets/exercises/plank shoulder tap.png",
                reps: 10,
              },
              11: {
                exerciseName: "Plank with Shoulder Tap",
                imagePath: "/assets/exercises/plank shoulder tap.png",
                reps: 11,
              },
              12: {
                exerciseName: "Plank with Shoulder Tap",
                imagePath: "/assets/exercises/plank shoulder tap.png",
                reps: 12,
              },
            },
            queen: {
              exerciseName: "Long Plank Hold",
              imagePath: "/assets/exercises/plank hold.png",
              isIsometric: true,
              holdSeconds: 45,
              specialInstruction: "#QueenChallenge hold full plank 45 seconds",
            },
            defaultImagePath: "/assets/exercises/plank hold.png",
          },
          // Hearts — Crunch Progression
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Basic Crunch",
                imagePath: "/assets/exercises/crunch.png",
                reps: 2,
              },
              3: {
                exerciseName: "Basic Crunch",
                imagePath: "/assets/exercises/crunch.png",
                reps: 3,
              },
              4: {
                exerciseName: "Basic Crunch",
                imagePath: "/assets/exercises/crunch.png",
                reps: 4,
              },
              5: {
                exerciseName: "Basic Crunch",
                imagePath: "/assets/exercises/crunch.png",
                reps: 5,
              },
              6: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 6,
                specialInstruction: "elbow to opposite knee, slow",
              },
              7: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 7,
                specialInstruction: "elbow to opposite knee, slow",
              },
              8: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 8,
                specialInstruction: "elbow to opposite knee, slow",
              },
              9: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 9,
                specialInstruction: "elbow to opposite knee, slow",
              },
              10: {
                exerciseName: "Reverse Crunch",
                imagePath: "/assets/exercises/reverse crunch.png",
                reps: 10,
                specialInstruction:
                  "pull knees to chest lifting hips off floor",
              },
              11: {
                exerciseName: "Reverse Crunch",
                imagePath: "/assets/exercises/reverse crunch.png",
                reps: 11,
                specialInstruction:
                  "pull knees to chest lifting hips off floor",
              },
              12: {
                exerciseName: "Reverse Crunch",
                imagePath: "/assets/exercises/reverse crunch.png",
                reps: 12,
                specialInstruction:
                  "pull knees to chest lifting hips off floor",
              },
            },
            queen: {
              exerciseName: "Slow Crunch",
              imagePath: "/assets/exercises/crunch.png",
              reps: 5,
              specialInstruction:
                "#QueenChallenge 5 reps, 3-second ascent and 3-second descent each rep",
            },
            defaultImagePath: "/assets/exercises/crunch.png",
          },
          // Diamonds — Stability & Anti-Rotation
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Bird Dog",
                imagePath: "/assets/exercises/bird dog.png",
                eachSide: true,
                reps: 2,
                specialInstruction: "2 sec hold, each side",
              },
              3: {
                exerciseName: "Bird Dog",
                imagePath: "/assets/exercises/bird dog.png",
                eachSide: true,
                reps: 3,
                specialInstruction: "2 sec hold, each side",
              },
              4: {
                exerciseName: "Bird Dog",
                imagePath: "/assets/exercises/bird dog.png",
                eachSide: true,
                reps: 4,
                specialInstruction: "2 sec hold, each side",
              },
              5: {
                exerciseName: "Bird Dog",
                imagePath: "/assets/exercises/bird dog.png",
                eachSide: true,
                reps: 5,
                specialInstruction: "2 sec hold, each side",
              },
              6: {
                exerciseName: "Dead Bug",
                imagePath: "/assets/exercises/dead bug.png",
                eachSide: true,
                reps: 6,
                specialInstruction: "each side",
              },
              7: {
                exerciseName: "Dead Bug",
                imagePath: "/assets/exercises/dead bug.png",
                eachSide: true,
                reps: 7,
                specialInstruction: "each side",
              },
              8: {
                exerciseName: "Dead Bug",
                imagePath: "/assets/exercises/dead bug.png",
                eachSide: true,
                reps: 8,
                specialInstruction: "each side",
              },
              9: {
                exerciseName: "Dead Bug",
                imagePath: "/assets/exercises/dead bug.png",
                eachSide: true,
                reps: 9,
                specialInstruction: "each side",
              },
              10: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 10,
                specialInstruction: "2 sec hold",
              },
              11: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 11,
                specialInstruction: "2 sec hold",
              },
              12: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 12,
                specialInstruction: "2 sec hold",
              },
            },
            queen: {
              exerciseName: "Bear Crawl Hold",
              imagePath: "/assets/exercises/bear crawl.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction:
                "#QueenChallenge knees 2 cm off floor, hold 30 seconds",
            },
            defaultImagePath: "/assets/exercises/bird dog.png",
          },
          // Clubs — Lower Core
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Knee Tuck",
                imagePath: "/assets/exercises/knee tuck.png",
                reps: 2,
                specialInstruction: "bring knees to chest, lower controlled",
              },
              3: {
                exerciseName: "Knee Tuck",
                imagePath: "/assets/exercises/knee tuck.png",
                reps: 3,
                specialInstruction: "bring knees to chest, lower controlled",
              },
              4: {
                exerciseName: "Knee Tuck",
                imagePath: "/assets/exercises/knee tuck.png",
                reps: 4,
                specialInstruction: "bring knees to chest, lower controlled",
              },
              5: {
                exerciseName: "Knee Tuck",
                imagePath: "/assets/exercises/knee tuck.png",
                reps: 5,
                specialInstruction: "bring knees to chest, lower controlled",
              },
              6: {
                exerciseName: "Flutter Kick",
                imagePath: "/assets/exercises/flutter kick.png",
                reps: 6,
                specialInstruction:
                  "legs 10 cm off floor, small alternate kicks",
              },
              7: {
                exerciseName: "Flutter Kick",
                imagePath: "/assets/exercises/flutter kick.png",
                reps: 7,
                specialInstruction:
                  "legs 10 cm off floor, small alternate kicks",
              },
              8: {
                exerciseName: "Flutter Kick",
                imagePath: "/assets/exercises/flutter kick.png",
                reps: 8,
                specialInstruction:
                  "legs 10 cm off floor, small alternate kicks",
              },
              9: {
                exerciseName: "Flutter Kick",
                imagePath: "/assets/exercises/flutter kick.png",
                reps: 9,
                specialInstruction:
                  "legs 10 cm off floor, small alternate kicks",
              },
              10: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/leg raise.png",
                reps: 10,
                specialInstruction:
                  "raise straight legs to 90 degrees, lower slowly",
              },
              11: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/leg raise.png",
                reps: 11,
                specialInstruction:
                  "raise straight legs to 90 degrees, lower slowly",
              },
              12: {
                exerciseName: "Leg Raise",
                imagePath: "/assets/exercises/leg raise.png",
                reps: 12,
                specialInstruction:
                  "raise straight legs to 90 degrees, lower slowly",
              },
            },
            queen: {
              exerciseName: "Leg Raise Hold",
              imagePath: "/assets/exercises/leg raise.png",
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "#QueenChallenge raise legs to 45 degrees, hold 20 seconds",
            },
            defaultImagePath: "/assets/exercises/knee tuck.png",
          },
        },
        joker: {
          exerciseName: "Core Finisher",
          imagePath: "/assets/exercises/combo finisher beginner female.png",
          comboList: [
            { reps: 30, exerciseName: "Plank" },
            { reps: 10, exerciseName: "Bicycle Crunch" },
            { reps: 10, exerciseName: "Dead Bug" },
            { reps: 10, exerciseName: "Leg Raise" },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Advanced: {
      male: {
        suits: {
          // Spades — Side plank holds (Side Plank / Queen=Side Plank Hold)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachSide: true,
              },
              3: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 20,
                eachSide: true,
              },
              4: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachSide: true,
              },
              5: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 25,
                eachSide: true,
              },
              6: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 30,
                eachSide: true,
              },
              7: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 30,
                eachSide: true,
              },
              8: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 30,
                eachSide: true,
              },
              9: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 35,
                eachSide: true,
              },
              10: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 35,
                eachSide: true,
              },
              11: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 40,
                eachSide: true,
              },
              12: {
                exerciseName: "Side Plank",
                imagePath: "/assets/exercises/plank.png",
                isIsometric: true,
                holdSeconds: 40,
                eachSide: true,
              },
            },
            queen: {
              exerciseName: "Side Plank Hold",
              imagePath: "/assets/exercises/plank.png",
              isIsometric: true,
              holdSeconds: 50,
              eachSide: true,
              specialInstruction:
                "Side Plank Hold - 50 seconds each side, hips high",
            },
            defaultImagePath: "/assets/exercises/plank.png",
          },
          // Hearts — Repetition core (Bicycle Crunch / V-up / Queen=V-up)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 16,
                eachSide: true,
              },
              3: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 16,
                eachSide: true,
              },
              4: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              5: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 18,
                eachSide: true,
              },
              6: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 10,
                eachLeg: false,
              },
              7: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 18,
                eachSide: true,
              },
              8: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
              9: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 20,
                eachSide: true,
              },
              10: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 12,
                eachLeg: false,
              },
              11: {
                exerciseName: "Bicycle Crunch",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 20,
                eachSide: true,
              },
              12: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 15,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "V-up",
              imagePath: "/assets/exercises/normal_squat.png",
              reps: 20,
              specialInstruction:
                "V-up - 20 reps, touch hands to feet at the top",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          // Diamonds — Dynamic core (Mountain Climber / Russian Twist / Queen=Russian Twist)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 30,
                eachLeg: true,
              },
              3: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 30,
                eachLeg: true,
              },
              4: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 20,
                eachSide: true,
              },
              5: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 35,
                eachLeg: true,
              },
              6: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 20,
                eachSide: true,
              },
              7: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 35,
                eachLeg: true,
              },
              8: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 25,
                eachSide: true,
              },
              9: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
              10: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 25,
                eachSide: true,
              },
              11: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
              12: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 30,
                eachSide: true,
              },
            },
            queen: {
              exerciseName: "Russian Twist",
              imagePath: "/assets/exercises/normal_squat.png",
              reps: 30,
              eachSide: true,
              specialInstruction:
                "Russian Twist - 30 reps each side, feet off the floor",
            },
            defaultImagePath: "/assets/exercises/high_knee_march.png",
          },
          // Clubs — Back/extension holds (Superman Hold / Pike Hold / Queen=Pike Hold)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              3: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              4: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 15,
                eachLeg: false,
              },
              5: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              6: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 15,
                eachLeg: false,
              },
              7: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              8: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              9: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              10: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              11: {
                exerciseName: "Superman Hold",
                imagePath: "/assets/exercises/superman hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
                specialInstruction: "3 sec hold per rep",
              },
              12: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Pike Hold",
              imagePath: "/assets/exercises/pike hold.png",
              isIsometric: true,
              holdSeconds: 35,
              specialInstruction:
                "Pike Hold - hold for 35 seconds, arms locked, hips high",
            },
            defaultImagePath: "/assets/exercises/superman hold.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/plank.png",
          comboList: [
            { reps: 25, exerciseName: "Bicycle Crunch", eachLeg: false },
            { reps: 15, exerciseName: "V-up", eachLeg: false },
            { reps: 40, exerciseName: "Mountain Climber", eachLeg: true },
            { reps: 30, exerciseName: "Russian Twist", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/plank.png",
        kingImagePath: "/assets/exercises/pike hold.png",
      } as DeckExerciseConfig,
      // Female Core Advanced deck — mirrors Core.Beginner.female shape.
      // Identity: name 'Core — Advanced (Women)', subtitle 'Hollow body, hanging
      // core and dynamic stability', equipment 'Pull-up bar (Clubs suit).
      // Otherwise none.'. 4 suits: Spades=Hollow Body Progression,
      // Hearts=Rotational Core, Diamonds=Dynamic Plank, Clubs=Hanging Core.
      female: {
        suits: {
          // Spades — Hollow Body Progression
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Hollow Body Hold",
                imagePath: "/assets/exercises/hollow body hold.png",
                isIsometric: true,
                holdSeconds: 20,
              },
              3: {
                exerciseName: "Hollow Body Hold",
                imagePath: "/assets/exercises/hollow body hold.png",
                isIsometric: true,
                holdSeconds: 25,
              },
              4: {
                exerciseName: "Hollow Body Hold",
                imagePath: "/assets/exercises/hollow body hold.png",
                isIsometric: true,
                holdSeconds: 30,
              },
              5: {
                exerciseName: "Hollow Body Hold",
                imagePath: "/assets/exercises/hollow body hold.png",
                isIsometric: true,
                holdSeconds: 35,
              },
              6: {
                exerciseName: "Hollow Body Rock",
                imagePath: "/assets/exercises/hollow body rock.png",
                reps: 10,
                specialInstruction:
                  "rock body back and forth, arms and legs extended",
              },
              7: {
                exerciseName: "Hollow Body Rock",
                imagePath: "/assets/exercises/hollow body rock.png",
                reps: 12,
                specialInstruction:
                  "rock body back and forth, arms and legs extended",
              },
              8: {
                exerciseName: "Hollow Body Rock",
                imagePath: "/assets/exercises/hollow body rock.png",
                reps: 14,
                specialInstruction:
                  "rock body back and forth, arms and legs extended",
              },
              9: {
                exerciseName: "Hollow Body Rock",
                imagePath: "/assets/exercises/hollow body rock.png",
                reps: 16,
                specialInstruction:
                  "rock body back and forth, arms and legs extended",
              },
              10: {
                exerciseName: "V-Up",
                imagePath: "/assets/exercises/v up.png",
                reps: 10,
                specialInstruction: "touch hands to feet at the top",
              },
              11: {
                exerciseName: "V-Up",
                imagePath: "/assets/exercises/v up.png",
                reps: 12,
                specialInstruction: "touch hands to feet at the top",
              },
              12: {
                exerciseName: "V-Up",
                imagePath: "/assets/exercises/v up.png",
                reps: 14,
                specialInstruction: "touch hands to feet at the top",
              },
            },
            queen: {
              exerciseName: "Hollow Body Hold",
              imagePath: "/assets/exercises/hollow body hold.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction:
                "#QueenChallenge Hollow Body Hold 30 sec — maximum effort. Show countdown timer.",
            },
            defaultImagePath: "/assets/exercises/hollow body hold.png",
          },
          // Hearts — Rotational Core
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/russian twist.png",
                reps: 10,
                eachSide: true,
                specialInstruction: "reps per side",
              },
              3: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/russian twist.png",
                reps: 12,
                eachSide: true,
                specialInstruction: "reps per side",
              },
              4: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/russian twist.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "reps per side",
              },
              5: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/russian twist.png",
                reps: 16,
                eachSide: true,
                specialInstruction: "reps per side",
              },
              6: {
                exerciseName: "Cross-Body Crunch",
                imagePath: "/assets/exercises/cross body crunch.png",
                reps: 12,
                eachSide: true,
                specialInstruction: "elbow to opposite knee",
              },
              7: {
                exerciseName: "Cross-Body Crunch",
                imagePath: "/assets/exercises/cross body crunch.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "elbow to opposite knee",
              },
              8: {
                exerciseName: "Cross-Body Crunch",
                imagePath: "/assets/exercises/cross body crunch.png",
                reps: 16,
                eachSide: true,
                specialInstruction: "elbow to opposite knee",
              },
              9: {
                exerciseName: "Cross-Body Crunch",
                imagePath: "/assets/exercises/cross body crunch.png",
                reps: 18,
                eachSide: true,
                specialInstruction: "elbow to opposite knee",
              },
              10: {
                exerciseName: "Bicycle with Pause",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "2 sec pause at the top, each side",
              },
              11: {
                exerciseName: "Bicycle with Pause",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 16,
                eachSide: true,
                specialInstruction: "2 sec pause at the top, each side",
              },
              12: {
                exerciseName: "Bicycle with Pause",
                imagePath: "/assets/exercises/bicycle crunch.png",
                reps: 18,
                eachSide: true,
                specialInstruction: "2 sec pause at the top, each side",
              },
            },
            queen: {
              exerciseName: "Russian Twist",
              imagePath: "/assets/exercises/russian twist.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction:
                "#QueenChallenge Russian Twist 30 sec — max reps with 2-sec pause per side. Show timer.",
            },
            defaultImagePath: "/assets/exercises/russian twist.png",
          },
          // Diamonds — Dynamic Plank
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/mountain climber.png",
                reps: 20,
                eachLeg: true,
                specialInstruction: "drive knees to chest",
              },
              3: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/mountain climber.png",
                reps: 24,
                eachLeg: true,
                specialInstruction: "drive knees to chest",
              },
              4: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/mountain climber.png",
                reps: 28,
                eachLeg: true,
                specialInstruction: "drive knees to chest",
              },
              5: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/mountain climber.png",
                reps: 32,
                eachLeg: true,
                specialInstruction: "drive knees to chest",
              },
              6: {
                exerciseName: "Spider-Man Plank",
                imagePath: "/assets/exercises/spiderman plank.png",
                reps: 10,
                eachSide: true,
                specialInstruction: "knee to elbow, each side",
              },
              7: {
                exerciseName: "Spider-Man Plank",
                imagePath: "/assets/exercises/spiderman plank.png",
                reps: 12,
                eachSide: true,
                specialInstruction: "knee to elbow, each side",
              },
              8: {
                exerciseName: "Spider-Man Plank",
                imagePath: "/assets/exercises/spiderman plank.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "knee to elbow, each side",
              },
              9: {
                exerciseName: "Spider-Man Plank",
                imagePath: "/assets/exercises/spiderman plank.png",
                reps: 16,
                eachSide: true,
                specialInstruction: "knee to elbow, each side",
              },
              10: {
                exerciseName: "Plank to Downward Dog",
                imagePath: "/assets/exercises/plank to down dog.png",
                reps: 10,
                specialInstruction: "pike hips high, return to plank",
              },
              11: {
                exerciseName: "Plank to Downward Dog",
                imagePath: "/assets/exercises/plank to down dog.png",
                reps: 12,
                specialInstruction: "pike hips high, return to plank",
              },
              12: {
                exerciseName: "Plank to Downward Dog",
                imagePath: "/assets/exercises/plank to down dog.png",
                reps: 14,
                specialInstruction: "pike hips high, return to plank",
              },
            },
            queen: {
              exerciseName: "Mountain Climber",
              imagePath: "/assets/exercises/mountain climber.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction:
                "#QueenChallenge Mountain Climber 30 sec — max reps. Show timer and rep counter.",
            },
            defaultImagePath: "/assets/exercises/mountain climber.png",
          },
          // Clubs — Hanging Core (pull-up bar)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Hanging Knee Raise",
                imagePath: "/assets/exercises/hanging knee raise.png",
                reps: 6,
                specialInstruction: "knees to chest, lower controlled",
              },
              3: {
                exerciseName: "Hanging Knee Raise",
                imagePath: "/assets/exercises/hanging knee raise.png",
                reps: 8,
                specialInstruction: "knees to chest, lower controlled",
              },
              4: {
                exerciseName: "Hanging Knee Raise",
                imagePath: "/assets/exercises/hanging knee raise.png",
                reps: 10,
                specialInstruction: "knees to chest, lower controlled",
              },
              5: {
                exerciseName: "Hanging Knee Raise",
                imagePath: "/assets/exercises/hanging knee raise.png",
                reps: 12,
                specialInstruction: "knees to chest, lower controlled",
              },
              6: {
                exerciseName: "Hanging Oblique Raise",
                imagePath: "/assets/exercises/hanging oblique raise.png",
                reps: 8,
                eachSide: true,
                specialInstruction: "knees to side, each side",
              },
              7: {
                exerciseName: "Hanging Oblique Raise",
                imagePath: "/assets/exercises/hanging oblique raise.png",
                reps: 10,
                eachSide: true,
                specialInstruction: "knees to side, each side",
              },
              8: {
                exerciseName: "Hanging Oblique Raise",
                imagePath: "/assets/exercises/hanging oblique raise.png",
                reps: 12,
                eachSide: true,
                specialInstruction: "knees to side, each side",
              },
              9: {
                exerciseName: "Hanging Oblique Raise",
                imagePath: "/assets/exercises/hanging oblique raise.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "knees to side, each side",
              },
              10: {
                exerciseName: "L-Sit Hold",
                imagePath: "/assets/exercises/l-sit.png",
                isIsometric: true,
                holdSeconds: 10,
                specialInstruction: "5 sec per hold",
              },
              11: {
                exerciseName: "L-Sit Hold",
                imagePath: "/assets/exercises/l-sit.png",
                isIsometric: true,
                holdSeconds: 11,
                specialInstruction: "5 sec per hold",
              },
              12: {
                exerciseName: "L-Sit Hold",
                imagePath: "/assets/exercises/l-sit.png",
                isIsometric: true,
                holdSeconds: 12,
                specialInstruction: "5 sec per hold",
              },
            },
            queen: {
              exerciseName: "Toes to Bar",
              imagePath: "/assets/exercises/toes to bar.png",
              reps: 5,
              specialInstruction:
                "#QueenChallenge Toes to Bar — straight legs touch bar each rep. 5 reps.",
            },
            defaultImagePath: "/assets/exercises/hanging knee raise.png",
          },
        },
        joker: {
          exerciseName: "Combo Finisher",
          imagePath: "/assets/exercises/combo finisher advanced female.png",
          comboList: [
            { reps: 10, exerciseName: "V-Up" },
            { reps: 10, exerciseName: "Bicycle with Pause" },
            { reps: 10, exerciseName: "Mountain Climber" },
            { reps: 5, exerciseName: "Hanging Knee Raise" },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Pro: {
      male: {
        suits: {
          // Spades — Plank-to-pushup holds (Plank to Push-up / Queen=Plank to Push-up)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 10,
                eachLeg: false,
              },
              3: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 10,
                eachLeg: false,
              },
              4: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 12,
                eachLeg: false,
              },
              5: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 12,
                eachLeg: false,
              },
              6: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 15,
                eachLeg: false,
              },
              7: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 15,
                eachLeg: false,
              },
              8: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 15,
                eachLeg: false,
              },
              9: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 18,
                eachLeg: false,
              },
              10: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 18,
                eachLeg: false,
              },
              11: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 20,
                eachLeg: false,
              },
              12: {
                exerciseName: "Plank to Push-up",
                imagePath: "/assets/exercises/plank.png",
                reps: 20,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Plank to Push-up",
              imagePath: "/assets/exercises/plank.png",
              reps: 25,
              specialInstruction:
                "Plank to Push-up - 25 reps, lower under control each rep",
            },
            defaultImagePath: "/assets/exercises/plank.png",
          },
          // Hearts — Hollow hold & V-up (Hollow Hold / V-up / Queen=Hollow Hold)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              3: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              4: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 15,
                eachLeg: false,
              },
              5: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              6: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 15,
                eachLeg: false,
              },
              7: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              8: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 18,
                eachLeg: false,
              },
              9: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
              10: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 18,
                eachLeg: false,
              },
              11: {
                exerciseName: "Hollow Hold",
                imagePath: "/assets/exercises/normal_squat.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
              12: {
                exerciseName: "V-up",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 20,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Hollow Hold",
              imagePath: "/assets/exercises/normal_squat.png",
              isIsometric: true,
              holdSeconds: 45,
              specialInstruction:
                "Hollow Hold - hold for 45 seconds, lower back pressed to floor",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          // Diamonds — Dynamic core (Russian Twist / Mountain Climber / Queen=Russian Twist)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 25,
                eachSide: true,
              },
              3: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 25,
                eachSide: true,
              },
              4: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
              5: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 30,
                eachSide: true,
              },
              6: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 40,
                eachLeg: true,
              },
              7: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 30,
                eachSide: true,
              },
              8: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 45,
                eachLeg: true,
              },
              9: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 35,
                eachSide: true,
              },
              10: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 45,
                eachLeg: true,
              },
              11: {
                exerciseName: "Russian Twist",
                imagePath: "/assets/exercises/normal_squat.png",
                reps: 35,
                eachSide: true,
              },
              12: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                reps: 50,
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Russian Twist",
              imagePath: "/assets/exercises/normal_squat.png",
              reps: 40,
              eachSide: true,
              specialInstruction:
                "Russian Twist - 40 reps each side, feet off the floor, weighted if possible",
            },
            defaultImagePath: "/assets/exercises/high_knee_march.png",
          },
          // Clubs — Pike hold (Pike Hold / Queen=Pike Hold)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              3: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
              },
              4: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              5: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 25,
                eachLeg: false,
              },
              6: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
              7: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
              8: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
              },
              9: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 35,
                eachLeg: false,
              },
              10: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 35,
                eachLeg: false,
              },
              11: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 40,
                eachLeg: false,
              },
              12: {
                exerciseName: "Pike Hold",
                imagePath: "/assets/exercises/pike hold.png",
                isIsometric: true,
                holdSeconds: 40,
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Pike Hold",
              imagePath: "/assets/exercises/pike hold.png",
              isIsometric: true,
              holdSeconds: 50,
              specialInstruction:
                "Pike Hold - hold for 50 seconds, arms locked, hips max elevated",
            },
            defaultImagePath: "/assets/exercises/pike hold.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/plank.png",
          comboList: [
            { reps: 25, exerciseName: "Plank to Push-up", eachLeg: false },
            { reps: 20, exerciseName: "V-up", eachLeg: false },
            { reps: 50, exerciseName: "Mountain Climber", eachLeg: true },
            { reps: 40, exerciseName: "Russian Twist", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/plank.png",
        kingImagePath: "/assets/exercises/pike hold.png",
      } as DeckExerciseConfig,
      female: {
        suits: {
          // Spades — Dragon Flag Progression (pull-up bar / floor)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Dragon Flag Negative",
                imagePath: "/assets/exercises/dragon flag negative.png",
                reps: 3,
                specialInstruction: "5-second descent",
              },
              3: {
                exerciseName: "Dragon Flag Negative",
                imagePath: "/assets/exercises/dragon flag negative.png",
                reps: 4,
                specialInstruction: "5-second descent",
              },
              4: {
                exerciseName: "Dragon Flag Negative",
                imagePath: "/assets/exercises/dragon flag negative.png",
                reps: 5,
                specialInstruction: "5-second descent",
              },
              5: {
                exerciseName: "Dragon Flag Negative",
                imagePath: "/assets/exercises/dragon flag negative.png",
                reps: 6,
                specialInstruction: "5-second descent",
              },
              6: {
                exerciseName: "Tuck Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 4,
                specialInstruction:
                  "knees tucked to chest, hold briefly at top",
              },
              7: {
                exerciseName: "Tuck Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 5,
                specialInstruction:
                  "knees tucked to chest, hold briefly at top",
              },
              8: {
                exerciseName: "Tuck Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 6,
                specialInstruction:
                  "knees tucked to chest, hold briefly at top",
              },
              9: {
                exerciseName: "Tuck Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 7,
                specialInstruction:
                  "knees tucked to chest, hold briefly at top",
              },
              10: {
                exerciseName: "Full Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 3,
                specialInstruction: "straight body, lower under control",
              },
              11: {
                exerciseName: "Full Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 4,
                specialInstruction: "straight body, lower under control",
              },
              12: {
                exerciseName: "Full Dragon Flag",
                imagePath: "/assets/exercises/dragon flag.png",
                reps: 5,
                specialInstruction: "straight body, lower under control",
              },
            },
            queen: {
              exerciseName: "Front Lever Hold",
              imagePath: "/assets/exercises/front lever.png",
              isIsometric: true,
              holdSeconds: 5,
              specialInstruction:
                "#QueenChallenge Front Lever Hold — 5-second hold, tuck version acceptable. Show countdown timer.",
            },
            defaultImagePath: "/assets/exercises/dragon flag.png",
          },
          // Hearts — Windshield Wipers (pull-up bar)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Windshield Wipers Tuck",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 5,
                eachSide: true,
                specialInstruction:
                  "knees tucked, rotate side to side, each side",
              },
              3: {
                exerciseName: "Windshield Wipers Tuck",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 6,
                eachSide: true,
                specialInstruction:
                  "knees tucked, rotate side to side, each side",
              },
              4: {
                exerciseName: "Windshield Wipers Tuck",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 7,
                eachSide: true,
                specialInstruction:
                  "knees tucked, rotate side to side, each side",
              },
              5: {
                exerciseName: "Windshield Wipers Tuck",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 8,
                eachSide: true,
                specialInstruction:
                  "knees tucked, rotate side to side, each side",
              },
              6: {
                exerciseName: "Windshield Wipers Straight",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 4,
                eachSide: true,
                specialInstruction:
                  "straight legs, rotate side to side, each side",
              },
              7: {
                exerciseName: "Windshield Wipers Straight",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 5,
                eachSide: true,
                specialInstruction:
                  "straight legs, rotate side to side, each side",
              },
              8: {
                exerciseName: "Windshield Wipers Straight",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 6,
                eachSide: true,
                specialInstruction:
                  "straight legs, rotate side to side, each side",
              },
              9: {
                exerciseName: "Windshield Wipers Straight",
                imagePath: "/assets/exercises/windshield wipers.png",
                reps: 7,
                eachSide: true,
                specialInstruction:
                  "straight legs, rotate side to side, each side",
              },
              10: {
                exerciseName: "Full Toes to Bar",
                imagePath: "/assets/exercises/toes to bar.png",
                reps: 5,
                specialInstruction: "straight legs touch the bar each rep",
              },
              11: {
                exerciseName: "Full Toes to Bar",
                imagePath: "/assets/exercises/toes to bar.png",
                reps: 6,
                specialInstruction: "straight legs touch the bar each rep",
              },
              12: {
                exerciseName: "Full Toes to Bar",
                imagePath: "/assets/exercises/toes to bar.png",
                reps: 7,
                specialInstruction: "straight legs touch the bar each rep",
              },
            },
            queen: {
              exerciseName: "Hanging L-hold",
              imagePath: "/assets/exercises/hanging l hold.png",
              isIsometric: true,
              holdSeconds: 20,
              specialInstruction:
                "#QueenChallenge Hanging L-hold — 20 seconds, legs extended at 90°. Show countdown timer.",
            },
            defaultImagePath: "/assets/exercises/windshield wipers.png",
          },
          // Diamonds — Planche Progression (floor)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Planche Lean",
                imagePath: "/assets/exercises/planche lean.png",
                isIsometric: true,
                holdSeconds: 15,
                specialInstruction: "lean shoulders forward over hands",
              },
              3: {
                exerciseName: "Planche Lean",
                imagePath: "/assets/exercises/planche lean.png",
                isIsometric: true,
                holdSeconds: 20,
                specialInstruction: "lean shoulders forward over hands",
              },
              4: {
                exerciseName: "Planche Lean",
                imagePath: "/assets/exercises/planche lean.png",
                isIsometric: true,
                holdSeconds: 25,
                specialInstruction: "lean shoulders forward over hands",
              },
              5: {
                exerciseName: "Planche Lean",
                imagePath: "/assets/exercises/planche lean.png",
                isIsometric: true,
                holdSeconds: 30,
                specialInstruction: "lean shoulders forward over hands",
              },
              6: {
                exerciseName: "Tuck Planche Hold",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 5,
                specialInstruction: "5 sec per hold",
              },
              7: {
                exerciseName: "Tuck Planche Hold",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 6,
                specialInstruction: "5 sec per hold",
              },
              8: {
                exerciseName: "Tuck Planche Hold",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 7,
                specialInstruction: "5 sec per hold",
              },
              9: {
                exerciseName: "Tuck Planche Hold",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 8,
                specialInstruction: "5 sec per hold",
              },
              10: {
                exerciseName: "Straddle Planche Attempt",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 3,
                specialInstruction: "straddle legs, brief hold attempts",
              },
              11: {
                exerciseName: "Straddle Planche Attempt",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 4,
                specialInstruction: "straddle legs, brief hold attempts",
              },
              12: {
                exerciseName: "Straddle Planche Attempt",
                imagePath: "/assets/exercises/tuck planche.png",
                isIsometric: true,
                holdSeconds: 5,
                specialInstruction: "straddle legs, brief hold attempts",
              },
            },
            queen: {
              exerciseName: "Hollow Body Planche Rock",
              imagePath: "/assets/exercises/planche lean.png",
              reps: 10,
              specialInstruction:
                "#QueenChallenge Hollow Body Planche Rock — 10 controlled rocks, maintain hollow body. Show rep counter.",
            },
            defaultImagePath: "/assets/exercises/planche lean.png",
          },
          // Clubs — Side Plank & Human Flag (floor / post)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Side Plank with Hip Dip",
                imagePath: "/assets/exercises/side plank hip dip.png",
                reps: 8,
                eachSide: true,
                specialInstruction: "dip hips toward floor, each side",
              },
              3: {
                exerciseName: "Side Plank with Hip Dip",
                imagePath: "/assets/exercises/side plank hip dip.png",
                reps: 10,
                eachSide: true,
                specialInstruction: "dip hips toward floor, each side",
              },
              4: {
                exerciseName: "Side Plank with Hip Dip",
                imagePath: "/assets/exercises/side plank hip dip.png",
                reps: 12,
                eachSide: true,
                specialInstruction: "dip hips toward floor, each side",
              },
              5: {
                exerciseName: "Side Plank with Hip Dip",
                imagePath: "/assets/exercises/side plank hip dip.png",
                reps: 14,
                eachSide: true,
                specialInstruction: "dip hips toward floor, each side",
              },
              6: {
                exerciseName: "Copenhagen Plank",
                imagePath: "/assets/exercises/copenhagen plank.png",
                isIsometric: true,
                holdSeconds: 5,
                eachSide: true,
                specialInstruction: "5 sec per hold, each side",
              },
              7: {
                exerciseName: "Copenhagen Plank",
                imagePath: "/assets/exercises/copenhagen plank.png",
                isIsometric: true,
                holdSeconds: 6,
                eachSide: true,
                specialInstruction: "5 sec per hold, each side",
              },
              8: {
                exerciseName: "Copenhagen Plank",
                imagePath: "/assets/exercises/copenhagen plank.png",
                isIsometric: true,
                holdSeconds: 7,
                eachSide: true,
                specialInstruction: "5 sec per hold, each side",
              },
              9: {
                exerciseName: "Copenhagen Plank",
                imagePath: "/assets/exercises/copenhagen plank.png",
                isIsometric: true,
                holdSeconds: 8,
                eachSide: true,
                specialInstruction: "5 sec per hold, each side",
              },
              10: {
                exerciseName: "Human Flag Attempt",
                imagePath: "/assets/exercises/human flag attempt.png",
                isIsometric: true,
                holdSeconds: 3,
                specialInstruction: "max effort — hold as long as possible",
              },
              11: {
                exerciseName: "Human Flag Attempt",
                imagePath: "/assets/exercises/human flag attempt.png",
                isIsometric: true,
                holdSeconds: 4,
                specialInstruction: "max effort — hold as long as possible",
              },
              12: {
                exerciseName: "Human Flag Attempt",
                imagePath: "/assets/exercises/human flag attempt.png",
                isIsometric: true,
                holdSeconds: 5,
                specialInstruction: "max effort — hold as long as possible",
              },
            },
            queen: {
              exerciseName: "Star Side Plank",
              imagePath: "/assets/exercises/side plank hip dip.png",
              reps: 5,
              eachSide: true,
              specialInstruction:
                "#QueenChallenge Star Side Plank — full side plank, raise top arm and leg simultaneously. 5 each side.",
            },
            defaultImagePath: "/assets/exercises/side plank hip dip.png",
          },
        },
        joker: {
          exerciseName: "Combo Finisher",
          imagePath: "/assets/exercises/combo finisher pro female.png",
          comboList: [
            { reps: 3, exerciseName: "Dragon Flag" },
            { reps: 5, exerciseName: "Windshield Wipers Straight" },
            { reps: 10, exerciseName: "Planche Lean" },
            { reps: 5, exerciseName: "Copenhagen Plank", eachSide: true },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
  },
  FullBody: {
    // Full Body decks — compound bodyweight movements across all four suits.
    // Spades = push-up / burpee (upper + full), Hearts = lunge family (lower +
    // full, eachLeg), Diamonds = squat / jump power (lower power), Clubs =
    // step-up / crawl / inchworm / mountain climber (compound dynamic).
    // Difficulty scales Beginner → Advanced → Pro with harder variations and
    // higher reps. Female decks mirror the male structure with adjusted reps.
    Beginner: {
      male: {
        suits: {
          // Spades — Push-up family (Standard / Wide / Incline / Queen=Negative)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Standard Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Standard Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Standard Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Incline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Hands on elevated surface",
              },
              8: {
                exerciseName: "Standard Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Incline Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
                specialInstruction: "Hands on elevated surface",
              },
              11: {
                exerciseName: "Standard Push-up",
                imagePath: "/assets/exercises/normal push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Wide Push-up",
                imagePath: "/assets/exercises/wide push up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Push-up Negative",
              imagePath: "/assets/exercises/negative push up.png",
              reps: 6,
              specialInstruction:
                "Push-up Negative - 6 reps, 5-second descent each",
            },
            defaultImagePath: "/assets/exercises/normal push up.png",
          },
          // Hearts — Lunge family (Forward / Reverse / Alternating / Queen=Slow)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Forward Lunge",
                imagePath: "/assets/exercises/front_lunge.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Reverse Lunge",
                imagePath: "/assets/exercises/reverse_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Slow Alternating Lunge",
              imagePath: "/assets/exercises/slow_lunge.png",
              eachLeg: true,
              reps: 5,
              specialInstruction:
                "Slow Alternating Lunge - 5 reps per leg, 3-sec descent each",
            },
            defaultImagePath: "/assets/exercises/alternating_lunge.png",
          },
          // Diamonds — Squat family (Normal / Sumo / Squat Hold / Queen=Wall Sit)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Squat Hold",
                imagePath: "/assets/exercises/squat_hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "Hold bottom of squat for 20 seconds",
              },
              7: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Squat Hold",
                imagePath: "/assets/exercises/squat_hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "Hold bottom of squat for 20 seconds",
              },
              10: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Squat Hold",
                imagePath: "/assets/exercises/squat_hold.png",
                isIsometric: true,
                holdSeconds: 20,
                eachLeg: false,
                specialInstruction: "Hold bottom of squat for 20 seconds",
              },
            },
            queen: {
              exerciseName: "Wall Sit",
              imagePath: "/assets/exercises/wall_sit.png",
              isIsometric: true,
              holdSeconds: 30,
              specialInstruction:
                "Wall Sit - hold 90-degree position against wall for 30 seconds",
            },
            defaultImagePath: "/assets/exercises/normal_squat.png",
          },
          // Clubs — Step-up family (Step-up / Calf Raise / High Knee March / Queen=Step-up Hold)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "High Knee March",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Calf Raise",
                imagePath: "/assets/exercises/calf_raise.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Step-up Hold",
              imagePath: "/assets/exercises/step_up.png",
              eachLeg: true,
              isIsometric: true,
              holdSeconds: 10,
              specialInstruction:
                "Step-up Hold - hold top of step 10 sec per leg",
            },
            defaultImagePath: "/assets/exercises/step_up.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 8, exerciseName: "Standard Push-up", eachLeg: false },
            { reps: 6, exerciseName: "Forward Lunge", eachLeg: true },
            { reps: 10, exerciseName: "Normal Squat", eachLeg: false },
            { reps: 6, exerciseName: "Step-up", eachLeg: true },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
      female: {
        suits: {
          // Spades — Burpee family (Modified / Standard / Inchworm / Queen=Burpee Hold)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Modified Burpee",
                imagePath: "/assets/exercises/modified burpee.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Modified Burpee",
                imagePath: "/assets/exercises/modified burpee.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Modified Burpee",
                imagePath: "/assets/exercises/modified burpee.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Modified Burpee",
                imagePath: "/assets/exercises/modified burpee.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Standard Burpee",
                imagePath: "/assets/exercises/burpee.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Standard Burpee",
                imagePath: "/assets/exercises/burpee.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Standard Burpee",
                imagePath: "/assets/exercises/burpee.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Standard Burpee",
                imagePath: "/assets/exercises/burpee.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/inchworm.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/inchworm.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/inchworm.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Burpee Hold",
              imagePath: "/assets/exercises/burpee.png",
              reps: 5,
              specialInstruction: "5 sec hold in plank — 5 reps",
            },
            defaultImagePath: "/assets/exercises/burpee.png",
          },
          // Hearts — Cardio family (Jumping Jacks / High Knees / Box Step-Up / Queen=High Knees 30 sec)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Jumping Jacks",
                imagePath: "/assets/exercises/jumping jacks.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Jumping Jacks",
                imagePath: "/assets/exercises/jumping jacks.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jumping Jacks",
                imagePath: "/assets/exercises/jumping jacks.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Jumping Jacks",
                imagePath: "/assets/exercises/jumping jacks.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "High Knees",
                imagePath: "/assets/exercises/high knees.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "High Knees",
                imagePath: "/assets/exercises/high knees.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "High Knees",
                imagePath: "/assets/exercises/high knees.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "High Knees",
                imagePath: "/assets/exercises/high knees.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Box Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Box Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Box Step-Up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "High Knees",
              imagePath: "/assets/exercises/high knees.png",
              holdSeconds: 30,
              specialInstruction: "30-second High Knees — max effort",
            },
            defaultImagePath: "/assets/exercises/high knees.png",
          },
          // Diamonds — Crawling family (Bear Crawl / Crab Walk / Lateral Shuffle / Queen=Bear Crawl Sprint)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/bear crawl.png",
                eachLeg: false,
                specialInstruction: "2 m forward + back = 1 rep",
              },
              3: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/bear crawl.png",
                eachLeg: false,
                specialInstruction: "2 m forward + back = 1 rep",
              },
              4: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/bear crawl.png",
                eachLeg: false,
                specialInstruction: "2 m forward + back = 1 rep",
              },
              5: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/bear crawl.png",
                eachLeg: false,
                specialInstruction: "2 m forward + back = 1 rep",
              },
              6: {
                exerciseName: "Crab Walk",
                imagePath: "/assets/exercises/crab walk.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Crab Walk",
                imagePath: "/assets/exercises/crab walk.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Crab Walk",
                imagePath: "/assets/exercises/crab walk.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Crab Walk",
                imagePath: "/assets/exercises/crab walk.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Lateral Shuffle",
                imagePath: "/assets/exercises/lateral shuffle.png",
                eachLeg: false,
                specialInstruction: "3 right + 3 left = 1 rep",
              },
              11: {
                exerciseName: "Lateral Shuffle",
                imagePath: "/assets/exercises/lateral shuffle.png",
                eachLeg: false,
                specialInstruction: "3 right + 3 left = 1 rep",
              },
              12: {
                exerciseName: "Lateral Shuffle",
                imagePath: "/assets/exercises/lateral shuffle.png",
                eachLeg: false,
                specialInstruction: "3 right + 3 left = 1 rep",
              },
            },
            queen: {
              exerciseName: "Bear Crawl Sprint",
              imagePath: "/assets/exercises/bear crawl.png",
              reps: 10,
              specialInstruction: "10 reps as fast as possible",
            },
            defaultImagePath: "/assets/exercises/bear crawl.png",
          },
          // Clubs — Flow family (Squat to Stand / Lunge with Torso Twist / Push-Up to Down Dog / Queen=Squat Thrust)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Squat to Stand",
                imagePath: "/assets/exercises/squat to stand.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Squat to Stand",
                imagePath: "/assets/exercises/squat to stand.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Squat to Stand",
                imagePath: "/assets/exercises/squat to stand.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Squat to Stand",
                imagePath: "/assets/exercises/squat to stand.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Lunge with Torso Twist",
                imagePath: "/assets/exercises/lunge twist.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Lunge with Torso Twist",
                imagePath: "/assets/exercises/lunge twist.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Lunge with Torso Twist",
                imagePath: "/assets/exercises/lunge twist.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Lunge with Torso Twist",
                imagePath: "/assets/exercises/lunge twist.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Push-Up to Down Dog",
                imagePath: "/assets/exercises/push up down dog.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Push-Up to Down Dog",
                imagePath: "/assets/exercises/push up down dog.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Push-Up to Down Dog",
                imagePath: "/assets/exercises/push up down dog.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Squat Thrust",
              imagePath: "/assets/exercises/push up down dog.png",
              reps: 8,
              specialInstruction:
                "Drop to plank, jump back to squat, stand. No push-up.",
            },
            defaultImagePath: "/assets/exercises/squat to stand.png",
          },
        },
        joker: {
          exerciseName: "Full Body Combo",
          imagePath: "/assets/exercises/combo finisher beginner female.png",
          comboList: [
            { reps: 5, exerciseName: "Burpee" },
            { reps: 10, exerciseName: "High Knees" },
            { reps: 5, exerciseName: "Bear Crawl" },
            { reps: 5, exerciseName: "Push-Up to Down Dog" },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Advanced: {
      male: {
        suits: {
          // Spades — Burpee / Pike Push-up family (upper + full)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Shoulder Tap Push-up",
                imagePath: "/assets/exercises/shoulder tap push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Burpee Broad Jump",
              imagePath: "/assets/exercises/broad_jump.png",
              reps: 6,
              specialInstruction:
                "Burpee Broad Jump - 6 reps, explode forward on each jump",
            },
            defaultImagePath: "/assets/exercises/jump_squat.png",
          },
          // Hearts — Alternating / Walking / Lunge with Knee Drive (lower + full, eachLeg)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_new.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Alternating Lunge",
                imagePath: "/assets/exercises/alternating_lunge.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Jumping Lunges",
              imagePath: "/assets/exercises/jumping_lunges.png",
              eachLeg: false,
              reps: 8,
              specialInstruction:
                "Jumping Lunges - 8 reps, switch legs in air each rep",
            },
            defaultImagePath: "/assets/exercises/alternating_lunge.png",
          },
          // Diamonds — Jump Squat / power family (lower power)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Normal Squat",
                imagePath: "/assets/exercises/normal_squat.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Squat Hold",
                imagePath: "/assets/exercises/squat_hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
                specialInstruction: "Hold bottom of squat for 30 seconds",
              },
              8: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Sumo Squat",
                imagePath: "/assets/exercises/sumo_squat.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Squat Hold",
                imagePath: "/assets/exercises/squat_hold.png",
                isIsometric: true,
                holdSeconds: 30,
                eachLeg: false,
                specialInstruction: "Hold bottom of squat for 30 seconds",
              },
              12: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Sumo Jump Squat",
              imagePath: "/assets/exercises/sumo_jump_squat.png",
              reps: 10,
              specialInstruction:
                "Sumo Jump Squat - 10 reps, wide stance, explode up",
            },
            defaultImagePath: "/assets/exercises/jump_squat.png",
          },
          // Clubs — Bear Crawl / Mountain Climber / compound dynamic
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/plank.png",
                eachLeg: false,
                specialInstruction: "Crawl forward and back, low hips",
              },
              3: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/plank.png",
                eachLeg: false,
                specialInstruction: "Crawl forward and back, low hips",
              },
              6: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/plank.png",
                eachLeg: false,
                specialInstruction: "Crawl forward and back, low hips",
              },
              9: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Step-up",
                imagePath: "/assets/exercises/step_up.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Bear Crawl",
                imagePath: "/assets/exercises/plank.png",
                eachLeg: false,
                specialInstruction: "Crawl forward and back, low hips",
              },
              12: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Cross-body Mountain Climber",
              imagePath: "/assets/exercises/high_knee_march.png",
              reps: 12,
              specialInstruction:
                "Cross-body Mountain Climber - 12 reps, drive knee to opposite elbow",
            },
            defaultImagePath: "/assets/exercises/plank.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 8, exerciseName: "Burpee", eachLeg: false },
            { reps: 6, exerciseName: "Walking Lunge", eachLeg: true },
            { reps: 10, exerciseName: "Jump Squat", eachLeg: false },
            { reps: 10, exerciseName: "Mountain Climber", eachLeg: false },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
      female: {
        suits: {
          // Spades — Burpee family (Plyometric / Single-Leg / Box Jump / Queen=Burpee Chin-up)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Plyometric Burpee",
                imagePath: "/assets/exercises/plyo burpee.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Plyometric Burpee",
                imagePath: "/assets/exercises/plyo burpee.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Plyometric Burpee",
                imagePath: "/assets/exercises/plyo burpee.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Plyometric Burpee",
                imagePath: "/assets/exercises/plyo burpee.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Single-Leg Burpee",
                imagePath: "/assets/exercises/single leg burpee.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Single-Leg Burpee",
                imagePath: "/assets/exercises/single leg burpee.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Single-Leg Burpee",
                imagePath: "/assets/exercises/single leg burpee.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Single-Leg Burpee",
                imagePath: "/assets/exercises/single leg burpee.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Burpee Box Jump",
                imagePath: "/assets/exercises/burpee box jump.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Burpee Box Jump",
                imagePath: "/assets/exercises/burpee box jump.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Burpee Box Jump",
                imagePath: "/assets/exercises/burpee box jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Burpee Chin-up",
              imagePath: "/assets/exercises/burpee chin up.png",
              reps: 5,
              specialInstruction: "1 chin-up per burpee — 5 reps",
            },
            defaultImagePath: "/assets/exercises/plyo burpee.png",
          },
          // Hearts — Jump family (Box Jump / Broad Jump / Tuck Jump / Queen=Box Jump to Squat Hold)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Box Jump",
                imagePath: "/assets/exercises/box jump.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Box Jump",
                imagePath: "/assets/exercises/box jump.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Box Jump",
                imagePath: "/assets/exercises/box jump.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Box Jump",
                imagePath: "/assets/exercises/box jump.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Box Jump to Squat Hold",
              imagePath: "/assets/exercises/box jump.png",
              reps: 5,
              specialInstruction: "3 sec hold on landing — 5 reps",
            },
            defaultImagePath: "/assets/exercises/box jump.png",
          },
          // Diamonds — Push-up family (Spider-Man / Archer / Decline+Climber / Queen=Diamond Push-up to Jump Squat)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Spider-Man Push-up",
                imagePath: "/assets/exercises/spiderman push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Spider-Man Push-up",
                imagePath: "/assets/exercises/spiderman push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Spider-Man Push-up",
                imagePath: "/assets/exercises/spiderman push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Spider-Man Push-up",
                imagePath: "/assets/exercises/spiderman push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Archer Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Archer Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Archer Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Archer Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Decline Push-up to Mountain Climber",
                imagePath: "/assets/exercises/decline push up.png",
                eachLeg: false,
                specialInstruction: "1 push-up + 4 climbers = 1 rep",
              },
              11: {
                exerciseName: "Decline Push-up to Mountain Climber",
                imagePath: "/assets/exercises/decline push up.png",
                eachLeg: false,
                specialInstruction: "1 push-up + 4 climbers = 1 rep",
              },
              12: {
                exerciseName: "Decline Push-up to Mountain Climber",
                imagePath: "/assets/exercises/decline push up.png",
                eachLeg: false,
                specialInstruction: "1 push-up + 4 climbers = 1 rep",
              },
            },
            queen: {
              exerciseName: "Diamond Push-up to Jump Squat",
              imagePath: "/assets/exercises/spiderman push up.png",
              reps: 6,
              specialInstruction: "1 diamond push-up + 1 jump squat = 1 rep",
            },
            defaultImagePath: "/assets/exercises/spiderman push up.png",
          },
          // Clubs — Jump Lunge family (Jump Lunge / Lateral / Jump Squat+Lunge / Queen=Non-stop Jump Lunge)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Lateral Jump Lunge",
                imagePath: "/assets/exercises/lateral jump lunge.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Jump Squat to Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
                specialInstruction: "1 jump squat + 2 jump lunges = 1 rep",
              },
              11: {
                exerciseName: "Jump Squat to Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
                specialInstruction: "1 jump squat + 2 jump lunges = 1 rep",
              },
              12: {
                exerciseName: "Jump Squat to Jump Lunge",
                imagePath: "/assets/exercises/jump lunge.png",
                eachLeg: false,
                specialInstruction: "1 jump squat + 2 jump lunges = 1 rep",
              },
            },
            queen: {
              exerciseName: "Non-stop Jump Lunge",
              imagePath: "/assets/exercises/jump lunge.png",
              holdSeconds: 30,
              specialInstruction: "30 sec max reps — timer + rep counter",
            },
            defaultImagePath: "/assets/exercises/jump lunge.png",
          },
        },
        joker: {
          exerciseName: "Full Body Combo",
          imagePath: "/assets/exercises/plyo burpee.png",
          comboList: [
            { reps: 5, exerciseName: "Plyometric Burpee" },
            { reps: 5, exerciseName: "Box Jump" },
            { reps: 5, exerciseName: "Archer Push-up", eachLeg: true },
            { reps: 10, exerciseName: "Jump Lunge" },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
    Pro: {
      male: {
        suits: {
          // Spades — Burpee variations + Pike Push-up (hardest upper + full)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Burpee Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Burpee Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Burpee Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Pike Push-up",
                imagePath: "/assets/exercises/pike push up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Burpee",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Burpee Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Man Maker",
              imagePath: "/assets/exercises/jump_squat.png",
              reps: 5,
              specialInstruction:
                "Man Maker - 5 reps, burpee with a push-up and jump at top",
            },
            defaultImagePath: "/assets/exercises/jump_squat.png",
          },
          // Hearts — Jumping Lunges / Lunge with Knee Drive Pro (lower + full, eachLeg)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_pro.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_pro.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Lunge with Knee Drive",
                imagePath: "/assets/exercises/lunge_knee_drive_pro.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Jumping Lunges",
                imagePath: "/assets/exercises/jumping_lunges.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Walking Lunge",
                imagePath: "/assets/exercises/walking_lunge.png",
                eachLeg: true,
              },
            },
            queen: {
              exerciseName: "Bulgarian Split Squat",
              imagePath: "/assets/exercises/bg_split_squat.png",
              eachLeg: true,
              reps: 6,
              specialInstruction:
                "Bulgarian Split Squat - 6 reps per leg, rear foot elevated",
            },
            defaultImagePath: "/assets/exercises/jumping_lunges.png",
          },
          // Diamonds — Tuck Jump / Broad Jump / Jump Squat (lower power, hardest)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Jump Squat",
                imagePath: "/assets/exercises/jump_squat.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Tuck Jump",
                imagePath: "/assets/exercises/tuck_jump.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Broad Jump",
                imagePath: "/assets/exercises/broad_jump.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Lateral Bound",
              imagePath: "/assets/exercises/lateral_bound.png",
              eachSide: true,
              reps: 6,
              specialInstruction:
                "Lateral Bound - 6 reps per side, explosive side-to-side jump",
            },
            defaultImagePath: "/assets/exercises/tuck_jump.png",
          },
          // Clubs — Inchworm / Mountain Climber / Single-Leg Step-up (compound dynamic, hardest)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/pike hold.png",
                eachLeg: false,
                specialInstruction:
                  "Walk hands out to plank and back, keep legs straight",
              },
              3: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Single-Leg Step-up",
                imagePath: "/assets/exercises/one_leg_step_up.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/pike hold.png",
                eachLeg: false,
                specialInstruction:
                  "Walk hands out to plank and back, keep legs straight",
              },
              6: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Single-Leg Step-up",
                imagePath: "/assets/exercises/one_leg_step_up.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/pike hold.png",
                eachLeg: false,
                specialInstruction:
                  "Walk hands out to plank and back, keep legs straight",
              },
              9: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Single-Leg Step-up",
                imagePath: "/assets/exercises/one_leg_step_up.png",
                eachLeg: true,
              },
              11: {
                exerciseName: "Inchworm",
                imagePath: "/assets/exercises/pike hold.png",
                eachLeg: false,
                specialInstruction:
                  "Walk hands out to plank and back, keep legs straight",
              },
              12: {
                exerciseName: "Mountain Climber",
                imagePath: "/assets/exercises/high_knee_march.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Cross-body Mountain Climber",
              imagePath: "/assets/exercises/high_knee_march.png",
              reps: 15,
              specialInstruction:
                "Cross-body Mountain Climber - 15 reps, drive knee to opposite elbow",
            },
            defaultImagePath: "/assets/exercises/pike hold.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/mbw_logo.png",
          comboList: [
            { reps: 6, exerciseName: "Burpee Broad Jump", eachLeg: false },
            { reps: 6, exerciseName: "Jumping Lunges", eachLeg: false },
            { reps: 8, exerciseName: "Tuck Jump", eachLeg: false },
            { reps: 6, exerciseName: "Single-Leg Step-up", eachLeg: true },
          ],
        },
        jokerCount: 1,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
      female: {
        suits: {
          // Spades — Pull + Push Combo (Burpee Chin-up / Explosive Pull-up / Muscle-Up Attempt / Queen=Pull-up to Dip Complex)
          Spades: {
            cardMap: {
              2: {
                exerciseName: "Burpee Chin-up",
                imagePath: "/assets/exercises/burpee chin up.png",
                eachLeg: false,
                specialInstruction: "1 chin-up at top of every burpee",
              },
              3: {
                exerciseName: "Burpee Chin-up",
                imagePath: "/assets/exercises/burpee chin up.png",
                eachLeg: false,
                specialInstruction: "1 chin-up at top of every burpee",
              },
              4: {
                exerciseName: "Burpee Chin-up",
                imagePath: "/assets/exercises/burpee chin up.png",
                eachLeg: false,
                specialInstruction: "1 chin-up at top of every burpee",
              },
              5: {
                exerciseName: "Burpee Chin-up",
                imagePath: "/assets/exercises/burpee chin up.png",
                eachLeg: false,
                specialInstruction: "1 chin-up at top of every burpee",
              },
              6: {
                exerciseName: "Explosive Pull-up",
                imagePath: "/assets/exercises/explosive pull up.png",
                eachLeg: false,
                specialInstruction:
                  "chest to bar — full dead hang between reps",
              },
              7: {
                exerciseName: "Explosive Pull-up",
                imagePath: "/assets/exercises/explosive pull up.png",
                eachLeg: false,
                specialInstruction:
                  "chest to bar — full dead hang between reps",
              },
              8: {
                exerciseName: "Explosive Pull-up",
                imagePath: "/assets/exercises/explosive pull up.png",
                eachLeg: false,
                specialInstruction:
                  "chest to bar — full dead hang between reps",
              },
              9: {
                exerciseName: "Explosive Pull-up",
                imagePath: "/assets/exercises/explosive pull up.png",
                eachLeg: false,
                specialInstruction:
                  "chest to bar — full dead hang between reps",
              },
              10: {
                exerciseName: "Muscle-Up Attempt",
                imagePath: "/assets/exercises/muscle up.png",
                eachLeg: false,
                specialInstruction:
                  "explosive transition — celebrate every rep",
              },
              11: {
                exerciseName: "Muscle-Up Attempt",
                imagePath: "/assets/exercises/muscle up.png",
                eachLeg: false,
                specialInstruction:
                  "explosive transition — celebrate every rep",
              },
              12: {
                exerciseName: "Muscle-Up Attempt",
                imagePath: "/assets/exercises/muscle up.png",
                eachLeg: false,
                specialInstruction:
                  "explosive transition — celebrate every rep",
              },
            },
            queen: {
              exerciseName: "Pull-up to Dip Complex",
              imagePath: "/assets/exercises/muscle up.png",
              reps: 4,
              specialInstruction: "3 pull-ups + 3 dips = 1 round x 4 rounds",
            },
            defaultImagePath: "/assets/exercises/muscle up.png",
          },
          // Hearts — Plyometric Push (Clapping / Plyo / Archer Plyo / Queen=Max Clapping Push-ups)
          Hearts: {
            cardMap: {
              2: {
                exerciseName: "Clapping Push-up",
                imagePath: "/assets/exercises/clapping push up.png",
                eachLeg: false,
              },
              3: {
                exerciseName: "Clapping Push-up",
                imagePath: "/assets/exercises/clapping push up.png",
                eachLeg: false,
              },
              4: {
                exerciseName: "Clapping Push-up",
                imagePath: "/assets/exercises/clapping push up.png",
                eachLeg: false,
              },
              5: {
                exerciseName: "Clapping Push-up",
                imagePath: "/assets/exercises/clapping push up.png",
                eachLeg: false,
              },
              6: {
                exerciseName: "Plyometric Push-up",
                imagePath: "/assets/exercises/plyo push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Plyometric Push-up",
                imagePath: "/assets/exercises/plyo push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Plyometric Push-up",
                imagePath: "/assets/exercises/plyo push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Plyometric Push-up",
                imagePath: "/assets/exercises/plyo push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Archer Plyometric Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
                specialInstruction: "explosive lateral transfer",
              },
              11: {
                exerciseName: "Archer Plyometric Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
                specialInstruction: "explosive lateral transfer",
              },
              12: {
                exerciseName: "Archer Plyometric Push-up",
                imagePath: "/assets/exercises/archer push up.png",
                eachLeg: false,
                specialInstruction: "explosive lateral transfer",
              },
            },
            queen: {
              exerciseName: "Max Clapping Push-ups",
              imagePath: "/assets/exercises/clapping push up.png",
              holdSeconds: 30,
              specialInstruction: "30 sec max reps",
            },
            defaultImagePath: "/assets/exercises/clapping push up.png",
          },
          // Diamonds — Pistol Complex (Pistol Squat / Pistol to Jump / Pistol Burpee / Queen=Pistol Complex)
          Diamonds: {
            cardMap: {
              2: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
              },
              3: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
              },
              4: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
              },
              5: {
                exerciseName: "Pistol Squat",
                imagePath: "/assets/exercises/pistol squat.png",
                eachLeg: true,
              },
              6: {
                exerciseName: "Pistol Squat to Jump",
                imagePath: "/assets/exercises/pistol jump.png",
                eachLeg: true,
              },
              7: {
                exerciseName: "Pistol Squat to Jump",
                imagePath: "/assets/exercises/pistol jump.png",
                eachLeg: true,
              },
              8: {
                exerciseName: "Pistol Squat to Jump",
                imagePath: "/assets/exercises/pistol jump.png",
                eachLeg: true,
              },
              9: {
                exerciseName: "Pistol Squat to Jump",
                imagePath: "/assets/exercises/pistol jump.png",
                eachLeg: true,
              },
              10: {
                exerciseName: "Pistol Burpee",
                imagePath: "/assets/exercises/pistol burpee.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Pistol Burpee",
                imagePath: "/assets/exercises/pistol burpee.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Pistol Burpee",
                imagePath: "/assets/exercises/pistol burpee.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Pistol Complex",
              imagePath: "/assets/exercises/pistol squat.png",
              eachSide: true,
              specialInstruction:
                "3 pistol squats + 3 jump squats each side without rest",
            },
            defaultImagePath: "/assets/exercises/pistol squat.png",
          },
          // Clubs — Handstand + Elite Push (HSPU Negative / HSPU / Typewriter / Queen=Freestanding Handstand Attempt)
          Clubs: {
            cardMap: {
              2: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
                holdSeconds: 5,
                specialInstruction: "5-second descent",
              },
              3: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
                holdSeconds: 5,
                specialInstruction: "5-second descent",
              },
              4: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
                holdSeconds: 5,
                specialInstruction: "5-second descent",
              },
              5: {
                exerciseName: "Handstand Push-up Negative",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
                holdSeconds: 5,
                specialInstruction: "5-second descent",
              },
              6: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
              },
              7: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
              },
              8: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
              },
              9: {
                exerciseName: "Handstand Push-up",
                imagePath: "/assets/exercises/handstand push up.png",
                eachLeg: false,
              },
              10: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/typewriter push up.png",
                eachLeg: false,
              },
              11: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/typewriter push up.png",
                eachLeg: false,
              },
              12: {
                exerciseName: "Typewriter Push-up",
                imagePath: "/assets/exercises/typewriter push up.png",
                eachLeg: false,
              },
            },
            queen: {
              exerciseName: "Freestanding Handstand Attempt",
              imagePath: "/assets/exercises/handstand push up.png",
              isIsometric: true,
              specialInstruction: "max hold — running timer",
            },
            defaultImagePath: "/assets/exercises/handstand push up.png",
          },
        },
        joker: {
          exerciseName: "Joker Combo",
          imagePath: "/assets/exercises/muscle up.png",
          comboList: [
            { reps: 3, exerciseName: "Muscle-Up Attempt", eachLeg: false },
            { reps: 3, exerciseName: "Clapping Push-up", eachLeg: false },
            { reps: 3, exerciseName: "Pistol Squat", eachLeg: true },
            { reps: 3, exerciseName: "Handstand Push-up", eachLeg: false },
          ],
        },
        jokerCount: 2,
        aceImagePath: "/assets/exercises/Last excersie x2.png",
        kingImagePath: "/assets/exercises/dividng by 2.png",
      } as DeckExerciseConfig,
    },
  },
};

/**
 * Returns the 4 exercise names for each suit given category, difficulty and gender.
 * Returns null if the deck uses a rich DeckExerciseConfig instead of a simple tuple.
 */
export function getDeckExercises(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender = "male",
): [string, string, string, string] | null {
  const entry = DECK_EXERCISES[category]?.[difficulty];
  if (!entry) return null;
  if (isRichConfig(entry)) return null; // rich config — no simple 4-tuple
  const simple = (entry as DeckExerciseSet)[gender];
  // Empty array (cleared deck) or rich config slipped through — no 4-tuple
  if (!Array.isArray(simple) || simple.length === 0) return null;
  return simple as [string, string, string, string];
}

/**
 * Returns the rich DeckExerciseConfig for decks that use per-card exercise mapping.
 * Returns null for simple DeckExerciseSet decks, or when the selected gender's
 * entry is empty (cleared deck, e.g. male Upper Body).
 */
export function getDeckExerciseConfig(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender = "male",
): DeckExerciseConfig | null {
  const entry = DECK_EXERCISES[category]?.[difficulty];
  if (!entry || !isRichConfig(entry)) return null;
  const cfg = (entry as Record<string, DeckExerciseConfig | string[]>)[gender];
  // Empty array (cleared deck) is not a valid DeckExerciseConfig
  if (!cfg || Array.isArray(cfg)) return null;
  return cfg;
}

/** Returns the deduplicated list of unique exercise names for a given deck/gender (for the exclude modal). */
export function getDeckExerciseList(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender = "male",
): string[] {
  const config = getDeckExerciseConfig(category, difficulty, gender);
  if (config) {
    const names = new Set<string>();
    for (const suit of Object.values(config.suits)) {
      for (const entry of Object.values(suit.cardMap)) {
        names.add((entry as SuitExerciseEntry).exerciseName);
      }
      names.add(suit.queen.exerciseName);
    }
    if (config.joker) {
      names.add(config.joker.exerciseName);
    }
    return [...names];
  }
  const simple = getDeckExercises(category, difficulty, gender);
  return [...new Set(simple ?? [])];
}

/** Build a suit→exercise map from the 4 exercises for the chosen deck/gender. */
function buildSuitExerciseMap(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender,
): Record<SuitKey, string> {
  const simple = getDeckExercises(category, difficulty, gender);
  const [hearts, spades, clubs, diamonds] = simple ?? [
    "Push-Up",
    "Pull-Up",
    "Row",
    "Dip",
  ];
  return {
    Hearts: hearts,
    Spades: spades,
    Clubs: clubs,
    Diamonds: diamonds,
  };
}

/**
 * Swaps a card's exercise for its bodyweight-friendly substitute when the
 * user doesn't own the equipment it calls for. Runs on an already
 * gender-resolved entry, so the substitute's imagePath just needs to be
 * authored correctly once per occurrence — no separate gender plumbing.
 */
function applySubstitution(
  entry: SuitExerciseEntry,
  equipment: EquipmentProfile,
): SuitExerciseEntry {
  if (!entry.requiresEquipment || !entry.substitute) return entry;
  if (equipment[entry.requiresEquipment]) return entry;
  // The substitute is the bodyweight stand-in — it doesn't actually use the
  // equipment, so requiresEquipment must be cleared along with the swap
  // (otherwise a substituted card would still be flagged as having used
  // gear the session never touched).
  return { ...entry, ...entry.substitute, requiresEquipment: undefined };
}

function buildFullDeck(
  suitExerciseMap: Record<SuitKey, string>,
  richConfig?: DeckExerciseConfig | null,
  deckCategory?: string,
  equipment: EquipmentProfile = {
    weightVest: false,
    resistanceBandLong: false,
    resistanceBandShort: false,
    rings: false,
  },
): LocalCard[] {
  const suits: SuitKey[] = ["Hearts", "Spades", "Clubs", "Diamonds"];
  const suitsWithAceKing: SuitKey[] = ["Hearts", "Spades"];
  const cards: LocalCard[] = [];

  for (const suit of suits) {
    for (const rank of RANKS) {
      const isAce = rank === "Ace";
      const isKing = rank === "King";
      if ((isAce || isKing) && !suitsWithAceKing.includes(suit)) continue;

      if (richConfig) {
        // Rich path: Queen gets special entry, numbers get per-card entry
        const suitCfg = richConfig.suits[suit];
        if (!suitCfg) continue;
        if (isAce || isKing) {
          cards.push({
            id: `${suit}-${rank}`,
            rank,
            suit,
            exerciseName: "",
            reps: 0,
            isJoker: false,
            isAce,
            isKing,
            imagePath: isAce
              ? richConfig.aceImagePath
              : richConfig.kingImagePath,
            deckCategory,
          });
          continue;
        }
        const rankNum = Number(rank);
        const isQueen = rank === "Queen";
        const rawEntry = isQueen
          ? suitCfg.queen
          : (suitCfg.cardMap[rankNum] ?? {
              exerciseName: "",
              imagePath: suitCfg.defaultImagePath,
              eachLeg: false,
            });
        const entry = applySubstitution(rawEntry, equipment);
        cards.push({
          id: `${suit}-${rank}`,
          rank,
          suit,
          exerciseName: entry.exerciseName,
          reps: isQueen ? (entry.reps ?? 0) : rankNum,
          isJoker: false,
          isAce: false,
          isKing: false,
          eachLeg: entry.eachLeg,
          eachSide: entry.eachSide,
          holdSeconds: entry.holdSeconds,
          specialInstruction: entry.specialInstruction,
          imagePath: entry.imagePath,
          illustrationComingSoon: entry.illustrationComingSoon,
          deckCategory,
          // applySubstitution already swapped this out for the bodyweight
          // substitute when the equipment isn't owned, so a surviving
          // requiresEquipment here means the card actually needs it.
          requiresEquipment: entry.requiresEquipment,
        });
      } else {
        // Simple path
        const rankNum = isAce || isKing ? 0 : Number(rank);
        const exerciseName =
          isAce || isKing ? "" : (suitExerciseMap[suit] ?? "");
        cards.push({
          id: `${suit}-${rank}`,
          rank,
          suit,
          exerciseName,
          reps: rankNum,
          isJoker: false,
          isAce,
          isKing,
          deckCategory,
        });
      }
    }
  }

  // 2 Jokers
  for (let j = 0; j < 2; j++) {
    const challenge = randChallenge();
    const jokerName = richConfig?.joker?.exerciseName ?? "Dead Hang";
    const jokerImg = richConfig?.joker?.imagePath;
    const jokerCombo = richConfig?.joker?.comboList;
    cards.push({
      id: `Joker-${j}`,
      rank: "Joker",
      suit: "Joker",
      exerciseName: jokerName,
      reps: 30,
      isJoker: true,
      isAce: false,
      isKing: false,
      challenge,
      imagePath: jokerImg,
      jokerComboList: jokerCombo,
      deckCategory,
    });
  }

  return cards;
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export function cardCountToNumber(cc: CardCount): number {
  if (cc === CardCount.Ten) return 10;
  if (cc === CardCount.Twenty) return 20;
  return 52;
}

function ensureNoConsecutiveExercises(deck: LocalCard[]): LocalCard[] {
  if (deck.length < 2) return deck;

  // Build effective exercise names for each position
  const effective: string[] = [];
  for (let i = 0; i < deck.length; i++) {
    const card = deck[i]!;
    if (card.isAce || card.isKing) {
      // Look back to find the previous non-modifier card
      let prev = "";
      for (let j = i - 1; j >= 0; j--) {
        if (!deck[j]!.isAce && !deck[j]!.isKing) {
          prev = deck[j]!.exerciseName;
          break;
        }
      }
      effective.push(prev);
    } else {
      effective.push(card.exerciseName);
    }
  }

  let changed = true;
  let iterations = 0;
  const maxIterations = deck.length * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let i = 0; i < deck.length - 1; i++) {
      if (effective[i] === effective[i + 1] && effective[i] !== "") {
        // Find next card with a different effective exercise
        let swapIdx = -1;
        for (let j = i + 2; j < deck.length; j++) {
          const cardJ = deck[j]!;
          const effJ =
            cardJ.isAce || cardJ.isKing ? effective[j] : cardJ.exerciseName;
          if (effJ !== effective[i]) {
            swapIdx = j;
            break;
          }
        }

        if (swapIdx === -1) {
          // Try searching from the end of the deck for any different exercise
          for (let j = deck.length - 1; j > i + 1; j--) {
            const cardJ = deck[j]!;
            const effJ =
              cardJ.isAce || cardJ.isKing ? effective[j] : cardJ.exerciseName;
            if (effJ !== effective[i]) {
              swapIdx = j;
              break;
            }
          }
        }

        if (swapIdx > i + 1) {
          // Swap positions i+1 and swapIdx
          const temp = deck[i + 1]!;
          deck[i + 1] = deck[swapIdx]!;
          deck[swapIdx] = temp;

          // Rebuild effective array from position i onward
          for (let k = i; k < deck.length; k++) {
            const card = deck[k]!;
            if (card.isAce || card.isKing) {
              let prev = "";
              for (let j = k - 1; j >= 0; j--) {
                if (!deck[j]!.isAce && !deck[j]!.isKing) {
                  prev = deck[j]!.exerciseName;
                  break;
                }
              }
              effective[k] = prev;
            } else {
              effective[k] = card.exerciseName;
            }
          }
          changed = true;
        }
      }
    }
  }

  return deck;
}

// ─── Movement Category System ─────────────────────────────────────────────────

/**
 * The five movement categories every exercise maps to exactly one of.
 */
export type MovementCategory = "Push" | "Pull" | "Dip" | "Core" | "Legs";

/**
 * Maps an exercise name to one of the five movement categories using
 * keyword matching. Order matters: more specific phrases (e.g. "leg raise"
 * → Core, "pike" → Push) are checked before broad keywords (e.g. "leg" → Legs)
 * so that edge cases like "Pike Hold" (a shoulder/push exercise) and
 * "Leg Raise" (a core exercise) classify correctly.
 */
export function getMovementCategory(exerciseName: string): MovementCategory {
  const name = (exerciseName ?? "").toLowerCase();

  // Push — any push-up variant, pike (shoulder), handstand, shoulder tap.
  // Checked first so "Plank to Push-up" and "Pike Hold" land here, not Core.
  if (
    name.includes("push-up") ||
    name.includes("pushup") ||
    name.includes("push up") ||
    name.includes("pike") ||
    name.includes("handstand") ||
    name.includes("shoulder tap") ||
    name.includes("dive bomber")
  ) {
    return "Push";
  }

  // Pull — pull-up / chin-up / row variants, hangs (grip/pull).
  if (
    name.includes("pull-up") ||
    name.includes("pullup") ||
    name.includes("pull up") ||
    name.includes("chin-up") ||
    name.includes("chinup") ||
    name.includes("chin up") ||
    name.includes("row") ||
    name.includes("commando") ||
    name.includes("hang")
  ) {
    return "Pull";
  }

  // Dip — any dip variant.
  if (name.includes("dip")) {
    return "Dip";
  }

  // Core — checked before Legs so "leg raise" → Core (not Legs via "leg"),
  // and "sit-up" (hyphen) is used instead of "sit up" so "wall sit" stays Legs.
  if (
    name.includes("leg raise") ||
    name.includes("sit-up") ||
    name.includes("situp") ||
    name.includes("crunch") ||
    name.includes("plank") ||
    name.includes("hollow") ||
    name.includes("dead bug") ||
    name.includes("superman") ||
    name.includes("l-sit") ||
    name.includes("lsit") ||
    name.includes("v-up") ||
    name.includes("vup") ||
    name.includes("twist") ||
    name.includes("mountain climber") ||
    name.includes("climber") ||
    name.includes("march") ||
    name.includes("bicycle") ||
    name.includes("inchworm") ||
    name.includes("crawl") ||
    name.includes("core")
  ) {
    return "Core";
  }

  // Legs — squats, lunges, jumps, bounds, calf, step-ups, glute/hip, burpees.
  if (
    name.includes("squat") ||
    name.includes("lunge") ||
    name.includes("jump") ||
    name.includes("bound") ||
    name.includes("calf") ||
    name.includes("step-up") ||
    name.includes("stepup") ||
    name.includes("step up") ||
    name.includes("wall sit") ||
    name.includes("glute") ||
    name.includes("hip") ||
    name.includes("leg") ||
    name.includes("burpee") ||
    name.includes("man maker") ||
    name.includes("good morning") ||
    name.includes("balance")
  ) {
    return "Legs";
  }

  // Fallback: unknown exercises default to Core (neutral, low collision risk).
  return "Core";
}

/**
 * Returns the effective movement category of a single card in a deck.
 *
 * - Ace / King (modifiers with no own exercise) inherit the category of the
 *   nearest preceding non-modifier card, mirroring how their reps are resolved
 *   from the previous card during the workout.
 * - Jokers with a combo list use the category of the first exercise in the
 *   combo (per spec). Jokers without a combo use their own exercise name.
 * - Queens and number cards use their own exercise name.
 */
function getCardMovementCategory(
  card: LocalCard,
  index: number,
  deck: LocalCard[],
): string {
  if (card.isAce || card.isKing) {
    for (let j = index - 1; j >= 0; j--) {
      const prev = deck[j]!;
      if (!prev.isAce && !prev.isKing) {
        return getMovementCategory(prev.exerciseName);
      }
    }
    // No preceding non-modifier card: no inherited category → cannot collide.
    return "";
  }
  if (card.isJoker && card.jokerComboList && card.jokerComboList.length > 0) {
    return getMovementCategory(card.jokerComboList[0]!.exerciseName);
  }
  return getMovementCategory(card.exerciseName);
}

/**
 * Generic second shuffle pass: reorders `items` so that no two consecutive
 * items share the same category (computed via `getCategory`, which may depend
 * on position — e.g. Ace/King inherit the previous card's category).
 *
 * Algorithm (per spec): iterate the deck. When item N and N+1 share a
 * category, swap item N+1 with the nearest item after N+1 that has a
 * different category. If none exists after N+1, look before N. Repeat until
 * no consecutive same-category pairs remain or no more swaps can be made.
 *
 * Modifier guard: Ace/King cards are never moved by this pass (their reps are
 * tied to the previous card). When a collision involves a modifier, the
 * non-modifier neighbour is swapped instead, preserving the modifier placement
 * established by applyCardDistributionAlgorithm.
 */
export function reorderNoConsecutiveCategories<T>(
  items: T[],
  getCategory: (item: T, index: number, arr: T[]) => string,
  isModifier?: (item: T) => boolean,
): T[] {
  const deck = [...items];
  if (deck.length < 2) return deck;

  const maxIterations = deck.length * 3;
  let iterations = 0;
  let changed = true;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Recompute effective categories each pass (Ace/King depend on position).
    const eff = deck.map((c, i) => getCategory(c, i, deck));

    for (let i = 0; i < deck.length - 1; i++) {
      const a = eff[i]!;
      const b = eff[i + 1]!;
      if (a === "" || b === "" || a !== b) continue;

      // Decide which side to swap. Prefer swapping the non-modifier so that
      // Ace/King cards stay anchored to the card they modify.
      const iIsMod = isModifier ? isModifier(deck[i]!) : false;
      const jIsMod = isModifier ? isModifier(deck[i + 1]!) : false;
      let swapMover: number; // index whose position changes
      if (iIsMod && jIsMod) continue; // shouldn't happen post-Rule2; skip
      if (jIsMod)
        swapMover = i; // move the non-modifier at i
      else swapMover = i + 1; // default per spec: move N+1

      const anchorCat = swapMover === i + 1 ? a : b; // category we're escaping

      // 1) Nearest different-category card after N+1.
      let swapIdx = -1;
      for (let j = i + 2; j < deck.length; j++) {
        const ej = eff[j]!;
        if (ej !== "" && ej !== anchorCat) {
          swapIdx = j;
          break;
        }
      }
      // 2) Fallback: look before N.
      if (swapIdx === -1) {
        for (let j = i - 1; j >= 0; j--) {
          const ej = eff[j]!;
          if (ej !== "" && ej !== anchorCat) {
            swapIdx = j;
            break;
          }
        }
      }

      if (swapIdx === -1) continue; // no candidate — leave this pair

      // Don't move a modifier into the swap target's slot if that would break
      // modifier placement (index 0 or adjacent to another modifier).
      if (isModifier?.(deck[swapMover]!)) {
        const targetIdx = swapIdx;
        if (targetIdx === 0) continue;
        const before = deck[targetIdx - 1];
        const after = deck[targetIdx + 1];
        if (before && isModifier(before)) continue;
        if (after && isModifier(after)) continue;
      }

      [deck[swapMover], deck[swapIdx]] = [deck[swapIdx]!, deck[swapMover]!];
      changed = true;
      break; // recompute effective categories after the swap
    }
  }

  return deck;
}

/**
 * Second shuffle pass for the workout deck: ensures no two consecutive cards
 * share the same movement category (Push / Pull / Dip / Core / Legs). Runs
 * AFTER fisherYatesShuffle, ensureNoConsecutiveExercises, and
 * applyCardDistributionAlgorithm — it only validates and fixes collisions,
 * it does not remove the initial randomness.
 */
export function ensureNoConsecutiveMovementCategories(
  deck: LocalCard[],
): LocalCard[] {
  return reorderNoConsecutiveCategories(
    deck,
    getCardMovementCategory,
    (c) => c.isAce || c.isKing,
  );
}

// ─── Global Card Distribution Algorithm ────────────────────────────────────────

export function applyCardDistributionAlgorithm(
  cards: LocalCard[],
  difficulty: "Beginner" | "Advanced" | "Pro",
  sessionLength: number,
): LocalCard[] {
  let deck = [...cards];

  // ── Rule 1: Joker Cap ────────────────────────────────────────────────────────
  const isJokerCard = (c: LocalCard) => !!c.jokerComboList || c.isJoker;

  if (difficulty === "Pro") {
    // Max 2 jokers. Keep only 2, remove the rest.
    let jokerCount = 0;
    deck = deck.filter((c) => {
      if (!isJokerCard(c)) return true;
      jokerCount++;
      return jokerCount <= 2;
    });
    // Enforce: first joker cannot appear before index 24, second before index 49.
    const jokerIndices = deck
      .map((c, i) => (isJokerCard(c) ? i : -1))
      .filter((i) => i >= 0);
    if (jokerIndices.length >= 1 && jokerIndices[0]! < 24) {
      const ji = jokerIndices[0]!;
      const [joker] = deck.splice(ji, 1);
      deck.splice(24, 0, joker!);
    }
    if (jokerIndices.length >= 2) {
      const newJIdx = deck
        .map((c, i) => (isJokerCard(c) ? i : -1))
        .filter((i) => i >= 0);
      if (newJIdx.length >= 2 && newJIdx[1]! < 49) {
        const ji = newJIdx[1]!;
        const [joker] = deck.splice(ji, 1);
        deck.splice(Math.min(49, deck.length), 0, joker!);
      }
      // No consecutive jokers
      const jIdx2 = deck
        .map((c, i) => (isJokerCard(c) ? i : -1))
        .filter((i) => i >= 0);
      if (jIdx2.length >= 2 && jIdx2[1]! === jIdx2[0]! + 1) {
        const ji = jIdx2[1]!;
        const [joker] = deck.splice(ji, 1);
        deck.splice(Math.min(ji + 2, deck.length), 0, joker!);
      }
    }
  } else {
    // Beginner/Advanced: keep max 1 joker
    let jokerCount = 0;
    deck = deck.filter((c) => {
      if (!isJokerCard(c)) return true;
      jokerCount++;
      return jokerCount <= 1;
    });
  }

  // ── Rule 2: Ace and King Frequency ──────────────────────────────────────────
  // Total modifier count (Ace ×2 + King ÷2 combined) scales with session
  // length only — the same target range applies to every difficulty and
  // every deck: 2 in a 10-card session, 3 in a 20-card session, and 4-6 in
  // a full 52-card deck.
  const isModifier = (c: LocalCard) => c.isAce || c.isKing;

  let totalModifierMin: number;
  let totalModifierMax: number;
  if (sessionLength <= 10) {
    totalModifierMin = 2;
    totalModifierMax = 2;
  } else if (sessionLength <= 20) {
    totalModifierMin = 3;
    totalModifierMax = 3;
  } else {
    totalModifierMin = 4;
    totalModifierMax = 6;
  }
  const totalModifierTarget =
    totalModifierMin +
    Math.floor(Math.random() * (totalModifierMax - totalModifierMin + 1));

  // Split as evenly as possible between Ace and King; an odd total goes
  // randomly to one side so it isn't always the same modifier that "wins".
  const modifierHalf = Math.floor(totalModifierTarget / 2);
  const oddModifier = totalModifierTarget % 2;
  const oddGoesToAce = oddModifier === 1 && Math.random() < 0.5;
  const aceTarget = modifierHalf + (oddGoesToAce ? 1 : 0);
  const kingTarget = modifierHalf + (oddModifier === 1 && !oddGoesToAce ? 1 : 0);

  const currentAces = deck.filter((c) => c.isAce);
  const currentKings = deck.filter((c) => c.isKing);

  // Trim excess aces
  if (currentAces.length > aceTarget) {
    let removed = 0;
    deck = deck.filter((c) => {
      if (!c.isAce) return true;
      if (removed < currentAces.length - aceTarget) {
        removed++;
        return false;
      }
      return true;
    });
  }
  // Trim excess kings
  if (currentKings.length > kingTarget) {
    let removed = 0;
    deck = deck.filter((c) => {
      if (!c.isKing) return true;
      if (removed < currentKings.length - kingTarget) {
        removed++;
        return false;
      }
      return true;
    });
  }
  // buildLocalDeck always builds the FULL ~54-card pool here (this function
  // has no idea the caller is about to do `full.slice(0, cardCount)`), so a
  // modifier that's merely "kept" by the trim above can still end up
  // shuffled past the slice cutoff and never actually be drawn. Every kept
  // or added modifier below must land within the first `sessionLength`
  // cards — that's the only slice of `deck` the player will ever see.
  const windowSize = Math.max(2, Math.min(sessionLength, deck.length));

  // Relocate any surviving ace/king that landed outside the visible window.
  const relocateIntoWindow = (isTarget: (c: LocalCard) => boolean) => {
    for (let i = deck.length - 1; i >= windowSize; i--) {
      if (!isTarget(deck[i]!)) continue;
      const [card] = deck.splice(i, 1);
      const pos = 1 + Math.floor(Math.random() * (windowSize - 1));
      deck.splice(pos, 0, card!);
    }
  };
  relocateIntoWindow((c) => c.isAce);
  relocateIntoWindow((c) => c.isKing);

  // Add missing aces
  const acesNow = deck.filter((c) => c.isAce);
  const kingsNow = deck.filter((c) => c.isKing);
  const aceTemplate: LocalCard = acesNow[0] ?? {
    id: "Hearts-Ace",
    rank: "Ace",
    suit: "Hearts",
    exerciseName: "",
    reps: 0,
    isJoker: false,
    isAce: true,
    isKing: false,
  };
  const kingTemplate: LocalCard = kingsNow[0] ?? {
    id: "Spades-King",
    rank: "King",
    suit: "Spades",
    exerciseName: "",
    reps: 0,
    isJoker: false,
    isAce: false,
    isKing: true,
  };
  for (let i = acesNow.length; i < aceTarget; i++) {
    let pos = 1 + Math.floor(Math.random() * (windowSize - 1));
    if (deck[pos - 1] && isModifier(deck[pos - 1]!))
      pos = Math.min(pos + 2, windowSize);
    deck.splice(pos, 0, { ...aceTemplate, id: `Hearts-Ace-extra-${i}` });
  }
  for (let i = kingsNow.length; i < kingTarget; i++) {
    let pos = 1 + Math.floor(Math.random() * (windowSize - 1));
    if (deck[pos - 1] && isModifier(deck[pos - 1]!))
      pos = Math.min(pos + 2, windowSize);
    deck.splice(pos, 0, { ...kingTemplate, id: `Spades-King-extra-${i}` });
  }

  // Fix: no modifier at index 0, no consecutive modifier pairs — prefer a
  // swap partner still inside the visible window so the fix-up never
  // shuffles a modifier back out past the slice cutoff.
  if (deck.length > 0 && deck[0] && isModifier(deck[0]!)) {
    let swapIdx = deck.findIndex(
      (c, i) => i > 0 && i < windowSize && !isModifier(c),
    );
    if (swapIdx === -1) {
      swapIdx = deck.findIndex((c, i) => i > 0 && !isModifier(c));
    }
    if (swapIdx > 0) {
      [deck[0], deck[swapIdx]] = [deck[swapIdx]!, deck[0]!];
    }
  }
  for (let i = 0; i < deck.length - 1; i++) {
    if (
      deck[i] &&
      deck[i + 1] &&
      isModifier(deck[i]!) &&
      isModifier(deck[i + 1]!)
    ) {
      let swapIdx = deck.findIndex(
        (c, j) => j > i + 1 && j < windowSize && !isModifier(c),
      );
      if (swapIdx === -1) {
        swapIdx = deck.findIndex((c, j) => j > i + 1 && !isModifier(c));
      }
      if (swapIdx > i + 1) {
        [deck[i + 1], deck[swapIdx]] = [deck[swapIdx]!, deck[i + 1]!];
      }
    }
  }

  // ── Rule 3: No Consecutive Same Suit ────────────────────────────────────────
  let changed3 = true;
  let iter3 = 0;
  while (changed3 && iter3++ < deck.length * 3) {
    changed3 = false;
    for (let i = 0; i < deck.length - 1; i++) {
      const a = deck[i]!;
      const b = deck[i + 1]!;
      if (!a || !b || isModifier(a) || isModifier(b)) continue;
      if (a.suit === b.suit && a.suit !== "Joker") {
        let swapIdx = -1;
        for (let j = i + 2; j < deck.length; j++) {
          const dj = deck[j]!;
          if (!isModifier(dj) && dj.suit !== a.suit && dj.suit !== "Joker") {
            swapIdx = j;
            break;
          }
        }
        if (swapIdx > i + 1) {
          [deck[i + 1], deck[swapIdx]] = [deck[swapIdx]!, deck[i + 1]!];
          changed3 = true;
        }
      }
    }
  }

  // ── Rule 4: Exercise Variety by Session Length ───────────────────────────────
  const sessionSlice = deck.slice(0, sessionLength);
  const distinctExercises = new Set(
    sessionSlice
      .filter((c) => !isModifier(c) && !isJokerCard(c))
      .map((c) => c.exerciseName),
  );
  let minDistinct = 4;
  if (sessionLength > 10 && sessionLength <= 20) minDistinct = 6;
  else if (sessionLength >= 21) minDistinct = 7;

  if (distinctExercises.size < minDistinct) {
    const allExercises = [
      ...new Set(
        deck
          .filter((c) => !isModifier(c) && !isJokerCard(c))
          .map((c) => c.exerciseName),
      ),
    ];
    const underRepresented = allExercises.filter(
      (e) => !distinctExercises.has(e),
    );
    let swapsNeeded = minDistinct - distinctExercises.size;
    for (const exercise of underRepresented) {
      if (swapsNeeded <= 0) break;
      const srcIdx = deck.findIndex(
        (c, i) =>
          i >= sessionLength && c.exerciseName === exercise && !isModifier(c),
      );
      if (srcIdx === -1) continue;
      const exerciseCounts = new Map<string, number[]>();
      for (let i = 0; i < Math.min(sessionLength, deck.length); i++) {
        const c = deck[i]!;
        if (!c || isModifier(c) || isJokerCard(c)) continue;
        const arr = exerciseCounts.get(c.exerciseName) ?? [];
        arr.push(i);
        exerciseCounts.set(c.exerciseName, arr);
      }
      let tgtIdx = -1;
      let maxCount = 0;
      for (const [, indices] of exerciseCounts) {
        if (indices.length > maxCount && indices.length > 1) {
          maxCount = indices.length;
          tgtIdx = indices[indices.length - 1]!;
        }
      }
      if (tgtIdx >= 0) {
        [deck[tgtIdx], deck[srcIdx]] = [deck[srcIdx]!, deck[tgtIdx]!];
        distinctExercises.add(exercise);
        swapsNeeded--;
      }
    }
  }

  return deck;
}

const NO_EQUIPMENT: EquipmentProfile = {
  weightVest: false,
  resistanceBandLong: false,
  resistanceBandShort: false,
  rings: false,
};

/** Mirrors the gender-lookup pattern above — reads whichever onboarding
 * blob is active (guest vs. logged-in) directly from localStorage. */
export function readEquipmentProfile(guestMode: boolean): EquipmentProfile {
  try {
    const key = guestMode ? "mbw_guest_onboarding" : "mbw_onboarding";
    const raw = localStorage.getItem(key);
    if (!raw) return NO_EQUIPMENT;
    const parsed = JSON.parse(raw) as { equipment?: EquipmentProfile };
    return parsed.equipment ?? NO_EQUIPMENT;
  } catch {
    return NO_EQUIPMENT;
  }
}

function buildLocalDeck(
  _deckId: string,
  cardCount: number,
  category: DeckCategory = "UpperBody",
  difficulty: DeckDifficulty = "Beginner",
  gender: WorkoutGender = "male",
  equipment: EquipmentProfile = NO_EQUIPMENT,
  /** The session length actually requested by the user (10/20/52) — kept
   * separate from `cardCount`, which callers pad with extra headroom so
   * there are still enough cards left after exclusion-filtering. Passing
   * the padded value into the distribution algorithm below used to
   * corrupt its Ace/King frequency targets and its exercise-variety
   * window (both are threshold-based on session length), which is why the
   * ×2/÷2 modifier cards behaved inconsistently — most reliably showing up
   * only once the "real" window had already passed and they'd been
   * shuffled toward the end of the padded pool. */
  sessionLength: number = cardCount,
): LocalCard[] {
  const richConfig = getDeckExerciseConfig(category, difficulty, gender);
  const simple = getDeckExercises(category, difficulty, gender);

  // Intentionally-empty deck (e.g. men's Core/FullBody, all women's decks):
  // no rich config and no simple 4-tuple. Return an empty deck gracefully
  // instead of fabricating default exercises.
  if (!richConfig && !simple) {
    return [];
  }

  const suitMap = buildSuitExerciseMap(category, difficulty, gender);
  let full = fisherYatesShuffle(
    buildFullDeck(suitMap, richConfig, category, equipment),
  );

  // Never start with King or Ace — swap with first non-modifier card
  if (full.length > 0 && (full[0]?.isAce || full[0]?.isKing)) {
    const swapIdx = full.findIndex((c, i) => i > 0 && !c.isAce && !c.isKing);
    if (swapIdx > 0) {
      const temp = full[0]!;
      full[0] = full[swapIdx]!;
      full[swapIdx] = temp;
    }
  }

  // Prevent consecutive same-exercise cards (including Ace/King inheriting previous exercise)
  full = ensureNoConsecutiveExercises(full);

  // Apply global card distribution algorithm — uses the real requested
  // session length, not the padded pool size (see sessionLength param doc).
  full = applyCardDistributionAlgorithm(full, difficulty, sessionLength);

  // Second shuffle pass: ensure no two consecutive cards share the same
  // movement category (Push / Pull / Dip / Core / Legs). Runs after the
  // random shuffle and distribution algorithm — only fixes collisions.
  full = ensureNoConsecutiveMovementCategories(full);

  const deck = full.slice(0, cardCount);

  // Preload all exercise images for instant display during workout
  setTimeout(() => {
    const seen = new Set<string>();
    for (const card of deck) {
      const src = resolveExerciseIllustration(card.exerciseName, gender);
      if (!seen.has(src)) {
        seen.add(src);
        const img = new Image();
        img.src = src;
      }
    }
  }, 0);

  return deck;
}

// ─── Calorie estimation ─────────────────────────────────────────────────────
// Both the pre-workout estimate (WorkoutSetupPage) and the live/final
// post-workout total (getWorkoutStats below) go through
// src/lib/calories.ts's estimateCardCalories — the two helpers here just
// adapt it to "a list of actually-played cards" (post-workout) vs. "the
// average card in a not-yet-played deck" (pre-workout), so both numbers
// come from the same per-exercise-type formula.

/** Sums estimated calories across cards already drawn/completed in a live session. */
function estimateSessionCalories(
  cards: LocalSessionCard[],
  weightKg?: number,
  age?: number,
  heightCm?: number,
): number {
  let total = 0;
  for (const sc of cards) {
    const isJoker = sc.card.suit === "Joker" || sc.card.rank === "Joker";
    total += estimateCardCalories({
      movementCategory: isJoker
        ? "Core"
        : getMovementCategory(sc.card.exercise),
      reps: isJoker ? undefined : sc.reps,
      holdSeconds: sc.card.holdSeconds ?? (isJoker ? 30 : undefined),
      eachLeg: sc.card.eachLeg,
      eachSide: sc.card.eachSide,
      weightKg,
      age,
      heightCm,
      exerciseName: isJoker ? undefined : sc.card.exercise,
    });
  }
  return total;
}

/**
 * Average estimated calories per card for a deck that hasn't been drawn
 * yet — walks every exercise the deck can produce (rich per-card config or
 * the simple 4-exercise tuple) and averages their individual estimates, so
 * the pre-workout number reflects the deck's real exercise mix instead of
 * a flat guess. Multiplying by the selected card count (see
 * cardCountToNumber) gives the session estimate shown on WorkoutSetupPage.
 */
export function estimateDeckAverageCaloriesPerCard(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender,
  weightKg?: number,
  age?: number,
  heightCm?: number,
): number {
  const richConfig = getDeckExerciseConfig(category, difficulty, gender);
  const entries: {
    exerciseName: string;
    reps?: number;
    holdSeconds?: number;
    eachLeg?: boolean;
    eachSide?: boolean;
  }[] = [];

  if (richConfig) {
    for (const suitCfg of Object.values(richConfig.suits)) {
      for (const [rankKey, entry] of Object.entries(suitCfg.cardMap)) {
        entries.push({
          exerciseName: entry.exerciseName,
          reps: Number(rankKey),
          holdSeconds: entry.holdSeconds,
          eachLeg: entry.eachLeg,
          eachSide: entry.eachSide,
        });
      }
      entries.push({
        exerciseName: suitCfg.queen.exerciseName,
        reps: suitCfg.queen.reps,
        holdSeconds: suitCfg.queen.holdSeconds,
        eachLeg: suitCfg.queen.eachLeg,
        eachSide: suitCfg.queen.eachSide,
      });
    }
  } else {
    const simple = getDeckExercises(category, difficulty, gender);
    if (simple) {
      // Simple decks assign a rank number (2-12) as the rep count — use the
      // midpoint (7) as a representative rep count for the average.
      for (const exerciseName of simple) {
        entries.push({ exerciseName, reps: 7 });
      }
    }
  }

  if (entries.length === 0) return 0;

  const total = entries.reduce(
    (sum, e) =>
      sum +
      estimateCardCalories({
        movementCategory: getMovementCategory(e.exerciseName),
        reps: e.reps,
        holdSeconds: e.holdSeconds,
        eachLeg: e.eachLeg,
        eachSide: e.eachSide,
        weightKg,
        age,
        heightCm,
        exerciseName: e.exerciseName,
      }),
    0,
  );

  return total / entries.length;
}

/**
 * FILM MODE helper: pulls an existing Pull-Up card and an existing Ace card
 * out of an already-built deck and re-places them at index 0 and 1, forcing
 * the opener to Pull-Up x10 → Ace (auto Pull-Up x20). Reuses real cards from
 * the deck (rather than fabricating new ones) so video/image assets stay
 * correct. No-ops if the deck has no Pull-Up or no Ace card.
 */
function rigFilmModePullupOpener(deck: LocalCard[]): LocalCard[] {
  const pullUpIdx = deck.findIndex(
    (c) =>
      !c.isAce &&
      !c.isKing &&
      !c.isJoker &&
      c.exerciseName.toLowerCase().includes("pull"),
  );
  if (pullUpIdx === -1) return deck;

  const aceIdx = deck.findIndex((c) => c.isAce);
  if (aceIdx === -1) return deck;

  const pullUpCard: LocalCard = { ...deck[pullUpIdx]!, reps: 10 };
  const aceCard = deck[aceIdx]!;

  const rest = deck.filter((_, i) => i !== pullUpIdx && i !== aceIdx);
  return [pullUpCard, aceCard, ...rest];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkout() {
  const store = useWorkoutStore();
  const navigate = useNavigate();
  const { weightKg, age, heightCm } = useOnboarding();

  const startWorkout = useCallback(
    async (customCount?: number, workoutGender?: WorkoutGender) => {
      const {
        selectedDeck,
        selectedCardCount,
        selectedCategory,
        selectedDifficulty,
        guestMode,
      } = store;
      // Allow starting if we have a deck or category+difficulty selection
      if (!selectedDeck && !selectedCategory) return;
      if (!customCount && !selectedCardCount) return;

      const category: DeckCategory = (selectedCategory ??
        "UpperBody") as DeckCategory;
      const difficulty: DeckDifficulty = (selectedDifficulty ??
        "Beginner") as DeckDifficulty;

      // Determine gender: explicit param > guest onboarding data > default male
      let gender: WorkoutGender = workoutGender ?? "male";
      if (guestMode && !workoutGender) {
        try {
          const raw = localStorage.getItem("mbw_guest_onboarding");
          if (raw) {
            const parsed = JSON.parse(raw) as { gender?: string };
            if (parsed.gender === "female" || parsed.gender === "male") {
              gender = parsed.gender as WorkoutGender;
            }
          }
        } catch {
          // ignore parse errors, fall back to male
        }
      }

      const cardCount = customCount ?? cardCountToNumber(selectedCardCount!);

      // Decks whose selected gender config is still empty (no rich config and
      // no simple 4-tuple) are not yet available. Show a coming-soon message
      // and bail out before building/shuffling the deck or navigating.
      const richConfig = getDeckExerciseConfig(category, difficulty, gender);
      const simple = getDeckExercises(category, difficulty, gender);
      if (!richConfig && !simple) {
        toast("Workout coming soon, excuse us 💀", {
          duration: 4000,
        });
        return;
      }

      store.setIsShuffling(true);
      store.setWorkoutGender(gender);

      // Shuffle animation delay
      await new Promise((r) => setTimeout(r, 1200));

      const deckId = selectedDeck
        ? String(selectedDeck.id)
        : `${category}-${difficulty}`;
      const equipment = readEquipmentProfile(guestMode);
      let deck = buildLocalDeck(
        deckId,
        cardCount * 2,
        category,
        difficulty,
        gender,
        equipment,
        cardCount,
      ); // build larger then filter, but keep modifier placement scoped to the real session length

      // Filter excluded exercises (keep Joker/Ace/King always)
      const excluded = store.excludedExercises;
      if (excluded.length > 0) {
        deck = deck.filter(
          (c) =>
            c.isJoker ||
            c.isAce ||
            c.isKing ||
            !excluded.includes(c.exerciseName),
        );
      }

      // Slice to requested card count after filtering
      deck = deck.slice(0, cardCount);

      // FILM MODE (?filmMode=1): rig the Advanced deck's opening two cards to
      // Pull-Up x10 then an Ace (which auto-doubles to Pull-Up x20 via the
      // existing Ace-resolves-from-previous-card logic in the store). Only
      // active when the query flag is present, so normal play is untouched.
      if (
        difficulty === "Advanced" &&
        new URLSearchParams(window.location.search).get("filmMode") === "1"
      ) {
        deck = rigFilmModePullupOpener(deck);
      }

      const actualCount = deck.length;
      store.setShuffledDeck(deck, actualCount);
      store.setWorkoutStartTime(Date.now());
      store.advanceDeck(); // Set first card
      store.setIsShuffling(false);

      navigate({ to: "/workout/session" });
    },
    [store, navigate],
  );

  const drawNextCard = useCallback(() => {
    store.setIsFlipping(true);
    setTimeout(() => {
      store.advanceDeck();
      store.setIsFlipping(false);
    }, 400);
  }, [store]);

  const goBackCard = useCallback(() => {
    store.setIsFlipping(true);
    setTimeout(() => {
      store.goBackCard();
      store.setIsFlipping(false);
    }, 300);
  }, [store]);

  const markSummary = useCallback(() => {
    store.setIsSummary(true);
  }, [store]);

  const dismissJoker = useCallback(() => {
    store.setJokerActive(false);
    store.setJokerChallenge(null);
  }, [store]);

  const resetWorkout = useCallback(() => {
    store.reset();
  }, [store]);

  const getWorkoutStats = useCallback(() => {
    const {
      workoutStartTime,
      deckIndex,
      totalCards,
      cardHistory,
      currentCard,
    } = store;
    const elapsedSeconds = workoutStartTime
      ? Math.floor((Date.now() - workoutStartTime) / 1000)
      : 0;
    const completedCards = Math.max(0, deckIndex + 1);
    const remainingCards = Math.max(0, totalCards - deckIndex - 1);
    const playedCards = currentCard
      ? [...cardHistory, currentCard]
      : cardHistory;
    // Same per-exercise-type formula (src/lib/calories.ts) the pre-workout
    // estimate on WorkoutSetupPage uses — computed from the cards actually
    // drawn so far, so this stays consistent through to the summary screen.
    const estimatedCalories = Math.round(
      estimateSessionCalories(
        playedCards,
        weightKg ?? undefined,
        age ?? undefined,
        heightCm ?? undefined,
      ),
    );
    return {
      elapsedSeconds,
      completedCards,
      remainingCards,
      estimatedCalories,
    };
  }, [store, weightKg, age, heightCm]);

  return {
    startWorkout,
    drawNextCard,
    goBackCard,
    cardHistoryLength: store.cardHistory.length,
    markSummary,
    dismissJoker,
    resetWorkout,
    getWorkoutStats,
    store,
  };
}
