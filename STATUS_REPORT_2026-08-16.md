# MyBodyWeight — Build Status & Illustration Update

**Scope of this pass:** replace all Male Upper Body card illustrations (Beginner / Advanced / Pro) with the new photoshoot, then audit the rest of the app for what's built, what's real vs. mocked, and what's worth polishing next.

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
| Pike Push-up Flat / Elevated | reuses `male_ub_beg_pike_push_up.png` | no flat/elevated-specific photo provided (matches prior behavior — both already shared one image) |
| Archer Push-up (Queen), Parallel Bar Dip, Chest Dip | `male_ub_beg_normal_push_up.png` / `male_ub_adv_deep_dip.png` | **⚠ needs a dedicated photo** — no archer-specific shot exists yet; dip cards share one "deep dip" shot for now |

### Pro — 8 dedicated photos, several reused-with-reason
| Card | Image | Note |
|---|---|---|
| Wall Handstand Hold, Freestanding Handstand (Queen) | `male_ub_pro_handstand_hold.png` | dedicated |
| Handstand Push-up (+ Negative) | `male_ub_pro_handstand_push_up.png` | dedicated |
| Pull-up Overhand | `male_ub_pro_normal_pull_up.png` | dedicated |
| Wide Grip Pull-up | `male_ub_pro_wide_pull_up.png` | dedicated |
| L-sit Pull-up (Queen) | `male_ub_pro_l_sit_pull_up.png` | dedicated |
| Archer Push-up Standard/Deep, One-arm Push-up Negative (Queen) | `male_ub_pro_one_arm_push_up.png` | dedicated — one-arm push-up shot fits archer's asymmetric load well |
| Joker combo | `male_ub_pro_joker_combo.png` | dedicated — previously this was just the app logo as a placeholder |
| Close Grip Pull-up | `male_ub_pro_chin_up.png` | reused — no close-grip-specific photo, chin-up is the closest grip variant available |
| Typewriter Push-up | `male_ub_pro_diamond_push_up.png` | **⚠ approximate** — no typewriter-specific photo; weak match |
| Ring Push-up (+ equipment substitute) | `male_ub_pro_clapping_push_up.png` / `male_ub_beg_normal_push_up.png` | **⚠ approximate** on the ring variant |
| Ring Dip, Parallel Bar Dip | `male_ub_pro_explosive_dip.png` / `male_ub_pro_deep_dip.png` | reused dip photos, reasonable fit |
| L-sit Hold (Queen) | `male_ub_pro_deep_dip.png` | **⚠ approximate** — no static L-sit hold photo available |

**Two photos in the Pro folder went unused:** `Archer pull up.png` (a pull movement, doesn't fit any push-up slot it was near) and `muscle up.png` (no muscle-up card exists in this deck). Worth checking whether those were meant for a different deck.

**Bottom line: 5 cards across Advanced/Pro** (Archer Push-up, Typewriter Push-up, Ring Push-up, Ring Dip's L-sit Hold pairing) are running on reused or approximate photos, flagged with ⚠ above. Everything else — all of Beginner, and the majority of Advanced/Pro — now has a dedicated photo from the new shoot. Female Upper Body and every other deck (Lower Body, Core, Full Body) were not touched.

---

## 2. Feature status across the app

### Core card-deck gameplay — ✅ working
All 24 deck combinations (4 categories × 3 difficulties × 2 genders) have real exercise data — none are empty/unbuilt. Ace (×2 previous exercise) and King (÷2) modifier logic, joker combos, equipment substitution, and the "no repeat exercise/movement-category back-to-back" shuffle rules are all implemented in `use-workout.ts`.

### Train Together (multiplayer) — ✅ working, one category locked
This is a real feature, not a mock: it's built on Supabase Realtime channels plus a `train_together_advance_card` RPC that draws one shared card sequence every participant's device renders off. Friend system (add/accept/invite), invite-by-code, host-configures-deck-then-invites flow, and live participant-status sync are all implemented (`trainTogetherBackend.ts`).
- **Core category is locked** ("Coming soon") — intentionally, per a comment in `trainTogetherDraw.ts`: no card data exists for it yet.

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

1. **5 illustration slots flagged ⚠ above** (Archer Push-up, Typewriter Push-up, Ring Push-up, L-sit Hold, and Close Grip Pull-up) are running on reused/approximate photos — good candidates for the next photoshoot batch.
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

*Illustration copy operations and code changes made this session: 33 image files copied into `public/assets/exercises/`; `exerciseAssets.ts` and `use-workout.ts` updated to repoint all Male Upper Body Beginner/Advanced/Pro card image paths. Typecheck passed clean after all edits. Female decks and all other categories were not modified.*
