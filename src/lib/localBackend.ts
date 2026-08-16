import {
  type AdminUserEntry,
  DeckCategory,
  DeckDifficulty,
  type OnboardingData,
  UserTier,
} from "../backend";
import type {
  CardCount,
  CardId,
  Deck,
  DeckId,
  DeckWithCards,
  Principal,
  Rank,
  RepSpec,
  SessionCard,
  SessionId,
  Suit,
  UserProfile,
  WorkoutHistoryEntry,
  WorkoutSessionView,
  WorkoutSummary,
  backendInterface,
} from "../backend";

// ─── localStorage-backed data layer ────────────────────────────────────────
// Replaces the ICP canister: accounts, profile stats and workout history all
// live in the browser's localStorage instead of a remote backend.

const ACCOUNTS_KEY = "mbw_accounts_db";

interface StoredAccount {
  principal: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

interface AccountRecord {
  account: StoredAccount;
  profile: UserProfile;
  history: WorkoutHistoryEntry[];
}

// The app patches BigInt.prototype.toJSON (see main.tsx) so bigints already
// serialize to plain decimal strings — JSON.stringify never sees a "bigint"
// typeof value to tag. So on the way back in, known bigint fields are
// explicitly coerced by field name instead of relying on a generic reviver.
function reviveRepsByExercise(raw: unknown): Array<[string, bigint]> {
  return ((raw as [string, unknown][]) ?? []).map(([name, reps]) => [
    name,
    BigInt(reps as any),
  ]);
}

function reviveProfile(raw: any): UserProfile {
  return {
    ...raw,
    createdAt: BigInt(raw.createdAt),
    totalWorkouts: BigInt(raw.totalWorkouts),
    totalCalories: BigInt(raw.totalCalories),
    totalReps: BigInt(raw.totalReps),
    lastWorkoutDate:
      raw.lastWorkoutDate !== undefined && raw.lastWorkoutDate !== null
        ? BigInt(raw.lastWorkoutDate)
        : undefined,
    totalRepsPerSuit: {
      diamonds: BigInt(raw.totalRepsPerSuit.diamonds),
      clubs: BigInt(raw.totalRepsPerSuit.clubs),
      spades: BigInt(raw.totalRepsPerSuit.spades),
      hearts: BigInt(raw.totalRepsPerSuit.hearts),
    },
    aceCardsDrawn: BigInt(raw.aceCardsDrawn),
    kingCardsDrawn: BigInt(raw.kingCardsDrawn),
    jokerCardsDrawn: BigInt(raw.jokerCardsDrawn),
    unlockedAchievements: (raw.unlockedAchievements ?? []).map(
      ([id, ts]: [string, unknown]) => [id, BigInt(ts as any)],
    ),
    fullDecksCompleted: BigInt(raw.fullDecksCompleted),
    longestStreak: BigInt(raw.longestStreak),
    currentStreak: BigInt(raw.currentStreak),
    // Older profiles saved before this field existed predate it — default to empty.
    repsByExercise: reviveRepsByExercise(raw.repsByExercise),
    // Local/guest profiles have no Supabase presence to be discoverable in.
    discoverable: false,
  };
}

function reviveHistoryEntry(raw: any): WorkoutHistoryEntry {
  return {
    ...raw,
    completedAt: BigInt(raw.completedAt),
    totalReps: BigInt(raw.totalReps),
    durationSeconds: BigInt(raw.durationSeconds),
    cardsCompleted: BigInt(raw.cardsCompleted),
    caloriesBurned: BigInt(raw.caloriesBurned),
    aceCardsDrawn: BigInt(raw.aceCardsDrawn),
    kingCardsDrawn: BigInt(raw.kingCardsDrawn),
    jokerCardsDrawn: BigInt(raw.jokerCardsDrawn),
    repsBySuit: {
      diamonds: BigInt(raw.repsBySuit.diamonds),
      clubs: BigInt(raw.repsBySuit.clubs),
      spades: BigInt(raw.repsBySuit.spades),
      hearts: BigInt(raw.repsBySuit.hearts),
    },
    // Older entries saved before Prompt 15 predate time validation —
    // default them to valid so pre-existing history isn't retroactively
    // disqualified from achievement progress.
    isValid: raw.isValid ?? true,
    avgTimePerCard: raw.avgTimePerCard ?? 0,
    repsByExercise: reviveRepsByExercise(raw.repsByExercise),
  };
}

function readAccounts(): Record<string, AccountRecord> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Record<string, AccountRecord> = {};
    for (const email of Object.keys(parsed)) {
      const rec = parsed[email];
      result[email] = {
        account: rec.account,
        profile: reviveProfile(rec.profile),
        history: (rec.history ?? []).map(reviveHistoryEntry),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, AccountRecord>): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getCurrentEmail(): string | null {
  try {
    const raw = localStorage.getItem("mbw_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? null;
  } catch {
    return null;
  }
}

function makeDefaultProfile(
  principal: string,
  username: string,
  email: string,
): UserProfile {
  return {
    principal: principal as unknown as Principal,
    username,
    email,
    createdAt: BigInt(Date.now()),
    totalWorkouts: BigInt(0),
    totalCalories: BigInt(0),
    totalReps: BigInt(0),
    lastWorkoutDate: undefined,
    totalRepsPerSuit: {
      diamonds: BigInt(0),
      clubs: BigInt(0),
      spades: BigInt(0),
      hearts: BigInt(0),
    },
    aceCardsDrawn: BigInt(0),
    kingCardsDrawn: BigInt(0),
    jokerCardsDrawn: BigInt(0),
    unlockedAchievements: [],
    fullDecksCompleted: BigInt(0),
    longestStreak: BigInt(0),
    currentStreak: BigInt(0),
    repsByExercise: [],
    discoverable: false,
  };
}

function isConsecutiveDay(prevMs: number, nextMs: number): boolean {
  const prev = new Date(prevMs);
  const next = new Date(nextMs);
  const prevDay = Date.UTC(
    prev.getUTCFullYear(),
    prev.getUTCMonth(),
    prev.getUTCDate(),
  );
  const nextDay = Date.UTC(
    next.getUTCFullYear(),
    next.getUTCMonth(),
    next.getUTCDate(),
  );
  return nextDay - prevDay === 86400000;
}

function mergeRepsByExercise(
  existing: Array<[string, bigint]>,
  addition: Array<[string, bigint]>,
): Array<[string, bigint]> {
  const totals = new Map(existing);
  for (const [name, reps] of addition) {
    totals.set(name, (totals.get(name) ?? BigInt(0)) + reps);
  }
  return [...totals];
}

function isSameDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

const mockDeck: Deck = {
  id: BigInt(1),
  name: "Upper Body Beginner Deck",
  isAvailable: true,
  description:
    "A full upper body workout using classic calisthenics movements.",
  cardCount: BigInt(52),
  category: DeckCategory.UpperBody,
  difficulty: DeckDifficulty.Beginner,
};

const mockProFemaleDeck: Deck = {
  id: BigInt(2),
  name: "Upper Body — Pro (Women)",
  isAvailable: true,
  description: "Archer push-ups, pull-ups and elite skill work",
  cardCount: BigInt(54),
  category: DeckCategory.UpperBody,
  difficulty: DeckDifficulty.Pro,
};

const mockCard = {
  id: BigInt(1),
  rank: "Ten" as Rank,
  suit: "Hearts" as Suit,
  exercise: "Normal Push Ups",
  deckId: BigInt(1),
  imageUrl: "/assets/normal_pushup.png",
  repSpec: { __kind__: "Fixed", Fixed: BigInt(10) } as RepSpec,
  videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
};

const mockSession: WorkoutSessionView = {
  id: BigInt(1),
  currentIndex: BigInt(0),
  startTime: BigInt(Date.now()),
  status: "Active" as any,
  totalCards: BigInt(10),
  deckId: BigInt(1),
  cardCount: BigInt(10),
  elapsedSeconds: BigInt(0),
  remainingCards: BigInt(10),
  estimatedCalories: BigInt(0),
};

export const localBackend: backendInterface = {
  addCard: async () => BigInt(1) as CardId,
  addDeck: async () => BigInt(1) as DeckId,
  completeWorkout: async (): Promise<WorkoutSummary | null> => ({
    startTime: BigInt(Date.now() - 1200000),
    totalCards: BigInt(10),
    completedCards: BigInt(10),
    durationSeconds: BigInt(1200),
    sessionId: BigInt(1),
    estimatedCalories: BigInt(128),
  }),
  createWorkoutSession: async () => BigInt(1) as SessionId,
  deleteDeck: async () => undefined,
  getDeck: async (): Promise<DeckWithCards | null> => ({
    deck: mockDeck,
    cards: [mockCard],
  }),
  getDecks: async (): Promise<Deck[]> => [mockDeck, mockProFemaleDeck],
  getDeckByCategory: async (): Promise<DeckWithCards | null> => ({
    deck: mockDeck,
    cards: [mockCard],
  }),
  getMyProfile: async () => {
    const email = getCurrentEmail();
    if (!email) return { __kind__: "err", err: "Not authenticated" };
    const accounts = readAccounts();
    const record = accounts[email];
    if (!record) return { __kind__: "err", err: "Account not found" };
    return { __kind__: "ok", ok: record.profile };
  },
  getMyWorkoutHistory: async () => {
    const email = getCurrentEmail();
    if (!email) return { __kind__: "err", err: "Not authenticated" };
    const accounts = readAccounts();
    const record = accounts[email];
    if (!record) return { __kind__: "err", err: "Account not found" };
    return { __kind__: "ok", ok: record.history };
  },
  getWorkoutSession: async (): Promise<WorkoutSessionView | null> =>
    mockSession,
  loginUser: async (email: string, passwordHash: string) => {
    const accounts = readAccounts();
    const record = accounts[email];
    if (!record || record.account.passwordHash !== passwordHash) {
      return { __kind__: "err", err: "Invalid email or password" };
    }
    return { __kind__: "ok", ok: record.profile };
  },
  nextCard: async (): Promise<SessionCard | null> => ({
    card: mockCard,
    reps: BigInt(10),
    isMod: false,
  }),
  registerUser: async (
    username: string,
    email: string,
    passwordHash: string,
  ) => {
    const accounts = readAccounts();
    if (accounts[email]) {
      return {
        __kind__: "err",
        err: "An account with this email already exists",
      };
    }
    const principal = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    accounts[email] = {
      account: {
        principal,
        username,
        email,
        passwordHash,
        createdAt: Date.now(),
      },
      profile: makeDefaultProfile(principal, username, email),
      history: [],
    };
    writeAccounts(accounts);
    return { __kind__: "ok", ok: null };
  },
  saveWorkoutHistory: async (entry: WorkoutHistoryEntry) => {
    const email = getCurrentEmail();
    if (!email) return { __kind__: "err", err: "Not authenticated" };
    const accounts = readAccounts();
    const record = accounts[email];
    if (!record) return { __kind__: "err", err: "Account not found" };

    record.history.push(entry);

    const p = record.profile;
    const completedAtMs = Number(entry.completedAt);
    const lastMs =
      p.lastWorkoutDate !== undefined ? Number(p.lastWorkoutDate) : null;
    let currentStreak = Number(p.currentStreak);
    if (lastMs === null) {
      currentStreak = 1;
    } else if (isSameDay(lastMs, completedAtMs)) {
      // same day — streak unchanged
    } else if (isConsecutiveDay(lastMs, completedAtMs)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    const longestStreak = Math.max(Number(p.longestStreak), currentStreak);

    record.profile = {
      ...p,
      totalWorkouts: p.totalWorkouts + BigInt(1),
      totalCalories: p.totalCalories + entry.caloriesBurned,
      totalReps: p.totalReps + entry.totalReps,
      lastWorkoutDate: entry.completedAt,
      totalRepsPerSuit: {
        diamonds: p.totalRepsPerSuit.diamonds + entry.repsBySuit.diamonds,
        clubs: p.totalRepsPerSuit.clubs + entry.repsBySuit.clubs,
        spades: p.totalRepsPerSuit.spades + entry.repsBySuit.spades,
        hearts: p.totalRepsPerSuit.hearts + entry.repsBySuit.hearts,
      },
      aceCardsDrawn: p.aceCardsDrawn + entry.aceCardsDrawn,
      kingCardsDrawn: p.kingCardsDrawn + entry.kingCardsDrawn,
      jokerCardsDrawn: p.jokerCardsDrawn + entry.jokerCardsDrawn,
      currentStreak: BigInt(currentStreak),
      longestStreak: BigInt(longestStreak),
      repsByExercise: mergeRepsByExercise(
        p.repsByExercise,
        entry.repsByExercise,
      ),
    };
    writeAccounts(accounts);
    return { __kind__: "ok", ok: null };
  },
  updateCard: async () => undefined,
  updateProfile: async (username: string) => {
    const email = getCurrentEmail();
    if (!email) return { __kind__: "err", err: "Not authenticated" };
    const accounts = readAccounts();
    const record = accounts[email];
    if (!record) return { __kind__: "err", err: "Account not found" };
    record.account.username = username;
    record.profile = { ...record.profile, username };
    writeAccounts(accounts);
    return { __kind__: "ok", ok: null };
  },
  // verifyEmail removed in refactor
  getTier: async (): Promise<UserTier> => UserTier.Registered,
  saveOnboarding: async (): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: null }),
  getOnboarding: async (): Promise<OnboardingData | null> => null,
  adminGrantSubscriber: async (): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: null }),
  adminRevokeSubscriber: async (): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: null }),
  getAdminUserList: async (): Promise<
    { __kind__: "ok"; ok: AdminUserEntry[] } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: [] }),
  setAdminPrincipal: async (): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: null }),
  setTier: async (): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  > => ({ __kind__: "ok", ok: null }),
  revokeTier: async (_principal: Principal) => ({ __kind__: "ok", ok: null }),
  getAchievements: async () => [],
  getUserAchievements: async () => [],
  // resendVerificationEmail removed in refactor
  addExercise: async () => {},
  getExercise: async () => null,
  listExercises: async () => [],
  // Upper Body — Beginner deck bindings
  clearLegacyUpperBody: async () => undefined,
  seedUpperBodyBeginnerDeck: async () => undefined,
  getUpperBodyBeginnerDeckIdentity: async () => ({
    name: "Upper Body — Beginner",
    subtitle: "Build your foundation — push, pull and hold with perfect form",
    category: "Upper Body",
    difficulty: "Beginner",
    gender: "Male",
    equipment: "None",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getUpperBodyBeginnerJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher beginner .png",
    steps: [
      { exerciseName: "Standard Push-up", reps: BigInt(10) },
      { exerciseName: "Pike Push-up", reps: BigInt(10) },
      { exerciseName: "Incline Row", reps: BigInt(10) },
      { exerciseName: "Bench Dip", reps: BigInt(10) },
    ],
  }),
  computeUpperBodyBeginnerTotals: async () => [],
  // Upper Body — Pro (Women) deck bindings
  clearLegacyUpperBodyProFemale: async () => undefined,
  seedUpperBodyProFemaleDeck: async () => undefined,
  getUpperBodyProFemaleDeckIdentity: async () => ({
    name: "Upper Body — Pro (Women)",
    subtitle: "Archer push-ups, pull-ups and elite skill work",
    category: "Upper Body",
    difficulty: "Pro",
    gender: "Female",
    equipment: "Pull-up bar + parallel bars",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getUpperBodyProFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher pro female.png",
    steps: [
      { exerciseName: "Archer Push-up", reps: BigInt(5) },
      { exerciseName: "Handstand Push-up Negative", reps: BigInt(5) },
      { exerciseName: "Pull-up", reps: BigInt(5) },
      { exerciseName: "Parallel Bar Dip", reps: BigInt(5) },
    ],
  }),
  computeUpperBodyProFemaleTotals: async () => [],
  // Lower Body — Beginner (Women) deck bindings
  clearLegacyLowerBodyBeginnerFemale: async () => undefined,
  seedLowerBodyBeginnerFemaleDeck: async () => undefined,
  getLowerBodyBeginnerFemaleDeckIdentity: async () => ({
    name: "Lower Body — Beginner (Women)",
    subtitle: "Squats, glute bridges and lunges — build from the ground up",
    category: "Lower Body",
    difficulty: "Beginner",
    gender: "Female",
    equipment: "None. Wall sit uses a wall.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getLowerBodyBeginnerFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher beginner female.png",
    steps: [
      { exerciseName: "Sumo Squat", reps: BigInt(10) },
      { exerciseName: "Single-Leg Glute Bridge", reps: BigInt(10) },
      { exerciseName: "Reverse Lunge", reps: BigInt(10) },
      { exerciseName: "Step-Up", reps: BigInt(10) },
    ],
  }),
  computeLowerBodyBeginnerFemaleTotals: async () => [],
  // Lower Body — Advanced (Women) deck bindings
  clearLegacyLowerBodyAdvancedFemale: async () => undefined,
  seedLowerBodyAdvancedFemaleDeck: async () => undefined,
  getLowerBodyAdvancedFemaleDeckIdentity: async () => ({
    name: "Lower Body — Advanced (Women)",
    subtitle: "Split squats, plyometrics and glute isolation — next level",
    category: "Lower Body",
    difficulty: "Advanced",
    gender: "Female",
    equipment: "Low box or bench for BSS and hip thrust.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getLowerBodyAdvancedFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher advanced female.png",
    steps: [
      { exerciseName: "BSS", reps: BigInt(6) },
      { exerciseName: "Single-Leg Hip Thrust", reps: BigInt(6) },
      { exerciseName: "Jump Lunge", reps: BigInt(6) },
      { exerciseName: "Glute Kickback", reps: BigInt(10) },
    ],
  }),
  computeLowerBodyAdvancedFemaleTotals: async () => [],
  // Lower Body — Pro (Women) deck bindings
  clearLegacyLowerBodyProFemale: async () => undefined,
  seedLowerBodyProFemaleDeck: async () => undefined,
  getLowerBodyProFemaleDeckIdentity: async () => ({
    name: "Lower Body — Pro (Women)",
    subtitle: "Pistol squats, explosive jumps and single-leg mastery",
    category: "Lower Body",
    difficulty: "Pro",
    gender: "Female",
    equipment: "Box for assisted pistol squat, otherwise none.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getLowerBodyProFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher pro female.png",
    steps: [
      { exerciseName: "Full Pistol Squat", reps: BigInt(3) },
      { exerciseName: "Tuck Jump", reps: BigInt(5) },
      { exerciseName: "Shrimp Squat", reps: BigInt(3) },
      { exerciseName: "Lateral Bound", reps: BigInt(5) },
    ],
  }),
  computeLowerBodyProFemaleTotals: async () => [],
  // Core — Beginner (Women) deck bindings
  clearLegacyCoreBeginnerFemale: async () => undefined,
  seedCoreBeginnerFemaleDeck: async () => undefined,
  getCoreBeginnerFemaleDeckIdentity: async () => ({
    name: "Core — Beginner (Women)",
    subtitle: "Planks, crunches and stability — build a rock-solid core",
    category: "Core",
    difficulty: "Beginner",
    gender: "Female",
    equipment: "None.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getCoreBeginnerFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher beginner female.png",
    steps: [
      { exerciseName: "Plank", reps: BigInt(30) },
      { exerciseName: "Bicycle Crunch", reps: BigInt(10) },
      { exerciseName: "Dead Bug", reps: BigInt(10) },
      { exerciseName: "Leg Raise", reps: BigInt(10) },
    ],
  }),
  computeCoreBeginnerFemaleTotals: async () => [],
  // Core — Advanced (Women) deck bindings
  clearLegacyCoreAdvancedFemale: async () => undefined,
  seedCoreAdvancedFemaleDeck: async () => undefined,
  getCoreAdvancedFemaleDeckIdentity: async () => ({
    name: "Core — Advanced (Women)",
    subtitle: "Hollow body, hanging core and dynamic stability",
    category: "Core",
    difficulty: "Advanced",
    gender: "Female",
    equipment: "Pull-up bar (Clubs suit). Otherwise none.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getCoreAdvancedFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher advanced female.png",
    steps: [
      { exerciseName: "V-Up", reps: BigInt(10) },
      { exerciseName: "Bicycle with Pause", reps: BigInt(10) },
      { exerciseName: "Mountain Climber", reps: BigInt(10) },
      { exerciseName: "Hanging Knee Raise", reps: BigInt(5) },
    ],
  }),
  computeCoreAdvancedFemaleTotals: async () => [],
  // Core — Pro (Women) deck bindings
  clearLegacyCoreProFemale: async () => undefined,
  seedCoreProFemaleDeck: async () => undefined,
  getCoreProFemaleDeckIdentity: async () => ({
    name: "Core — Pro (Women)",
    subtitle: "Dragon flags, windshield wipers and gymnastic core",
    category: "Core",
    difficulty: "Pro",
    gender: "Female",
    equipment:
      "Pull-up bar (Clubs and Hearts). Parallel bars or floor for others.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getCoreProFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher pro female.png",
    steps: [
      { exerciseName: "Dragon Flag", reps: BigInt(3) },
      { exerciseName: "Windshield Wipers Straight", reps: BigInt(5) },
      { exerciseName: "Planche Lean", reps: BigInt(10) },
      { exerciseName: "Copenhagen Plank", reps: BigInt(5) },
    ],
  }),
  computeCoreProFemaleTotals: async () => [],
  // Full Body — Beginner (Women) deck bindings
  clearLegacyFullBodyBeginnerFemale: async () => undefined,
  seedFullBodyBeginnerFemaleDeck: async () => undefined,
  getFullBodyBeginnerFemaleDeckIdentity: async () => ({
    name: "Full Body — Beginner (Women)",
    subtitle: "Total-body movement — cardio, strength and coordination",
    category: "Full Body",
    difficulty: "Beginner",
    gender: "Female",
    equipment: "None.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getFullBodyBeginnerFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher beginner female.png",
    steps: [
      { exerciseName: "Burpee", reps: BigInt(5) },
      { exerciseName: "High Knees", reps: BigInt(10) },
      { exerciseName: "Bear Crawl", reps: BigInt(5) },
      { exerciseName: "Push-Up to Down Dog", reps: BigInt(5) },
    ],
  }),
  computeFullBodyBeginnerFemaleTotals: async () => [],
  // Full Body — Advanced (Women) deck bindings
  clearLegacyFullBodyAdvancedFemale: async () => undefined,
  seedFullBodyAdvancedFemaleDeck: async () => undefined,
  getFullBodyAdvancedFemaleDeckIdentity: async () => ({
    name: "Full Body — Advanced (Women)",
    subtitle: "Plyometrics, explosive combos and full-body conditioning",
    category: "Full Body",
    difficulty: "Advanced",
    gender: "Female",
    equipment: "Box for box jumps (one variation).",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getFullBodyAdvancedFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher advanced female.png",
    steps: [
      { exerciseName: "Plyometric Burpee", reps: BigInt(5) },
      { exerciseName: "Box Jump", reps: BigInt(5) },
      { exerciseName: "Archer Push-up", reps: BigInt(5) },
      { exerciseName: "Jump Lunge", reps: BigInt(10) },
    ],
  }),
  computeFullBodyAdvancedFemaleTotals: async () => [],
  // Full Body — Pro (Women) deck bindings
  clearLegacyFullBodyProFemale: async () => undefined,
  seedFullBodyProFemaleDeck: async () => undefined,
  getFullBodyProFemaleDeckIdentity: async () => ({
    name: "Full Body — Pro (Women)",
    subtitle:
      "Elite full-body mastery — explosive power, skill holds and conditioning",
    category: "Full Body",
    difficulty: "Pro",
    gender: "Female",
    equipment: "Pull-up bar + parallel bars for skill work.",
    isAvailable: true,
    cardCount: BigInt(54),
  }),
  getFullBodyProFemaleJokerCombo: async () => ({
    restBetween: false,
    imageAsset: "/assets/exercises/combo finisher pro female.png",
    steps: [
      { exerciseName: "Muscle-Up", reps: BigInt(3) },
      { exerciseName: "Pistol Squat", reps: BigInt(3) },
      { exerciseName: "Handstand Push-up", reps: BigInt(5) },
      { exerciseName: "Burpee Muscle-Up", reps: BigInt(3) },
    ],
  }),
  computeFullBodyProFemaleTotals: async () => [],
};
