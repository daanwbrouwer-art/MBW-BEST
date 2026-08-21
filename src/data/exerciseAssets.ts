/**
 * exerciseAssets.ts
 * Maps exercise names to illustration paths and defines suit config
 * for the premium workout card deck.
 *
 * Upper Body — Beginner deck uses exact uploaded filenames (with spaces
 * and typos preserved) under /assets/exercises/.
 */

/**
 * Shown whenever no real, dedicated illustration exists for an exercise —
 * deliberately never falls back to a generic/reused/wrong-gender image
 * (a squat photo standing in for a v-up, a male photo in a female deck,
 * etc). An honest "coming soon" beats a confidently wrong picture.
 */
export const COMING_SOON_ILLUSTRATION =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect width="800" height="800" fill="#f5f2ec"/>
      <text x="400" y="380" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="34" font-weight="700" fill="#9c9488" text-anchor="middle">ILLUSTRATION</text>
      <text x="400" y="430" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="34" font-weight="700" fill="#9c9488" text-anchor="middle">COMING SOON</text>
    </svg>`,
  );

export type SuitKey = "Hearts" | "Spades" | "Clubs" | "Diamonds" | "Joker";

export interface SuitConfig {
  symbol: string;
  label: string;
  accent: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export const SUIT_CONFIG: Record<string, SuitConfig> = {
  Hearts: {
    symbol: "\u2665",
    label: "PUSH UPS",
    accent: "oklch(0.65 0.22 25)",
    glowColor: "oklch(0.65 0.22 25 / 0.35)",
    gradientFrom: "oklch(0.09 0.015 310)",
    gradientTo: "oklch(0.12 0.01 20)",
  },
  Spades: {
    symbol: "\u2660",
    label: "PULL UPS",
    accent: "oklch(0.72 0.04 240)",
    glowColor: "oklch(0.72 0.04 240 / 0.30)",
    gradientFrom: "oklch(0.09 0.02 240)",
    gradientTo: "oklch(0.12 0.015 250)",
  },
  Clubs: {
    symbol: "\u2663",
    label: "ROWS",
    accent: "oklch(0.72 0.19 145)",
    glowColor: "oklch(0.72 0.19 145 / 0.30)",
    gradientFrom: "oklch(0.09 0.02 150)",
    gradientTo: "oklch(0.11 0.025 145)",
  },
  Diamonds: {
    symbol: "\u2666",
    label: "DIPS",
    accent: "oklch(0.65 0.18 250)",
    glowColor: "oklch(0.65 0.18 250 / 0.30)",
    gradientFrom: "oklch(0.09 0.02 250)",
    gradientTo: "oklch(0.12 0.025 255)",
  },
  Joker: {
    symbol: "\u2605",
    label: "WILD",
    accent: "oklch(0.68 0.25 180)",
    glowColor: "oklch(0.68 0.25 180 / 0.40)",
    gradientFrom: "oklch(0.08 0.02 260)",
    gradientTo: "oklch(0.08 0.025 255)",
  },
};

/**
 * Upper Body — Beginner deck image assets.
 * Exact uploaded filenames (spaces and typos preserved).
 * Referenced by both the illustration map and the Joker overlay.
 */
export const UPPER_BODY_BEGINNER_ASSETS = {
  normalPushUp: "/assets/exercises/male_ub_beg_normal_push_up.png",
  widePushUp: "/assets/exercises/male_ub_beg_wide_push_up.png",
  negativePushUp: "/assets/exercises/male_ub_beg_negative_push_up.png",
  shoulderTapPushUp: "/assets/exercises/male_ub_beg_shoulder_tap_push_up.png",
  pikePushUp: "/assets/exercises/male_ub_beg_pike_push_up.png",
  pikeHold: "/assets/exercises/male_ub_beg_pike_hold.png",
  supermanHold: "/assets/exercises/male_ub_beg_superman_hold.png",
  invertedRow: "/assets/exercises/male_ub_beg_inverted_row.png",
  negativeBenchDip: "/assets/exercises/male_ub_beg_negative_bench_dip.png",
  tricepPushUp: "/assets/exercises/male_ub_beg_tricep_push_up.png",
  inclinePushUp: "/assets/exercises/male_ub_beg_incline_push_up.png",
  jokerCombo: "/assets/exercises/male_ub_beg_combo_finisher.png",
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Upper Body — Advanced deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 16 advanced deck exercises + Ace/King face cards.
 *
 * Exercises without a dedicated uploaded image reuse the closest matching
 * asset from the same movement family:
 *  - Pike Push-up Decline  → elevated pike push up (steeper pike variant)
 *  - Chin-up with Pause    → chin up (same movement, pause is on-screen text)
 *  - Commando Pull-up      → chin up (vertical pull family)
 *  - Dip Slow Negative     → parallel bar dip (same apparatus, tempo is text)
 *  - Archer Push-up        → normal push up (push family, asymmetric load)
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the beginner deck — they are global face card images.
 */
export const FEMALE_UPPER_BODY_ADVANCED_ASSETS = {
  normalPushUp: "/assets/exercises/normal push up.png",
  declinePushUp: "/assets/exercises/decline push-up.png",
  diamondPushUp: "/assets/exercises/diamond_pushup.png",
  pikePushUpFlat: "/assets/exercises/pike push up.png",
  pikePushUpElevated: "/assets/exercises/pike push-up elevated.png",
  pikePushUpDecline: "/assets/exercises/pike push up.png",
  wallHandstandHold: "/assets/exercises/wall handstand hold.png",
  assistedChinUp: "/assets/exercises/assisted pull-up.png",
  fullChinUp: "/assets/exercises/chin up.png",
  chinUpWithPause: "/assets/exercises/pull with pause.png",
  commandoPullUp: COMING_SOON_ILLUSTRATION,
  benchDipStraightLeg: "/assets/exercises/bench dip.png",
  parallelBarDip: "/assets/exercises/Tricep Dip Parallel Bar.png",
  chestDip: "/assets/exercises/chest dip.png",
  dipSlowNegative: "/assets/exercises/slow dip.png",
  archerPushUp: "/assets/exercises/normal push up.png",
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Upper Body — Pro deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 16 Pro deck exercises + Ace/King face cards.
 *
 * Exercises without a dedicated uploaded image reuse the closest matching
 * asset from the same movement family:
 *  - Archer Push-up Standard / Deep  → archer push up (same family, depth is text)
 *  - One-arm Push-up Negative         → archer push up (asymmetric push family)
 *  - Wall Handstand Hold              → handstand hold (per-rep cue is text)
 *  - Handstand Push-up Negative      → handstand push up (tempo is text)
 *  - Freestanding Handstand Attempt   → handstand hold (hold variant)
 *  - Pull-up Overhand / Close Grip    → pull up (grip width is text)
 *  - L-sit Pull-up                    → l-sit pull up
 *  - Parallel Bar Dip (Pro variant)   → parallel bar dip
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the beginner/advanced decks — they are global face card images.
 */
export const FEMALE_UPPER_BODY_PRO_ASSETS = {
  archerPushUp: "/assets/exercises/normal push up.png",
  typewriterPushUp: COMING_SOON_ILLUSTRATION,
  handstandHold: "/assets/exercises/handstand hold.png",
  handstandPushUp: "/assets/exercises/handstand push-up.png",
  pullUp: "/assets/exercises/upper body pro pull up.png",
  widePullUp: COMING_SOON_ILLUSTRATION,
  lSitPullUp: "/assets/exercises/L-sit pull up.png",
  parallelBarDip: "/assets/exercises/Tricep Dip Parallel Bar.png",
  ringPushUp: "/assets/exercises/normal push up.png",
  ringDip: "/assets/exercises/dips.png",
  lSitHold: "/assets/exercises/l-sit hold.png",
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Upper Body — Beginner deck image assets.
 * Exact uploaded filenames (spaces preserved). Several differ from the male
 * deck (which has trailing spaces/typos); these use the EXACT female spellings.
 * Ace and King images are shared with the male deck.
 */
export const FEMALE_UPPER_BODY_BEGINNER_ASSETS = {
  kneePushUp: "/assets/exercises/knee push up.png",
  normalPushUp: "/assets/exercises/normal push up.png",
  widePushUp: "/assets/exercises/wide push up.png",
  negativePushUp: "/assets/exercises/negative push up.png",
  shoulderTapPushUp: "/assets/exercises/shoulder tap push up.png",
  pikePushUp: "/assets/exercises/pike push up.png",
  pikeHold: "/assets/exercises/pike hold.png",
  supermanHold: "/assets/exercises/superman hold.png",
  invertedRow: "/assets/exercises/inverted row.png",
  benchDip: "/assets/exercises/bench dip.png",
  tricepPushUp: "/assets/exercises/tricep push up.png",
  jokerCombo: COMING_SOON_ILLUSTRATION,
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Lower Body — Beginner deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 16 beginner deck exercises.
 *
 * Exercises without a dedicated uploaded image reuse the closest matching
 * asset from the same movement family:
 *  - Glute Bridge Pulse → glute bridge (pulse is on-screen text)
 *  - Walking Lunge      → forward lunge (same forward-stepping family)
 *  - Single-Leg Balance Hold → calf raise (single-leg stability family)
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 */
export const FEMALE_LOWER_BODY_BEGINNER_ASSETS = {
  // No dedicated female art delivered yet for these three — was silently
  // reusing a male-illustrated generic asset before, now honest about it.
  normalSquat: COMING_SOON_ILLUSTRATION,
  reverseLunge: COMING_SOON_ILLUSTRATION,
  forwardLunge: COMING_SOON_ILLUSTRATION,
  sumoSquat: "/assets/exercises/female sumo squat.png",
  narrowSquat: "/assets/exercises/narrow squat.png",
  wallSit: "/assets/exercises/female wall sit.png",
  twoLegGluteBridge: "/assets/exercises/glute bridge.png",
  singleLegGluteBridge: "/assets/exercises/single leg bridge.png",
  elevatedHipThrust: COMING_SOON_ILLUSTRATION,
  gluteBridgePulse: "/assets/exercises/glute bridge.png",
  lateralLunge: "/assets/exercises/female lateral lunge.png",
  walkingLunge: "/assets/exercises/female walking lunge.png",
  standingCalfRaise: "/assets/exercises/female calf raise.png",
  stepUp: "/assets/exercises/female step up.png",
  singleLegCalfRaise: "/assets/exercises/female single leg calf raise.png",
  singleLegBalanceHold: "/assets/exercises/single leg balance hold.png",
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Lower Body — Pro deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 13 Pro deck exercises plus the Ace/King face cards.
 *
 * Spades (pistol squat family):
 *  - Assisted Pistol Squat → assisted pistol squat.png
 *  - Box Pistol Squat       → box pistol squat.png
 *  - Pistol Squat           → pistol squat.png
 *
 * Hearts (jump family):
 *  - Jump Squat  → jump squat.png
 *  - Broad Jump  → broad jump.png
 *  - Tuck Jump   → tuck jump.png
 *
 * Diamonds (single-leg strength):
 *  - Shrimp Squat           → shrimp squat.png
 *  - Single Leg Nordic Curl → single leg nordic curl.png
 *  - Good Morning           → good morning.png
 *
 * Clubs (hip/lateral):
 *  - Hip Abduction → hip abduction.png
 *  - Lateral Bound → lateral bound.png
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 */
export const FEMALE_LOWER_BODY_PRO_ASSETS = {
  // Spades — pistol squat family
  assistedPistolSquat: "/assets/exercises/assisted pistol squat.png",
  boxPistolSquat: "/assets/exercises/box pistol squat.png",
  pistolSquat: "/assets/exercises/pistol squat.png",
  // Hearts — jump family
  jumpSquat: "/assets/exercises/jump squat.png",
  broadJump: COMING_SOON_ILLUSTRATION,
  tuckJump: "/assets/exercises/tuck jump.png",
  // Diamonds — single-leg strength
  shrimpSquat: "/assets/exercises/shrimp squat.png",
  singleLegNordicCurl: "/assets/exercises/single leg nordic curl.png",
  goodMorning: "/assets/exercises/good morning.png",
  // Clubs — hip / lateral
  hipAbduction: "/assets/exercises/hip abduction.png",
  lateralBound: COMING_SOON_ILLUSTRATION,
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Lower Body — Advanced deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 11 unique exercise image files plus the Ace/King face cards.
 *
 * Several exercises share an image with a sibling in the same movement family
 * (the on-screen text distinguishes the variant):
 *  - BSS Isometric Hold → bulgarian split squat.png (same BSS shape, hold is text)
 *  - Hip Thrust Pulse    → hip thrust.png (pulse is on-screen text)
 *  - Continuous Jump Lunge → jump lunge.png (tempo is text)
 *  - Donkey Kick Pulse   → glute kickback.png (pulse is text)
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 *
 * NOTE: imagePath fields point at the requested filenames exactly as
 * specified. Several files are not yet uploaded; the deck functions
 * without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_LOWER_BODY_ADVANCED_ASSETS = {
  // Spades — Bulgarian Split Squat family
  bssNormal: "/assets/exercises/bulgarian split squat.png",
  bssElevated: "/assets/exercises/bss elevated.png",
  bssDeficit: "/assets/exercises/bss deficit.png",
  bssIsometricHold: "/assets/exercises/bulgarian split squat hold.png",
  // Hearts — Hip Thrust & Hamstring family
  elevatedHipThrust: COMING_SOON_ILLUSTRATION,
  singleLegHipThrust: "/assets/exercises/single leg hip thrust.png",
  nordicCurl: COMING_SOON_ILLUSTRATION,
  hipThrustPulse: COMING_SOON_ILLUSTRATION,
  // Diamonds — Plyometric Lunge family
  jumpingLunge: "/assets/exercises/jump lunge.png",
  lateralJumpLunge: "/assets/exercises/lateral jump lunge.png",
  singleLegRdl: "/assets/exercises/single leg rdl.png",
  continuousJumpLunge: "/assets/exercises/continuous jump lunge.png",
  // Clubs — Glute Isolation family
  gluteKickback: "/assets/exercises/glute kickback.png",
  fireHydrant: COMING_SOON_ILLUSTRATION,
  donkeyKickPulse: "/assets/exercises/donkey kick.png",
  clamshell: "/assets/exercises/clamshell.png",
  // Joker combo
  jokerCombo: COMING_SOON_ILLUSTRATION,
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Core — Beginner deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 13 beginner deck exercises plus the Joker combo and the
 * Ace/King face cards.
 *
 * Queen card images reuse the matching base exercise asset:
 *  - Long Plank Hold    → plank hold.png
 *  - Slow Crunch        → crunch.png
 *  - Bear Crawl Hold    → bear crawl.png
 *  - Leg Raise Hold     → leg raise.png
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 *
 * NOTE: imagePath fields point at the requested filenames exactly as
 * specified. Several files are not yet uploaded; the deck functions
 * without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_CORE_BEGINNER_ASSETS = {
  // Plank family
  plankHold: "/assets/exercises/plank hold.png",
  sidePlank: "/assets/exercises/side plank.png",
  plankShoulderTap: "/assets/exercises/plank shoulder tap.png",
  // Crunch family
  crunch: "/assets/exercises/crunch.png",
  bicycleCrunch: "/assets/exercises/bicycle crunch.png",
  reverseCrunch: "/assets/exercises/reverse crunch.png",
  // Anti-extension / stability
  birdDog: COMING_SOON_ILLUSTRATION,
  deadBug: "/assets/exercises/dead bug.png",
  supermanHold: "/assets/exercises/superman hold.png",
  // Dynamic core
  bearCrawl: "/assets/exercises/bear crawl.png",
  kneeTuck: COMING_SOON_ILLUSTRATION,
  flutterKick: "/assets/exercises/flutter kick.png",
  legRaise: "/assets/exercises/leg raise.png",
  legRaiseHold: "/assets/exercises/leg raise hold.png",
  // Joker combo
  jokerCombo: COMING_SOON_ILLUSTRATION,
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Core — Advanced deck image assets.
 *
 * 4 suits:
 *  - Spades (Hollow Body Progression)
 *      Hollow Body Hold   → hollow body hold.png
 *      Hollow Body Rock   → hollow body rock.png
 *      V-Up               → v up.png
 *      Queen (Hollow Body Hold 30 sec) → hollow body hold.png
 *  - Hearts (Rotational Core)
 *      Russian Twist      → russian twist.png
 *      Cross-Body Crunch  → cross body crunch.png
 *      Bicycle with Pause → bicycle crunch.png
 *      Queen (Russian Twist 30 sec) → russian twist.png
 *  - Diamonds (Dynamic Plank)
 *      Mountain Climber   → mountain climber.png
 *      Spider-Man Plank   → spiderman plank.png
 *      Plank to Downward Dog → plank to down dog.png
 *      Queen (Mountain Climber 30 sec) → mountain climber.png
 *  - Clubs (Hanging Core — pull-up bar)
 *      Hanging Knee Raise → hanging knee raise.png
 *      Hanging Oblique Raise → hanging oblique raise.png
 *      L-Sit Hold         → l-sit.png
 *      Queen (Toes to Bar) → toes to bar.png
 *
 * Joker combo → combo finisher advanced female.png
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 *
 * NOTE: imagePath fields point at the requested filenames exactly as
 * specified. Several files are not yet uploaded; the deck functions
 * without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_CORE_ADVANCED_ASSETS = {
  // Hollow body family
  hollowBodyHold: "/assets/exercises/hollow body hold.png",
  hollowBodyRock: COMING_SOON_ILLUSTRATION,
  vUp: "/assets/exercises/v up.png",
  // Rotational core
  russianTwist: "/assets/exercises/russian twist.png",
  crossBodyCrunch: "/assets/exercises/cross body crunch.png",
  bicycleWithPause: "/assets/exercises/bicycle crunch with pause.png",
  // Dynamic plank
  mountainClimber: "/assets/exercises/mountain climber.png",
  spiderManPlank: COMING_SOON_ILLUSTRATION,
  plankToDownDog: "/assets/exercises/plank to down dog.png",
  // Hanging core
  hangingKneeRaise: "/assets/exercises/hanging knee raise.png",
  hangingObliqueRaise: COMING_SOON_ILLUSTRATION,
  lSit: "/assets/exercises/l-sit.png",
  toesToBar: "/assets/exercises/toes to bar.png",
  // Joker combo
  jokerCombo: COMING_SOON_ILLUSTRATION,
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Core — Pro deck image assets.
 *
 * 4 suits:
 *  - Spades (Dragon Flag Progression)
 *      Dragon Flag Negative → dragon flag negative.png
 *      Dragon Flag          → dragon flag.png
 *      Tuck Dragon Flag     → dragon flag.png
 *      Queen (Dragon Flag)  → dragon flag.png
 *  - Hearts (Front Lever & Windshield Wipers)
 *      Front Lever          → front lever.png
 *      Windshield Wipers    → windshield wipers.png
 *      Toes to Bar          → toes to bar.png
 *      Queen (Toes to Bar)  → toes to bar.png
 *  - Diamonds (Planche Progression)
 *      Planche Lean             → planche lean.png
 *      Tuck Planche             → tuck planche.png
 *      Straddle Planche         → tuck planche.png
 *      Queen (Hanging L Hold)   → hanging l hold.png
 *  - Clubs (Side Plank & Copenhagen)
 *      Hollow Body Planche Rock → planche lean.png
 *      Side Plank Hip Dip        → side plank hip dip.png
 *      Copenhagen Plank          → copenhagen plank.png
 *      Queen (Human Flag Attempt)→ human flag attempt.png
 *      Star Side Plank          → side plank hip dip.png
 *
 * Joker combo → combo finisher pro female.png
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 *
 * NOTE: imagePath fields point at the requested filenames exactly as
 * specified. Several files are not yet uploaded; the deck functions
 * without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_CORE_PRO_ASSETS = {
  // Dragon flag family
  dragonFlagNegative: COMING_SOON_ILLUSTRATION,
  dragonFlag: COMING_SOON_ILLUSTRATION,
  tuckDragonFlag: COMING_SOON_ILLUSTRATION,
  // Front lever & windshield wipers
  frontLever: COMING_SOON_ILLUSTRATION,
  windshieldWipers: COMING_SOON_ILLUSTRATION,
  toesToBar: "/assets/exercises/toes to bar.png",
  // Planche family
  plancheLean: COMING_SOON_ILLUSTRATION,
  tuckPlanche: COMING_SOON_ILLUSTRATION,
  straddlePlanche: COMING_SOON_ILLUSTRATION,
  hangingLHold: COMING_SOON_ILLUSTRATION,
  // Side plank & copenhagen
  hollowBodyPlancheRock: COMING_SOON_ILLUSTRATION,
  sidePlankHipDip: COMING_SOON_ILLUSTRATION,
  copenhagenPlank: COMING_SOON_ILLUSTRATION,
  humanFlagAttempt: COMING_SOON_ILLUSTRATION,
  starSidePlank: COMING_SOON_ILLUSTRATION,
  // Joker combo
  jokerCombo: COMING_SOON_ILLUSTRATION,
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Female Full Body — Beginner deck image assets.
 * Exact uploaded filenames (spaces preserved) per the user's specification.
 * Covers all 12 unique exercise image files plus the Ace/King face cards.
 *
 * Ace ("Last exercise x2") and King ("dividing by 2") images are shared
 * with the other decks — they are global face card images.
 *
 * NOTE: imagePath fields point at the requested filenames exactly as
 * specified. Several files are not yet uploaded; the deck functions
 * without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_FULL_BODY_BEGINNER_ASSETS = {
  modifiedBurpee: COMING_SOON_ILLUSTRATION,
  burpee: "/assets/exercises/burpee.png",
  inchworm: "/assets/exercises/inchworm.png",
  jumpingJacks: "/assets/exercises/jumping jacks.png",
  highKnees: "/assets/exercises/high knees.png",
  stepUp: COMING_SOON_ILLUSTRATION,
  bearCrawl: "/assets/exercises/bear crawl.png",
  bearCrawlSprint: "/assets/exercises/bear crawl sprint.png",
  crabWalk: COMING_SOON_ILLUSTRATION,
  lateralShuffle: COMING_SOON_ILLUSTRATION,
  squatToStand: COMING_SOON_ILLUSTRATION,
  lungeTwist: "/assets/exercises/lunge twist.png",
  pushUpDownDog: "/assets/exercises/push up down dog.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Full Body — Advanced (female) exercise image assets.
 * Exact uploaded filenames preserved verbatim (including any typos).
 * Missing files resolve once the user uploads them — the deck still
 * functions without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_FULL_BODY_ADVANCED_ASSETS = {
  plyometricBurpee: "/assets/exercises/plyo burpee.png",
  singleLegBurpee: "/assets/exercises/single leg burpee.png",
  burpeeBoxJump: COMING_SOON_ILLUSTRATION,
  burpeeChinUp: "/assets/exercises/burpee chin up.png",
  boxJump: COMING_SOON_ILLUSTRATION,
  broadJump: COMING_SOON_ILLUSTRATION,
  tuckJump: "/assets/exercises/tuck jump.png",
  spiderManPushUp: COMING_SOON_ILLUSTRATION,
  archerPushUp: COMING_SOON_ILLUSTRATION,
  declinePushUp: "/assets/exercises/decline push up.png",
  jumpLunge: "/assets/exercises/jump squat to jump lunge.png",
  lateralJumpLunge: "/assets/exercises/lateral jump lunge full body.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Full Body — Pro (female) exercise image assets.
 * Exact uploaded filenames preserved verbatim (including any typos).
 * Missing files resolve once the user uploads them — the deck still
 * functions without images rendering and they resolve once the user uploads them.
 */
export const FEMALE_FULL_BODY_PRO_ASSETS = {
  burpeeChinUp: "/assets/exercises/burpee chin up pro.png",
  explosivePullUp: COMING_SOON_ILLUSTRATION,
  muscleUp: "/assets/exercises/muscle up.png",
  clappingPushUp: COMING_SOON_ILLUSTRATION,
  plyoPushUp: COMING_SOON_ILLUSTRATION,
  archerPushUp: COMING_SOON_ILLUSTRATION,
  pistolSquat: "/assets/exercises/pistol squat pro fullbody.png",
  pistolJump: COMING_SOON_ILLUSTRATION,
  pistolBurpee: COMING_SOON_ILLUSTRATION,
  handstandPushUp: "/assets/exercises/handstand push up.png",
  typewriterPushUp: COMING_SOON_ILLUSTRATION,
  // Queen — Pistol Complex (dedicated, distinct from base pistol squat)
  pistolComplex: "/assets/exercises/pistol complex.png",
  // Queen — Freestanding Handstand Attempt (dedicated, distinct from handstand push-up)
  freestandingHandstandAttempt:
    "/assets/exercises/freestanding handstand attempt.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Male Core — Beginner deck image assets.
 * Newly delivered dedicated male illustrations. Mirrors the exercise
 * composition of FEMALE_CORE_BEGINNER_ASSETS — only the artwork differs.
 *
 * Several exercises have no confidently-identified dedicated image yet
 * (sidePlank, supermanHold, kneeTuck) — the deck functions without images
 * rendering for those and they resolve once dedicated art is uploaded.
 */
export const MALE_CORE_BEGINNER_ASSETS = {
  plankHold: "/assets/exercises/male_core_beg_plank_hold.png",
  crunch: "/assets/exercises/male_core_beg_crunch.png",
  bicycleCrunch: "/assets/exercises/male_core_beg_bicycle_crunch.png",
  reverseCrunch: "/assets/exercises/male_core_beg_reverse_crunch.png",
  birdDog: "/assets/exercises/male_core_beg_bird_dog.png",
  flutterKick: "/assets/exercises/male_core_beg_flutter_kick.png",
  legRaise: "/assets/exercises/male_core_beg_leg_raise.png",
  plankShoulderTap: "/assets/exercises/male_core_beg_plank_shoulder_tap.png",
  deadBug: "/assets/exercises/male_core_beg_dead_bug.png",
  sidePlank: "/assets/exercises/male_core_beg_side_plank.png",
  // Joker combo
  jokerCombo: "/assets/exercises/male_core_beg_joker_combo.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Male Core — Advanced deck image assets.
 * Newly delivered dedicated male illustrations. Mirrors the exercise
 * composition of FEMALE_CORE_ADVANCED_ASSETS — only the artwork differs.
 *
 * Several exercises have no confidently-identified dedicated image yet
 * (crossBodyCrunch, spiderManPlank, plankToDownDog, hangingObliqueRaise,
 * toesToBar) — the deck functions without images rendering for those.
 */
export const MALE_CORE_ADVANCED_ASSETS = {
  hollowBodyHold: "/assets/exercises/male_core_adv_hollow_body_hold.png",
  hollowBodyRock: "/assets/exercises/male_core_adv_hollow_body_rock.png",
  vUp: "/assets/exercises/male_core_adv_v_up.png",
  russianTwist: "/assets/exercises/male_core_adv_russian_twist.png",
  bicycleWithPause: "/assets/exercises/male_core_adv_bicycle_with_pause.png",
  mountainClimber: "/assets/exercises/male_core_adv_mountain_climber.png",
  hangingKneeRaise: "/assets/exercises/male_core_adv_hanging_knee_raise.png",
  lSit: "/assets/exercises/male_core_adv_l_sit.png",
  // Joker combo
  jokerCombo: "/assets/exercises/male_core_adv_joker_combo.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Male Core — Pro deck image assets.
 * Newly delivered dedicated male illustrations. Mirrors the exercise
 * composition of FEMALE_CORE_PRO_ASSETS — only the artwork differs.
 *
 * Most Pro-tier exercises (dragon flag family, front lever, windshield
 * wipers, tuck/straddle planche, hanging L hold, hollow body planche rock,
 * copenhagen plank) have no confidently-identified dedicated image yet —
 * the deck functions without images rendering for those.
 */
export const MALE_CORE_PRO_ASSETS = {
  toesToBar: "/assets/exercises/male_core_pro_toes_to_bar.png",
  plancheLean: "/assets/exercises/male_core_pro_planche_lean.png",
  sidePlankHipDip: "/assets/exercises/male_core_pro_side_plank_hip_dip.png",
  starSidePlank: "/assets/exercises/male_core_pro_star_side_plank.png",
  humanFlagAttempt: "/assets/exercises/male_core_pro_human_flag_attempt.png",
  windshieldWipers: "/assets/exercises/male_core_pro_windshield_wipers.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/**
 * Male Full Body — Beginner deck image assets.
 * Newly delivered dedicated male illustrations. Mirrors the exercise
 * composition of FEMALE_FULL_BODY_BEGINNER_ASSETS — only the artwork differs.
 *
 * Several exercises have no confidently-identified dedicated image yet
 * (modifiedBurpee, burpee, highKnees, stepUp, lateralShuffle, lungeTwist) —
 * the deck functions without images rendering for those.
 */
export const MALE_FULL_BODY_BEGINNER_ASSETS = {
  inchworm: "/assets/exercises/male_fb_beg_inchworm.png",
  jumpingJacks: "/assets/exercises/male_fb_beg_jumping_jacks.png",
  bearCrawl: "/assets/exercises/male_fb_beg_bear_crawl.png",
  crabWalk: "/assets/exercises/male_fb_beg_crab_walk.png",
  squatToStand: "/assets/exercises/male_fb_beg_squat_to_stand.png",
  pushUpDownDog: "/assets/exercises/male_fb_beg_push_up_down_dog.png",
  modifiedBurpee: "/assets/exercises/male_fb_beg_modified_burpee.png",
  // Face cards (shared global images)
  aceDouble: "/assets/exercises/Last excersie x2.png",
  kingHalf: "/assets/exercises/dividng by 2.png",
} as const;

/** Normalizes an exercise name to a lowercase key for matching. */
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Maps exercise name keywords to local illustration paths.
 * Listed most-specific first so the first match wins.
 *
 * Upper Body — Beginner deck is the only Upper Body deck wired in the
 * frontend. Old Upper Body exercise references have been removed.
 */
const EXERCISE_ILLUSTRATION_MAP: Array<[string[], string]> = [
  // ── Upper Body — Beginner (exact uploaded filenames) ──────────────────────
  // Joker combo image — must be checked before generic joker/combo matches
  [
    [
      "joker combo upper",
      "joker combo beginner",
      "ub_beginner_combo",
      "joker combo (upper body)",
      "combo finisher beginner",
    ],
    UPPER_BODY_BEGINNER_ASSETS.jokerCombo,
  ],
  // Ace — "Last exercise x2" dedicated image
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    UPPER_BODY_BEGINNER_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    UPPER_BODY_BEGINNER_ASSETS.kingHalf,
  ],
  // Shoulder Tap Push-up — before generic push up
  [
    ["shoulder tap push", "shoulder tap pushup", "shoulder tap push up"],
    UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
  ],
  // Negative Push-up — before generic push up
  [
    ["negative push", "negative pushup", "negative push up"],
    UPPER_BODY_BEGINNER_ASSETS.negativePushUp,
  ],
  // Tricep Push-up — before generic push up
  [
    ["tricep push", "tricep pushup", "tricep push up"],
    UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
  ],
  // Pike Push-up — before generic push up / pike hold
  [
    ["pike push", "pike pushup", "pike push up"],
    UPPER_BODY_BEGINNER_ASSETS.pikePushUp,
  ],
  // Pike Hold — isometric, before generic hold
  [["pike hold"], UPPER_BODY_BEGINNER_ASSETS.pikeHold],
  // Superman Hold — isometric, before generic hold
  [["superman hold"], UPPER_BODY_BEGINNER_ASSETS.supermanHold],
  // Wide Push-up — before generic push up
  [
    ["wide push", "wide pushup", "wide push up", "wide knee push"],
    UPPER_BODY_BEGINNER_ASSETS.widePushUp,
  ],
  // Negative Bench Dip — before generic dip
  [
    ["negative bench dip", "negative dip"],
    UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip,
  ],
  // Inverted Row — before generic row
  [
    ["inverted row", "incline row", "horizontal row"],
    UPPER_BODY_BEGINNER_ASSETS.invertedRow,
  ],
  // Normal Push-up — generic push up fallback for Upper Body Beginner
  [
    [
      "normal push",
      "normal pushup",
      "normal push up",
      "normal push-up",
      "standard push",
      "standard pushup",
      "standard push up",
      "push up",
      "pushup",
      "push ups",
    ],
    UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
  ],
  // Bench Dip — generic dip fallback for Upper Body Beginner
  [
    ["bench dip", "deep bench dip", "weighted dip", "ring dip", "dip", "dips"],
    "/assets/exercises/dips.png",
  ],

  // ── Upper Body — Advanced / Pro push-up & handstand family (male assets) ──
  // These keyword entries ensure male Advanced and Pro decks resolve to the
  // male_ prefixed illustration files instead of the female-depicting originals.
  // More-specific variants are listed BEFORE the generic "push up" fallback
  // above so the first match wins.
  // Joker combo (Advanced / Pro) — must be checked before the Beginner joker
  // combo entry and before any generic joker/combo matches
  [
    [
      "joker combo advanced",
      "combo finisher advanced",
      "joker combo (upper body advanced)",
    ],
    "/assets/exercises/male_ub_adv_joker_combo.png",
  ],
  [
    ["joker combo pro", "combo finisher pro", "joker combo (upper body pro)"],
    "/assets/exercises/male_ub_pro_joker_combo.png",
  ],
  // Handstand Push-up — before generic push up / handstand hold
  [
    ["handstand push", "handstand pushup", "handstand push up"],
    "/assets/exercises/male_ub_pro_handstand_push_up.png",
  ],
  // Freestanding Handstand (Pro, no wall) — before the wall handstand fallback
  [
    ["freestanding handstand", "handstand attempt"],
    "/assets/exercises/male_ub_pro_handstand_hold.png",
  ],
  // Wall Handstand Hold — isometric, before generic hold
  [
    ["wall handstand", "handstand hold", "handstand"],
    "/assets/exercises/male_ub_adv_handstand_hold.png",
  ],
  // Diamond Push-up — dedicated male asset
  [
    ["diamond push", "diamond pushup", "diamond push up"],
    "/assets/exercises/male_ub_adv_diamond_push_up.png",
  ],
  // Typewriter Push-up — wide push-up family
  [
    ["typewriter push", "typewriter pushup", "typewriter push up"],
    UPPER_BODY_BEGINNER_ASSETS.widePushUp,
  ],
  // Archer Push-up / One-arm Push-up — dedicated male asset (Pro)
  [
    [
      "archer push",
      "archer pushup",
      "archer push up",
      "one arm push",
      "one-arm push",
    ],
    "/assets/exercises/male_ub_pro_one_arm_push_up.png",
  ],
  // Ring Push-up — unstable push family
  [
    ["ring push", "ring pushup", "ring push up"],
    UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
  ],
  // Pike Push-up Decline — dedicated male asset (Advanced), before generic pike push up
  [
    ["pike push up decline", "pike push-up decline", "decline pike push"],
    "/assets/exercises/male_ub_adv_pike_push_up_decline.png",
  ],
  // Decline Push-up — dedicated male asset (Advanced)
  [
    ["decline push", "decline pushup", "decline push up"],
    "/assets/exercises/male_ub_adv_decline_push_up.png",
  ],
  // Dip Slow Negative — dedicated male asset (Advanced), before generic dip
  [
    ["dip slow negative", "slow negative dip"],
    "/assets/exercises/male_ub_adv_dip_slow_negative.png",
  ],

  // ── Upper Body — Advanced / Pro pull-up family (keyword entries) ────────────
  // Order matters: more-specific grip variants are listed before the generic
  // "pull up" fallback so the first match wins.
  // Wide grip pull-up — dedicated male asset (Pro)
  [
    ["wide grip pull", "wide pull", "wide pullup", "wide pull up"],
    "/assets/exercises/male_ub_pro_wide_pull_up.png",
  ],
  // Close grip pull-up — before generic "pull up"
  [
    ["close grip pull", "close grip pullup", "close grip pull up"],
    "/assets/exercises/normal_pullup.png",
  ],
  // L-sit pull-up — dedicated male asset (Pro)
  [
    ["l sit pull", "l sit pullup", "l sit pull up"],
    "/assets/exercises/male_ub_pro_l_sit_pull_up.png",
  ],
  // Commando pull-up — before generic "pull up"
  [
    ["commando pull", "commando pullup", "commando pull up"],
    "/assets/exercises/normal_pullup.png",
  ],
  // Assisted pull-up — uses the rows/assisted image
  [
    ["assisted pull", "assisted pullup", "assisted pull up"],
    "/assets/exercises/chinup_rows.png",
  ],
  // Chin-up — dedicated male asset (Advanced)
  [
    ["chin up", "chinup", "chin ups"],
    "/assets/exercises/male_ub_adv_chin_up.png",
  ],
  // Generic pull-up fallback — dedicated male asset, must come after all
  // specific pull variants
  [
    ["pull up", "pullup", "pull ups", "pull-up"],
    "/assets/exercises/male_ub_adv_normal_pull_up.png",
  ],

  // ── Lower Body Beginner (real assets) ──────────────────────────────────────
  // Joker Combo (Lower Body) — must be checked before generic combo/joker
  [
    ["joker combo lower", "lb_beginner_combo", "joker combo (lower body)"],
    "/assets/exercises/lb_beginner_combo.png",
  ],
  // Squat Hold — isometric, before generic "squat" matches
  [["squat hold"], "/assets/exercises/squat_hold.png"],
  // Sumo Squat — before generic "squat"
  [["sumo squat"], "/assets/exercises/sumo_squat.png"],
  // Regular / Normal Squat — after sumo/hold specifics
  [["regular squat", "normal squat"], "/assets/exercises/normal_squat.png"],
  // Slow Alternating Lunge — before generic alternating/lunge
  [
    ["slow alternating lunge", "slow alternating", "slow lunge"],
    "/assets/exercises/slow_lunge.png",
  ],
  // Alternating Lunge — before generic "lunge"
  [["alternating lunge"], "/assets/exercises/alternating_lunge.png"],
  // Forward / Front Lunge — before generic "lunge"
  [["forward lunge", "front lunge"], "/assets/exercises/front_lunge.png"],
  // Reverse Lunge
  [["reverse lunge"], "/assets/exercises/reverse_lunge.png"],
  // High Knee March — before generic "knee" or "march"
  [
    ["high knee march", "high knee", "knee march"],
    "/assets/exercises/high_knee_march.png",
  ],
  // Step-Up
  [["step-up", "step up", "stepup"], "/assets/exercises/step_up.png"],
  // Calf Raise
  [["calf raise", "calf raises", "calf"], "/assets/exercises/calf_raise.png"],
  // Wall Sit
  [["wall sit"], "/assets/exercises/wall_sit.png"],
  // Standing Hip Circle
  [
    ["standing hip circle", "hip circle", "standing hip"],
    "/assets/exercises/standing_hip_circle.png",
  ],

  // ── Lower Body Advanced (real assets) ────────────────────────────────────────
  // Jump Squat — before generic squat matches
  [["jump squat", "squat jump"], "/assets/exercises/jump_squat.png"],
  // Pistol Squat
  [["pistol squat"], "/assets/exercises/pistol_squat_advanced.png"],
  // Sumo Squat advanced variant
  [["sumo squat advanced"], "/assets/exercises/sumo_squat_advanced.png"],
  // Walking Lunge — before generic lunge
  [["walking lunge"], "/assets/exercises/walking_lunge.png"],
  // Lunge with Knee Drive — before generic lunge
  [
    ["lunge with knee drive", "lunge knee drive"],
    "/assets/exercises/lunge_knee_drive_new.png",
  ],
  // Broad Jump — before generic jump
  [["broad jump"], "/assets/exercises/broad_jump.png"],
  // Lateral Bound
  [["lateral bound"], "/assets/exercises/lateral_bound.png"],
  // Tuck Jump — before generic jump
  [["tuck jump"], "/assets/exercises/tuck_jump.png"],
  // Single-Leg Calf Raise — before generic calf raise
  [
    ["single-leg calf raise", "single leg calf raise", "one leg calf raise"],
    "/assets/exercises/single_leg_calf_raise.png",
  ],

  // ── Lower Body Pro (real assets) ─────────────────────────────────────────────
  // Pistol Squat Pro — before generic "pistol squat" or "squat" matches
  [["pistol squat pro"], "/assets/exercises/pistol_squat_pro.png"],
  // Sumo Jump Squat — before generic "sumo squat" or "squat"
  [["sumo jump squat"], "/assets/exercises/sumo_jump_squat.png"],
  // Jumping Lunges — before generic "lunge"
  [
    ["jumping lunges", "jumping lunge", "jump lunge"],
    "/assets/exercises/jumping_lunges.png",
  ],
  // Bulgarian Split Squat — before generic "squat" or "lunge"
  [
    ["bulgarian split squat", "bulgarian split", "split squat"],
    "/assets/exercises/bg_split_squat.png",
  ],
  // Curtsy Lunge — before generic "lunge"
  [["curtsy lunge", "curtsy"], "/assets/exercises/curtsy_lunge.png"],
  // Lunge with Knee Drive Pro — before generic lunge/knee drive (different image to advanced)
  [
    ["lunge with knee drive pro", "lunge knee drive pro"],
    "/assets/exercises/lunge_knee_drive_pro.png",
  ],
  // Single-Leg Step-Up — before generic "step up"
  [
    [
      "single-leg step-up",
      "single leg step-up",
      "one leg step-up",
      "single leg step up",
    ],
    "/assets/exercises/one_leg_step_up.png",
  ],
  // Single-Leg Wall Sit — before generic "wall sit"
  [
    ["single-leg wall sit", "single leg wall sit"],
    "/assets/exercises/single_leg_wall_sit.png",
  ],

  // ── Lower Body (other/placeholder) ──────────────────────────────────────────
  [["squat pulse", "squat"], "/assets/exercises/normal_squat.png"],
  [["lunge"], "/assets/exercises/alternating_lunge.png"],
  [
    ["glute bridge", "single-leg glute bridge"],
    "/assets/exercises/normal_squat.png",
  ],
  [["box step-up", "lateral step-up"], "/assets/exercises/step_up.png"],
  [["nordic curl"], "/assets/exercises/single leg nordic curl.png"],
  [["donkey kick"], "/assets/exercises/normal_squat.png"],
  [["romanian deadlift"], "/assets/exercises/normal_squat.png"],
  [
    ["plyometric lunge", "lateral lunge"],
    "/assets/exercises/alternating_lunge.png",
  ],
  [["sissy squat"], "/assets/exercises/normal_squat.png"],

  // Core — male & female variants (mapped to real illustration assets)
  // Plank family — real plank asset
  [
    [
      "plank",
      "plank hold",
      "plank to push up",
      "plank to pushup",
      "plank to push-up",
      "plank shoulder tap",
      "plank up down",
      "up down plank",
    ],
    "/assets/exercises/plank.png",
  ],
  // Side plank — real plank asset (same hold shape)
  [
    ["side plank", "weighted side plank", "side plank hold"],
    "/assets/exercises/plank.png",
  ],
  // Superman / back extension — real superman hold asset (male)
  [
    ["superman hold", "superman", "back extension", "swimmer"],
    UPPER_BODY_BEGINNER_ASSETS.supermanHold,
  ],
  // Pike hold — real pike hold asset (core compression, male)
  [["pike hold", "pike compression"], UPPER_BODY_BEGINNER_ASSETS.pikeHold],
  // Mountain climber — high knee march is the closest real dynamic asset
  [
    ["mountain climber", "mountain climbers", "cross-body mountain climber"],
    "/assets/exercises/high_knee_march.png",
  ],
  // Deliberately no generic normal_squat.png reuse here anymore for hollow
  // body / v-up / bicycle crunch / leg raise / flutter kick / dead bug /
  // hanging raise / dragon flag / ab wheel / l-sit / boat hold / hip dip /
  // russian twist — a squat photo standing in for a dragon flag was exactly
  // the "everything is bad" bug. These now fall through to
  // COMING_SOON_ILLUSTRATION (or their real MALE_CORE_*_ASSETS entry, which
  // is checked before this map ever runs).

  // Full Body — male & female variants (mapped to real illustration assets)
  // Burpee family — closest real full-body dynamic asset is jump squat
  [
    [
      "muscle-up burpee",
      "burpee pull-up",
      "burpee to broad jump",
      "burpee",
      "modified burpee",
      "half burpee",
      "burpee broad jump",
    ],
    "/assets/exercises/jump_squat.png",
  ],
  // Tuck jump — real asset
  [["tuck jump", "tuck jumps"], "/assets/exercises/tuck_jump.png"],
  // Broad jump — real asset
  [["broad jump", "broad jumps"], "/assets/exercises/broad_jump.png"],
  // Jump squat — real asset
  [
    ["jump squat", "squat jump", "jump squats"],
    "/assets/exercises/jump_squat.png",
  ],
  // Deliberately no generic reuse anymore for box jump (was broad_jump.png —
  // wrong equipment), turkish get-up / man maker (was normal_squat.png /
  // jump_squat.png), or the crawl family (spiderman crawl, lateral crawl,
  // bear crawl, crab walk — was plank.png, nothing like a crawl). These now
  // fall through to their real MALE_FULL_BODY_BEGINNER_ASSETS entry (bear
  // crawl, crab walk, inchworm all have real art) or COMING_SOON_ILLUSTRATION.
  // Squat pulse — real squat asset
  [
    ["squat pulse", "squat pulses", "pulse squat"],
    "/assets/exercises/normal_squat.png",
  ],
  // Push-up (full body compound) — male push up asset
  [
    ["push up", "pushup", "push ups", "push-up"],
    UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
  ],
  // Lunge (full body compound) — real lunge asset
  [["lunge", "lunges"], "/assets/exercises/alternating_lunge.png"],
  // Squat (full body compound) — real squat asset
  [
    ["squat", "squats", "bodyweight squat"],
    "/assets/exercises/normal_squat.png",
  ],
  // Step-up (full body compound) — real step up asset
  [["step-up", "step up", "stepup"], "/assets/exercises/step_up.png"],

  // Assisted / Band variations — male inverted row / bench dip assets
  [
    ["assisted pull-up", "band-assisted", "negative pull-up"],
    UPPER_BODY_BEGINNER_ASSETS.invertedRow,
  ],
  [
    ["resistance band row", "single-arm row", "archer row"],
    UPPER_BODY_BEGINNER_ASSETS.invertedRow,
  ],
  [["assisted dip"], UPPER_BODY_BEGINNER_ASSETS.negativeBenchDip],

  // Joker challenges — male inverted row asset. Deliberately NOT matching a
  // bare "hang" keyword — it was a substring of "hanging", so a Dead Hang
  // fallback image was incorrectly winning for Hanging L Hold / Hanging
  // Oblique Raise too.
  [["dead hang", "deadhang"], UPPER_BODY_BEGINNER_ASSETS.invertedRow],
];

/**
 * Female-specific exercise illustration overrides.
 * Uses the same keyword matching logic as the main map.
 *
 * Upper Body — Beginner uses female-specific image assets (exact uploaded
 * filenames, several differ from the male deck). Lower Body / Core / Full
 * Body entries fall back to the same shared assets as the male map.
 */
const FEMALE_EXERCISE_ILLUSTRATION_MAP: Array<[string[], string]> = [
  // ── Upper Body — Pro (female-specific assets) ───────────────────────────────
  // Most-specific Pro names are listed FIRST so they win over the
  // advanced/beginner/generic push-up, dip, pull-up, and handstand fallbacks
  // below.
  //
  // Ace — "Last exercise x2" dedicated image (shared with beginner/advanced)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_UPPER_BODY_PRO_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with beginner/advanced)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_UPPER_BODY_PRO_ASSETS.kingHalf,
  ],
  // Typewriter Push-up — before generic push up / archer push up
  [
    [
      "typewriter push",
      "typewriter pushup",
      "typewriter push up",
      "typewriter push-up",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.typewriterPushUp,
  ],
  // Archer Push-up Standard — before generic archer push up / push up
  [
    [
      "archer push up standard",
      "archer pushup standard",
      "archer push-up standard",
      "archer push up deep",
      "archer pushup deep",
      "archer push-up deep",
      "one-arm push-up negative",
      "one arm push up negative",
      "one arm pushup negative",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.archerPushUp,
  ],
  // Freestanding Handstand Attempt — before generic handstand / wall handstand
  [
    [
      "freestanding handstand",
      "freestanding handstand attempt",
      "free standing handstand",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.handstandHold,
  ],
  // Handstand Push-up — before generic handstand / push up
  [
    ["handstand push up", "handstand pushup", "handstand push-up"],
    FEMALE_UPPER_BODY_PRO_ASSETS.handstandPushUp,
  ],
  // Wall Handstand Hold (Pro per-rep variant) — before generic handstand hold
  [
    ["wall handstand hold", "wall handstand", "handstand hold", "handstand"],
    FEMALE_UPPER_BODY_PRO_ASSETS.handstandHold,
  ],
  // Wide Grip Pull-up — before generic pull up
  [
    [
      "wide grip pull",
      "wide grip pull up",
      "wide grip pullup",
      "wide grip pull-up",
      "wide pull up",
      "wide pullup",
      "wide pull-up",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.widePullUp,
  ],
  // Close Grip Pull-up — before generic pull up
  [
    [
      "close grip pull",
      "close grip pull up",
      "close grip pullup",
      "close grip pull-up",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.pullUp,
  ],
  // Pull-up Overhand — before generic pull up
  [
    [
      "pull up overhand",
      "pullup overhand",
      "pull-up overhand",
      "overhand pull",
      "overhand pull up",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.pullUp,
  ],
  // L-sit Pull-up — before generic pull up / l-sit
  [
    [
      "l-sit pull up",
      "l sit pull up",
      "lsit pull up",
      "l-sit pullup",
      "l-sit pull-up",
    ],
    FEMALE_UPPER_BODY_PRO_ASSETS.lSitPullUp,
  ],
  // Ring Dip — before generic dip / ring
  [["ring dip", "ring dips"], "/assets/exercises/dips.png"],
  // Ring Push-up — before generic push up / ring
  [
    ["ring push up", "ring pushup", "ring push-up"],
    FEMALE_UPPER_BODY_PRO_ASSETS.ringPushUp,
  ],
  // L-sit Hold — before generic l-sit / hold
  [
    ["l-sit hold", "l sit hold", "lsit hold"],
    FEMALE_UPPER_BODY_PRO_ASSETS.lSitHold,
  ],
  // Parallel Bar Dip (Pro variant) — before generic dip / parallel bar dip
  [
    ["parallel bar dip", "parallel bar dips", "parallel dip", "bar dip"],
    FEMALE_UPPER_BODY_PRO_ASSETS.parallelBarDip,
  ],

  // ── Upper Body — Advanced (female-specific assets) ─────────────────────────
  // Most-specific advanced names are listed FIRST so they win over the
  // beginner/generic push-up, dip, and chin-up fallbacks below.
  //
  // Ace — "Last exercise x2" dedicated image (shared with beginner deck)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with beginner deck)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.kingHalf,
  ],
  // Pike Push-up Elevated — before generic pike push up
  [
    [
      "pike push up elevated",
      "pike push-up elevated",
      "pike pushup elevated",
      "elevated pike push",
      "elevated pike pushup",
      "elevated pike push up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.pikePushUpElevated,
  ],
  // Pike Push-up Decline — before generic pike push up
  [
    [
      "pike push up decline",
      "pike push-up decline",
      "pike pushup decline",
      "decline pike push",
      "decline pike pushup",
      "decline pike push up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.pikePushUpDecline,
  ],
  // Pike Push-up Flat — before generic pike push up
  [
    [
      "pike push up flat",
      "pike push-up flat",
      "pike pushup flat",
      "flat pike push",
      "flat pike pushup",
      "flat pike push up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.pikePushUpFlat,
  ],
  // Wall Handstand Hold — before generic handstand/hold
  [
    ["wall handstand hold", "wall handstand", "handstand hold", "handstand"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.wallHandstandHold,
  ],
  // Decline Push-up — before generic push up
  [
    ["decline push", "decline pushup", "decline push up", "decline push-up"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.declinePushUp,
  ],
  // Diamond Push-up — before generic push up
  [
    ["diamond push", "diamond pushup", "diamond push up", "diamond push-up"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.diamondPushUp,
  ],
  // Archer Push-up — before generic push up
  [
    ["archer push", "archer pushup", "archer push up", "archer push-up"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.archerPushUp,
  ],
  // Assisted Chin-up — before generic chin up
  [
    [
      "assisted chin",
      "assisted chin up",
      "assisted chinup",
      "assisted chin-up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.assistedChinUp,
  ],
  // Chin-up with Pause — before generic chin up
  [
    [
      "chin up with pause",
      "chin-up with pause",
      "chinup with pause",
      "pause chin up",
      "paused chin up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.chinUpWithPause,
  ],
  // Full Chin-up — before generic chin up
  [
    [
      "full chin up",
      "full chin-up",
      "full chinup",
      "chin up",
      "chin-up",
      "chinup",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.fullChinUp,
  ],
  // Commando Pull-up — before generic pull up
  [
    [
      "commando pull",
      "commando pull up",
      "commando pullup",
      "commando pull-up",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.commandoPullUp,
  ],
  // Bench Dip Straight-leg — before generic bench dip / dip
  [
    [
      "bench dip straight",
      "bench dip straight leg",
      "bench dip straight-leg",
      "straight leg bench dip",
      "straight-leg bench dip",
    ],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.benchDipStraightLeg,
  ],
  // Chest Dip — before generic dip
  [["chest dip", "chest dips"], FEMALE_UPPER_BODY_ADVANCED_ASSETS.chestDip],
  // Parallel Bar Dip — before generic dip
  [
    ["parallel bar dip", "parallel bar dips", "parallel dip", "bar dip"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.parallelBarDip,
  ],
  // Dip Slow Negative — before generic dip
  [
    ["dip slow negative", "slow negative dip", "dip slow"],
    FEMALE_UPPER_BODY_ADVANCED_ASSETS.dipSlowNegative,
  ],

  // ── Upper Body — Beginner (female-specific assets) ─────────────────────────
  // Joker combo image — must be checked before generic joker/combo matches
  [
    [
      "joker combo upper",
      "joker combo beginner",
      "ub_beginner_combo",
      "joker combo (upper body)",
      "combo finisher beginner",
      "joker",
      "combo",
      "finisher",
    ],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.jokerCombo,
  ],
  // Ace — "Last exercise x2" dedicated image (shared with male deck)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with male deck)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.kingHalf,
  ],
  // Knee Push-up — before generic push up
  [
    ["knee push up", "knee pushup", "knee push-up"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.kneePushUp,
  ],
  // Shoulder Tap Push-up — before generic push up
  [
    [
      "shoulder tap push",
      "shoulder tap pushup",
      "shoulder tap push up",
      "shoulder tap",
    ],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.shoulderTapPushUp,
  ],
  // Negative Push-up — before generic push up
  [
    [
      "negative push",
      "negative pushup",
      "negative push up",
      "push up negative",
      "push-up negative",
    ],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.negativePushUp,
  ],
  // Tricep Push-up — before generic push up
  [
    ["tricep push", "tricep pushup", "tricep push up", "tricep push-up"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.tricepPushUp,
  ],
  // Pike Push-up Slow — same image as Pike Push-up; "3s down" is on-screen text
  [
    ["pike push up slow", "pike push-up slow", "pike pushup slow"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.pikePushUp,
  ],
  // Pike Push-up — before generic push up / pike hold
  [
    ["pike push", "pike pushup", "pike push up", "pike push-up"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.pikePushUp,
  ],
  // Pike Hold — isometric, before generic hold
  [["pike hold"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.pikeHold],
  // Superman Hold — isometric, before generic hold
  [["superman hold"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.supermanHold],
  // Wide Push-up — before generic push up
  [
    ["wide push", "wide pushup", "wide push up", "wide knee push"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.widePushUp,
  ],
  // Bench Dip Slow Negative — before generic bench dip
  [
    ["bench dip slow negative", "slow negative bench dip"],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.benchDip,
  ],
  // Elevated Bench Dip — before generic bench dip
  [["elevated bench dip"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.benchDip],
  // Bench Dip — generic dip fallback for female Upper Body Beginner
  [
    ["bench dip", "deep bench dip", "weighted dip", "ring dip", "dip", "dips"],
    "/assets/exercises/dips.png",
  ],
  // Horizontal Row — same image as Incline Row; on-screen text distinguishes angle
  [["horizontal row"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.invertedRow],
  // Incline Row — before generic row
  [["incline row"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.invertedRow],
  // Row Hold — isometric, before generic row
  [["row hold"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.invertedRow],
  // Inverted Row — before generic row
  [["inverted row"], FEMALE_UPPER_BODY_BEGINNER_ASSETS.invertedRow],
  // Normal Push-up — generic push up fallback for female Upper Body Beginner
  [
    [
      "normal push",
      "normal pushup",
      "normal push up",
      "normal push-up",
      "standard push",
      "standard pushup",
      "standard push up",
      "push up",
      "pushup",
      "push ups",
    ],
    FEMALE_UPPER_BODY_BEGINNER_ASSETS.normalPushUp,
  ],

  // ── Lower Body — Beginner (female-specific assets) ─────────────────────────
  // Most-specific beginner names are listed FIRST so they win over the
  // generic lower-body squat/lunge/calf/step-up fallbacks below.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.kingHalf,
  ],
  // Single-Leg Balance Hold — before generic calf raise / balance
  [
    [
      "single-leg balance hold",
      "single leg balance hold",
      "balance hold",
      "single leg balance",
    ],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.singleLegBalanceHold,
  ],
  // Single-Leg Calf Raise — before generic calf raise
  [
    ["single-leg calf raise", "single leg calf raise", "one leg calf raise"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.singleLegCalfRaise,
  ],
  // Single-Leg Glute Bridge — before generic glute bridge
  [
    [
      "single-leg glute bridge",
      "single leg glute bridge",
      "one leg glute bridge",
    ],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.singleLegGluteBridge,
  ],
  // Glute Bridge Pulse — before generic glute bridge
  [
    ["glute bridge pulse", "bridge pulse", "pulse glute bridge"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.gluteBridgePulse,
  ],
  // Elevated Hip Thrust — before generic hip thrust / glute bridge
  [
    ["elevated hip thrust", "hip thrust elevated", "hip thrust"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.elevatedHipThrust,
  ],
  // Two-Leg Glute Bridge — before generic glute bridge
  [
    ["two-leg glute bridge", "two leg glute bridge", "glute bridge"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.twoLegGluteBridge,
  ],
  // Lateral Lunge — before generic lunge
  [
    ["lateral lunge", "side lunge"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.lateralLunge,
  ],
  // Walking Lunge — before generic lunge
  [["walking lunge"], FEMALE_LOWER_BODY_BEGINNER_ASSETS.walkingLunge],
  // Forward Lunge — before generic lunge
  [
    ["forward lunge", "front lunge"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.forwardLunge,
  ],
  // Reverse Lunge — before generic lunge
  [["reverse lunge"], FEMALE_LOWER_BODY_BEGINNER_ASSETS.reverseLunge],
  // Narrow Squat — before generic squat
  [
    ["narrow squat", "close squat"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.narrowSquat,
  ],
  // Sumo Squat — before generic squat
  [["sumo squat"], FEMALE_LOWER_BODY_BEGINNER_ASSETS.sumoSquat],
  // Wall Sit — before generic squat / sit
  [["wall sit"], FEMALE_LOWER_BODY_BEGINNER_ASSETS.wallSit],
  // Standing Calf Raise — before generic calf raise
  [
    ["standing calf raise", "calf raise", "calf raises", "calf"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.standingCalfRaise,
  ],
  // Step-Up — before generic step up
  [["step-up", "step up", "stepup"], FEMALE_LOWER_BODY_BEGINNER_ASSETS.stepUp],
  // Normal Squat — generic squat fallback for female Lower Body Beginner
  [
    ["normal squat", "regular squat", "squat"],
    FEMALE_LOWER_BODY_BEGINNER_ASSETS.normalSquat,
  ],

  // Deliberately no generic Lower Body / Lower Body Advanced reuse block
  // here anymore (was borrowing male-illustrated generic assets like
  // normal_squat.png, broad_jump.png, tuck_jump.png for exercises with no
  // real female art). Falls through to COMING_SOON_ILLUSTRATION instead.

  // Lower Body Pro — female variants
  // Most-specific pistol-squat names FIRST so they win over the generic
  // "pistol squat" / "pistol squat pro" entries below.
  [
    ["assisted pistol squat", "assisted pistol"],
    FEMALE_LOWER_BODY_PRO_ASSETS.assistedPistolSquat,
  ],
  [
    ["box pistol squat", "box pistol"],
    FEMALE_LOWER_BODY_PRO_ASSETS.boxPistolSquat,
  ],
  // Hearts — jump family (most-specific before generic jump/squat matches)
  [["tuck jump", "tuckjump"], FEMALE_LOWER_BODY_PRO_ASSETS.tuckJump],
  [["broad jump", "broadjump"], FEMALE_LOWER_BODY_PRO_ASSETS.broadJump],
  [["jump squat", "squat jump"], FEMALE_LOWER_BODY_PRO_ASSETS.jumpSquat],
  // Diamonds — single-leg strength (most-specific first)
  [["shrimp squat", "shrimpsquat"], FEMALE_LOWER_BODY_PRO_ASSETS.shrimpSquat],
  [
    ["single leg nordic curl", "single-leg nordic curl", "nordic curl"],
    FEMALE_LOWER_BODY_PRO_ASSETS.singleLegNordicCurl,
  ],
  [["good morning", "goodmorning"], FEMALE_LOWER_BODY_PRO_ASSETS.goodMorning],
  // Clubs — hip / lateral (hip abduction before generic hip matches)
  [
    ["hip abduction", "hipabduction"],
    FEMALE_LOWER_BODY_PRO_ASSETS.hipAbduction,
  ],
  [
    ["lateral bound", "lateralbound"],
    FEMALE_LOWER_BODY_PRO_ASSETS.lateralBound,
  ],
  // Deliberately no generic Lower Body Pro reuse block here anymore (was
  // borrowing male-illustrated generic assets). Falls through to
  // COMING_SOON_ILLUSTRATION instead.

  // ── Lower Body — Advanced (female-specific assets) ─────────────────────────
  // Most-specific advanced names are listed FIRST so they win over the
  // generic lower-body squat/lunge/hip-thrust fallbacks below.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.kingHalf,
  ],
  // Joker Combo (Lower Body Advanced Female) — before generic joker/combo
  [
    [
      "joker combo lower body advanced",
      "joker combo advanced female",
      "joker combo (lower body advanced)",
      "combo finisher advanced female",
    ],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.jokerCombo,
  ],
  // BSS Deficit — before generic BSS / split squat / squat
  [
    ["bss deficit", "deficit bss", "deficit split squat"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.bssDeficit,
  ],
  // BSS Elevated — before generic BSS / split squat / squat
  [
    ["bss elevated", "elevated bss", "elevated split squat"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.bssElevated,
  ],
  // BSS Isometric Hold — before generic BSS / split squat / squat
  [
    ["bss isometric", "bss hold", "split squat hold", "bss isometric hold"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.bssIsometricHold,
  ],
  // BSS Normal — before generic BSS / split squat / squat
  [
    ["bss normal", "bss", "bulgarian split squat", "split squat"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.bssNormal,
  ],
  // Single-Leg Hip Thrust — before generic hip thrust
  [
    ["single-leg hip thrust", "single leg hip thrust", "one leg hip thrust"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.singleLegHipThrust,
  ],
  // Hip Thrust Pulse — before generic hip thrust
  [
    ["hip thrust pulse", "thrust pulse", "pulse hip thrust"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.hipThrustPulse,
  ],
  // Elevated Hip Thrust — before generic hip thrust
  [
    ["elevated hip thrust", "hip thrust elevated", "hip thrust"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.elevatedHipThrust,
  ],
  // Nordic Curl — before generic curl
  [
    ["nordic curl", "nordic hamstring curl"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.nordicCurl,
  ],
  // Lateral Jump Lunge — before generic jump lunge / lunge
  [
    ["lateral jump lunge", "lateral lunge jump", "side jump lunge"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.lateralJumpLunge,
  ],
  // Continuous Jump Lunge — before generic jump lunge / lunge
  [
    ["continuous jump lunge", "continuous lunge", "continuous jumping lunge"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.continuousJumpLunge,
  ],
  // Jumping Lunge — before generic jump lunge / lunge
  [
    ["jumping lunge", "jump lunge", "jump lunges", "jumping lunges"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.jumpingLunge,
  ],
  // Single-Leg RDL — before generic rdl / deadlift
  [
    [
      "single-leg rdl",
      "single leg rdl",
      "one leg rdl",
      "single leg romanian deadlift",
    ],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.singleLegRdl,
  ],
  // Donkey Kick Pulse — before generic donkey kick / kickback
  [
    ["donkey kick pulse", "donkey kickpulse", "kickback pulse"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.donkeyKickPulse,
  ],
  // Glute Kickback — before generic kickback / donkey kick
  [
    ["glute kickback", "glute kick back", "kickback", "donkey kick"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.gluteKickback,
  ],
  // Fire Hydrant — before generic hydrant
  [
    ["fire hydrant", "firehydrant", "hydrant"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.fireHydrant,
  ],
  // Clamshell — before generic clam
  [
    ["clamshell", "clam shell", "clam"],
    FEMALE_LOWER_BODY_ADVANCED_ASSETS.clamshell,
  ],

  // ── Core — Beginner (female-specific assets) ───────────────────────────────
  // Most-specific beginner names are listed FIRST so they win over the
  // generic core plank/crunch/leg-raise fallbacks below.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_CORE_BEGINNER_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_CORE_BEGINNER_ASSETS.kingHalf,
  ],
  // Joker Combo (Core Beginner Female) — before generic joker/combo
  [
    [
      "joker combo core beginner",
      "joker combo beginner female",
      "joker combo (core beginner)",
      "combo finisher beginner female",
    ],
    FEMALE_CORE_BEGINNER_ASSETS.jokerCombo,
  ],
  // Plank Shoulder Tap — before generic plank / plank hold
  [
    ["plank shoulder tap", "shoulder tap plank"],
    FEMALE_CORE_BEGINNER_ASSETS.plankShoulderTap,
  ],
  // Side Plank — before generic plank / plank hold
  [
    ["side plank", "side plank hold", "weighted side plank"],
    FEMALE_CORE_BEGINNER_ASSETS.sidePlank,
  ],
  // Plank Hold / Long Plank Hold (Queen) — before generic plank
  [
    ["plank hold", "long plank hold", "long plank"],
    FEMALE_CORE_BEGINNER_ASSETS.plankHold,
  ],
  // Bicycle Crunch — before generic crunch / reverse crunch
  [
    ["bicycle crunch", "oblique crunch", "bicycle"],
    FEMALE_CORE_BEGINNER_ASSETS.bicycleCrunch,
  ],
  // Reverse Crunch — before generic crunch
  [
    ["reverse crunch", "reverse crunches"],
    FEMALE_CORE_BEGINNER_ASSETS.reverseCrunch,
  ],
  // Crunch / Slow Crunch (Queen) — generic crunch fallback for Core Beginner
  [["crunch", "crunches", "slow crunch"], FEMALE_CORE_BEGINNER_ASSETS.crunch],
  // Superman Hold — before generic bird dog / dead bug / hold
  [["superman hold", "superman"], FEMALE_CORE_BEGINNER_ASSETS.supermanHold],
  // Bird Dog — before generic dead bug
  [["bird dog", "birddog"], FEMALE_CORE_BEGINNER_ASSETS.birdDog],
  // Dead Bug — before generic bug
  [
    ["dead bug", "modified dead bug", "extended dead bug"],
    FEMALE_CORE_BEGINNER_ASSETS.deadBug,
  ],
  // Bear Crawl / Bear Crawl Hold (Queen) — before generic crawl
  [
    ["bear crawl hold", "bear crawl", "bearcrawl"],
    FEMALE_CORE_BEGINNER_ASSETS.bearCrawl,
  ],
  // Flutter Kick — before generic leg raise / knee tuck
  [
    ["flutter kick", "scissor kick", "flutter kicks"],
    FEMALE_CORE_BEGINNER_ASSETS.flutterKick,
  ],
  // Leg Raise Hold (Queen) — dedicated art, before generic leg raise
  [["leg raise hold"], FEMALE_CORE_BEGINNER_ASSETS.legRaiseHold],
  // Leg Raise — before generic knee tuck
  [
    ["leg raise", "lying leg raise", "straight leg raise"],
    FEMALE_CORE_BEGINNER_ASSETS.legRaise,
  ],
  // Knee Tuck — generic knee tuck fallback for Core Beginner
  [
    ["knee tuck", "knee tucks", "tuck hold"],
    FEMALE_CORE_BEGINNER_ASSETS.kneeTuck,
  ],

  // ── Core — Advanced (female-specific assets) ──────────────────────────────
  // Most-specific Advanced names are listed FIRST so they win over the
  // generic core fallbacks below (hollow body, v-up, bicycle, leg raise,
  // mountain climber, russian twist, l-sit, hanging raise families).
  // Joker combo image — must be checked before generic joker/combo matches
  [
    [
      "combo finisher advanced female",
      "joker combo advanced female",
      "joker combo core advanced female",
    ],
    FEMALE_CORE_ADVANCED_ASSETS.jokerCombo,
  ],
  // Hollow body hold — before generic hollow body fallback
  [
    ["hollow body hold", "hollow hold"],
    FEMALE_CORE_ADVANCED_ASSETS.hollowBodyHold,
  ],
  // Hollow body rock — before generic hollow body fallback
  [
    ["hollow body rock", "hollow rock"],
    FEMALE_CORE_ADVANCED_ASSETS.hollowBodyRock,
  ],
  // V-up — before generic v-up / sit-up / crunch fallback
  [["v up", "v-up", "vups"], FEMALE_CORE_ADVANCED_ASSETS.vUp],
  // Russian twist — before generic russian twist / oblique twist fallback
  [
    ["russian twist", "russian twists"],
    FEMALE_CORE_ADVANCED_ASSETS.russianTwist,
  ],
  // Cross-body crunch — before generic bicycle / oblique crunch fallback
  [
    ["cross body crunch", "cross-body crunch"],
    FEMALE_CORE_ADVANCED_ASSETS.crossBodyCrunch,
  ],
  // Bicycle with pause / bicycle crunch — before generic bicycle fallback
  [
    ["bicycle with pause", "bicycle crunch"],
    FEMALE_CORE_ADVANCED_ASSETS.bicycleWithPause,
  ],
  // Mountain climber — before generic mountain climber fallback
  [
    ["mountain climber", "mountain climbers"],
    FEMALE_CORE_ADVANCED_ASSETS.mountainClimber,
  ],
  // Spider-man plank — before generic plank fallback
  [
    ["spider-man plank", "spiderman plank"],
    FEMALE_CORE_ADVANCED_ASSETS.spiderManPlank,
  ],
  // Plank to downward dog — before generic plank fallback
  [
    ["plank to downward dog", "plank to down dog"],
    FEMALE_CORE_ADVANCED_ASSETS.plankToDownDog,
  ],
  // Hanging knee raise — before generic hanging raise fallback
  [["hanging knee raise"], FEMALE_CORE_ADVANCED_ASSETS.hangingKneeRaise],
  // Hanging oblique raise — before generic hanging raise fallback
  [["hanging oblique raise"], FEMALE_CORE_ADVANCED_ASSETS.hangingObliqueRaise],
  // L-sit — before generic l-sit fallback
  [["l-sit", "l sit", "lsit", "tuck l-sit"], FEMALE_CORE_ADVANCED_ASSETS.lSit],
  // Toes to bar — before generic hanging raise fallback
  [["toes to bar"], FEMALE_CORE_ADVANCED_ASSETS.toesToBar],

  // ── Core — Pro (female-specific assets) ───────────────────────────────────
  // Most-specific Pro names are listed FIRST so they win over the
  // generic core fallbacks below (hollow body, v-up, bicycle, leg raise,
  // mountain climber, russian twist, l-sit, hanging raise families).
  // Joker combo image — must be checked before generic joker/combo matches
  [
    [
      "combo finisher pro female",
      "joker combo pro female",
      "joker combo core pro female",
    ],
    FEMALE_CORE_PRO_ASSETS.jokerCombo,
  ],
  // Dragon flag negative — before generic dragon flag fallback
  [
    ["dragon flag negative", "neg dragon flag", "negative dragon flag"],
    FEMALE_CORE_PRO_ASSETS.dragonFlagNegative,
  ],
  // Dragon flag — before generic dragon flag fallback
  [["dragon flag", "dragon flags"], FEMALE_CORE_PRO_ASSETS.dragonFlag],
  // Tuck dragon flag — before generic dragon flag fallback
  [
    ["tuck dragon flag", "tucked dragon flag"],
    FEMALE_CORE_PRO_ASSETS.tuckDragonFlag,
  ],
  // Front lever — before generic lever fallback
  [["front lever", "front levers"], FEMALE_CORE_PRO_ASSETS.frontLever],
  // Windshield wipers — before generic wiper fallback
  [
    ["windshield wiper", "windshield wipers", "windshield wipers exercise"],
    FEMALE_CORE_PRO_ASSETS.windshieldWipers,
  ],
  // Toes to bar (Pro) — before generic hanging raise fallback
  [["toes to bar", "toes to bars"], FEMALE_CORE_PRO_ASSETS.toesToBar],
  // Planche lean — before generic planche fallback
  [
    ["planche lean", "planche leans", "hollow body planche rock"],
    FEMALE_CORE_PRO_ASSETS.plancheLean,
  ],
  // Tuck planche — before generic planche fallback
  [
    ["tuck planche", "tucked planche", "straddle planche"],
    FEMALE_CORE_PRO_ASSETS.tuckPlanche,
  ],
  // Hanging L hold — before generic l-sit / hanging raise fallback
  [
    ["hanging l hold", "hanging l-sit", "hanging l sit"],
    FEMALE_CORE_PRO_ASSETS.hangingLHold,
  ],
  // Side plank hip dip — before generic side plank fallback
  [
    ["side plank hip dip", "side plank dips", "star side plank"],
    FEMALE_CORE_PRO_ASSETS.sidePlankHipDip,
  ],
  // Copenhagen plank — before generic plank fallback
  [
    ["copenhagen plank", "copenhagen planks", "copenhagen"],
    FEMALE_CORE_PRO_ASSETS.copenhagenPlank,
  ],
  // Human flag attempt — before generic flag fallback
  [
    ["human flag attempt", "human flag", "flag attempt"],
    FEMALE_CORE_PRO_ASSETS.humanFlagAttempt,
  ],

  // ── Full Body — Beginner (female-specific assets) ───────────────────────────
  // Most-specific beginner names are listed FIRST so they win over the
  // generic full-body burpee/crawl/inchworm/jumping-jack/squat fallbacks
  // below. These resolve to the dedicated FEMALE_FULL_BODY_BEGINNER_ASSETS.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.kingHalf,
  ],
  // Modified Burpee — before generic burpee
  [
    ["modified burpee", "modified burpee beginner"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.modifiedBurpee,
  ],
  // Standard Burpee — before generic burpee
  [
    ["standard burpee", "standard burpee beginner"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.burpee,
  ],
  // Burpee Hold — before generic burpee / hold
  [["burpee hold"], FEMALE_FULL_BODY_BEGINNER_ASSETS.burpee],
  // Bear Crawl Sprint — before generic bear crawl
  [
    ["bear crawl sprint", "bear crawl sprint beginner"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.bearCrawlSprint,
  ],
  // Bear Crawl — before generic crawl
  [["bear crawl", "bearcrawl"], FEMALE_FULL_BODY_BEGINNER_ASSETS.bearCrawl],
  // Crab Walk — before generic crawl
  [["crab walk", "crabwalk"], FEMALE_FULL_BODY_BEGINNER_ASSETS.crabWalk],
  // Inchworm — before generic inchworm / walkout
  [
    ["inchworm", "inch worm", "walkout", "walk out"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.inchworm,
  ],
  // Jumping Jacks — before generic jumping jack
  [
    ["jumping jacks", "jumping jack", "seal jack", "seal jacks"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.jumpingJacks,
  ],
  // High Knees — before generic high knee march
  [
    ["high knees", "high knee", "knee march", "high knee march"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.highKnees,
  ],
  // Box Step-Up — before generic step up
  [
    ["box step-up", "box step up", "box stepup"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.stepUp,
  ],
  // Lateral Shuffle — before generic lateral
  [
    ["lateral shuffle", "side shuffle", "shuffle"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.lateralShuffle,
  ],
  // Squat to Stand — before generic squat
  [
    ["squat to stand", "squat to stand up"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.squatToStand,
  ],
  // Squat Thrust — before generic squat
  [["squat thrust"], FEMALE_FULL_BODY_BEGINNER_ASSETS.squatToStand],
  // Lunge with Torso Twist / Lunge Twist — before generic lunge
  [
    ["lunge with torso twist", "lunge twist", "torso twist lunge"],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.lungeTwist,
  ],
  // Push-Up to Down Dog — before generic push up / plank
  [
    [
      "push up to down dog",
      "push-up to down dog",
      "pushup to down dog",
      "push up down dog",
      "push-up down dog",
    ],
    FEMALE_FULL_BODY_BEGINNER_ASSETS.pushUpDownDog,
  ],

  // ── Full Body — Advanced (female-specific assets) ────────────────────────────
  // Most-specific Advanced names are listed FIRST so they win over the
  // generic full-body burpee/jump/push-up/lunge fallbacks below. These
  // resolve to the dedicated FEMALE_FULL_BODY_ADVANCED_ASSETS.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.kingHalf,
  ],
  // Plyometric Burpee — before generic burpee
  [
    ["plyometric burpee", "plyo burpee", "plyo burpee advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.plyometricBurpee,
  ],
  // Single-Leg Burpee — before generic burpee
  [
    ["single leg burpee", "single-leg burpee", "single leg burpee advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.singleLegBurpee,
  ],
  // Burpee Box Jump — before generic burpee / box jump
  [
    ["burpee box jump", "burpee box jump advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.burpeeBoxJump,
  ],
  // Burpee Chin-up — before generic burpee / chin up
  [
    ["burpee chin up", "burpee chin-up", "burpee chin up advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.burpeeChinUp,
  ],
  // Box Jump — before generic box jump
  [["box jump", "box jump advanced"], FEMALE_FULL_BODY_ADVANCED_ASSETS.boxJump],
  // Broad Jump — before generic broad jump
  [
    ["broad jump", "broad jump advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.broadJump,
  ],
  // Tuck Jump — before generic tuck jump
  [
    ["tuck jump", "tuck jump advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.tuckJump,
  ],
  // Box Jump to Squat Hold — before generic box jump
  [
    ["box jump to squat hold", "box jump to squat hold advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.boxJump,
  ],
  // Spider-Man Push-up — before generic push up
  [
    [
      "spider-man push up",
      "spider man push up",
      "spiderman push up",
      "spider-man pushup",
      "spider man pushup",
      "spiderman push up advanced",
    ],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.spiderManPushUp,
  ],
  // Archer Push-up — before generic push up / archer
  [
    [
      "archer push up",
      "archer push-up",
      "archer pushup",
      "archer push up advanced",
    ],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.archerPushUp,
  ],
  // Decline Push-up to Mountain Climber — before generic push up / decline
  [
    [
      "decline push up to mountain climber",
      "decline push-up to mountain climber",
      "decline push up",
      "decline push-up",
      "decline pushup",
    ],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.declinePushUp,
  ],
  // Diamond Push-up to Jump Squat — before generic push up / diamond
  [
    [
      "diamond push up to jump squat",
      "diamond push-up to jump squat",
      "diamond push up",
    ],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.spiderManPushUp,
  ],
  // Jump Lunge — before generic lunge
  [
    [
      "jump lunge",
      "jump lunge advanced",
      "non-stop jump lunge",
      "non stop jump lunge",
    ],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.jumpLunge,
  ],
  // Lateral Jump Lunge — before generic lunge / lateral
  [
    ["lateral jump lunge", "lateral jump lunge advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.lateralJumpLunge,
  ],
  // Jump Squat to Jump Lunge — before generic jump squat / lunge
  [
    ["jump squat to jump lunge", "jump squat to jump lunge advanced"],
    FEMALE_FULL_BODY_ADVANCED_ASSETS.jumpLunge,
  ],

  // ── Full Body — Pro (female-specific assets) ────────────────────────────────
  // Most-specific Pro names are listed FIRST so they win over the generic
  // full-body burpee/jump/push-up/lunge fallbacks below. These resolve to the
  // dedicated FEMALE_FULL_BODY_PRO_ASSETS.
  //
  // Ace — "Last exercise x2" dedicated image (shared with other decks)
  [
    ["last excersie x2", "last exercise x2", "ace double", "ace x2"],
    FEMALE_FULL_BODY_PRO_ASSETS.aceDouble,
  ],
  // King — "dividing by 2" dedicated image (shared with other decks)
  [
    ["dividng by 2", "dividing by 2", "king half", "king /2"],
    FEMALE_FULL_BODY_PRO_ASSETS.kingHalf,
  ],
  // Joker combo — Muscle-up (before generic muscle up)
  [
    ["joker combo", "joker combo pro", "joker combo full body pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.muscleUp,
  ],
  // Burpee Chin-up — before generic burpee / chin up
  [
    ["burpee chin up", "burpee chin-up", "burpee chin up pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.burpeeChinUp,
  ],
  // Explosive Pull-up — before generic pull up
  [
    [
      "explosive pull up",
      "explosive pull-up",
      "explosive pull",
      "explosive pull up pro",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.explosivePullUp,
  ],
  // Muscle-up — before generic pull up
  [
    ["muscle up", "muscle-up", "muscle up pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.muscleUp,
  ],
  // Clapping Push-up — before generic push up
  [
    [
      "clapping push up",
      "clapping push-up",
      "clapping pushup",
      "clapping push up pro",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.clappingPushUp,
  ],
  // Plyo Push-up — before generic push up / plyo
  [
    ["plyo push up", "plyo push-up", "plyo pushup", "plyo push up pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.plyoPushUp,
  ],
  // Archer Push-up — before generic push up / archer
  [
    ["archer push up", "archer push-up", "archer pushup", "archer push up pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.archerPushUp,
  ],
  // Pistol Squat — before generic squat
  [
    ["pistol squat", "pistol squat pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.pistolSquat,
  ],
  // Pistol Jump — before generic jump / pistol
  [["pistol jump", "pistol jump pro"], FEMALE_FULL_BODY_PRO_ASSETS.pistolJump],
  // Pistol Burpee — before generic burpee / pistol
  [
    ["pistol burpee", "pistol burpee pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.pistolBurpee,
  ],
  // Handstand Push-up — before generic push up / handstand
  [
    [
      "handstand push up",
      "handstand push-up",
      "handstand pushup",
      "handstand push up pro",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.handstandPushUp,
  ],
  // Typewriter Push-up — before generic push up / typewriter
  [
    [
      "typewriter push up",
      "typewriter push-up",
      "typewriter pushup",
      "typewriter push up pro",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.typewriterPushUp,
  ],
  // Queen — Pull-up to Dip Complex — before generic pull up / dip
  [
    [
      "pull-up to dip",
      "pull up to dip",
      "pull-up to dip complex",
      "pull up to dip complex",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.muscleUp,
  ],
  // Queen — Max Clapping Push-ups — before generic clapping push up
  [
    [
      "max clapping",
      "max clapping push up",
      "max clapping push-ups",
      "max clapping pushups",
    ],
    FEMALE_FULL_BODY_PRO_ASSETS.clappingPushUp,
  ],
  // Queen — Pistol Complex — before generic pistol
  [
    ["pistol complex", "pistol complex pro"],
    FEMALE_FULL_BODY_PRO_ASSETS.pistolComplex,
  ],
  // Queen — Freestanding Handstand Attempt — before generic handstand
  [
    ["freestanding handstand", "freestanding handstand attempt"],
    FEMALE_FULL_BODY_PRO_ASSETS.freestandingHandstandAttempt,
  ],

  // Deliberately no generic/reused fallback block here anymore — Core,
  // Full Body, and joker-challenge exercises with no dedicated female
  // asset above now correctly fall through to COMING_SOON_ILLUSTRATION
  // in resolveExerciseIllustration() rather than borrowing a male photo
  // or reusing one unrelated image (e.g. a squat) across a dozen
  // different exercises.
];

/**
 * Male-specific exercise illustration overrides.
 * Uses the same keyword matching logic as the main map. Covers only the
 * newly-delivered dedicated male Core and Full Body — Beginner assets
 * (MALE_CORE_BEGINNER_ASSETS, MALE_CORE_ADVANCED_ASSETS,
 * MALE_CORE_PRO_ASSETS, MALE_FULL_BODY_BEGINNER_ASSETS). Upper Body male
 * art is wired directly into EXERCISE_ILLUSTRATION_MAP (the default map)
 * since it was already the male-resolution path before this array existed.
 * Anything not covered here falls through to EXERCISE_ILLUSTRATION_MAP.
 */
const MALE_EXERCISE_ILLUSTRATION_MAP: Array<[string[], string]> = [
  // ── Core — Beginner (male-specific assets) ──────────────────────────────────
  // Joker Combo (Core Beginner Male) — before generic joker/combo
  [
    [
      "joker combo core beginner",
      "joker combo beginner male",
      "joker combo (core beginner)",
      "combo finisher beginner male",
    ],
    MALE_CORE_BEGINNER_ASSETS.jokerCombo,
  ],
  // Plank Shoulder Tap — before generic plank / plank hold
  [
    ["plank shoulder tap", "shoulder tap plank"],
    MALE_CORE_BEGINNER_ASSETS.plankShoulderTap,
  ],
  // Plank Hold / Long Plank Hold (Queen) — before generic plank
  [
    ["plank hold", "long plank hold", "long plank"],
    MALE_CORE_BEGINNER_ASSETS.plankHold,
  ],
  // Bicycle Crunch — before generic crunch
  [
    ["bicycle crunch", "oblique crunch", "bicycle"],
    MALE_CORE_BEGINNER_ASSETS.bicycleCrunch,
  ],
  // Reverse Crunch — before generic crunch
  [
    ["reverse crunch", "reverse crunches"],
    MALE_CORE_BEGINNER_ASSETS.reverseCrunch,
  ],
  // Crunch / Slow Crunch (Queen) — generic crunch fallback for Core Beginner
  [["crunch", "crunches", "slow crunch"], MALE_CORE_BEGINNER_ASSETS.crunch],
  // Bird Dog
  [["bird dog", "birddog"], MALE_CORE_BEGINNER_ASSETS.birdDog],
  // Flutter Kick
  [
    ["flutter kick", "scissor kick", "flutter kicks"],
    MALE_CORE_BEGINNER_ASSETS.flutterKick,
  ],
  // Leg Raise
  [
    ["leg raise", "lying leg raise", "straight leg raise"],
    MALE_CORE_BEGINNER_ASSETS.legRaise,
  ],

  // ── Core — Advanced (male-specific assets) ──────────────────────────────────
  // Joker combo image — must be checked before generic joker/combo matches
  [
    ["combo finisher advanced male", "joker combo advanced male"],
    MALE_CORE_ADVANCED_ASSETS.jokerCombo,
  ],
  // Hollow body hold — before generic hollow body fallback
  [
    ["hollow body hold", "hollow hold"],
    MALE_CORE_ADVANCED_ASSETS.hollowBodyHold,
  ],
  // Hollow body rock — before generic hollow body fallback
  [
    ["hollow body rock", "hollow rock"],
    MALE_CORE_ADVANCED_ASSETS.hollowBodyRock,
  ],
  // Dead bug — before generic bird dog / hold (Beginner asset, checked here
  // too since Core Advanced/Beginner keyword lists are interleaved below)
  [
    ["dead bug", "modified dead bug", "extended dead bug"],
    MALE_CORE_BEGINNER_ASSETS.deadBug,
  ],
  // Side plank — before generic plank
  [
    ["side plank", "weighted side plank", "side plank hold"],
    MALE_CORE_BEGINNER_ASSETS.sidePlank,
  ],
  // V-up
  [["v up", "v-up", "vups"], MALE_CORE_ADVANCED_ASSETS.vUp],
  // Russian twist
  [["russian twist", "russian twists"], MALE_CORE_ADVANCED_ASSETS.russianTwist],
  // Bicycle with pause
  [["bicycle with pause"], MALE_CORE_ADVANCED_ASSETS.bicycleWithPause],
  // Mountain climber
  [
    ["mountain climber", "mountain climbers"],
    MALE_CORE_ADVANCED_ASSETS.mountainClimber,
  ],
  // Hanging knee raise
  [["hanging knee raise"], MALE_CORE_ADVANCED_ASSETS.hangingKneeRaise],
  // L-sit
  [["l-sit", "l sit", "lsit", "tuck l-sit"], MALE_CORE_ADVANCED_ASSETS.lSit],

  // ── Core — Pro (male-specific assets) ───────────────────────────────────────
  // Toes to bar
  [["toes to bar", "toes to bars"], MALE_CORE_PRO_ASSETS.toesToBar],
  // Planche lean
  [["planche lean", "planche leans"], MALE_CORE_PRO_ASSETS.plancheLean],
  // Side plank hip dip
  [
    ["side plank hip dip", "side plank dips"],
    MALE_CORE_PRO_ASSETS.sidePlankHipDip,
  ],
  // Star side plank
  [["star side plank"], MALE_CORE_PRO_ASSETS.starSidePlank],
  // Human flag attempt
  [
    ["human flag attempt", "human flag", "flag attempt"],
    MALE_CORE_PRO_ASSETS.humanFlagAttempt,
  ],
  // Windshield wipers
  [
    ["windshield wiper", "windshield wipers"],
    MALE_CORE_PRO_ASSETS.windshieldWipers,
  ],

  // ── Full Body — Beginner (male-specific assets) ─────────────────────────────
  // Modified burpee — before generic burpee
  [
    ["modified burpee", "modified burpee beginner"],
    MALE_FULL_BODY_BEGINNER_ASSETS.modifiedBurpee,
  ],
  // Inchworm — before generic inchworm / walkout
  [
    ["inchworm", "inch worm", "walkout", "walk out"],
    MALE_FULL_BODY_BEGINNER_ASSETS.inchworm,
  ],
  // Jumping Jacks
  [
    ["jumping jacks", "jumping jack", "seal jack", "seal jacks"],
    MALE_FULL_BODY_BEGINNER_ASSETS.jumpingJacks,
  ],
  // Bear Crawl
  [["bear crawl", "bearcrawl"], MALE_FULL_BODY_BEGINNER_ASSETS.bearCrawl],
  // Crab Walk
  [["crab walk", "crabwalk"], MALE_FULL_BODY_BEGINNER_ASSETS.crabWalk],
  // Squat to Stand / Squat Thrust
  [
    ["squat to stand", "squat to stand up", "squat thrust"],
    MALE_FULL_BODY_BEGINNER_ASSETS.squatToStand,
  ],
  // Push-Up to Down Dog
  [
    [
      "push up to down dog",
      "push-up to down dog",
      "pushup to down dog",
      "push up down dog",
      "push-up down dog",
    ],
    MALE_FULL_BODY_BEGINNER_ASSETS.pushUpDownDog,
  ],
];

/**
 * Returns the best matching illustration path for an exercise name.
 * Falls back to the Upper Body Beginner Normal Push-up asset if nothing matches.
 */
export function resolveExerciseIllustration(
  exerciseName: string,
  gender?: "male" | "female",
): string {
  const key = normalizeKey(exerciseName);

  // Female-specific overrides. Deliberately does NOT fall through to the
  // shared/male map below on a miss — that map's generic entries are real
  // male-illustrated images, and showing one in a female deck is worse than
  // showing nothing. A female miss goes straight to COMING_SOON_ILLUSTRATION.
  if (gender === "female") {
    for (const [keywords, path] of FEMALE_EXERCISE_ILLUSTRATION_MAP) {
      for (const kw of keywords) {
        if (key.includes(kw)) return path;
      }
    }
    return COMING_SOON_ILLUSTRATION;
  }

  // Male-specific overrides (Core / Full Body — Beginner dedicated art)
  if (gender === "male") {
    for (const [keywords, path] of MALE_EXERCISE_ILLUSTRATION_MAP) {
      for (const kw of keywords) {
        if (key.includes(kw)) return path;
      }
    }
  }

  for (const [keywords, path] of EXERCISE_ILLUSTRATION_MAP) {
    for (const kw of keywords) {
      if (key.includes(kw)) return path;
    }
  }
  return COMING_SOON_ILLUSTRATION;
}

export function getSuitLabel(suit: string, deckCategory?: string): string {
  if (deckCategory === "Lower Body") {
    switch (suit) {
      case "Spades":
        return "SQUATS";
      case "Hearts":
        return "LUNGES";
      case "Diamonds":
        return "STEP-UPS";
      case "Clubs":
        return "CALF and STABILITY";
      default:
        return SUIT_CONFIG[suit]?.label ?? "";
    }
  }
  return SUIT_CONFIG[suit]?.label ?? "";
}

/** Returns the suit config for a given suit string. */
export function getSuitConfig(suit: string): SuitConfig {
  return SUIT_CONFIG[suit] ?? SUIT_CONFIG.Hearts;
}
