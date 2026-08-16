# Illustrations Needed

This file lists every exercise across every deck / difficulty / gender combination in `src/data/exerciseAssets.ts` that currently **reuses** a fallback, generic, or "closest matching" image instead of having its own dedicated illustration. Dropping a correctly-named PNG into `public/assets/exercises/` is **not enough by itself** — the corresponding entry in `src/data/exerciseAssets.ts` (either a deck asset constant like `FEMALE_CORE_PRO_ASSETS`, or a keyword entry in `EXERCISE_ILLUSTRATION_MAP` / `FEMALE_EXERCISE_ILLUSTRATION_MAP`) must also be updated to point at the new filename. That rewiring is a follow-up step and is **not** done in this document.

All target files live at `public/assets/exercises/<filename>` (confirmed against existing entries such as `public/assets/exercises/normal_squat.png` and `public/assets/exercises/bench dip.png`, which are referenced in code as `/assets/exercises/normal_squat.png` etc.).

Ace ("Last exercise x2") and King ("dividing by 2") face cards are intentionally shared globally across every deck (per the file's own comments) and are **not** treated as gaps here — they are game-mechanic cards, not exercises.

---

## Upper Body — Beginner (Male)

No gaps. Every key in `UPPER_BODY_BEGINNER_ASSETS` (normalPushUp, widePushUp, negativePushUp, shoulderTapPushUp, pikePushUp, pikeHold, supermanHold, invertedRow, negativeBenchDip, tricepPushUp, jokerCombo) points to its own uniquely named `male_*.png` file.

## Upper Body — Beginner (Female)

No gaps. Every key in `FEMALE_UPPER_BODY_BEGINNER_ASSETS` points to its own uniquely named file (e.g. `knee push up.png`, `shoulder tap push up.png`, `tricep push up.png`).

## Upper Body — Advanced (Female)

Source: `FEMALE_UPPER_BODY_ADVANCED_ASSETS`. Naming convention in this deck: lowercase words separated by spaces, `.png`.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Decline Push-up | `normal push up.png` | `decline push up.png` |
| Pike Push-up Elevated | `pike push up.png` (same file as Flat variant) | `pike push up elevated.png` |
| Pike Push-up Decline | `pike push up.png` (same file as Flat variant) | `pike push up decline.png` |
| Wall Handstand Hold | `pike hold.png` | `wall handstand hold.png` |
| Assisted Chin-up | `chinup_rows.png` (uncertain — this file may be intended as a generic "assisted" pulling asset, shared with the Male generic deck's "Assisted Pull-up") | `assisted chin up.png` |
| Chin-up with Pause | `chinup_pullup.png` (same file as Full Chin-up) | `chin up with pause.png` |
| Commando Pull-up | `normal_pullup.png` (comment in file says this should reuse chin-up, but the code actually points to `normal_pullup.png` — flagging the code's actual behavior; comment/code mismatch, uncertain) | `commando pull up.png` |
| Chest Dip | `dips.png` (generic dip placeholder, shared with Parallel Bar Dip / Dip Slow Negative and many other decks) | `chest dip.png` |
| Parallel Bar Dip | `dips.png` (generic dip placeholder) | `parallel bar dip.png` |
| Dip Slow Negative | `dips.png` (generic dip placeholder) | `dip slow negative.png` |
| Archer Push-up | `normal push up.png` (same file as Normal/Decline Push-up) | `archer push up.png` |

## Upper Body — Pro (Female)

Source: `FEMALE_UPPER_BODY_PRO_ASSETS`, plus keyword overrides in `FEMALE_EXERCISE_ILLUSTRATION_MAP` (lines ~1043–1163) that route additional named variants onto these same assets.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Handstand Hold (incl. Wall Handstand Hold / Freestanding Handstand Attempt) | `pike hold.png` | `handstand hold.png` |
| Handstand Push-up (incl. Negative variant) | `pike push up.png` | `handstand push up.png` |
| Typewriter Push-up | `wide_pushup.png` — uncertain whether this is truly dedicated or a renamed shared wide-push-up file; flagging since it doesn't follow this deck's "space-separated" convention | `typewriter push up.png` |
| Close Grip Pull-up | `normal_pullup.png` (same file as generic Pull-up) | `close grip pull up.png` |
| Pull-up Overhand | `normal_pullup.png` (same file as generic Pull-up) | `pull up overhand.png` |
| L-sit Pull-up | `chinup_pullup.png` | `l sit pull up.png` |
| Ring Push-up | `normal push up.png` (same file as Archer Push-up) | `ring push up.png` |
| Ring Dip | `dips.png` (generic dip placeholder) | `ring dip.png` |
| L-sit Hold | `dips.png` (generic dip placeholder — shape mismatch, an L-sit hold looks nothing like a dip) | `l sit hold.png` |
| Parallel Bar Dip (Pro variant) | `dips.png` (generic dip placeholder) | `parallel bar dip pro.png` |

## Upper Body — Advanced & Pro (Male / generic map)

There is no `MALE_UPPER_BODY_ADVANCED_ASSETS` / `MALE_UPPER_BODY_PRO_ASSETS` constant. Male Advanced/Pro Upper Body resolves entirely through keyword entries in `EXERCISE_ILLUSTRATION_MAP` (lines ~651–738) that intentionally point back at the Beginner deck's `male_*` files.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Handstand Push-up | `male_pike_push_up.png` (UPPER_BODY_BEGINNER_ASSETS.pikePushUp) | `male_handstand_push_up.png` |
| Wall Handstand Hold / Freestanding Handstand / Handstand Hold / Handstand Attempt | `male_pike_hold.png` (UPPER_BODY_BEGINNER_ASSETS.pikeHold) | `male_handstand_hold.png` |
| Typewriter Push-up | `male_wide_push_up.png` (UPPER_BODY_BEGINNER_ASSETS.widePushUp) | `male_typewriter_push_up.png` |
| Archer Push-up (Standard / Deep / One-arm Push-up Negative) | `male_normal_push_up.png` (UPPER_BODY_BEGINNER_ASSETS.normalPushUp) | `male_archer_push_up.png` |
| Ring Push-up | `male_normal_push_up.png` | `male_ring_push_up.png` |
| Decline Push-up | `male_normal_push_up.png` | `male_decline_push_up.png` |
| Close Grip Pull-up | `normal_pullup.png` (generic, shared with plain Pull-up) | `male_close_grip_pull_up.png` |
| L-sit Pull-up | `normal_pullup.png` | `male_l_sit_pull_up.png` |
| Commando Pull-up | `normal_pullup.png` | `male_commando_pull_up.png` |
| Assisted Pull-up | `chinup_rows.png` (uncertain — same file as Female Advanced's Assisted Chin-up) | `male_assisted_pull_up.png` |

*(Diamond Push-up and plain Wide-Grip Pull-up/Chin-up/Pull-up are intentionally excluded — the file's own comment confirms Diamond Push-up "stays diamond_pushup.png" as a genuine dedicated asset, and `wide_pullup.png` / `chinup_pullup.png` / `normal_pullup.png` are each uniquely owned by their base exercise.)*

## Lower Body — Beginner (Female)

Source: `FEMALE_LOWER_BODY_BEGINNER_ASSETS`.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Glute Bridge Pulse | `glute bridge.png` (same file as Two-Leg Glute Bridge) | `glute bridge pulse.png` |
| Walking Lunge | `front_lunge.png` (same file as Forward Lunge) | `walking lunge.png` |
| Single-Leg Balance Hold | `calf_raise.png` (same file as Standing Calf Raise) | `single leg balance hold.png` |

## Lower Body — Advanced (Female)

Source: `FEMALE_LOWER_BODY_ADVANCED_ASSETS`.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| BSS Isometric Hold | `bulgarian split squat.png` (same file as BSS Normal) | `bss isometric hold.png` |
| Hip Thrust Pulse | `hip thrust.png` (same file as Elevated Hip Thrust) | `hip thrust pulse.png` |
| Continuous Jump Lunge | `jump lunge.png` (same file as Jumping Lunge) | `continuous jump lunge.png` |
| Donkey Kick Pulse | `glute kickback.png` (same file as Glute Kickback) | `donkey kick pulse.png` |

## Lower Body — Pro (Female)

No gaps. Every key in `FEMALE_LOWER_BODY_PRO_ASSETS` points to its own uniquely named file.

## Lower Body — Beginner / Advanced / Pro (Male)

Almost every named exercise here has its own dedicated `snake_case.png` file (e.g. `pistol_squat_advanced.png`, `bg_split_squat.png`, `curtsy_lunge.png`, `one_leg_step_up.png`). The exceptions live in the "Lower Body (other/placeholder)" block of `EXERCISE_ILLUSTRATION_MAP` (lines ~844–859), which applies to both male and (as a secondary fallback) female decks:

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Glute Bridge / Single-Leg Glute Bridge | `normal_squat.png` (shape mismatch — a squat image standing in for a floor bridge) | `glute_bridge.png` |
| Box Step-up / Lateral Step-up | `step_up.png` | `box_step_up.png` / `lateral_step_up.png` |
| Nordic Curl (generic/male) | `single leg nordic curl.png` (cross-gender reuse of the Female Lower Body Pro asset) | `nordic_curl.png` |
| Donkey Kick (generic/male) | `normal_squat.png` (shape mismatch) | `donkey_kick.png` |
| Romanian Deadlift | `normal_squat.png` (shape mismatch — hip-hinge exercise using a squat image) | `romanian_deadlift.png` |
| Plyometric Lunge / Lateral Lunge (generic/male) | `alternating_lunge.png` | `plyometric_lunge.png` / `lateral_lunge.png` |
| Sissy Squat | `normal_squat.png` (shape mismatch — very different knee-dominant movement) | `sissy_squat.png` |

## Core — Beginner (Female)

Source: `FEMALE_CORE_BEGINNER_ASSETS`. All 13 base keys are individually dedicated. The gaps are the deck's own documented Queen face-card variants, which reuse the base exercise's image (per the file's header comment):

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Long Plank Hold (Queen) | `plank hold.png` (same as Plank Hold) | `long plank hold.png` |
| Slow Crunch (Queen) | `crunch.png` (same as Crunch) | `slow crunch.png` |
| Bear Crawl Hold (Queen) | `bear crawl.png` (same as Bear Crawl) | `bear crawl hold.png` |
| Leg Raise Hold (Queen) | `leg raise.png` (same as Leg Raise) | `leg raise hold.png` |

## Core — Advanced (Female)

Source: `FEMALE_CORE_ADVANCED_ASSETS`. All 13 base keys are individually dedicated. Gaps are documented Queen variants plus one cross-deck ambiguity:

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Hollow Body Hold 30 sec (Queen) | `hollow body hold.png` (same as Hollow Body Hold) | `hollow body hold queen.png` |
| Russian Twist 30 sec (Queen) | `russian twist.png` (same as Russian Twist) | `russian twist queen.png` |
| Mountain Climber 30 sec (Queen) | `mountain climber.png` (same as Mountain Climber) | `mountain climber queen.png` |
| Joker Combo (Core — Advanced Female) | `combo finisher advanced female.png` — **uncertain/cross-deck**: this exact file is also used as the Joker Combo for Lower Body — Advanced (Female); at least one of the two decks is missing its own dedicated combo-finisher art | `combo finisher advanced female core.png` |

## Core — Pro (Female)

Source: `FEMALE_CORE_PRO_ASSETS`.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Tuck Dragon Flag | `dragon flag.png` (same as Dragon Flag) | `tuck dragon flag.png` |
| Straddle Planche | `tuck planche.png` (same as Tuck Planche) | `straddle planche.png` |
| Hollow Body Planche Rock | `planche lean.png` (same as Planche Lean) | `hollow body planche rock.png` |
| Star Side Plank | `side plank hip dip.png` (same as Side Plank Hip Dip) | `star side plank.png` |
| Dragon Flag (Queen) | `dragon flag.png` | `dragon flag queen.png` |
| Toes to Bar (Queen) | `toes to bar.png` (same file used by the base Toes to Bar exercise — uncertain whether this Queen entry is meant to be visually distinct) | `toes to bar queen.png` |

## Full Body — Beginner (Female)

Source: `FEMALE_FULL_BODY_BEGINNER_ASSETS`. All 12 base keys are individually dedicated. Gaps come from extra named card variants in `FEMALE_EXERCISE_ILLUSTRATION_MAP` (lines ~1940–2008) that route onto these same assets:

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Burpee Hold | `burpee.png` (same as dynamic Burpee — a static hold reusing a dynamic-movement image) | `burpee hold.png` |
| Bear Crawl Sprint | `bear crawl.png` (same as Bear Crawl) | `bear crawl sprint.png` |
| Box Step-Up | `step up.png` (uncertain — may just be an alternate name for the same Step-Up exercise rather than a truly distinct movement) | `box step up.png` |
| Squat Thrust | `squat to stand.png` (same as Squat to Stand — different movement) | `squat thrust.png` |

## Full Body — Advanced (Female)

Source: `FEMALE_FULL_BODY_ADVANCED_ASSETS`. All 12 base keys are individually dedicated. Gaps come from extra named card variants in `FEMALE_EXERCISE_ILLUSTRATION_MAP` (lines ~2010–2123):

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Box Jump to Squat Hold | `box jump.png` (same as plain Box Jump) | `box jump to squat hold.png` |
| Diamond Push-up to Jump Squat | `spiderman push up.png` (reuses Spider-Man Push-up's image — mismatched exercise family, this combo has neither a diamond-push-up nor a jump-squat visual) | `diamond push up to jump squat.png` |
| Jump Squat to Jump Lunge | `jump lunge.png` (same as plain Jump Lunge — no jump-squat visual) | `jump squat to jump lunge.png` |

## Full Body — Pro (Female)

Source: `FEMALE_FULL_BODY_PRO_ASSETS`. All 11 base keys are individually dedicated. Gaps come from extra named card variants in `FEMALE_EXERCISE_ILLUSTRATION_MAP` (lines ~2125–2246):

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Joker Combo (Full Body — Pro Female) | `muscle up.png` (unlike every other female deck, this deck has no dedicated "combo finisher" art — it reuses the Muscle-up image) | `combo finisher pro female full body.png` |
| Pull-up to Dip Complex (Queen) | `muscle up.png` (same as Muscle-up) | `pull up to dip complex.png` |
| Max Clapping Push-ups (Queen) | `clapping push up.png` (same as Clapping Push-up — uncertain, may be an intentional "same movement, higher reps" reuse) | `max clapping push ups.png` |
| Pistol Complex (Queen) | `pistol squat.png` (same as Pistol Squat) | `pistol complex.png` |
| Freestanding Handstand Attempt (Queen) | `handstand push up.png` (a static hold reusing a dynamic push-up image — shape mismatch) | `freestanding handstand attempt.png` |

## Core — Male / Unisex (no dedicated deck constant)

There is no `MALE_CORE_*` or unisex `CORE_*` constant in this file at all. Every Core exercise for the male path (and any female exercise not caught by the female-specific Core Beginner/Advanced/Pro entries above) resolves through the generic block in `EXERCISE_ILLUSTRATION_MAP` (lines ~861–939, duplicated again at the tail of `FEMALE_EXERCISE_ILLUSTRATION_MAP`, lines ~2248–2325). Nearly the entire Core movement library collapses onto three unrelated placeholder images: `plank.png`, `normal_squat.png`, and the male Superman/Pike Hold assets.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Plank Shoulder Tap | `plank.png` | `plank_shoulder_tap.png` |
| Plank to Push-up | `plank.png` | `plank_to_push_up.png` |
| Up-Down Plank | `plank.png` | `up_down_plank.png` |
| Side Plank / Weighted Side Plank | `plank.png` | `side_plank.png` |
| Back Extension | `male_superman_hold.png` | `back_extension.png` |
| Swimmer | `male_superman_hold.png` | `swimmer.png` |
| Mountain Climber | `high_knee_march.png` (shape mismatch) | `mountain_climber.png` |
| Hollow Body Hold | `normal_squat.png` (shape mismatch) | `hollow_body_hold.png` |
| V-up | `normal_squat.png` | `v_up.png` |
| Sit-up | `normal_squat.png` | `sit_up.png` |
| Crunch | `normal_squat.png` | `crunch.png` |
| Bicycle Crunch / Oblique Crunch | `normal_squat.png` | `bicycle_crunch.png` |
| Leg Raise | `normal_squat.png` | `leg_raise.png` |
| Reverse Crunch | `normal_squat.png` | `reverse_crunch.png` |
| Flutter Kick / Scissor Kick | `normal_squat.png` | `flutter_kick.png` |
| Dead Bug | `normal_squat.png` | `dead_bug.png` |
| Hanging Leg Raise | `normal_squat.png` | `hanging_leg_raise.png` |
| Hanging Knee Raise | `normal_squat.png` | `hanging_knee_raise.png` |
| Dragon Flag | `normal_squat.png` | `dragon_flag.png` |
| Ab Wheel Rollout | `normal_squat.png` | `ab_wheel_rollout.png` |
| L-sit | `normal_squat.png` | `l_sit.png` |
| Boat Hold | `normal_squat.png` | `boat_hold.png` |
| Hip Dip | `normal_squat.png` | `hip_dip.png` |
| Russian Twist | `normal_squat.png` | `russian_twist.png` |

## Full Body — Male / Unisex (no dedicated deck constant)

Same situation as Core: no `MALE_FULL_BODY_*` constant exists. Everything resolves through the generic block in `EXERCISE_ILLUSTRATION_MAP` (lines ~940–1031, duplicated at the tail of the female map, lines ~2327–2393), collapsing almost the whole full-body library onto `jump_squat.png`, `broad_jump.png`, `plank.png`, and the male Pike Hold / Inverted Row assets.

| Exercise | Currently Reuses | Suggested New Filename |
|---|---|---|
| Burpee | `jump_squat.png` (shape mismatch) | `burpee.png` |
| Modified Burpee | `jump_squat.png` | `modified_burpee.png` |
| Half Burpee | `jump_squat.png` | `half_burpee.png` |
| Burpee Pull-up | `jump_squat.png` | `burpee_pull_up.png` |
| Burpee to Broad Jump | `jump_squat.png` | `burpee_to_broad_jump.png` |
| Muscle-up Burpee | `jump_squat.png` | `muscle_up_burpee.png` |
| Box Jump | `broad_jump.png` (shape mismatch — different jump pattern) | `box_jump.png` |
| Turkish Get-up | `normal_squat.png` (shape mismatch) | `turkish_get_up.png` |
| Bear Crawl | `plank.png` | `bear_crawl.png` |
| Crab Walk | `plank.png` | `crab_walk.png` |
| Spider-Man Crawl | `plank.png` | `spiderman_crawl.png` |
| Lateral Crawl / Lateral Bear Crawl | `plank.png` | `lateral_crawl.png` |
| Inchworm / Walkout | `male_pike_hold.png` | `inchworm.png` |
| Man Maker | `jump_squat.png` | `man_maker.png` |
| Jumping Jack | `jump_squat.png` (shape mismatch) | `jumping_jack.png` |
| Seal Jack | `jump_squat.png` | `seal_jack.png` |
| Assisted Pull-up / Negative Pull-up | `male_inverted_row.png` (shape mismatch — a supported pull-up reusing a horizontal row image) | `male_assisted_pull_up.png` |
| Single-Arm Row / Archer Row / Resistance Band Row | `male_inverted_row.png` | `male_single_arm_row.png` |
| Assisted Dip | `male_bench_dip.png` | `male_assisted_dip.png` |
| Dead Hang (Male) | `male_inverted_row.png` (shape mismatch — a passive hang reusing a rowing-pull image) | `male_dead_hang.png` |
| Dead Hang (Female) | `inverted row.png` (same mismatch as the male version, female-side file) | `dead hang.png` |

---

## Summary

- **Decks covered:** all 15+ deck/difficulty/gender constants defined in the file (Upper Body, Lower Body, Core, Full Body × Beginner/Advanced/Pro × Male/Female, where they exist), plus the two large gender-agnostic Core and Full Body keyword blocks that stand in for decks with no dedicated constant at all.
- **Ambiguous/uncertain items worth a second look:**
  - `chinup_rows.png` — shared by Female Upper Body Advanced's "Assisted Chin-up" and the Male generic map's "Assisted Pull-up"; unclear if this was intentional or accidental sharing.
  - The header comment for `FEMALE_UPPER_BODY_ADVANCED_ASSETS` says "Commando Pull-up → chin up," but the actual code maps it to `normal_pullup.png` — a comment/code drift worth confirming with whoever wrote the file.
  - `combo finisher advanced female.png` is used as the Joker Combo image for **both** Lower Body — Advanced (Female) and Core — Advanced (Female); at least one needs its own art.
  - Several "Queen" face-card variants (e.g. "Toes to Bar (Queen)", "Hanging L Hold (Queen)") may be intentionally identical to their base exercise rather than true gaps — flagged as uncertain rather than dropped.
  - "Box Step-Up" (Full Body Beginner Female) and "Max Clapping Push-ups" (Full Body Pro Female Queen) may just be renamed/higher-rep variants of an already-dedicated exercise rather than genuinely different movements.
