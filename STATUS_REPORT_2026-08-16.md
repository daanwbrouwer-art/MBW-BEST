# MyBodyWeight — Build Status & Illustration Update

**Running build log — two passes so far, same day.** Session 1 (below, Sections 1-4): replaced all Male Upper Body card illustrations with the new photoshoot and audited the rest of the app. Session 2 (Section 5): fixed the Play Together / folder-drift issue, added BMI onboarding, fixed the Joker overlay, corrected several exercise names/illustrations based on a card-by-card review, fixed a real bug in the Ace/King modifier algorithm, and consolidated the project onto one canonical, git-tracked folder. **Jump to Section 5 for the latest state** — some rows in Section 1's tables below were superseded there (marked inline).

---

## 1. Illustration swap — Male Upper Body

All three difficulty tiers now point at the new photos in `MBW - pictures/Upper body DECK/MEN/`. 33 files were copied into `public/assets/exercises/` under a `male_ub_<tier>_*` naming scheme so they can never collide with the shared files other decks (female Upper Body, Lower Body, Core, Full Body) still depend on — nothing outside the male Upper Body deck was touched.

### Beginner — 12 cards, all dedicated photos
| Card | Image |
|---|---|
| Standard Push-up | `male_ub_beg_normal_push_up.png` |
| Wide Push-up | `male_ub_beg_wide_push_up.png` |
| Incline Push-up | `male_ub_beg_incline_push_up.png` *(see note below)* |
| Push-up Negative (Queen) | `male_ub_beg_negative_push_up.png` |
| Shoulder Tap Push-up | `male_ub_beg_shoulder_tap_push_up.png` |
| Pike Hold | `male_ub_beg_pike_hold.png` |
| Superman Hold | `male_ub_beg_superman_hold.png` |
| Incline / Horizontal Row, Row Hold | `male_ub_beg_inverted_row.png` |
| Bench Dip, Elevated Bench Dip, Bench Dip Slow Negative | `male_ub_beg_negative_bench_dip.png` |
| Tricep Push-up | `male_ub_beg_tricep_push_up.png` |
| Joker combo | `male_ub_beg_combo_finisher.png` |

> **Judgment call:** the "inclined push up" photo was filed under the **Advanced** folder in the pictures set, but nothing in the Advanced deck is called "Incline Push-up" — that's a Beginner-only card, and it had no dedicated photo before (it was silently reusing the Standard Push-up shot). Content matched Beginner far better than folder placement, so it now lives there. Flag if that read was wrong.

### Advanced — 9 dedicated photos, 3 reused-with-reason
| Card | Image | Note |
|---|---|---|
| Decline Push-up | `male_ub_adv_decline_push_up.png` | dedicated |
| Diamond Push-up | `male_ub_adv_diamond_push_up.png` | dedicated |
| Pike Push-up Decline | `male_ub_adv_pike_push_up_decline.png` | dedicated |
| Wall Handstand Hold (Queen) | `male_ub_adv_handstand_hold.png` | dedicated |
| Assisted / Negative Pull-up | `male_ub_adv_chin_up.png` | dedicated |
| Pull-up, Pull-up w/ Pause, Commando Pull-up (Queen) | `male_ub_adv_normal_pull_up.png` | dedicated |
| Dip Slow Negative (Queen) | `male_ub_adv_dip_slow_negative.png` | dedicated |
| Joker combo | `male_ub_adv_joker_combo.png` | dedicated — previously showed the generic pull-up shot |
| Normal Push-up | reuses `male_ub_beg_normal_push_up.png` | same exercise name as Beginner, no separate Advanced photo provided |
| Pike Push-up Flat / Elevated | reuses `male_ub_beg_pike_push_up.png` | **Session 2:** renamed to plain "Pike Push-up" — the Flat/Elevated split implied a visual distinction the shared photo doesn't show |
| Archer Push-up (Queen), Parallel Bar Dip, Chest Dip | `male_ub_beg_normal_push_up.png` / `male_ub_adv_deep_dip.png` | **Session 2:** Archer Push-up (Queen) now shows "Illustration coming soon" instead of the misleading generic push-up photo; Commando Pull-up (Diamonds Queen) got the same treatment |

### Pro — 8 dedicated photos, several reused-with-reason
| Card | Image | Note |
|---|---|---|
| Wall Handstand Hold, Freestanding Handstand (Queen) | `male_ub_pro_handstand_hold.png` | dedicated |
| Handstand Push-up (+ Negative) | `male_ub_pro_handstand_push_up.png` | dedicated |
| Pull-up Overhand | `male_ub_pro_normal_pull_up.png` | dedicated — **Session 2:** renamed to plain "Pull-up" (redundant with the existing generic "Pull-up") |
| Wide Grip Pull-up | `male_ub_pro_wide_pull_up.png` | dedicated |
| L-sit Pull-up (Queen) | `male_ub_pro_l_sit_pull_up.png` | dedicated |
| Archer Push-up Standard/Deep, One-arm Push-up Negative (Queen) | `male_ub_pro_one_arm_push_up.png` | dedicated — **Session 2:** cardMap entries renamed to "One-arm Push-up" / "One-arm Push-up Deep" (the photo is a genuine one-arm push-up, not an archer shift) |
| Joker combo | `male_ub_pro_joker_combo.png` | dedicated — previously this was just the app logo as a placeholder. **Session 2:** this big combo image no longer renders in the Joker overlay at all (see Section 5.3) — the per-exercise 4-square grid is now the only illustration shown |
| Close Grip Pull-up | `male_ub_pro_chin_up.png` | **Session 2:** name kept, but the reused chin-up photo was removed — now shows "Illustration coming soon" |
| Typewriter Push-up | `male_ub_pro_diamond_push_up.png` | **Session 2:** renamed to "Diamond Push-up" — the photo genuinely is a diamond push-up, so this is now a correct match, not an approximation |
| Ring Push-up (+ equipment substitute) | `male_ub_pro_clapping_push_up.png` / `male_ub_beg_normal_push_up.png` | **Session 2:** the ring-owned photo was removed → "Illustration coming soon"; the no-rings substitute (Standard Push-up) still shows its own correct photo |
| Ring Dip, Parallel Bar Dip | `male_ub_pro_explosive_dip.png` / `male_ub_pro_deep_dip.png` | reused dip photos, reasonable fit — left as-is |
| L-sit Hold (Queen) | `male_ub_pro_deep_dip.png` | **Session 2:** photo removed → "Illustration coming soon" |

**Two photos in the Pro folder went unused:** `Archer pull up.png` (a pull movement, doesn't fit any push-up slot it was near) and `muscle up.png` (no muscle-up card exists in this deck). Worth checking whether those were meant for a different deck.

**Bottom line (superseded by Session 2 — see Section 5.2):** the 5 cards originally flagged here (Archer Push-up, Typewriter Push-up, Ring Push-up, L-sit Hold, and Close Grip Pull-up) no longer show approximate/misleading photos. Three were renamed to match what their photo actually shows (Typewriter → Diamond Push-up, Archer Standard/Deep → One-arm Push-up / One-arm Push-up Deep), and two now show "Illustration coming soon" instead of a wrong photo (Close Grip Pull-up, L-sit Hold), alongside Commando Pull-up and Ring Push-up which got the same coming-soon treatment. Female Upper Body and every other deck (Lower Body, Core, Full Body) still have not been touched.

---

## 2. Feature status across the app

### Core card-deck gameplay — ✅ working
All 24 deck combinations (4 categories × 3 difficulties × 2 genders) have real exercise data — none are empty/unbuilt. Ace (×2 previous exercise) and King (÷2) modifier logic, joker combos, equipment substitution, and the "no repeat exercise/movement-category back-to-back" shuffle rules are all implemented in `use-workout.ts`.

### Train Together (multiplayer) — ✅ working, one category locked
This is a real feature, not a mock: it's built on Supabase Realtime channels plus a `train_together_advance_card` RPC that draws one shared card sequence every participant's device renders off. Friend system (add/accept/invite), invite-by-code, host-configures-deck-then-invites flow, and live participant-status sync are all implemented (`trainTogetherBackend.ts`).
- **Core category is locked** ("Coming soon") — intentionally, per a comment in `trainTogetherDraw.ts`: no card data exists for it yet.
- **If this ever looks "missing":** it was, once — see Section 5.1. It's a folder problem, not a code problem. Confirm you're running the dev server from *this* folder (`MBW - 09-08-26`), now the sole canonical copy.

### Map & Parks — ✅ working
Real Leaflet map with marker clustering, backed by a Supabase `nearby_parks()` RPC (not sample data), plus place-name geocoding, "search this area," and an add-a-park flow with equipment tagging.

### Nearby Athletes — ✅ working
Opt-in visibility ("visible to nearby athletes" toggle gates it), live proximity query, and moderation built in (block, report/flag).

### Custom Workout Builder — ✅ working
Client-side deck builder + its own session runner (`CustomWorkoutBuilderPage` / `CustomWorkoutSessionPage`), independent of the pre-built decks.

### Chat — ✅ working
Thread list and conversation view backed by `remoteBackend.ts`, with mute-thread support.

### Achievements & Streaks — ✅ working
Achievement engine computed off real workout history and streak tracking, including a secret "Ghost" achievement (opened the app daily for a week without training) driven by a daily app-open log.

### Subscriptions / Payments — ✅ working on native, mocked in browser
`RevenueCatPaymentService` is wired for real purchases on iOS/Android via Capacitor. In plain browser dev (`npm run dev` — i.e. **the LAN preview you've been testing on your phone**), it automatically falls back to `LocalMockPaymentService`, since there's no native billing runtime to talk to.
> Practical implication: if you test the paywall from the phone browser over your LAN, any "purchase" is fake/local — that's expected, not a bug. Real billing only fires from an installed native build.

### Auth — ✅ working, hybrid
Supports guest mode, Supabase email auth, and legacy Internet Identity (ICP) hooks side by side (`use-local-identity`, `use-local-actor`). The IC hooks look like an earlier architecture that's been superseded by Supabase — worth a cleanup pass if they're confirmed dead, but not causing harm as-is.

---

## 3. Things worth your attention

1. ~~5 illustration slots flagged ⚠ above are running on reused/approximate photos~~ — **resolved in Session 2** (renamed where the photo was actually correct, "coming soon" where no accurate photo exists). Still worth a future photoshoot batch for: One-arm Push-up variants (dynamic archer motion, if wanted as a separate move), Close Grip Pull-up, L-sit Hold, Commando Pull-up, Ring Push-up.
2. **Train Together's Core category** is intentionally locked pending card data — not a bug, but worth deciding when Core gets built out.
3. **Subscription pricing is hardcoded in EUR** in `SUBSCRIPTION_TIERS` rather than reading live per-market pricing from RevenueCat — a documented, deliberate simplification for now, not an oversight.
4. **Legacy Internet Identity auth code** still lives alongside Supabase auth — fine functionally, but worth confirming it's still needed before it accumulates more surface area.
5. Two Pro-tier photos (`Archer pull up.png`, `muscle up.png`) went unused — worth checking if they belong to a different deck.

---

## 4. User-friendly tips worth considering

These are suggestions, not confirmed gaps — flagging where a small addition could meaningfully improve the everyday experience:

- **Train Together — Core "coming soon" state:** a "notify me when this unlocks" tap instead of a flat disabled button turns a dead end into a small win.
- **Card session — rest cue between cards:** if there isn't already a beat between cards for breath/reset, even a 3-second auto-advance pause would reduce the "gym bro treats it like a race" failure mode.
- **Achievements — near-miss nudges:** a push notification when someone's one session away from unlocking something tends to outperform generic streak reminders (worth checking whether `useNotifications` already covers this case).
- **Streak — grace day:** if missing one day currently zeroes the streak, a once-a-week freeze (common in habit apps) meaningfully reduces rage-quits after a single bad day.
- **Custom Workout Builder → Train Together bridge:** letting a custom deck be shared straight into a Train Together session (not just pre-built decks) would connect two features that currently look separate.
- **Map — equipment filter:** with parks already tagged by equipment, a filter chip row (pull-up bar / dip bars / rings) on top of the existing search would make the map more actionable, not just informative.
- **Subscription — trial countdown:** if there's a free trial, a persistent small countdown ("3 days left") tends to convert better than a one-time paywall screen.
- **Illustration credit for the reused/approximate cards:** since 5 slots are running on stand-in photos, a lightweight internal flag (even just a code comment, which this update already adds) prevents someone mistaking "approximate" for "final" later.

---

## 5. Session 2 — Play Together, BMI onboarding, Joker fix, exercise corrections, Ace/King algorithm

### 5.1 The Play Together mystery — solved, and the project consolidated

Three separate copies of this app existed on disk (`MBW - 09-08-26`, `mybodyweight-github`, `mybodyweight-github-2026-07-30`) and had drifted apart. The dev server you were actually testing on your phone was running from `mybodyweight-github-2026-07-30` — the oldest copy, which predates Train Together entirely (its bottom nav literally says "Workouts" in that slot, not "Together," because the feature was never built there). Meanwhile this folder (`MBW - 09-08-26`) has had Train Together fully wired for a while, which is why an earlier Claude Code session correctly reported it as working — it was looking at a different folder than your phone was.

**Fixed:**
- Stopped the stale dev server and corrected `.claude/launch.json` (it pointed at `mybodyweight-github`, a *third*, different folder, not even the one that was actually running) to launch from `MBW - 09-08-26`.
- Verified live: bottom nav now reads "Together," and it opens the real Train Together hub.
- **`MBW - 09-08-26` is now git-initialized** (it never was before) with an initial commit, and is the designated single source of truth going forward.
- **Still on disk, not deleted:** `mybodyweight-github` and `mybodyweight-github-2026-07-30` are legacy. Recommend archiving/removing both once you've confirmed nothing in them is needed, so no future session edits or tests the wrong copy again. `mybodyweight-github` in particular has thousands of lines of uncommitted work sitting in its working tree that never made it into a commit.

### 5.2 New: age, height, weight → BMI onboarding

Added a height slider next to the existing weight/age sliders on the onboarding body-metrics step, with a live BMI readout (category label + numeric BMI) as soon as any of the three is touched.

- `src/lib/calories.ts`: added `calculateBMI()`, `getBMICategory()`, and a mild `bmiFactor()` multiplier (±15%, centered on the WHO-normal BMI midpoint of 22) applied on top of the existing MET×bodyweight×age formula — same "deliberately subtle, not clinical" spirit as the existing age adjustment.
- `heightCm` threaded end-to-end: `types/user.ts` → `use-onboarding.ts` → `use-workout.ts`'s calorie helpers → `WorkoutSetupPage.tsx`'s pre-workout estimate, so the estimate shown before a workout and the total shown after both reflect the same BMI-aware formula.
- Verified live: 64kg/170cm → BMI 22.1 "Healthy weight range"; 105kg/170cm → BMI 36.3 "Higher weight range." Full onboarding flow completes and saves correctly.
- **Gap flagged, not built:** weight/height/age can only be set once, at onboarding — there's no Profile screen to edit them afterward. The plumbing (`saveOnboarding()`) already supports it; a Profile edit card would be a small follow-up.

### 5.3 Joker overlay — removed the duplicate illustration

The Joker overlay was showing three things stacked on top of each other: a 4-square per-exercise mini-grid, then a single big "combo finisher" photo (`jokerImagePath`, the dedicated `male_ub_<tier>_joker_combo.png` / `combo_finisher.png` files from Section 1), then the numbered exercise list. Per your review, that's now down to one representation: the 4-square grid + list. The big combo image no longer renders (`JokerOverlay.tsx`'s `jokerImagePath` prop was removed entirely).

Separately, the 4 squares themselves weren't reliably showing the correct per-exercise photo — Joker combo steps had no explicit `imagePath` field, so they always resolved through a keyword-fuzzy fallback table that, for male Advanced/Pro, mostly maps to generic Beginner-tier images rather than the tier-specific photoshoot. Added an explicit `imagePath` to every combo step in every male Upper Body joker (Beginner/Advanced/Pro), reusing the exact same photo already used for that exercise's real card elsewhere in the deck. Verified live: all 4 squares now show distinct, correct photos.

### 5.4 Exercise name/illustration corrections (male Upper Body, Advanced + Pro)

Based on a card-by-card review against the actual photos:

| Card | Change |
|---|---|
| Archer Push-up Standard/Deep (Pro) | Renamed → **One-arm Push-up** / **One-arm Push-up Deep** — the photo is a genuine one-arm push-up |
| Typewriter Push-up (Pro) | Renamed → **Diamond Push-up** — the photo is a diamond push-up |
| Pull-up Overhand (Pro) | Renamed → **Pull-up** — redundant with the existing generic Pull-up |
| Pike Push-up Flat / Elevated (Advanced) | Renamed → **Pike Push-up** — both reused one generic photo with no visual distinction; Pike Push-up Decline kept its own name (has a distinct photo) |
| Close Grip Pull-up (Pro) | Name **kept** — picture removed, shows "Illustration coming soon" |
| L-sit Hold (Pro), Commando Pull-up (Advanced), Ring Push-up (Pro, rings-owned case only) | Picture removed, shows "Illustration coming soon" |

New `illustrationComingSoon` flag added to the card-config type (`SuitExerciseEntry` in `use-workout.ts`), threaded through `LocalCard` → `LocalSessionCard` → `ExerciseCard.tsx` (renders a placeholder instead of a photo) and into the Pro Deck Preview / paywall screen (`ProDeckPreviewPage.tsx`, `proDeckPreview.ts`). Also updated the "learn more" exercise-info text panel (`ExerciseInfoPanel.tsx`) for the two renamed Archer→One-arm entries.

### 5.5 Ace/King modifier algorithm — rebuilt, and a real positioning bug fixed along the way

New rule, applied uniformly to every category and difficulty (previously Pro got a much higher modifier count than Beginner/Advanced): total Ace+King modifiers = **2 in a 10-card session, 3 in a 20-card session, 4–6 in a 52-card deck**, split as evenly as possible between the two.

While implementing this, found that the *existing* logic (not something introduced this session) had a real bug: `buildLocalDeck` always builds the full ~54-card pool first and only slices it down to the requested count afterward, but modifier cards were being inserted at random positions across that *entire* pool — so a modifier "present" in the full deck would frequently land past the slice cutoff and never actually be drawn. A first test session (10 cards) drew zero modifiers. Fixed by bounding all modifier insertion/relocation to the actual visible window (`sessionLength`) instead of the full padded pool.

Verified live: a fresh 10-card Beginner Upper Body session drew exactly 2 modifiers (1 Ace at card 4, 1 King at card 10), both rendering correctly (×2 doubled reps, ÷2 halved reps).

### 5.6 Verification performed this session

`tsc --noEmit` clean after every batch of edits. Live browser verification: full onboarding flow with BMI, Pro Deck Preview page (all renames + coming-soon placeholders confirmed visually), two complete 10-card Beginner playthroughs (Joker draw + Ace + King all confirmed working correctly).

---

*Session 1 — illustration copy operations and code changes: 33 image files copied into `public/assets/exercises/`; `exerciseAssets.ts` and `use-workout.ts` updated to repoint all Male Upper Body Beginner/Advanced/Pro card image paths. Female decks and all other categories were not modified.*

*Session 2 — code changes: `src/hooks/use-workout.ts`, `src/store/workout.ts`, `src/lib/calories.ts`, `src/lib/proDeckPreview.ts`, `src/pages/OnboardingPage.tsx`, `src/pages/WorkoutSetupPage.tsx`, `src/pages/WorkoutSessionPage.tsx`, `src/pages/ProDeckPreviewPage.tsx`, `src/components/ExerciseCard.tsx`, `src/components/JokerOverlay.tsx`, `src/components/ExerciseInfoPanel.tsx`, `src/types/user.ts`, `src/hooks/use-onboarding.ts`, `.claude/launch.json`. Repo git-initialized with one commit. Typecheck clean throughout.*
