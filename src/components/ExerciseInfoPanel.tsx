import type { Exercise } from "@/backend";
import { cn } from "@/lib/utils";
import { Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ExerciseInfoPanelProps {
  open: boolean;
  exercise: Exercise | null | undefined;
  loading?: boolean;
  exerciseName?: string;
  /** Active deck difficulty — used to resolve colliding display names
   * (e.g. "Normal Push-up", "Joker Combo") to the correct local fallback. */
  difficulty?: string;
  onClose: () => void;
}

// ─── Local form-cue fallback ────────────────────────────────────────────────
// Used when the backend does not return an Exercise record so the info icon
// always shows the correct form cue text for every Upper Body Beginner card.
interface LocalExerciseInfo {
  exerciseName: string;
  description: string;
  keyPoints: string[];
  muscleGroups: string[];
  difficulty: string;
  videoUrl?: string;
}

const LOCAL_EXERCISE_INFO: Record<string, LocalExerciseInfo> = {
  "knee pushup": {
    exerciseName: "Knee Push-up",
    description:
      "Kneel on the floor with hands shoulder-width apart and body held straight from knees to head. Lower the chest to about 1 cm above the floor, then press back up to full arm extension. Keep the core braced throughout so the hips never sag.",
    keyPoints: [
      "Kneel on the floor, hands shoulder-width apart",
      "Body held straight from knees to head",
      "Lower chest to ~1 cm above the floor",
      "Press back to full arm extension",
      "Core braced throughout — no hip sag",
    ],
    muscleGroups: ["Chest", "Front Shoulders", "Triceps"],
    difficulty: "Beginner",
  },
  "normal pushup beginner": {
    exerciseName: "Normal Push-up",
    description:
      "Start in a full plank — body rigid from head to heels, hands under shoulders. Lower chest toward the floor with elbows tracking at 45 degrees from the torso, then press back to full lockout. Brace the core throughout.",
    keyPoints: [
      "Full plank — body rigid from head to heels",
      "Hands directly under the shoulders",
      "Lower chest toward the floor",
      "Elbows track at 45 degrees from the torso",
      "Press to full lockout at the top",
    ],
    muscleGroups: ["Chest", "Front Shoulders", "Triceps", "Core"],
    difficulty: "Beginner",
  },
  "standard pushup": {
    exerciseName: "Standard Push-up",
    description:
      "Hands shoulder-width, chest to 1 cm from floor, full lockout at top.",
    keyPoints: [
      "Hands directly under shoulders",
      "Lower chest to ~1 cm from floor",
      "Full lockout at the top of every rep",
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Beginner",
  },
  "wide pushup": {
    exerciseName: "Wide Push-up",
    description:
      "Set up like a standard push-up but place the hands 15-20 cm wider than shoulder-width. Lower the chest to about 1 cm from the floor and press back to full lockout. The wider grip shifts load onto the outer chest and shoulders.",
    keyPoints: [
      "Hands 15-20 cm wider than shoulder-width",
      "Lower chest to ~1 cm from the floor",
      "Press to full lockout at the top",
      "Targets the outer chest and shoulders",
      "Keep the body in a rigid line throughout",
    ],
    muscleGroups: ["Outer Chest", "Front Shoulders", "Triceps"],
    difficulty: "Beginner",
  },
  "incline pushup": {
    exerciseName: "Incline Push-up",
    description:
      "Hands on bench ~40 cm; reduces load, perfect for building form.",
    keyPoints: [
      "Hands on elevated surface ~40 cm",
      "Reduces load vs floor push-up",
      "Great for building clean form",
    ],
    muscleGroups: ["Upper Chest", "Shoulders"],
    difficulty: "Beginner",
  },
  "pushup negative": {
    exerciseName: "Push-up Negative",
    description:
      "Start at the top of a push-up and lower under control until the chest reaches the floor over 5 seconds. Reset to the top using the knees if needed. Aim for 6 reps — the slow descent builds the strength needed for full push-ups.",
    keyPoints: [
      "Start at the top of the push-up",
      "Lower to the floor over 5 seconds",
      "Reset to the top using the knees if needed",
      "6 reps total — quality over speed",
      "Builds strength for full push-ups",
    ],
    muscleGroups: ["Chest", "Triceps", "Front Shoulders"],
    difficulty: "Beginner",
  },
  "shoulder tap pushup": {
    exerciseName: "Shoulder Tap Push-up",
    description:
      "Complete a full push-up, then at the top lift one hand and tap the opposite shoulder. Keep the hips completely still — no rotation — so the core does the stabilising work. Alternate shoulders each rep.",
    keyPoints: [
      "Complete the full push-up first",
      "Tap the opposite shoulder at the top",
      "Keep hips completely still — no rotation",
      "Alternate shoulders each rep",
      "Core braces to resist the rotation",
    ],
    muscleGroups: ["Chest", "Core", "Front Shoulders", "Triceps"],
    difficulty: "Beginner",
  },
  "pike pushup": {
    exerciseName: "Pike Push-up",
    description:
      "Form an inverted-V with hips pushed high and hands on the floor. Lower the head toward the floor between the hands, then press back to the top. The steeper the pike, the more the load shifts from chest onto the shoulders.",
    keyPoints: [
      "Hips pushed high — inverted-V position",
      "Lower the head toward the floor",
      "Press back to full lockout",
      "Targets the shoulders more than the chest",
      "Steeper pike angle = more shoulder load",
    ],
    muscleGroups: ["Front Shoulders", "Triceps", "Upper Chest"],
    difficulty: "Beginner",
  },
  "pike pushup slow": {
    exerciseName: "Pike Push-up Slow",
    description:
      "Same pike push-up movement, but lower under control over 3 seconds each rep. The extra time under tension increases the demand on the shoulders and triceps without adding weight.",
    keyPoints: [
      "Same pike push-up setup — hips high",
      "3-second controlled descent each rep",
      "Press back to full lockout at the top",
      "Increases time under tension on the shoulders",
      "No bouncing — control the whole descent",
    ],
    muscleGroups: ["Front Shoulders", "Triceps", "Upper Chest"],
    difficulty: "Beginner",
  },
  "pike hold": {
    exerciseName: "Pike Hold",
    description:
      "Form an inverted-V with hips pushed high and hands on the floor, arms fully locked. Stack the hips directly over the shoulders so the torso is near-vertical, then hold the position static for 20 seconds. The countdown timer runs on screen — keep the arms locked and the load in the shoulders the whole time.",
    keyPoints: [
      "Form an inverted-V with hips pushed high",
      "Arms fully locked out — no bend at the elbow",
      "Hips stacked directly over the shoulders",
      "Hold the position static for 20 seconds",
      "Countdown shown on screen — keep the load in the shoulders",
    ],
    muscleGroups: ["Shoulders", "Core"],
    difficulty: "Beginner",
  },
  "superman hold": {
    exerciseName: "Superman Hold",
    description:
      "Lie face down on the floor with arms extended overhead and legs straight. Squeeze the glutes and lower back to lift the chest, arms and legs off the floor at the same time, then hold the top position for 2 seconds before lowering back down under control. Move with control — no swinging or momentum.",
    keyPoints: [
      "Lie face down, arms extended overhead, legs straight",
      "Lift chest, arms and legs off the floor at the same time",
      "Squeeze the glutes and lower back to drive the lift",
      "Hold the top position for 2 seconds per rep",
      "Lower back down under control — no swinging",
    ],
    muscleGroups: ["Lower Back", "Glutes", "Upper Back"],
    difficulty: "Beginner",
  },
  "incline row": {
    exerciseName: "Incline Row",
    description:
      "Set a bar or sturdy table at about hip height and get under it with the body held straight at roughly 45 degrees, heels on the floor. Hang from straight arms, then pull the chest up to touch the bar while driving the elbows back. Squeeze the shoulder blades together hard at the top, then lower back to a dead hang under control.",
    keyPoints: [
      "Set the bar or table at about hip height",
      "Body held straight at roughly 45 degrees, heels on the floor",
      "Start from straight arms — dead hang",
      "Pull the chest up to touch the bar, elbows driving back",
      "Squeeze the shoulder blades together at the top",
    ],
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
  },
  "horizontal row": {
    exerciseName: "Horizontal Row",
    description:
      "Set the bar or table low so the body hangs parallel to the floor with heels on the ground and arms reaching straight up. Pull the chest up to touch the bar while keeping the body in a rigid line, squeezing the shoulder blades together hard at the top. This is the hardest row variation — the near-horizontal body angle puts roughly 75% of a full pull-up load through the back.",
    keyPoints: [
      "Set the bar low so the body hangs parallel to the floor",
      "Heels on the ground, arms reaching straight up",
      "Keep the body in a rigid line throughout",
      "Pull the chest up to touch the bar",
      "Squeeze the shoulder blades together hard at the top",
    ],
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
  },
  "row hold": {
    exerciseName: "Row Hold",
    description:
      "Pull into the top of a row with the chest touching the bar and the shoulder blades squeezed together. Hold that top position for a full 2-second pause before lowering back to a dead hang, then pull straight into the next rep. Complete 5 reps total — the pause builds isometric back strength at the hardest point of the row.",
    keyPoints: [
      "Pull into the top of the row — chest touching the bar",
      "Squeeze the shoulder blades together",
      "Hold the top position for a full 2-second pause",
      "Lower back to a dead hang under control",
      "5 reps total — pause every rep",
    ],
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
  },
  "bench dip": {
    exerciseName: "Bench Dip",
    description:
      "Sit on the edge of a bench with hands placed shoulder-width beside the hips, fingers gripping the edge. Slide the hips off the bench, extend the legs out in front, then lower the body by bending the elbows straight backward to 90 degrees. Press back up through the palms to full lockout, keeping the chest lifted and the elbows tracking straight back.",
    keyPoints: [
      "Hands on the bench behind you, shoulder-width, fingers gripping the edge",
      "Slide the hips off and extend the legs out in front",
      "Elbows drive straight backward to 90 degrees",
      "Press up through the palms to full lockout",
      "Keep the chest lifted — do not round forward",
    ],
    muscleGroups: ["Triceps", "Shoulders"],
    difficulty: "Beginner",
  },
  "elevated bench dip": {
    exerciseName: "Elevated Bench Dip",
    description:
      "Set up like a Bench Dip but place both the hands and the feet on elevated surfaces of similar height. Lower the body by bending the elbows straight backward to 90 degrees, then press back up to full lockout. Elevating both ends increases the load to roughly 75% of a full parallel-bar dip, making it the bridge between bench dips and bar dips.",
    keyPoints: [
      "Hands AND feet both elevated on surfaces of similar height",
      "Same dip mechanics as the Bench Dip",
      "Elbows drive straight backward to 90 degrees",
      "Press up to full lockout through the palms",
      "Increases load to ~75% of a full bar dip",
    ],
    muscleGroups: ["Triceps", "Chest", "Shoulders"],
    difficulty: "Beginner",
  },
  "tricep pushup": {
    exerciseName: "Tricep Push-up",
    description:
      "Set up like a standard push-up but bring the hands in directly under the sternum, shoulder-width or narrower, and pin the elbows tight against the torso throughout. Lower the chest to about 1 cm from the floor with the elbows tracking straight backward, then press back to full lockout. The narrow grip and pinned elbows shift the load almost entirely onto the triceps.",
    keyPoints: [
      "Hands under the sternum, shoulder-width or narrower",
      "Elbows pinned tight to the torso the whole time",
      "Lower the chest to ~1 cm from the floor",
      "Elbows track straight backward — no flaring",
      "Press to full lockout — load stays on the triceps",
    ],
    muscleGroups: ["Triceps", "Chest"],
    difficulty: "Beginner",
  },
  "bench dip slow negative": {
    exerciseName: "Bench Dip Slow Negative",
    description:
      "Set up like a Bench Dip with hands on the bench behind you. Lower the body under control over a full 5 seconds, pausing for 1 second at the bottom with the elbows bent to 90 degrees, then press back up to lockout at a normal tempo. Complete 5 reps total — the slow descent builds triceps strength at the hardest part of the dip.",
    keyPoints: [
      "Hands on the bench behind you, same Bench Dip setup",
      "Lower under control over a full 5 seconds",
      "1-second pause at the bottom — elbows at 90 degrees",
      "Press back up to lockout at a normal tempo",
      "5 reps total — quality over speed on the descent",
    ],
    muscleGroups: ["Triceps", "Shoulders"],
    difficulty: "Beginner",
  },
  "joker combo": {
    exerciseName: "Joker Combo",
    description:
      "A four-exercise circuit done back to back with no rest between movements. Move straight from the last rep of one exercise into the first rep of the next — the combo only ends when the last rep of the Bench Dip is locked out. The Joker tests the whole upper body in one push: chest and triceps on the push-ups, shoulders on the pike, back and biceps on the row, then triceps again on the dip.",
    keyPoints: [
      "10× Standard Push-up",
      "10× Pike Push-up",
      "10× Incline Row",
      "10× Bench Dip",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Upper Body"],
    difficulty: "Beginner",
  },
  // ─── Female Upper Body Advanced deck ──────────────────────────────────────
  "assisted chinup": {
    exerciseName: "Assisted Chin-up",
    description:
      "Loop resistance band over bar, place knees in band. Grip with palms facing you. Pull chin over bar, lower to full dead hang.",
    keyPoints: [
      "Loop resistance band over the bar",
      "Place knees in the band for assistance",
      "Grip with palms facing you",
      "Pull chin over the bar",
      "Lower to a full dead hang",
    ],
    muscleGroups: ["Lats", "Biceps", "Rear Deltoids", "Core"],
    difficulty: "Advanced",
  },
  "full chinup": {
    exerciseName: "Full Chin-up",
    description:
      "Hang from the bar with a supinated (palms-toward-you) shoulder-width grip, arms fully extended and shoulders engaged. Pull the chin over the bar by driving the elbows down and back, squeezing the lats hard at the top, then lower back to a full dead hang under control. No kipping — every rep starts and ends from a dead hang with strict form.",
    keyPoints: [
      "Start from a full dead hang — arms extended, shoulders engaged",
      "Supinated grip, shoulder-width apart",
      "Drive the elbows down and back to pull the chin over the bar",
      "Squeeze the lats hard at the top",
      "Lower to a full dead hang — no kipping, strict reps only",
    ],
    muscleGroups: ["Lats", "Biceps", "Rear Deltoids", "Core"],
    difficulty: "Advanced",
  },
  "chinup with pause": {
    exerciseName: "Chin-up with Pause",
    description:
      "Same mechanics as the Full Chin-up — dead hang start, supinated shoulder-width grip, chin over the bar with no kipping. The difference is the top: once the chin clears the bar, hold the position static for a full 2-second pause before lowering back to the dead hang. The pause kills momentum and forces the lats and biceps to hold the load isometrically at the hardest point of the rep.",
    keyPoints: [
      "Same setup as the Full Chin-up — dead hang, supinated grip",
      "Pull the chin over the bar with no kipping",
      "Hold the top position for a full 2-second pause",
      "Pause every rep — no momentum into the next pull",
      "Lower back to a full dead hang under control",
    ],
    muscleGroups: ["Lats", "Biceps", "Mid-back", "Core"],
    difficulty: "Advanced",
  },
  "commando pullup": {
    exerciseName: "Commando Pull-up",
    description:
      "One hand pronated, one supinated, bar between hands. Pull so one ear passes bar, alternate sides. 5 reps per side.",
    keyPoints: [
      "One hand pronated, one hand supinated",
      "Bar between your hands",
      "Pull so one ear passes the bar",
      "Alternate sides each rep",
      "5 reps per side",
    ],
    muscleGroups: ["Lats", "Biceps", "Obliques", "Core"],
    difficulty: "Advanced",
  },
  "decline pushup": {
    exerciseName: "Decline Push-up",
    description:
      "Set up like a standard push-up but place the feet on a bench roughly 40 cm high with the hands on the floor directly under the shoulders. Brace the core and lower the chest toward the floor with the elbows tracking at 45 degrees, then press back to full lockout. The downward angle shifts the load up onto the upper chest and front shoulders — the higher the feet, the harder the press.",
    keyPoints: [
      "Feet on a bench ~40 cm high, hands on the floor under the shoulders",
      "Body held in a rigid line from head to heels",
      "Lower the chest toward the floor, elbows at 45 degrees",
      "Press back to full lockout at the top",
      "Higher feet = more upper chest and front shoulder load",
    ],
    muscleGroups: ["Upper Chest", "Front Shoulders", "Triceps"],
    difficulty: "Advanced",
  },
  "diamond pushup": {
    exerciseName: "Diamond Push-up",
    description:
      "Form a diamond shape with the hands directly under the sternum — index fingers and thumbs touching so the diamond sits in the centre of the chest. Brace the core and lower the chest toward the diamond with the elbows pinned tight against the torso and tracking straight backward, then press back to full lockout. The narrow grip and pinned elbows shift the load almost entirely off the chest and onto the triceps.",
    keyPoints: [
      "Form a diamond with the hands under the sternum",
      "Index fingers and thumbs touching in the centre of the chest",
      "Elbows pinned tight to the torso, tracking straight backward",
      "Lower the chest toward the diamond, then press to full lockout",
      "Narrow grip shifts the load from chest onto the triceps",
    ],
    muscleGroups: ["Triceps", "Inner Chest", "Front Shoulders"],
    difficulty: "Advanced",
  },
  "archer pushup": {
    exerciseName: "Archer Push-up",
    description:
      "Wide stance. Lower toward one arm while the other extends straight out sideways. Alternate sides. 5 reps per side, 3-second descent.",
    keyPoints: [
      "Set up with a wide stance",
      "Lower toward one arm",
      "Other arm extends straight out sideways",
      "Alternate sides — 5 reps per side",
      "3-second controlled descent",
    ],
    muscleGroups: ["Chest", "Anterior Deltoid", "Triceps", "Serratus Anterior"],
    difficulty: "Advanced",
  },
  "pike pushup flat": {
    exerciseName: "Pike Push-up Flat",
    description:
      "Form an inverted-V on the floor with the hips pushed high and the hands planted shoulder-width apart, arms fully locked. Lower the head toward the floor between the hands with the elbows tracking straight backward, then press back to the top. The steeper the pike, the more the load shifts from the chest onto the shoulders — keep the hips high to maximise the deltoid work.",
    keyPoints: [
      "Form an inverted-V on the floor — hips pushed high",
      "Hands shoulder-width apart, arms fully locked",
      "Lower the head toward the floor between the hands",
      "Elbows track straight backward, then press back to lockout",
      "Steeper pike angle = more shoulder load over chest",
    ],
    muscleGroups: ["Anterior Deltoid", "Triceps", "Upper Chest"],
    difficulty: "Advanced",
  },
  "pike pushup elevated": {
    exerciseName: "Pike Push-up Elevated",
    description:
      "Place the feet on a box or bench and push the hips directly above the shoulders so the torso is near-vertical, arms fully locked. Lower the head toward the floor between the hands with the elbows tracking straight backward, then press back to the top. Elevating the feet steepens the pike angle and shifts even more load onto the deltoids than the flat variation.",
    keyPoints: [
      "Feet on a box or bench, hips pushed directly above the shoulders",
      "Torso near-vertical, arms fully locked",
      "Lower the head toward the floor between the hands",
      "Elbows track straight backward, then press back to lockout",
      "More vertical angle than the flat pike = more deltoid load",
    ],
    muscleGroups: ["Anterior Deltoid", "Triceps", "Upper Chest"],
    difficulty: "Advanced",
  },
  "pike pushup decline": {
    exerciseName: "Pike Push-up Decline",
    description:
      "Place the feet high on a box or bench so the pike angle is the most vertical of the three pike variations — hips stacked directly over the shoulders with the torso near-vertical. Lower the head toward the floor between the hands with the elbows tracking straight backward, then press back to the top. The near-inverted position puts maximum deltoid emphasis on every rep.",
    keyPoints: [
      "Feet high — most vertical pike angle of the three variations",
      "Hips stacked directly over the shoulders, torso near-vertical",
      "Lower the head toward the floor between the hands",
      "Elbows track straight backward, then press back to lockout",
      "Near-inverted position = maximum deltoid emphasis",
    ],
    muscleGroups: ["Anterior Deltoid", "Triceps", "Upper Chest"],
    difficulty: "Advanced",
  },
  "wall handstand hold": {
    exerciseName: "Wall Handstand Hold",
    description:
      "Kick up against a wall into a full handstand with the arms fully locked, body held straight from wrists to ankles, and the heels resting lightly on the wall. Brace the core and push the floor away hard through the hands so the shoulders stay active the whole time. Isometric hold — no reps, just a 20-second static hold against the wall. The countdown timer runs on screen; keep the arms locked and the body rigid until it hits zero.",
    keyPoints: [
      "Kick up against the wall into a full handstand",
      "Arms fully locked out — no bend at the elbow",
      "Body held straight from wrists to ankles, heels light on the wall",
      "Push the floor away hard — keep the shoulders active",
      "Isometric hold — 20-second static hold, no reps",
    ],
    muscleGroups: ["Deltoids", "Triceps", "Core", "Wrists"],
    difficulty: "Advanced",
  },
  "bench dip straightleg": {
    exerciseName: "Bench Dip Straight-leg",
    description:
      "Sit on the edge of a bench with hands placed shoulder-width beside the hips, fingers gripping the edge. Slide the hips off the bench and extend the legs fully out in front with only the heels on the floor — the straight legs increase the load versus a bent-knee bench dip. Lower the body by bending the elbows straight backward until the upper arms are parallel to the floor, then press back up through the palms to full lockout, keeping the chest lifted the whole time.",
    keyPoints: [
      "Hands on the bench behind you, shoulder-width, fingers gripping the edge",
      "Slide the hips off and extend the legs fully — heels only on the floor",
      "Lower by bending the elbows straight backward to upper-arms parallel",
      "Press up through the palms to full lockout",
      "Keep the chest lifted — straight legs increase the load",
    ],
    muscleGroups: ["Triceps", "Lower Chest", "Front Shoulders"],
    difficulty: "Advanced",
  },
  "parallel bar dip": {
    exerciseName: "Parallel Bar Dip",
    description:
      "Support yourself on the parallel bars with the arms locked and the body held upright — shoulders down and away from the ears. Lower the body by bending the elbows straight backward to 90 degrees, keeping the torso upright and the chest lifted so the load stays on the triceps rather than the chest. Press back up through the palms to full lockout, staying tall the whole time.",
    keyPoints: [
      "Support yourself on the parallel bars, arms locked",
      "Shoulders down and away from the ears — stay tall",
      "Lower by bending the elbows straight backward to 90 degrees",
      "Keep the torso upright — do not lean forward",
      "Press back up through the palms to full lockout",
    ],
    muscleGroups: ["Triceps", "Lower Chest", "Front Shoulders"],
    difficulty: "Advanced",
  },
  "chest dip": {
    exerciseName: "Chest Dip",
    description:
      "A chest-emphasis variation of the parallel bar dip. From a locked support position, lean the torso forward 20-30 degrees and lower under control until the shoulders drop below the elbows — a deeper range than the upright dip. Press back up through the lower chest and triceps, keeping the forward lean throughout. Targets the lower pectorals far more than the upright dip.",
    keyPoints: [
      "Start in a locked support on the bars, shoulders stacked over the hands",
      "Lean the torso forward 20-30 degrees and hold that angle throughout",
      "Lower under control until the shoulders drop below the elbows — deeper than the upright dip",
      "Press back up through the lower chest and triceps, maintaining the forward lean",
      "Keep the chest lifted and the shoulders away from the ears — no shrugging or collapsing",
    ],
    muscleGroups: ["Lower Chest", "Triceps", "Front Shoulders"],
    difficulty: "Advanced",
  },
  "dip slow negative": {
    exerciseName: "Dip Slow Negative",
    description:
      "An eccentric-focused dip on the parallel bars. From the top locked support, lower the body over a controlled 5-second descent, emphasizing the triceps and chest under tension. Once at the bottom, press back up at normal tempo. The slow negative builds strength in the lowering phase; the press remains a normal-speed rep. Aim for 5 reps total.",
    keyPoints: [
      "Start at the top in a locked support on the parallel bars",
      "Lower over a controlled 5-second descent — count each second",
      "Eccentric emphasis through the triceps and chest — fight the pull of gravity",
      "Press back up at normal tempo once you reach the bottom",
      "Complete 5 reps total, maintaining control on every negative",
    ],
    muscleGroups: ["Triceps", "Chest (Eccentric Emphasis)"],
    difficulty: "Advanced",
  },
  "normal pushup advanced": {
    exerciseName: "Normal Push-up",
    description:
      "Full plank with hands shoulder-width apart. Lower under control until the chest touches the floor, then drive up to full lockout. Advanced standard — clean tempo, full range, no hip sag.",
    keyPoints: [
      "Hands shoulder-width apart, body in a rigid plank",
      "Lower under control until the chest touches the floor",
      "Full range of motion — no partial reps",
      "Drive up to full lockout at the top",
      "No hip sag or kipping — keep the line rigid",
    ],
    muscleGroups: ["Chest", "Triceps", "Front Shoulders", "Core"],
    difficulty: "Advanced",
  },
  "joker combo advanced": {
    exerciseName: "Joker Combo",
    description:
      "All 4 Advanced exercises back to back with no rest between them. Move straight from one into the next — the combo only ends when the last rep of the final exercise is locked out.",
    keyPoints: [
      "6× Decline Push-up",
      "6× Elevated Pike Push-up",
      "6× Chin-up",
      "6× Parallel Bar Dip",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Upper Body"],
    difficulty: "Advanced",
  },
  "elevated pike pushup": {
    exerciseName: "Elevated Pike Push-up",
    description:
      "Feet elevated on a box or bench, hips pushed directly above the shoulders so the torso is near-vertical. Lower the head to the floor between the hands, then press back up. The steeper the pike, the more the load shifts onto the deltoids.",
    keyPoints: [
      "Feet elevated on a box or bench",
      "Hips pushed directly above the shoulders",
      "Lower the head to the floor between your hands",
      "Press back to full lockout",
      "Steeper pike angle = more deltoid load",
    ],
    muscleGroups: ["Anterior Deltoid", "Triceps", "Upper Chest"],
    difficulty: "Advanced",
  },
  chinup: {
    exerciseName: "Chin-up",
    description:
      "Hang from the bar with a supinated (palms-toward-you) shoulder-width grip. Pull until the chin clears the bar, then lower back to a full dead hang. No kipping — every rep starts and ends at a dead hang.",
    keyPoints: [
      "Start from a full dead hang",
      "Supinated grip, shoulder-width",
      "Pull until the chin clears the bar",
      "Lower back to a full dead hang",
      "No kipping — strict reps only",
    ],
    muscleGroups: ["Lats", "Biceps", "Rear Deltoids", "Core"],
    difficulty: "Advanced",
  },
  // ─── Female Upper Body Pro deck ───────────────────────────────────────────
  "onearm pushup": {
    exerciseName: "One-arm Push-up",
    description:
      "Set up in a push-up position with one hand behind your back and all your weight shifted onto the working arm. Lower with control and press back to the top, keeping the hips square and the body from rotating. Alternate arms as needed between sets. One of the purest tests of single-arm pressing strength in the deck.",
    keyPoints: [
      "One hand behind your back — all weight on the working arm",
      "Keep the hips square — resist rotating toward the floor",
      "Lower with control, press back to full lockout",
      "Feet slightly wider than normal for balance",
      "Alternate arms between sets as needed",
    ],
    muscleGroups: ["Chest", "Anterior Deltoid", "Triceps", "Core (Anti-rotation)"],
    difficulty: "Pro",
  },
  "onearm pushup deep": {
    exerciseName: "One-arm Push-up Deep",
    description:
      "Same one-arm setup as the standard version, but lower the chest all the way to the floor on the working arm for maximum range of motion. Press back to full lockout at the top. The deeper descent increases time under tension and the strength demand on the working arm.",
    keyPoints: [
      "Same one-arm setup as the standard version",
      "Lower chest all the way to the floor on the working arm",
      "Full range of motion — chest touches",
      "Press back to full lockout at the top",
      "Keep the hips square throughout the descent",
    ],
    muscleGroups: ["Chest (Full ROM)", "Triceps", "Deltoids", "Core (Anti-rotation)"],
    difficulty: "Pro",
  },
  "typewriter pushup": {
    exerciseName: "Typewriter Push-up",
    description:
      "Set up with a wide hand stance. Lower to the bottom of the push-up, then slide the chest across to one side staying low, and rise on that arm to lockout. Lower again, slide to the opposite side, and rise on that arm. Each side-to-side slide counts as one rep. The lateral slide keeps the chest under tension the whole time and builds straight-arm stability on the supporting side.",
    keyPoints: [
      "Wide hand stance — lower to the bottom first",
      "Slide chest side to side staying low before rising",
      "Rise on the arm you slide toward — full lockout",
      "Each slide = 1 rep",
      "Keep the chest low during the slide — no rising early",
    ],
    muscleGroups: [
      "Chest",
      "Triceps",
      "Serratus Anterior",
      "Core (Lateral Stability)",
    ],
    difficulty: "Pro",
  },
  "onearm pushup negative": {
    exerciseName: "One-arm Push-up Negative",
    description:
      "Set up in a standard push-up position but with a slightly wider stance for balance. Shift the load onto one arm, extend the other arm out to the side or behind the back, and lower under control over 5 seconds until the chest reaches the floor. Reset to the top using both arms, then alternate sides. Complete 5 reps per side — the slow single-arm descent builds the eccentric strength needed for a full one-arm push-up.",
    keyPoints: [
      "Slightly wider stance for balance",
      "Shift load onto one arm, other arm out to the side or behind the back",
      "Lower over 5 seconds — 5-second descent",
      "Reset to the top using both arms",
      "5 reps per side — alternate sides",
    ],
    muscleGroups: ["Chest", "Triceps", "Anterior Deltoid", "Core"],
    difficulty: "Pro",
  },
  "wall handstand hold pro": {
    exerciseName: "Wall Handstand Hold",
    description:
      "Kick up against a wall into a full handstand with the arms fully locked and the body held straight from wrists to ankles. Hold the position static for 15 seconds per rep — the per-rep cue is shown beneath the rep number. Push the floor away hard through the hands so the shoulders stay active the whole time. Reset by stepping down and kicking back up for the next rep.",
    keyPoints: [
      "Kick up against the wall into a full handstand",
      "Arms fully locked out — no bend at the elbow",
      "Body held straight from wrists to ankles",
      "15 sec per rep — cue shown beneath the rep number",
      "Push the floor away hard — keep the shoulders active",
    ],
    muscleGroups: ["Deltoids", "Triceps", "Upper Traps (Eccentric)", "Core"],
    difficulty: "Pro",
  },
  "handstand pushup negative": {
    exerciseName: "Handstand Push-up Negative",
    description:
      "Kick up into a wall handstand with the arms locked and the body straight. Lower the head toward the floor between the hands over a controlled 5-second descent, fighting gravity the whole way. Once the head touches the floor, reset on the knees and kick back up — do not press back up. The eccentric overload builds the strength needed for a full handstand push-up.",
    keyPoints: [
      "Kick up into a wall handstand — arms locked, body straight",
      "Lower the head to the floor over 5 seconds — 5-second descent",
      "Reset on the knees — do not press back up",
      "Fight gravity the whole way down — control every second",
      "Eccentric overload builds full handstand push-up strength",
    ],
    muscleGroups: ["Deltoids", "Triceps", "Upper Traps (Eccentric)"],
    difficulty: "Pro",
  },
  "handstand pushup": {
    exerciseName: "Handstand Push-up",
    description:
      "Kick up into a wall handstand with the arms locked and the body straight. Lower the head to the floor between the hands with the elbows tracking straight backward, then press back up to full lockout. Full range of motion — the head touches the floor at the bottom and the arms lock out at the top. The most demanding vertical pushing exercise in the deck.",
    keyPoints: [
      "Wall handstand — arms locked, body straight",
      "Lower the head to the floor between the hands",
      "Elbows track straight backward — no flaring",
      "Press back to full lockout at the top",
      "Full range — head touches floor, arms lock at top",
    ],
    muscleGroups: ["Deltoids", "Triceps", "Upper Traps", "Core"],
    difficulty: "Pro",
  },
  "freestanding handstand attempt": {
    exerciseName: "Freestanding Handstand Attempt",
    description:
      "Kick up away from the wall into a freestanding handstand with the arms locked and the body straight. Hold the balance for as long as possible — the running timer counts up on screen the whole time you are up. When you lose balance and step down, that is one attempt. The goal is maximum hold time, not reps. Use the wall only to kick up — once up, balance freely.",
    keyPoints: [
      "Kick up from the wall into a freestanding handstand",
      "Arms locked, body straight — no wall support once up",
      "Hold max time — running timer counts up on screen",
      "Step down when you lose balance — that is one attempt",
      "Goal is maximum hold time, not reps",
    ],
    muscleGroups: ["Deltoids", "Triceps", "Core", "Wrists", "Balance"],
    difficulty: "Pro",
  },
  "pullup overhand": {
    exerciseName: "Pull-up Overhand",
    description:
      "Hang from the bar with a pronated (palms-away) shoulder-width grip, arms fully extended and shoulders engaged in a full dead hang. Pull the chin over the bar by driving the elbows down, squeezing the lats hard at the top, then lower back to a full dead hang under control. No swinging or kipping — every rep starts and ends from a strict dead hang.",
    keyPoints: [
      "Full dead hang — arms extended, shoulders engaged",
      "Pronated (palms-away) grip, shoulder-width",
      "Pull the chin over the bar — no swinging",
      "Squeeze the lats hard at the top",
      "Lower to a full dead hang — strict reps only",
    ],
    muscleGroups: ["Lats", "Biceps", "Rear Deltoids", "Core"],
    difficulty: "Pro",
  },
  "wide grip pullup": {
    exerciseName: "Wide Grip Pull-up",
    description:
      "Hang from the bar with a pronated grip, hands placed 15 cm wider than shoulder-width on each side. Pull the chin over the bar with the elbows driving down and out, then lower back to a full dead hang. The wider grip shifts the load onto the outer lats and rear deltoids and reduces biceps involvement versus a shoulder-width pull-up.",
    keyPoints: [
      "Pronated grip, hands 15 cm wider each side",
      "Full dead hang start and finish",
      "Pull the chin over the bar — elbows drive down and out",
      "Targets the outer lats and rear deltoids",
      "Lower under control — no kipping",
    ],
    muscleGroups: ["Outer Lats", "Rear Deltoids", "Biceps"],
    difficulty: "Pro",
  },
  "close grip pullup": {
    exerciseName: "Close Grip Pull-up",
    description:
      "Hang from the bar with a pronated grip, hands nearly touching at the centre of the bar. Pull the chin over the bar with the elbows driving straight down, then lower back to a full dead hang. The narrow grip shifts the load onto the inner lats and mid-back and increases the range of motion versus a wide pull-up.",
    keyPoints: [
      "Pronated grip, hands nearly touching at bar centre",
      "Full dead hang start and finish",
      "Pull the chin over the bar — elbows drive straight down",
      "Targets the inner lats and mid-back",
      "Lower under control — no kipping",
    ],
    muscleGroups: ["Inner Lats", "Biceps", "Mid-back"],
    difficulty: "Pro",
  },
  "lsit pullup": {
    exerciseName: "L-sit Pull-up",
    description:
      "Hang from the bar with a pronated grip and raise the legs straight out in front so they are parallel to the floor — hold the L-sit position throughout the entire pull-up. Pull the chin over the bar while keeping the legs elevated and parallel, then lower back to a dead hang without dropping the legs. Quality over quantity — 3 strict reps with the legs up beats 10 sloppy reps. The cue '3 reps — legs parallel' is shown beneath the rep number.",
    keyPoints: [
      "Raise legs straight out in front — parallel to the floor",
      "Hold the L-sit position throughout the entire pull-up",
      "Pull the chin over the bar without dropping the legs",
      "Lower to a dead hang — legs stay elevated",
      "3 reps — legs parallel — quality over quantity",
    ],
    muscleGroups: ["Lats", "Hip Flexors", "Core", "Biceps"],
    difficulty: "Pro",
  },
  "ring pushup": {
    exerciseName: "Ring Push-up",
    description:
      "Set the rings at a low height and place the feet on the floor with the hands in the rings, body in a rigid plank. Lower the chest toward the rings with the elbows tracking backward, keeping the rings stable and turned out, then press back to full lockout. At the top, actively turn the rings out (externally rotate) to engage the stabilisers. The instability of the rings forces the chest and shoulders to control the whole range.",
    keyPoints: [
      "Feet on the floor, hands in the rings — rigid plank",
      "Lower the chest toward the rings, elbows tracking backward",
      "Keep the rings stable — do not let them wobble",
      "Press to full lockout at the top",
      "Turn the rings out (externally rotate) at the top to engage stabilisers",
    ],
    muscleGroups: ["Chest", "Triceps", "Deltoids", "Serratus Anterior"],
    difficulty: "Pro",
  },
  "ring dip": {
    exerciseName: "Ring Dip",
    description:
      "Support yourself on the rings with the arms locked and the body held upright, shoulders pushed down and away from the ears. Lower the body by bending the elbows straight backward to 90 degrees, keeping the rings stable and close to the body, then press back up through the palms to full lockout. At the top, turn the rings out (externally rotate) to stabilise. The ring instability makes this far harder than a parallel bar dip — the stabilisers work the whole time.",
    keyPoints: [
      "Support on the rings — arms locked, body upright",
      "Shoulders down and away from the ears",
      "Lower to 90 degrees — keep the rings stable and close",
      "Press to full lockout through the palms",
      "Turn the rings out (externally rotate) at the top to stabilise",
    ],
    muscleGroups: ["Triceps", "Lower Chest", "Front Shoulders", "Stabilisers"],
    difficulty: "Pro",
  },
  "lsit hold": {
    exerciseName: "L-sit Hold",
    description:
      "Support yourself on parallel bars (or on the floor with hands beside the hips) and press the shoulders down and away from the ears. Raise the legs straight out in front so they are parallel to the floor, hold the position static for 15 seconds. The 15-second countdown timer runs on screen — keep the legs elevated and parallel the whole time, arms locked, core braced hard.",
    keyPoints: [
      "Support on parallel bars or floor — hands beside the hips",
      "Press the shoulders down and away from the ears",
      "Raise the legs straight out — parallel to the floor",
      "Hold the position static for 15 seconds",
      "Countdown shown on screen — arms locked, core braced",
    ],
    muscleGroups: ["Hip Flexors", "Core", "Triceps", "Shoulders"],
    difficulty: "Pro",
  },
  "parallel bar dip pro": {
    exerciseName: "Parallel Bar Dip",
    description:
      "Support yourself on the parallel bars with the arms locked and the body held upright — shoulders down and away from the ears. Lower the body by bending the elbows straight backward to 90 degrees, keeping the torso upright and the chest lifted so the load stays on the triceps rather than the chest. Press back up through the palms to full lockout, staying tall the whole time. The Pro variant demands strict upright form and full 90-degree depth on every rep.",
    keyPoints: [
      "Support on the parallel bars, arms locked",
      "Shoulders down and away from the ears — stay tall",
      "Lower to 90 degrees — elbows straight backward",
      "Keep the torso upright — do not lean forward",
      "Press to full lockout — strict form, full depth every rep",
    ],
    muscleGroups: ["Triceps", "Lower Chest", "Front Shoulders"],
    difficulty: "Pro",
  },
  "joker combo pro": {
    exerciseName: "Joker Combo",
    description:
      "All 4 Pro exercises back to back with no rest between them. Move straight from the last rep of one exercise into the first rep of the next — the combo only ends when the last rep of the Parallel Bar Dip is locked out. The Joker tests the whole upper body at the elite level: chest and unilateral strength on the archer push-ups, eccentric shoulder strength on the handstand push-up negative, back and biceps on the pull-up, then triceps again on the dip.",
    keyPoints: [
      "5× Archer Push-up each side",
      "5× Handstand Push-up Negative",
      "5× Pull-up",
      "5× Parallel Bar Dip",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Upper Body"],
    difficulty: "Pro",
  },
  // ─── Female Lower Body Beginner deck ───────────────────────────────────────
  "normal squat beginner": {
    exerciseName: "Normal Squat",
    description:
      "Feet shoulder-width, toes slightly out. Push hips back and down until thighs parallel to floor. Drive through heels to stand. Keep chest up throughout.",
    keyPoints: [
      "Feet shoulder-width, toes slightly out",
      "Push hips back and down",
      "Thighs parallel to floor at the bottom",
      "Drive through the heels to stand",
      "Keep the chest up throughout",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Core"],
    difficulty: "Beginner",
  },
  "sumo squat beginner": {
    exerciseName: "Sumo Squat",
    description:
      "Feet wider than shoulder-width, toes 45 degrees out. Lower hips straight down between feet. Push knees out in direction of toes.",
    keyPoints: [
      "Feet wider than shoulder-width",
      "Toes pointed 45 degrees out",
      "Lower hips straight down between the feet",
      "Push the knees out in the direction of the toes",
      "Keep the chest up throughout",
    ],
    muscleGroups: ["Inner Thighs (Adductors)", "Glutes", "Quads"],
    difficulty: "Beginner",
  },
  "narrow squat beginner": {
    exerciseName: "Narrow Squat",
    description:
      "Feet together. Squat as deep as possible keeping heels on floor. Arms forward for balance. Intense quad burn.",
    keyPoints: [
      "Feet together",
      "Squat as deep as possible",
      "Keep the heels on the floor",
      "Arms forward for balance",
      "Intense quad burn",
    ],
    muscleGroups: ["Quadriceps (Dominant)", "Glutes"],
    difficulty: "Beginner",
  },
  "wall sit beginner": {
    exerciseName: "Wall Sit",
    description:
      "Back flat against wall, slide down until thighs parallel to floor, knees above ankles. Hands not on thighs. Show 30-second countdown timer.",
    keyPoints: [
      "Back flat against the wall",
      "Slide down until thighs parallel to the floor",
      "Knees above the ankles",
      "Hands not on the thighs",
      "30-second countdown timer shown on screen",
    ],
    muscleGroups: ["Quadriceps", "Glutes", "Core (Isometric)"],
    difficulty: "Beginner",
  },
  "twoleg glute bridge beginner": {
    exerciseName: "Two-Leg Glute Bridge",
    description:
      "Lie on back, knees bent, feet flat. Drive hips up until body forms straight line from knees to shoulders. Squeeze glutes hard at top for 1 second.",
    keyPoints: [
      "Lie on the back, knees bent, feet flat",
      "Drive the hips up",
      "Body forms a straight line from knees to shoulders",
      "Squeeze the glutes hard at the top",
      "Hold the squeeze for 1 second",
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core"],
    difficulty: "Beginner",
  },
  "singleleg glute bridge beginner": {
    exerciseName: "Single-Leg Glute Bridge",
    description:
      "Same as Two-Leg Bridge but one leg extended. Drive through standing foot. Keep hips level — do not let one side drop.",
    keyPoints: [
      "Same setup as the Two-Leg Bridge",
      "One leg extended straight out",
      "Drive through the standing foot",
      "Keep the hips level",
      "Do not let one side drop",
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core Stability"],
    difficulty: "Beginner",
  },
  "elevated hip thrust beginner": {
    exerciseName: "Elevated Hip Thrust",
    description:
      "Shoulders on bench, feet flat on floor, hips low. Drive hips up until body is parallel to floor. Squeeze glutes hard at top. Show shoulders on bench cue.",
    keyPoints: [
      "Shoulders on the bench",
      "Feet flat on the floor, hips low",
      "Drive the hips up until the body is parallel to the floor",
      "Squeeze the glutes hard at the top",
      "Shoulders on bench cue shown on screen",
    ],
    muscleGroups: ["Glutes Max and Medius", "Hamstrings", "Core"],
    difficulty: "Beginner",
  },
  "glute bridge pulse beginner": {
    exerciseName: "Glute Bridge Pulse",
    description:
      "20 small pulses at top, no full lowering. Show 20 pulses cue.",
    keyPoints: [
      "Hold the top of the glute bridge",
      "20 small pulses at the top",
      "No full lowering between pulses",
      "Keep the glutes engaged the whole time",
      "20 pulses cue shown on screen",
    ],
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Beginner",
  },
  "reverse lunge beginner": {
    exerciseName: "Reverse Lunge",
    description:
      "Step one foot back, lower rear knee to just above floor. Front knee stays above ankle. Push through front heel to return.",
    keyPoints: [
      "Step one foot back",
      "Lower the rear knee to just above the floor",
      "Front knee stays above the ankle",
      "Push through the front heel to return",
      "Keep the torso upright throughout",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Beginner",
  },
  "forward lunge beginner": {
    exerciseName: "Forward Lunge",
    description:
      "Step forward, lower back knee toward floor. Front shin vertical. Drive through front heel back to start.",
    keyPoints: [
      "Step forward with one foot",
      "Lower the back knee toward the floor",
      "Front shin stays vertical",
      "Drive through the front heel back to start",
      "Keep the torso upright throughout",
    ],
    muscleGroups: ["Quads (Dominant)", "Glutes", "Calves"],
    difficulty: "Beginner",
  },
  "lateral lunge beginner": {
    exerciseName: "Lateral Lunge",
    description:
      "Step wide to one side, sit hips back over that foot, opposite leg straight. Push off to return.",
    keyPoints: [
      "Step wide to one side",
      "Sit the hips back over that foot",
      "Opposite leg stays straight",
      "Push off to return to the start",
      "Keep the chest up throughout",
    ],
    muscleGroups: ["Glute Medius", "Inner Thighs", "Quads"],
    difficulty: "Beginner",
  },
  "walking lunge beginner": {
    exerciseName: "Walking Lunge",
    description: "10 continuous steps forward. Show 10 steps forward cue.",
    keyPoints: [
      "10 continuous steps forward",
      "Lower the back knee toward the floor each step",
      "Front shin stays vertical each step",
      "Drive through the front heel into the next step",
      "10 steps forward cue shown on screen",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Calves"],
    difficulty: "Beginner",
  },
  "standing calf raise beginner": {
    exerciseName: "Standing Calf Raise",
    description:
      "Rise onto toes fully, pause 1 second at top. Lower slowly over 2 seconds. Use wall for balance only.",
    keyPoints: [
      "Rise onto the toes fully",
      "Pause 1 second at the top",
      "Lower slowly over 2 seconds",
      "Use the wall for balance only",
      "Full range of motion on every rep",
    ],
    muscleGroups: ["Gastrocnemius", "Soleus"],
    difficulty: "Beginner",
  },
  "stepup beginner": {
    exerciseName: "Step-Up",
    description:
      "Step one foot onto box or chair. Drive through that heel to stand on top. Step down controlled. Alternate leading leg.",
    keyPoints: [
      "Step one foot onto a box or chair",
      "Drive through that heel to stand on top",
      "Step down controlled",
      "Alternate the leading leg",
      "Full stand on top of the box each rep",
    ],
    muscleGroups: ["Glutes", "Quads", "Hamstrings", "Calves"],
    difficulty: "Beginner",
  },
  "singleleg calf raise beginner": {
    exerciseName: "Single-Leg Calf Raise",
    description:
      "Hold wall for balance. Raise one foot. Rise onto toes of standing leg, pause, lower slowly.",
    keyPoints: [
      "Hold the wall for balance",
      "Raise one foot off the floor",
      "Rise onto the toes of the standing leg",
      "Pause at the top",
      "Lower slowly under control",
    ],
    muscleGroups: ["Gastrocnemius", "Soleus (Single-Leg Load)"],
    difficulty: "Beginner",
  },
  "singleleg balance hold beginner": {
    exerciseName: "Single-Leg Balance Hold",
    description:
      "Stand on one foot, slight knee bend, 20 seconds each side. Show timer.",
    keyPoints: [
      "Stand on one foot",
      "Slight knee bend on the standing leg",
      "Hold for 20 seconds each side",
      "Keep the core braced for stability",
      "Timer shown on screen",
    ],
    muscleGroups: ["Calves", "Core", "Ankle Stabilizers"],
    difficulty: "Beginner",
  },
  // ─── Lower Body Pro deck ──────────────────────────────────────────────────
  "full pistol squat pro": {
    exerciseName: "Full Pistol Squat",
    description:
      "Stand on one foot with the other leg extended straight forward, parallel to the floor. Lower under control until the standing-leg thigh drops below parallel to the floor, keeping the chest up and the extended leg held straight out in front. Drive through the heel of the standing foot to stand back to full lockout. Complete the assigned reps on one leg before switching to the other.",
    keyPoints: [
      "Stand on one foot, other leg extended straight forward, parallel to the floor",
      "Lower until the standing-leg thigh is below parallel",
      "Keep the chest up throughout — do not round forward",
      "Drive through the heel of the standing foot to stand",
      "Complete all reps on one leg before switching sides",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hamstrings",
      "Ankle Stabilisers",
      "Core",
    ],
    difficulty: "Pro",
  },
  // Alias so the deck's "Pistol Squat" card resolves to the Full Pistol Squat
  // info when the backend has no record for it.
  "pistol squat pro": {
    exerciseName: "Full Pistol Squat",
    description:
      "Stand on one foot with the other leg extended straight forward, parallel to the floor. Lower under control until the standing-leg thigh drops below parallel to the floor, keeping the chest up and the extended leg held straight out in front. Drive through the heel of the standing foot to stand back to full lockout. Complete the assigned reps on one leg before switching to the other.",
    keyPoints: [
      "Stand on one foot, other leg extended straight forward, parallel to the floor",
      "Lower until the standing-leg thigh is below parallel",
      "Keep the chest up throughout — do not round forward",
      "Drive through the heel of the standing foot to stand",
      "Complete all reps on one leg before switching sides",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hamstrings",
      "Ankle Stabilisers",
      "Core",
    ],
    difficulty: "Pro",
  },
  "shrimp squat pro": {
    exerciseName: "Shrimp Squat",
    description:
      "Stand on one foot and grab the rear foot with one or both hands behind you, holding it close to the glutes. Lower the rear knee toward the floor while keeping the torso upright and the standing leg tracking over the foot. Drive through the standing foot to rise back to the top, maintaining balance and an upright chest the whole way up. A deeper single-leg squat than the pistol — the rear-foot grip forces the hip flexors and quads to control the descent.",
    keyPoints: [
      "Stand on one foot, grab the rear foot with one or both hands behind you",
      "Lower the rear knee toward the floor",
      "Keep the torso upright throughout — do not fold forward",
      "Drive through the standing foot to rise",
      "Deeper single-leg demand than the pistol squat",
    ],
    muscleGroups: ["Quads (Deep Single-Leg)", "Glutes", "Hip Flexors"],
    difficulty: "Pro",
  },
  "tuck jump pro": {
    exerciseName: "Tuck Jump",
    description:
      "Jump vertically and bring both knees up toward the chest at the peak of the jump. Extend the legs back down before landing, absorbing the impact through soft knees with no pause — drive straight into the next jump. Keep the chest up and the core braced so the knees come to the chest rather than the chest dropping to the knees. No rest between reps — every landing flows straight into the next take-off.",
    keyPoints: [
      "Jump and bring the knees to the chest at the peak",
      "Extend the legs before landing",
      "Land with soft knees — absorb the impact",
      "No pause — drive straight into the next jump",
      "Keep the chest up; do not drop the chest to the knees",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves", "Hip Flexors (Power)"],
    difficulty: "Pro",
  },
  "lateral bound pro": {
    exerciseName: "Lateral Bound",
    description:
      "Start in a single-leg stance. Jump explosively sideways, pushing off the standing leg and travelling as far as possible to the side. Land on the opposite single leg, absorbing the impact through the hip and knee with a soft, controlled landing. Pause for 1 second to stabilise on the landing leg before bounding back in the opposite direction. Alternate sides each rep — the pause builds the lateral stability and single-leg control the deck demands.",
    keyPoints: [
      "Start in a single-leg stance",
      "Jump explosively sideways — push off the standing leg",
      "Land on the opposite single leg, absorbing through hip and knee",
      "Pause 1 second to stabilise before the next bound",
      "Alternate sides each rep",
    ],
    muscleGroups: [
      "Glute Medius",
      "Quads",
      "Calves",
      "Core (Lateral Stability)",
    ],
    difficulty: "Pro",
  },
  "jump squat pro": {
    exerciseName: "Jump Squat",
    description:
      "Drop into a full squat with the thighs reaching parallel to the floor, then explode upward as high as possible, reaching the arms overhead at the peak of the jump. Land softly, absorbing the impact through the knees and hips and flowing straight down into the next squat. No pause between reps — the descent of one rep becomes the load for the next jump. Maximum explosive output on every rep.",
    keyPoints: [
      "Drop into a full squat — thighs to parallel",
      "Explode upward as high as possible",
      "Reach the arms overhead at the peak of the jump",
      "Land softly — absorb through the knees and hips",
      "No pause — flow straight into the next squat",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves (Explosive)"],
    difficulty: "Pro",
  },
  "bss normal": {
    exerciseName: "Bulgarian Split Squat",
    description:
      "Stand with your back to a bench and place the top of your rear foot on it. Hop your front foot forward so that when you descend, your front knee tracks directly over your ankle and your front thigh reaches parallel to the floor. Lower under control until the back knee nearly touches the floor, then drive through the heel of the front foot back to standing. Keep the torso tall and the core braced so the hips stay square — no leaning forward or collapsing inward.",
    keyPoints: [
      "Rear foot on the bench, top of foot down",
      "Front foot far enough that the knee tracks over the ankle",
      "Lower until the back knee nearly touches the floor",
      "Drive through the front heel back to standing",
      "Keep the torso tall and the hips square",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Core (Stability)"],
    difficulty: "Advanced",
  },
  "bss elevated": {
    exerciseName: "Elevated Bulgarian Split Squat",
    description:
      "Set up like a standard Bulgarian Split Squat, but place the front foot on a small plate or low riser so the back knee can travel below the level of the front foot at the bottom of the rep. The extra range of motion increases the stretch on the rear-leg hip flexor and the load on the front-leg glute. Descend slowly until the back knee grazes the floor, pause for a beat at the bottom, then press back up through the front heel. Balance is the limiting factor — pick a fixed gaze point and brace hard.",
    keyPoints: [
      "Front foot on a low plate or riser",
      "Back knee travels below the front foot at the bottom",
      "Pause for a beat at the bottom of each rep",
      "Press through the front heel back to standing",
      "Fix your gaze on a point to hold balance",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hip Flexors (Stretch)",
      "Core (Stability)",
    ],
    difficulty: "Advanced",
  },
  "bss deficit": {
    exerciseName: "Deficit Bulgarian Split Squat",
    description:
      "The most demanding split-squat variant: the front foot stands on a higher riser (two stacked plates) while the rear foot rests on the bench behind you. The added height lets the back knee descend well past the floor, creating a deep deficit stretch at the bottom. Lower under control until you reach the deepest comfortable depth — never bounce out of the bottom — then drive explosively through the front heel. Use a wall or rack for balance on the first set until you find the groove.",
    keyPoints: [
      "Front foot on a high riser (two stacked plates)",
      "Rear foot on the bench behind you",
      "Descend past the floor into a deep deficit stretch",
      "No bounce — drive out of the bottom under control",
      "Use a wall for balance on the first set if needed",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hamstrings (Deep Stretch)",
      "Hip Flexors",
    ],
    difficulty: "Advanced",
  },
  "nordic curl": {
    exerciseName: "Nordic Hamstring Curl",
    description:
      "Anchor your feet under a sturdy pad or have a partner hold your ankles as you kneel on a soft surface. Keeping your body in a straight line from knees to shoulders, lower your torso toward the floor as slowly as possible by eccentrically contracting the hamstrings. Catch yourself with your hands at the bottom, push back up just enough to reset, and repeat. The slower the descent, the more eccentric strength you build — aim for a 4-5 second negative. This is the single best exercise for hamstring injury prevention.",
    keyPoints: [
      "Anchored feet, kneeling on a soft surface",
      "Body in a straight line from knees to shoulders",
      "Lower as slowly as possible — aim for 4-5 seconds",
      "Catch with the hands at the bottom and reset",
      "Never bounce or use momentum on the way up",
    ],
    muscleGroups: ["Hamstrings (Eccentric)", "Glutes", "Core"],
    difficulty: "Advanced",
  },
  "jumping lunge": {
    exerciseName: "Jumping Lunge",
    description:
      "Begin at the bottom of a lunge with both knees at 90 degrees, the front foot planted and the back knee just above the floor. Explode upward, switching legs mid-air so you land back into a lunge on the opposite side. Land softly and immediately drop into the next rep — there is no pause between jumps. Pump the arms in time with the legs to generate rhythm and height. Keep the front knee tracking over the toes and the chest tall throughout.",
    keyPoints: [
      "Start at the bottom of a lunge, both knees at 90 degrees",
      "Explode upward and switch legs mid-air",
      "Land softly and immediately drop into the next rep",
      "Pump the arms in time with the legs for rhythm",
      "Keep the front knee over the toes and the chest tall",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Calves (Explosive)",
      "Core (Lateral Stability)",
    ],
    difficulty: "Advanced",
  },
  "singleleg rdl": {
    exerciseName: "Single-Leg Romanian Deadlift",
    description:
      "Stand on one leg with a slight bend in the knee and the other leg extended behind you. Hinge at the hip, pushing the hips back and lowering the torso toward the floor while the free leg rises in a straight line behind you. Keep the working-side hip square and the back flat — no rotation or rounding. Reach the bottom when the torso is roughly parallel to the floor, then squeeze the glute to return to standing. Hold a dumbbell in the opposite hand for added load.",
    keyPoints: [
      "Stand on one leg with a slight knee bend",
      "Hinge at the hip, pushing the hips back",
      "Free leg rises in a straight line behind you",
      "Keep the working hip square and the back flat",
      "Squeeze the glute to return to standing",
    ],
    muscleGroups: [
      "Hamstrings",
      "Glutes",
      "Core (Anti-Rotation)",
      "Ankle (Stability)",
    ],
    difficulty: "Advanced",
  },
  "glute kickback": {
    exerciseName: "Glute Kickback",
    description:
      "Start on all fours with hands under the shoulders and knees under the hips. Keeping the knee bent at 90 degrees, lift one leg straight back and up by squeezing the glute, raising the foot toward the ceiling until the thigh is in line with the torso. Hold the top for a one-count squeeze, then lower under control without letting the knee touch the floor before the next rep. Keep the core braced and the hips level — no leaning to one side to compensate.",
    keyPoints: [
      "Start on all fours, hands under shoulders, knees under hips",
      "Lift the leg back and up by squeezing the glute",
      "Knee stays bent at 90 degrees throughout",
      "Hold the top for a one-count squeeze",
      "Lower under control — no leaning to compensate",
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core (Stability)"],
    difficulty: "Advanced",
  },
  "fire hydrant": {
    exerciseName: "Fire Hydrant",
    description:
      "Begin on all fours with hands under the shoulders and knees under the hips, back flat and core braced. Keeping the knee bent at 90 degrees, lift one leg out to the side, raising the thigh toward hip height by abducting at the hip. Pause for a one-count squeeze at the top, then lower under control back to the starting position. Keep the hips square to the floor and the torso still — the motion comes from the hip, not the spine. Add a resistance band above the knees for a stronger burn.",
    keyPoints: [
      "Start on all fours, hands under shoulders, knees under hips",
      "Lift the bent leg out to the side to hip height",
      "Pause for a one-count squeeze at the top",
      "Lower under control back to the start",
      "Keep the hips square — motion comes from the hip, not the spine",
    ],
    muscleGroups: ["Glutes (Medius)", "Hip Abductors", "Core (Stability)"],
    difficulty: "Advanced",
  },
  // ─── Female Core Beginner deck ─────────────────────────────────────────────
  "plank hold": {
    exerciseName: "Plank Hold",
    description:
      "Forearms on floor, elbows under shoulders. Body rigid from head to heels. Squeeze glutes, brace core, breathe normally. Card value = number of 5-second holds.",
    keyPoints: [
      "5 sec per hold",
      "Card value = number of holds",
      "Squeeze glutes, brace core",
      "Breathe normally",
    ],
    muscleGroups: ["Core", "shoulders", "glutes"],
    difficulty: "Beginner",
  },
  "side plank": {
    exerciseName: "Side Plank",
    description:
      "One forearm on floor, body turned sideways. Lift hips to create straight line from head to feet. Hold the position for rep count seconds (e.g. card 7 = 7 seconds).",
    keyPoints: [
      "Hold for rep-count seconds",
      "Straight line head to feet",
      "Lift hips",
    ],
    muscleGroups: ["Obliques", "glute medius", "shoulder stabilisers"],
    difficulty: "Beginner",
  },
  "plank shoulder tap": {
    exerciseName: "Plank Shoulder Tap",
    description:
      "High plank on hands. Lift one hand and tap opposite shoulder. Replace. Repeat other side. Brace hard — prevent hip rotation.",
    keyPoints: [
      "High plank on hands",
      "Alternate taps",
      "Prevent hip rotation",
      "Brace hard",
    ],
    muscleGroups: ["Core anti-rotation", "serratus anterior", "shoulders"],
    difficulty: "Beginner",
  },
  "bird dog": {
    exerciseName: "Bird Dog",
    description:
      "On all fours. Extend right arm forward and left leg back simultaneously. Hold 2 seconds. Return. Alternate. Back stays completely flat.",
    keyPoints: [
      "2 sec hold",
      "each side",
      "Back stays flat",
      "Extend opposite arm and leg",
    ],
    muscleGroups: ["Erector spinae", "glutes", "core stability"],
    difficulty: "Beginner",
  },
  "dead bug": {
    exerciseName: "Dead Bug",
    description:
      "Lie on back, arms toward ceiling, knees at 90 degrees. Lower opposite arm and leg toward floor, keeping lower back pressed flat. Return. Alternate.",
    keyPoints: [
      "each side",
      "Lower back pressed flat",
      "Knees at 90 degrees",
      "Alternate",
    ],
    muscleGroups: ["Transverse abdominis", "hip flexors", "core coordination"],
    difficulty: "Beginner",
  },
  "knee tuck": {
    exerciseName: "Knee Tuck",
    description:
      "Lie on back. Bring both knees to chest. Slowly extend legs back — do not let them touch floor. Control entirely.",
    keyPoints: [
      "Bring knees to chest",
      "Lower controlled",
      "Do not let legs touch floor",
    ],
    muscleGroups: ["Lower rectus abdominis", "hip flexors"],
    difficulty: "Beginner",
  },
  "flutter kick": {
    exerciseName: "Flutter Kick",
    description:
      "Lie on back, hands under lower back. Legs 10 cm off floor. Alternate small up-down kicks from the hip. Core braced — lower back does not arch.",
    keyPoints: [
      "Legs 10 cm off floor",
      "Small alternate kicks",
      "Core braced",
      "Lower back does not arch",
    ],
    muscleGroups: ["Lower abs", "hip flexors"],
    difficulty: "Beginner",
  },
  "leg raise": {
    exerciseName: "Leg Raise",
    description:
      "Lie on back, legs straight. Press lower back into floor. Raise legs to 90 degrees, lower slowly until just above floor. Do not touch down.",
    keyPoints: [
      "Raise legs to 90 degrees",
      "Lower slowly",
      "Do not touch down",
      "Press lower back into floor",
    ],
    muscleGroups: ["Lower rectus abdominis", "hip flexors"],
    difficulty: "Beginner",
  },
  // ── Core — Advanced (female-specific entries) ─────────────────────────────
  "hollow body hold advanced": {
    exerciseName: "Hollow Body Hold",
    description:
      "Lie on back. Press lower back firmly into floor. Arms overhead, legs straight 30 cm off floor. Hold position. The lower back must stay flat — this is the essential cue.",
    keyPoints: [
      "Press lower back firmly into floor",
      "Arms overhead, legs straight 30 cm off floor",
      "Hold position steady",
      "Lower back must stay flat — essential cue",
    ],
    muscleGroups: [
      "Transverse abdominis",
      "Rectus abdominis",
      "Hip flexors",
      "Shoulder girdle",
    ],
    difficulty: "Advanced",
  },
  "v up advanced": {
    exerciseName: "V-Up",
    description:
      "Lie flat, arms overhead. Raise legs and upper body simultaneously to meet hands at feet — V shape. Lower fully controlled. No momentum.",
    keyPoints: [
      "Lie flat, arms overhead",
      "Raise legs and upper body simultaneously",
      "Meet hands at feet — V shape",
      "Lower fully controlled",
      "No momentum",
    ],
    muscleGroups: ["Rectus abdominis", "Hip flexors", "Core coordination"],
    difficulty: "Advanced",
  },
  "hanging knee raise advanced": {
    exerciseName: "Hanging Knee Raise",
    description:
      "Hang from pull-up bar, shoulder-width grip. Bring both knees to chest in a controlled curl. Lower fully. No swinging — use core, not momentum.",
    keyPoints: [
      "Hang from pull-up bar, shoulder-width grip",
      "Bring both knees to chest in controlled curl",
      "Lower fully",
      "No swinging — use core, not momentum",
    ],
    muscleGroups: ["Lower abs", "Hip flexors", "Grip"],
    difficulty: "Advanced",
  },
  "lsit advanced": {
    exerciseName: "L-Sit Hold",
    description:
      "On floor using hands on yoga blocks or parallel bars. Push down and raise legs parallel to floor. Hold 5 seconds per rep. Show 5 sec per hold cue.",
    keyPoints: [
      "On floor using hands on yoga blocks or parallel bars",
      "Push down and raise legs parallel to floor",
      "Hold 5 seconds per rep",
      "5 sec per hold cue",
    ],
    muscleGroups: ["Hip flexors", "Core", "Triceps", "Shoulder girdle"],
    difficulty: "Advanced",
  },
  "toes to bar advanced": {
    exerciseName: "Toes to Bar",
    description:
      "Hang from bar, arms straight. Raise straight legs until toes touch bar. Lower controlled. No kipping. 5 reps.",
    keyPoints: [
      "Hang from bar, arms straight",
      "Raise straight legs until toes touch bar",
      "Lower controlled",
      "No kipping",
      "5 reps",
    ],
    muscleGroups: ["Rectus abdominis", "Hip flexors", "Lats", "Grip"],
    difficulty: "Advanced",
  },
  "mountain climber advanced": {
    exerciseName: "Mountain Climber",
    description:
      "High plank. Drive one knee toward chest, return, immediately drive the other. Hips level throughout. Shoulders over wrists.",
    keyPoints: [
      "High plank position",
      "Drive one knee toward chest, return",
      "Immediately drive the other knee",
      "Hips level throughout",
      "Shoulders over wrists",
    ],
    muscleGroups: ["Core", "Hip flexors", "Shoulders"],
    difficulty: "Advanced",
  },
  "russian twist advanced": {
    exerciseName: "Russian Twist",
    description:
      "Sit at 45 degrees, feet off floor or on floor. Rotate torso fully side to side. Touch floor beside hip at each end. One full side-to-side = 1 rep per side.",
    keyPoints: [
      "Sit at 45 degrees, feet off floor or on floor",
      "Rotate torso fully side to side",
      "Touch floor beside hip at each end",
      "One full side-to-side = 1 rep per side",
    ],
    muscleGroups: ["Obliques", "Rectus abdominis", "Hip flexors"],
    difficulty: "Advanced",
  },
  // ── Core — Pro (female-specific entries) ───────────────────────────────────
  "dragon flag negative pro": {
    exerciseName: "Dragon Flag Negative",
    description:
      "Grip bench behind head, raise body to vertical. Lower the entire straight body as slowly as possible toward horizontal — do not touch bench. Use hands to return to start.",
    keyPoints: [
      "Grip bench behind head, raise body to vertical",
      "Lower entire straight body as slowly as possible toward horizontal",
      "Do not touch bench",
      "Use hands to return to start",
    ],
    muscleGroups: [
      "Entire anterior chain — abs, hip flexors, quads, shoulders (eccentric)",
    ],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "full dragon flag pro": {
    exerciseName: "Full Dragon Flag",
    description:
      "From bench grip, raise body to vertical and lower UNDER CONTROL all the way to horizontal, then raise back. Body stays rigid like a plank throughout.",
    keyPoints: [
      "From bench grip, raise body to vertical",
      "Lower under control all the way to horizontal",
      "Raise back up",
      "Body stays rigid like a plank throughout",
    ],
    muscleGroups: [
      "Rectus abdominis",
      "Hip flexors",
      "Lats",
      "Entire core chain",
    ],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "windshield wipers straight pro": {
    exerciseName: "Windshield Wipers Straight",
    description:
      "Hang from bar, raise straight legs to horizontal. Rotate legs to one side until nearly touching bar beside you, then rotate to other side. One full sweep = 1 rep.",
    keyPoints: [
      "Hang from bar, raise straight legs to horizontal",
      "Rotate legs to one side until nearly touching bar beside you",
      "Then rotate to other side",
      "One full sweep = 1 rep",
    ],
    muscleGroups: ["Obliques", "Rectus abdominis", "Lats", "Grip"],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "tuck planche hold pro": {
    exerciseName: "Tuck Planche Hold",
    description:
      "High plank. Shift weight forward over wrists. Lean until you can lift knees off floor, tucked tight to chest. Hold 5 seconds. Wrists bear full bodyweight.",
    keyPoints: [
      "High plank position",
      "Shift weight forward over wrists",
      "Lean until knees lift off floor, tucked tight to chest",
      "Hold 5 seconds",
      "Wrists bear full bodyweight",
    ],
    muscleGroups: ["Serratus anterior", "Deltoids", "Triceps", "Core"],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "copenhagen plank pro": {
    exerciseName: "Copenhagen Plank",
    description:
      "Lie on side, top foot on bench. Push up into side plank using top foot and forearm. Body bridged sideways — hips lifted, rigid. Hold 5 seconds per rep.",
    keyPoints: [
      "Lie on side, top foot on bench",
      "Push up into side plank using top foot and forearm",
      "Body bridged sideways — hips lifted, rigid",
      "Hold 5 seconds per rep",
    ],
    muscleGroups: ["Adductors", "Obliques", "Glute medius", "Core"],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "planche lean pro": {
    exerciseName: "Planche Lean",
    description:
      "High plank on floor. Shift entire body forward so shoulders pass well beyond wrists. Arms locked. Enormous load in serratus and anterior deltoid.",
    keyPoints: [
      "High plank on floor",
      "Shift entire body forward so shoulders pass well beyond wrists",
      "Arms locked",
      "Enormous load in serratus and anterior deltoid",
    ],
    muscleGroups: [
      "Serratus anterior",
      "Anterior deltoid",
      "Wrist flexors",
      "Core",
    ],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  "front lever hold pro": {
    exerciseName: "Front Lever Hold",
    description:
      "Hang from bar. Raise body to horizontal position (tuck version: knees pulled to chest). Hold 5 seconds per rep.",
    keyPoints: [
      "Hang from bar",
      "Raise body to horizontal position",
      "Tuck version: knees pulled to chest",
      "Hold 5 seconds per rep",
    ],
    muscleGroups: ["Lats", "Core", "Rear deltoids", "Biceps"],
    difficulty: "Pro",
    videoUrl: "coming soon",
  },
  // ─── Female Full Body Beginner deck ─────────────────────────────────────────
  "modified burpee": {
    exerciseName: "Modified Burpee",
    description:
      "Stand. Squat, hands on floor. Step one foot back, then the other to plank. Step forward, then stand. Stepping instead of jumping — perfect for beginners.",
    keyPoints: [
      "Start standing with feet shoulder-width apart",
      "Squat down and place hands on floor",
      "Step one foot back, then the other into plank position",
      "Step feet forward one at a time",
      "Stand back up fully",
    ],
    muscleGroups: ["Quads", "Chest", "Shoulders", "Core", "Glutes"],
    difficulty: "Beginner",
  },
  "standard burpee": {
    exerciseName: "Standard Burpee",
    description:
      "Stand. Squat, hands on floor. Jump feet to plank and do one push-up. Jump feet forward. Jump up with hands overhead. Land softly.",
    keyPoints: [
      "Start standing",
      "Squat and place hands on floor",
      "Jump feet back to plank",
      "Perform one push-up",
      "Jump feet forward to hands",
      "Explosively jump up with arms overhead",
      "Land softly with bent knees",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Chest",
      "Shoulders",
      "Triceps",
      "Core",
      "Calves",
    ],
    difficulty: "Beginner",
  },
  inchworm: {
    exerciseName: "Inchworm",
    description:
      "Stand, feet hip-width. Fold forward, place hands on floor. Walk hands forward to plank. Pause. Walk hands back to feet. Rise to standing. Slow and controlled.",
    keyPoints: [
      "Stand with feet hip-width apart",
      "Fold forward placing hands on floor",
      "Walk hands forward to full plank",
      "Pause briefly in plank",
      "Walk hands back to feet",
      "Rise to standing slowly",
    ],
    muscleGroups: ["Hamstrings", "Shoulders", "Core", "Chest"],
    difficulty: "Beginner",
  },
  "bear crawl": {
    exerciseName: "Bear Crawl",
    description:
      "All fours, knees 2 cm off floor. Move opposite hand and foot simultaneously. Core braced, back flat. 2 metres forward and back = 1 rep.",
    keyPoints: [
      "Start on all fours with knees 2 cm off floor",
      "Move opposite hand and foot simultaneously",
      "Keep core braced and back flat",
      "Crawl 2 metres forward",
      "Crawl 2 metres back to complete one rep",
    ],
    muscleGroups: ["Core", "Shoulders", "Quads"],
    difficulty: "Beginner",
  },
  "lunge with torso twist": {
    exerciseName: "Lunge with Torso Twist",
    description:
      "Step forward into lunge. At the bottom, rotate upper body toward front leg. Rotate back to centre. Push to standing. Alternate legs.",
    keyPoints: [
      "Step forward into a lunge",
      "At the bottom, rotate upper body toward front leg",
      "Rotate back to centre",
      "Push back to standing",
      "Alternate legs each rep",
    ],
    muscleGroups: ["Quads", "Glutes", "Obliques", "Hip Flexors"],
    difficulty: "Beginner",
  },
  "pushup to down dog": {
    exerciseName: "Push-Up to Down Dog",
    description:
      "From plank, do a push-up. At top, push hips high into downward dog V-shape. Hold 1 second. Return to plank. Full cycle = 1 rep.",
    keyPoints: [
      "Start in plank position",
      "Perform a push-up",
      "At the top, push hips high into downward dog V-shape",
      "Hold for 1 second",
      "Return to plank to complete one rep",
    ],
    muscleGroups: ["Chest", "Shoulders", "Triceps", "Hamstrings", "Core"],
    difficulty: "Beginner",
  },
  "jumping jacks": {
    exerciseName: "Jumping Jacks",
    description:
      "Stand feet together, arms at sides. Jump feet wide while swinging arms overhead. Jump back together. Arms and legs move simultaneously. Maintain rhythm.",
    keyPoints: [
      "Start with feet together and arms at sides",
      "Jump feet wide while swinging arms overhead",
      "Jump back to starting position",
      "Keep arms and legs moving simultaneously",
      "Maintain a steady rhythm",
    ],
    muscleGroups: ["Calves", "Shoulders", "Hip Abductors", "Cardiovascular"],
    difficulty: "Beginner",
  },
  "high knees": {
    exerciseName: "High Knees",
    description:
      "Stand tall. Drive one knee up above hip level, then the other, alternating rapidly as if running on the spot. Keep core engaged.",
    keyPoints: [
      "Stand tall with core engaged",
      "Drive one knee up above hip level",
      "Alternate knees rapidly",
      "Stay light on the balls of your feet",
    ],
    muscleGroups: ["Quads", "Hip Flexors", "Core", "Calves", "Cardiovascular"],
    difficulty: "Beginner",
  },
  "box stepup": {
    exerciseName: "Box Step-Up",
    description:
      "Stand in front of a box or step. Step one foot onto the box, push through the heel to stand up. Step down. Alternate legs. Each step = 1 rep.",
    keyPoints: [
      "Stand in front of a box or sturdy step",
      "Step one foot onto the box",
      "Push through the heel to stand up fully",
      "Step down with control",
      "Alternate legs each rep",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Calves"],
    difficulty: "Beginner",
  },
  "crab walk": {
    exerciseName: "Crab Walk",
    description:
      "Sit on floor, hands behind you, fingers pointing toward feet. Lift hips off floor. Walk forward then back, keeping hips high.",
    keyPoints: [
      "Sit on floor with hands behind you",
      "Lift hips off the floor",
      "Walk forward using hands and feet",
      "Keep hips elevated throughout",
      "Walk back to starting position",
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Triceps", "Core", "Shoulders"],
    difficulty: "Beginner",
  },
  "lateral shuffle": {
    exerciseName: "Lateral Shuffle",
    description:
      "Stand with knees slightly bent, stay low. Take 3 quick steps to the right, then 3 steps to the left. 3 right + 3 left = 1 rep. Stay low throughout.",
    keyPoints: [
      "Start with knees slightly bent, staying low",
      "Take 3 quick shuffle steps to the right",
      "Take 3 quick shuffle steps to the left",
      "Stay low throughout the movement",
      "3 right + 3 left = 1 rep",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hip Abductors",
      "Calves",
      "Cardiovascular",
    ],
    difficulty: "Beginner",
  },
  "squat to stand": {
    exerciseName: "Squat to Stand",
    description:
      "Squat down with feet shoulder-width apart. As you stand up, reach arms overhead. Lower arms and squat again. Full range of motion.",
    keyPoints: [
      "Squat down with feet shoulder-width apart",
      "As you stand, reach arms fully overhead",
      "Lower arms back down",
      "Squat again for next rep",
      "Use full range of motion",
    ],
    muscleGroups: ["Quads", "Glutes", "Shoulders", "Core"],
    difficulty: "Beginner",
  },
  "squat thrust": {
    exerciseName: "Squat Thrust",
    description:
      "Drop to plank position, jump feet back to squat, then stand up. No push-up. 8 reps.",
    keyPoints: [
      "Start standing",
      "Drop hands to floor and jump feet back to plank",
      "Jump feet forward to squat position",
      "Stand up fully",
      "No push-up in this variation",
    ],
    muscleGroups: ["Quads", "Glutes", "Chest", "Shoulders", "Core"],
    difficulty: "Beginner",
  },
  "burpee hold": {
    exerciseName: "Burpee Hold",
    description:
      "Perform a burpee to the plank position. At the bottom, hold the plank for 5 seconds. Return to standing. 5 reps.",
    keyPoints: [
      "Perform a burpee down to plank",
      "Hold the plank position for 5 seconds",
      "Return to standing",
      "Complete 5 reps total",
    ],
    muscleGroups: ["Core", "Chest", "Shoulders", "Quads"],
    difficulty: "Beginner",
  },
  "bear crawl sprint": {
    exerciseName: "Bear Crawl Sprint",
    description:
      "Perform bear crawls as fast as possible for 10 reps. Maintain form even at speed.",
    keyPoints: [
      "Get into bear crawl position",
      "Crawl as fast as possible",
      "Maintain proper form even at speed",
      "Complete 10 reps",
    ],
    muscleGroups: ["Core", "Shoulders", "Quads"],
    difficulty: "Beginner",
  },
  // ── Full Body — Advanced (female) ──────────────────────────────────────────
  "plyometric burpee advanced": {
    exerciseName: "Plyometric Burpee",
    description:
      "Same as standard burpee but explosive — jump as high as possible, clap hands overhead. Land with soft knees, immediately flow into next rep. No pause.",
    keyPoints: [
      "Explosive jump as high as possible",
      "Clap hands overhead at peak",
      "Soft knees on landing",
      "No pause between reps",
    ],
    muscleGroups: ["Full body — quads, glutes, chest, shoulders, core, calves"],
    difficulty: "Advanced",
  },
  "spiderman pushup advanced": {
    exerciseName: "Spider-Man Push-up",
    description:
      "High plank. As you lower, bring one knee out to same-side elbow. Return leg as you press up. Alternate sides each rep.",
    keyPoints: [
      "Start in high plank",
      "Knee to same-side elbow on the way down",
      "Alternate sides each rep",
      "Return leg as you press up",
    ],
    muscleGroups: ["Chest", "Triceps", "Core", "Obliques", "Hip flexors"],
    difficulty: "Advanced",
  },
  "box jump advanced": {
    exerciseName: "Box Jump",
    description:
      "Facing box. Drop into quarter-squat, swing arms, jump onto box. Land softly with knees bent. Stand fully before stepping down. Never jump backward off the box.",
    keyPoints: [
      "Quarter-squat start",
      "Arm swing for momentum",
      "Soft landing with bent knees",
      "Stand fully on top",
      "Step down — never jump backward off the box",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves (explosive power)"],
    difficulty: "Advanced",
  },
  "singleleg burpee advanced": {
    exerciseName: "Single-Leg Burpee",
    description:
      "Full burpee performed while standing on one leg. The non-working leg stays raised throughout. Show each leg note — reps are per leg.",
    keyPoints: [
      "Stand on one leg only",
      "Non-working leg stays raised",
      "Each leg = 1 rep",
      "Full burpee motion on one leg",
    ],
    muscleGroups: ["Full body with additional single-leg stability demand"],
    difficulty: "Advanced",
  },
  "decline pushup to mountain climber advanced": {
    exerciseName: "Decline Push-up to Mountain Climber",
    description:
      "Feet on bench. Perform 1 decline push-up. At the top, hold plank and drive knees to chest 4 times. That full sequence = 1 rep.",
    keyPoints: [
      "Feet elevated on bench",
      "1 push-up + 4 climbers",
      "Hold plank at the top",
      "Full sequence = 1 rep",
    ],
    muscleGroups: ["Upper chest", "Shoulders", "Core", "Hip flexors"],
    difficulty: "Advanced",
  },
  "lateral jump lunge advanced": {
    exerciseName: "Lateral Jump Lunge",
    description:
      "Jump sideways and land in a lunge — jumping leg goes forward, other goes back. Feet together, jump to other side. Each side = 1 rep.",
    keyPoints: [
      "Sideways jump into lunge",
      "Jumping leg forward, other back",
      "Alternate sides",
      "Each side = 1 rep",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Adductors",
      "Calves",
      "Lateral stability",
    ],
    difficulty: "Advanced",
  },
  "jump squat to jump lunge advanced": {
    exerciseName: "Jump Squat to Jump Lunge",
    description:
      "Jump squat, then immediately do 2 jumping lunges (one each side). All 3 jumps = 1 rep. No pauses between components.",
    keyPoints: [
      "1 jump squat + 2 jump lunges",
      "No pauses between components",
      "All 3 jumps = 1 rep",
      "One lunge each side",
    ],
    muscleGroups: [
      "Quads",
      "Glutes",
      "Hamstrings",
      "Calves",
      "Full conditioning",
    ],
    difficulty: "Advanced",
  },
  "burpee box jump advanced": {
    exerciseName: "Burpee Box Jump",
    description:
      "Perform a full burpee, then immediately jump onto a box with both feet. Land softly, stand fully, step down. Chain the burpee straight into the box jump with no pause.",
    keyPoints: [
      "Full burpee first",
      "Explode straight into box jump",
      "Soft landing on the box",
      "Stand fully on top",
      "Step down — no pause between burpee and jump",
    ],
    muscleGroups: ["Full body — quads, glutes, chest, shoulders, calves"],
    difficulty: "Advanced",
  },
  "burpee chinup advanced": {
    exerciseName: "Burpee Chin-up",
    description:
      "Perform a burpee, then at the top jump up to a bar and do 1 chin-up. Drop back down and flow straight into the next burpee. 1 chin-up per burpee — 5 reps.",
    keyPoints: [
      "Full burpee to standing",
      "Jump to bar at the top",
      "1 chin-up per burpee",
      "Flow straight into next rep",
      "Complete 5 reps",
    ],
    muscleGroups: ["Full body — back, biceps, chest, shoulders, legs"],
    difficulty: "Advanced",
  },
  "broad jump advanced": {
    exerciseName: "Broad Jump",
    description:
      "Stand with feet shoulder-width. Drop into quarter-squat, swing arms, jump forward as far as possible. Land softly with bent knees and stick the landing. Reset fully before each rep.",
    keyPoints: [
      "Quarter-squat start",
      "Arm swing for momentum",
      "Jump forward for max distance",
      "Soft landing with bent knees",
      "Reset fully between reps",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Calves"],
    difficulty: "Advanced",
  },
  "tuck jump advanced": {
    exerciseName: "Tuck Jump",
    description:
      "From standing, drop slightly and explode upward, driving both knees up toward the chest at the peak. Land softly with bent knees and immediately reset for the next rep.",
    keyPoints: [
      "Slight dip then explode up",
      "Drive knees to chest at peak",
      "Soft landing with bent knees",
      "Reset between reps",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves", "Core"],
    difficulty: "Advanced",
  },
  "box jump to squat hold advanced": {
    exerciseName: "Box Jump to Squat Hold",
    description:
      "Jump onto the box and immediately hold the bottom of a squat on top for 3 seconds before standing. 5 reps. The hold builds isometric strength at the hardest part of the squat.",
    keyPoints: [
      "Jump onto box with both feet",
      "Hold bottom of squat on top",
      "3 sec hold on landing",
      "Stand fully after the hold",
      "Complete 5 reps",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves", "Core"],
    difficulty: "Advanced",
  },
  "archer pushup advanced": {
    exerciseName: "Archer Push-up",
    description:
      "Wide hand placement. Lower toward one side while the opposite arm stays fully extended. Press back to center, then alternate sides. The straight arm bears partial load — the bent arm does most of the work.",
    keyPoints: [
      "Hands set wide",
      "Lower toward one side",
      "Opposite arm stays straight",
      "Press back to center",
      "Alternate sides each rep",
    ],
    muscleGroups: ["Chest", "Shoulders", "Triceps", "Core"],
    difficulty: "Advanced",
  },
  "diamond pushup to jump squat advanced": {
    exerciseName: "Diamond Push-up to Jump Squat",
    description:
      "Perform 1 diamond push-up (hands form a diamond under the chest), then immediately stand and do 1 explosive jump squat. The full combo = 1 rep. 6 reps. No pause between the push-up and the jump.",
    keyPoints: [
      "1 diamond push-up (hands form diamond)",
      "Immediately stand and jump squat",
      "1 push-up + 1 jump squat = 1 rep",
      "No pause between components",
      "Complete 6 reps",
    ],
    muscleGroups: ["Chest", "Triceps", "Quads", "Glutes", "Calves"],
    difficulty: "Advanced",
  },
  "jump lunge advanced": {
    exerciseName: "Jump Lunge",
    description:
      "Start in lunge position. Drop into the lunge, then explode upward and switch legs in the air, landing in a lunge on the opposite side. Alternate legs each rep. Soft landings.",
    keyPoints: [
      "Start in lunge position",
      "Explode upward and switch legs in air",
      "Land in lunge on opposite side",
      "Alternate legs each rep",
      "Soft landings",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Calves"],
    difficulty: "Advanced",
  },
  "nonstop jump lunge advanced": {
    exerciseName: "Non-stop Jump Lunge",
    description:
      "Continuous jump lunges for 30 seconds — switch legs in the air every rep, no pauses. Max reps. Timer + rep counter track your output. Maintain form even at speed.",
    keyPoints: [
      "Continuous jump lunges",
      "Switch legs in the air",
      "No pauses — keep moving",
      "30 sec max reps",
      "Maintain form at speed",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Calves", "Cardio"],
    difficulty: "Advanced",
  },
  // ─── Gap-fill pass (Part 2 audit) — added for exercises with no prior entry ─────

  // Cross-match fixes — these exercises previously fell through to a
  // same-family substring match with meaningfully different content
  // (e.g. a side plank resolving to front-plank cues). Exact keys added
  // so they resolve to their own correct entry instead.
  "negative chinup": {
    exerciseName: "Negative Chin-up",
    description:
      "Jump or step up to the top chin-up position, chin over the bar, then lower yourself as slowly as possible — 3 to 5 seconds down. The eccentric-only lower builds the pulling strength needed for a full chin-up.",
    keyPoints: [
      "Jump to the top position",
      "Lower slowly — 3 to 5 seconds",
      "Fight the descent the whole way down",
      "Reset from the floor each rep",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Advanced",
  },
  "burpee chinup pro": {
    exerciseName: "Burpee Chin-up",
    description:
      "Perform a full burpee, then immediately jump up and complete one strict chin-up before dropping back down into the next burpee. One chin-up per burpee.",
    keyPoints: [
      "Full burpee with push-up",
      "Jump up to the bar",
      "1 strict chin-up per burpee",
      "5 reps",
    ],
    muscleGroups: ["Full Body", "Lats", "Cardio"],
    difficulty: "Pro",
  },
  "singleleg nordic curl pro": {
    exerciseName: "Single-Leg Nordic Curl",
    description:
      "Kneel with one ankle anchored, the other leg lifted and crossed behind for balance. Lean forward from the knees as slowly as possible, controlling the descent with the hamstring of the working leg, then pull back to vertical.",
    keyPoints: [
      "Ankle anchored, one leg only",
      "Lean forward from the knees",
      "Control the descent — don't collapse",
      "5 reps each leg",
    ],
    muscleGroups: ["Hamstrings", "Glutes", "Core"],
    difficulty: "Pro",
  },
  "side plank hold": {
    exerciseName: "Side Plank Hold",
    description:
      "One forearm on the floor, body turned sideways, stacked feet. Lift the hips to form a straight line from head to feet and hold, keeping the hips high — don't let them sag toward the floor.",
    keyPoints: [
      "One forearm on the floor, body sideways",
      "Stack the feet",
      "Hips high — straight line head to feet",
      "50 sec each side",
    ],
    muscleGroups: ["Obliques", "Core", "Shoulders"],
    difficulty: "Advanced",
  },
  "side plank with hip dip": {
    exerciseName: "Side Plank with Hip Dip",
    description:
      "Hold a side plank on your forearm, then dip the hips down toward the floor and lift back up to the starting height, without letting the bottom hip actually touch down. Complete all reps on one side before switching.",
    keyPoints: [
      "Hold the side plank position",
      "Dip hips toward the floor",
      "Lift back to starting height",
      "Reps each side",
    ],
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Advanced",
  },
  "star side plank": {
    exerciseName: "Star Side Plank",
    description:
      "Full side plank on one forearm, then raise the top arm straight up and the top leg straight out at the same time, forming a star shape. Hold briefly, then lower both back down together.",
    keyPoints: [
      "Full side plank position",
      "Raise top arm and top leg together",
      "Form a star shape",
      "5 reps each side",
    ],
    muscleGroups: ["Obliques", "Core", "Hip Abductors"],
    difficulty: "Pro",
  },
  "joker combo lower body": {
    exerciseName: "Joker Combo (Lower Body)",
    description:
      "A four-exercise lower-body circuit done back to back with no rest between movements. Move straight from the last rep of one exercise into the first rep of the next — squats, then a forward lunge, a step-up, and finish on calf raises.",
    keyPoints: [
      "6× Regular Squat",
      "6× Forward Lunge each leg",
      "6× Step-Up each leg",
      "8× Calf Raise",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Lower Body"],
    difficulty: "Beginner",
  },

  // Upper Body
  joker: {
    exerciseName: "Joker",
    description:
      "A four-exercise circuit done back to back with no rest between movements. Move straight from the last rep of one exercise into the first rep of the next — the combo only ends when the last rep of the Bench Dip is locked out. Tests the whole upper body in one push: chest on the push-ups, shoulders on the shoulder tap, back and biceps on the row, then triceps on the dip.",
    keyPoints: [
      "10× Standard Push-up",
      "10× Shoulder Tap Push-up",
      "10× Incline Row",
      "10× Bench Dip",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Upper Body"],
    difficulty: "Beginner",
  },
  "assisted pullup": {
    exerciseName: "Assisted Pull-up",
    description:
      "Loop a resistance band around the bar and under one foot or knee for support. Pull chest toward the bar, then lower under control to a full dead hang. The band takes just enough load off to keep every rep honest while you build toward an unassisted pull-up.",
    keyPoints: [
      "Band looped under foot or knee",
      "Pull chest toward the bar",
      "Lower to a full dead hang",
      "Use the lightest band that still lets you fail around the target reps",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Advanced",
  },
  "negative pullup": {
    exerciseName: "Negative Pull-up",
    description:
      "Jump or step up to the top position, chin over the bar, then lower yourself as slowly as possible — 3 to 5 seconds down. The eccentric-only lower builds the pulling strength most people are missing for a full pull-up.",
    keyPoints: [
      "Jump to the top position",
      "Lower slowly — 3 to 5 seconds",
      "Fight the descent the whole way down",
      "Reset from the floor each rep",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Advanced",
  },
  "pullup advanced": {
    exerciseName: "Pull-up",
    description:
      "Supinated (underhand) grip, hang fully at the bottom of every rep. Pull until your chin clears the bar, then lower with control back to a full dead hang before the next rep. No kipping — strict form only.",
    keyPoints: [
      "Supinated grip, shoulder-width",
      "Full dead hang between reps",
      "Chin clears the bar",
      "Strict — no kipping or swinging",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Advanced",
  },
  "pullup with pause": {
    exerciseName: "Pull-up with Pause",
    description:
      "Standard strict pull-up, but hold chin-over-bar for a 2 second count at the top of every rep before lowering. The pause removes momentum entirely and forces the back and biceps to control the position, not just pass through it.",
    keyPoints: [
      "Pull chin over the bar",
      "Hold 2 seconds at the top",
      "Lower under control to a full hang",
      "No momentum — the pause exposes it",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Advanced",
  },
  "pullup pro": {
    exerciseName: "Pull-up",
    description:
      "Strict pull-up at Pro tier — full dead hang to chin-over-bar, every rep identical. At this level the card counts clean reps only; any kip, swing, or partial range doesn't count.",
    keyPoints: [
      "Full dead hang start position",
      "Chin clears the bar every rep",
      "Strict tempo, no swinging",
      "Card value = number of clean reps",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Pro",
  },

  // Lower Body
  "regular squat": {
    exerciseName: "Regular Squat",
    description:
      "Feet shoulder-width, toes slightly out. Sit the hips back and down until thighs are roughly parallel to the floor, chest up, knees tracking over the toes. Drive through the heels to stand.",
    keyPoints: [
      "Feet shoulder-width",
      "Hips back and down, chest up",
      "Thighs to parallel",
      "Drive through the heels",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Beginner",
  },
  "squat hold beginner": {
    exerciseName: "Squat Hold",
    description:
      "Lower into the bottom of a squat, thighs roughly parallel to the floor, and hold. Keep the chest up and weight in the heels — don't let the hold collapse into a slump. Card value = number of seconds.",
    keyPoints: [
      "Thighs to parallel, chest up",
      "Weight in the heels",
      "Card value = number of seconds",
      "Breathe steadily through the hold",
    ],
    muscleGroups: ["Quads", "Glutes", "Core"],
    difficulty: "Beginner",
  },
  "alternating lunge beginner": {
    exerciseName: "Alternating Lunge",
    description:
      "Step one leg forward into a lunge, front thigh to parallel and back knee just short of the floor, then push back to standing and switch legs. Keep the torso upright and each step controlled.",
    keyPoints: [
      "Step forward, front thigh to parallel",
      "Back knee just short of the floor",
      "Torso upright throughout",
      "Alternate legs each rep",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Beginner",
  },
  "slow alternating lunge": {
    exerciseName: "Slow Alternating Lunge",
    description:
      "Same alternating lunge, slowed down deliberately — 3 seconds to lower into the bottom position, 3 seconds to rise. The slow tempo removes momentum and makes the front leg do all the work.",
    keyPoints: [
      "3 sec down, 3 sec up",
      "Front thigh to parallel",
      "Torso upright",
      "Alternate legs, no rushing the tempo",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Beginner",
  },
  "high knee march": {
    exerciseName: "High Knee March",
    description:
      "Stand tall and march in place, driving each knee up to hip height before planting and switching sides. Keep a slow, controlled pace — this is a warm-up mover, not a sprint drill.",
    keyPoints: [
      "Drive knee to hip height",
      "Stand tall, controlled pace",
      "Plant before switching legs",
      "Arms swing naturally",
    ],
    muscleGroups: ["Hip Flexors", "Quads", "Core"],
    difficulty: "Beginner",
  },
  "calf raise beginner": {
    exerciseName: "Calf Raise",
    description:
      "Stand tall, feet hip-width. Rise onto the balls of both feet as high as possible, pause briefly at the top, then lower under control until heels touch down.",
    keyPoints: [
      "Rise onto the balls of both feet",
      "Brief pause at the top",
      "Lower under control",
      "Full range — heels all the way down",
    ],
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
  },
  "jump squat advanced": {
    exerciseName: "Jump Squat",
    description:
      "Squat to parallel, then explode upward into a jump, extending fully through hips, knees, and ankles. Land soft with bent knees and sink straight back into the next rep.",
    keyPoints: [
      "Squat to parallel",
      "Explode upward, full extension",
      "Land soft, knees bent",
      "Absorb the landing into the next rep",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves"],
    difficulty: "Advanced",
  },
  "sumo squat advanced": {
    exerciseName: "Sumo Squat",
    description:
      "Wide stance, toes turned out roughly 45°. Sit straight down between the legs, chest tall, then drive through the heels to stand. The wide stance shifts more load onto the inner thighs and glutes.",
    keyPoints: [
      "Wide stance, toes turned out",
      "Sit straight down between the legs",
      "Chest tall throughout",
      "Drive through the heels",
    ],
    muscleGroups: ["Inner Thighs", "Glutes", "Quads"],
    difficulty: "Advanced",
  },
  "squat hold advanced": {
    exerciseName: "Squat Hold",
    description:
      "Bottom-of-squat isometric hold, thighs to parallel, held for a longer duration than the Beginner version. Weight in the heels, chest up, brace the core to keep the position from sagging. Card value = number of seconds.",
    keyPoints: [
      "Thighs to parallel, chest up",
      "Weight in the heels",
      "Brace the core against sagging",
      "Card value = number of seconds",
    ],
    muscleGroups: ["Quads", "Glutes", "Core"],
    difficulty: "Advanced",
  },
  "walking lunge advanced": {
    exerciseName: "Walking Lunge",
    description:
      "Step forward into a lunge, front thigh to parallel, then instead of stepping back, drive through the front leg into the next step forward with the opposite leg. Continue traveling forward, alternating legs.",
    keyPoints: [
      "Step forward into a lunge",
      "Front thigh to parallel",
      "Drive forward into the next step",
      "Keep the torso upright throughout",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "forward lunge advanced": {
    exerciseName: "Forward Lunge",
    description:
      "Step one leg forward into a deep lunge, front thigh to parallel and back knee just short of the floor, then push back off the front foot to the starting position. Complete all reps on one leg before switching.",
    keyPoints: [
      "Step forward, front thigh to parallel",
      "Back knee just short of the floor",
      "Push back to the start position",
      "All reps one leg, then switch",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "lunge with knee drive advanced": {
    exerciseName: "Lunge with Knee Drive",
    description:
      "Step back into a reverse lunge, then drive off the front foot and pull the rear knee up to hip height in one explosive motion, briefly balancing on one leg before stepping back into the next rep.",
    keyPoints: [
      "Reverse lunge, back knee low",
      "Drive off the front foot",
      "Rear knee to hip height",
      "Brief balance, then reset",
    ],
    muscleGroups: ["Quads", "Glutes", "Hip Flexors"],
    difficulty: "Advanced",
  },
  "lateral lunge advanced": {
    exerciseName: "Lateral Lunge",
    description:
      "Step wide to one side, sit the hips back over the bent knee while the other leg stays straight, then push back to standing. Keep both feet flat and the chest up throughout. Card value = reps each leg.",
    keyPoints: [
      "Step wide to one side",
      "Bent knee tracks over the foot",
      "Straight leg stays extended",
      "Card value = reps each leg",
    ],
    muscleGroups: ["Inner Thighs", "Glutes", "Quads"],
    difficulty: "Advanced",
  },
  "stepup advanced": {
    exerciseName: "Step-Up",
    description:
      "Place one foot fully on a raised platform, drive through that heel to stand fully upright on top, then step down under control. Avoid pushing off the trailing leg — the working leg does all the lifting.",
    keyPoints: [
      "Full foot on the platform",
      "Drive through the heel to stand",
      "Trailing leg stays passive",
      "Step down under control",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "lateral bound advanced": {
    exerciseName: "Lateral Bound",
    description:
      "Push off one leg and bound sideways as far as possible, landing softly on the opposite leg and holding the landing for a beat before bounding back. Builds single-leg power and frontal-plane control.",
    keyPoints: [
      "Push off one leg, bound sideways",
      "Land soft on the opposite leg",
      "Hold the landing briefly",
      "Bound back to complete the rep",
    ],
    muscleGroups: ["Glutes", "Quads", "Hip Abductors"],
    difficulty: "Advanced",
  },
  "calf raise advanced": {
    exerciseName: "Calf Raise",
    description:
      "Rise onto the balls of both feet as high as possible, pause at the top, then lower under control through a full range of motion. At Advanced tier, slow the tempo and squeeze the top position harder.",
    keyPoints: [
      "Rise onto the balls of both feet",
      "Pause and squeeze at the top",
      "Full range on the way down",
      "Controlled tempo throughout",
    ],
    muscleGroups: ["Calves"],
    difficulty: "Advanced",
  },
  "singleleg calf raise advanced": {
    exerciseName: "Single-Leg Calf Raise",
    description:
      "Balance on one foot, rise onto the ball of that foot as high as possible, pause, then lower under control. Use a wall or rail for light balance support only — the calf does the work, not your hands.",
    keyPoints: [
      "Balance on one foot",
      "Rise onto the ball of the foot",
      "Pause at the top",
      "Lower under control, full range",
    ],
    muscleGroups: ["Calves", "Balance"],
    difficulty: "Advanced",
  },
  "wall sit advanced": {
    exerciseName: "Wall Sit",
    description:
      "Back flat against a wall, slide down until thighs are parallel to the floor, knees at 90°. Hold the position, weight in the heels, for the timed duration. Card value = number of seconds.",
    keyPoints: [
      "Back flat against the wall",
      "Thighs parallel, knees at 90°",
      "Weight in the heels",
      "Card value = number of seconds",
    ],
    muscleGroups: ["Quads", "Glutes"],
    difficulty: "Advanced",
  },
  "bss isometric hold": {
    exerciseName: "BSS Isometric Hold",
    description:
      "Bulgarian Split Squat position — rear foot elevated behind you on a bench, front thigh lowered to parallel — held static at the bottom for the timed duration on each leg. Chest tall, front knee tracking over the toes.",
    keyPoints: [
      "Rear foot elevated on a bench",
      "Front thigh to parallel, hold",
      "Chest tall throughout",
      "Hold 20 seconds each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Advanced",
  },
  "elevated hip thrust advanced": {
    exerciseName: "Elevated Hip Thrust",
    description:
      "Upper back braced on a bench, feet flat on the floor. Drive the hips up to full extension until torso and thighs form a straight line, squeeze the glutes hard at the top, then lower under control.",
    keyPoints: [
      "Upper back on the bench",
      "Drive hips to full extension",
      "Squeeze glutes at the top",
      "Lower under control",
    ],
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "singleleg hip thrust": {
    exerciseName: "Single-Leg Hip Thrust",
    description:
      "Same hip thrust setup, but drive up on one leg while the other stays extended in the air. Keep the hips square — don't let the working side rotate open. Complete all reps on one leg before switching.",
    keyPoints: [
      "One leg drives, other stays extended",
      "Keep hips square",
      "Squeeze the glute at the top",
      "All reps one leg, then switch",
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core"],
    difficulty: "Advanced",
  },
  "hip thrust pulse": {
    exerciseName: "Hip Thrust Pulse",
    description:
      "From the top of a hip thrust, pulse in a small range near lockout — a few inches down and back up — without fully lowering between pulses. Keeps constant tension on the glutes.",
    keyPoints: [
      "Start from the top of the thrust",
      "Small pulses near lockout",
      "No full lowering between pulses",
      "20 pulses, constant tension",
    ],
    muscleGroups: ["Glutes"],
    difficulty: "Advanced",
  },
  "continuous jump lunge": {
    exerciseName: "Continuous Jump Lunge",
    description:
      "From a lunge position, jump and switch legs mid-air, landing in the opposite lunge, and keep going for the timed window without stopping. Max controlled reps in 30 seconds.",
    keyPoints: [
      "Jump and switch legs mid-air",
      "Land soft in the opposite lunge",
      "Keep going without stopping",
      "30 seconds, max reps",
    ],
    muscleGroups: ["Quads", "Glutes", "Cardio"],
    difficulty: "Advanced",
  },
  "donkey kick pulse": {
    exerciseName: "Donkey Kick Pulse",
    description:
      "On hands and knees, kick one leg back and up until the thigh is in line with the torso, then pulse in a small range at the top without lowering fully between pulses. Squeeze the glute on every pulse.",
    keyPoints: [
      "On hands and knees",
      "Kick leg back to hip height",
      "Small pulses at the top",
      "Squeeze the glute each pulse",
    ],
    muscleGroups: ["Glutes"],
    difficulty: "Advanced",
  },
  clamshell: {
    exerciseName: "Clamshell",
    description:
      "Lie on your side, knees bent and stacked, feet together. Keeping feet touching, open the top knee upward like a clamshell, then lower under control. Keep the hips stacked — don't roll back.",
    keyPoints: [
      "Lie on side, knees bent, feet together",
      "Open top knee upward",
      "Keep hips stacked, don't roll back",
      "Lower under control",
    ],
    muscleGroups: ["Glutes (Medius)", "Hip Abductors"],
    difficulty: "Advanced",
  },
  bss: {
    exerciseName: "BSS",
    description:
      "Bulgarian Split Squat — rear foot elevated behind you on a bench, front foot planted well ahead. Lower until the front thigh reaches parallel, then drive back up through the front heel. Complete all reps one leg before switching.",
    keyPoints: [
      "Rear foot elevated on a bench",
      "Front thigh lowers to parallel",
      "Drive up through the front heel",
      "All reps one leg, then switch",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Advanced",
  },
  "sumo jump squat pro": {
    exerciseName: "Sumo Jump Squat",
    description:
      "Wide stance, toes turned out. Squat down between the legs, then explode straight up into a jump, extending fully. Land soft back into the wide stance and sink immediately into the next rep.",
    keyPoints: [
      "Wide stance, toes turned out",
      "Squat between the legs",
      "Explode upward, full extension",
      "Land soft, reset immediately",
    ],
    muscleGroups: ["Inner Thighs", "Glutes", "Quads"],
    difficulty: "Pro",
  },
  "squat hold pro": {
    exerciseName: "Squat Hold",
    description:
      "Bottom-of-squat isometric hold at the longest duration in the progression — thighs to parallel, chest tall, weight in the heels. Brace hard; this is a pure time-under-tension test at Pro tier.",
    keyPoints: [
      "Thighs to parallel, chest tall",
      "Weight in the heels",
      "Brace the core hard",
      "Hold 45 seconds",
    ],
    muscleGroups: ["Quads", "Glutes", "Core"],
    difficulty: "Pro",
  },
  "bulgarian split squat": {
    exerciseName: "Bulgarian Split Squat",
    description:
      "Rear foot elevated on a bench behind you, front foot planted well ahead. Lower straight down until the front thigh reaches parallel, keeping the torso upright, then drive back up through the front heel. All reps on one leg before switching.",
    keyPoints: [
      "Rear foot elevated on a bench",
      "Front thigh lowers to parallel",
      "Torso upright throughout",
      "All reps one leg, then switch",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "curtsy lunge": {
    exerciseName: "Curtsy Lunge",
    description:
      "Step one leg diagonally behind and across the standing leg, lowering into a curtsy-style lunge until both knees bend to roughly 90°, then drive back to standing. Keep the chest up and hips square.",
    keyPoints: [
      "Step diagonally behind and across",
      "Both knees bend to ~90°",
      "Chest up, hips square",
      "Drive back to standing",
    ],
    muscleGroups: ["Glutes", "Quads", "Inner Thighs"],
    difficulty: "Pro",
  },
  "lunge with knee drive pro": {
    exerciseName: "Lunge with Knee Drive",
    description:
      "Reverse lunge into an explosive front-knee drive to hip height, balancing briefly on the standing leg before stepping back into the next rep. At Pro tier, drive with more power and control the balance longer.",
    keyPoints: [
      "Reverse lunge, back knee low",
      "Explosive knee drive to hip height",
      "Balance briefly at the top",
      "12 reps each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Hip Flexors"],
    difficulty: "Pro",
  },
  "broad jump pro": {
    exerciseName: "Broad Jump",
    description:
      "From a quarter-squat, swing the arms and jump forward for maximum horizontal distance, landing softly with bent knees. Stick the landing before resetting for the next jump.",
    keyPoints: [
      "Quarter-squat, swing the arms",
      "Jump for maximum distance",
      "Land soft, knees bent",
      "Stick the landing before resetting",
    ],
    muscleGroups: ["Quads", "Glutes", "Calves"],
    difficulty: "Pro",
  },
  "singleleg stepup": {
    exerciseName: "Single-Leg Step-Up",
    description:
      "All reps on one leg: full foot on a raised platform, drive through that heel to stand fully upright, then step down under control without letting the trailing leg help. Switch legs only after completing the set.",
    keyPoints: [
      "Full foot on the platform",
      "Drive through the heel to stand",
      "Trailing leg stays passive",
      "10 reps each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "singleleg calf raise pro": {
    exerciseName: "Single-Leg Calf Raise",
    description:
      "Balance on one foot, rise onto the ball of that foot to full extension, pause, then lower through a complete range of motion under control. At Pro tier, add a slower descent for more time under tension.",
    keyPoints: [
      "Balance on one foot",
      "Rise to full extension",
      "Pause at the top",
      "Slow, controlled descent",
    ],
    muscleGroups: ["Calves", "Balance"],
    difficulty: "Pro",
  },
  "singleleg wall sit": {
    exerciseName: "Single-Leg Wall Sit",
    description:
      "From a standard wall sit position, lift one foot off the floor and hold, keeping hips level and the standing thigh at parallel. Switch legs for the second half of the hold.",
    keyPoints: [
      "Standard wall sit position",
      "Lift one foot, hold",
      "Keep hips level",
      "Switch legs for the second half",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "walking lunge pro": {
    exerciseName: "Walking Lunge",
    description:
      "Step forward into a lunge, front thigh to parallel, and drive through the front leg straight into the next step forward with the opposite leg. At Pro tier, keep a brisk, continuous pace without breaking form.",
    keyPoints: [
      "Step forward, front thigh to parallel",
      "Drive forward into the next step",
      "Continuous pace, no pausing",
      "Torso upright throughout",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Pro",
  },
  "assisted pistol squat": {
    exerciseName: "Assisted Pistol Squat",
    description:
      "Hold a doorframe, rail, or TRX-style anchor for light support. Extend one leg forward, then lower on the standing leg as far as control allows, using the support only to balance — not to pull yourself up.",
    keyPoints: [
      "Light hand support only",
      "Extend one leg forward",
      "Lower as far as control allows",
      "5 reps each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "box pistol squat": {
    exerciseName: "Box Pistol Squat",
    description:
      "Stand in front of a box or bench. Extend one leg forward and lower until you tap the box with your hips, then drive back up to standing without using the box to bounce.",
    keyPoints: [
      "Box or bench behind you",
      "Extend one leg forward",
      "Tap the box, don't bounce",
      "5 reps each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "pistol squat isometric": {
    exerciseName: "Pistol Squat Isometric",
    description:
      "Lower into a single-leg squat, extended leg held forward, and pause at the lowest controllable position for the timed hold. Rebuild to standing between sides.",
    keyPoints: [
      "Single-leg squat position",
      "Extended leg held forward",
      "Hold at the bottom",
      "15 sec each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "30second max jump squats": {
    exerciseName: "30-second Max Jump Squats",
    description:
      "Squat to parallel and explode into a jump, landing soft and immediately sinking into the next rep — as many as possible in 30 seconds. Timer runs continuously; count every full rep.",
    keyPoints: [
      "Squat to parallel, explode up",
      "Land soft, reset immediately",
      "30 sec timer, max reps",
      "Count every full-range rep",
    ],
    muscleGroups: ["Quads", "Glutes", "Cardio"],
    difficulty: "Pro",
  },
  "assisted shrimp squat": {
    exerciseName: "Assisted Shrimp Squat",
    description:
      "Hold the rear foot with the same-side hand behind you, then lower on the standing leg toward the floor, letting the rear knee track down and back, using a light fingertip touch on a wall or rail for balance only.",
    keyPoints: [
      "Hold rear foot behind you",
      "Lower toward the floor",
      "Light fingertip balance support only",
      "5 reps each leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "singleleg good morning": {
    exerciseName: "Single-Leg Good Morning",
    description:
      "Balance on one leg, hinge forward at the hip while extending the free leg straight behind you, keeping the back flat, until the torso is roughly parallel to the floor. Drive the hips forward to return to standing.",
    keyPoints: [
      "Hinge at the hip, flat back",
      "Free leg extends straight behind",
      "Torso toward parallel",
      "8 reps each side",
    ],
    muscleGroups: ["Hamstrings", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "sidelying hip abduction": {
    exerciseName: "Side-Lying Hip Abduction",
    description:
      "Lie on your side, legs stacked and straight. Lift the top leg upward against gravity, keeping it in line with the torso — don't let it drift forward — then lower under control.",
    keyPoints: [
      "Lie on side, legs stacked straight",
      "Lift top leg against gravity",
      "Keep leg in line with torso",
      "10 reps each side",
    ],
    muscleGroups: ["Glutes (Medius)", "Hip Abductors"],
    difficulty: "Pro",
  },
  "standing hip abduction": {
    exerciseName: "Standing Hip Abduction",
    description:
      "Stand tall holding a wall or rail for light balance. Lift one leg straight out to the side against gravity, keeping the hips level and the torso upright, then lower under control.",
    keyPoints: [
      "Stand tall, light balance support",
      "Lift leg straight out to the side",
      "Keep hips level",
      "10 reps each side",
    ],
    muscleGroups: ["Glutes (Medius)", "Hip Abductors"],
    difficulty: "Pro",
  },
  "lateral bound hold": {
    exerciseName: "Lateral Bound Hold",
    description:
      "Bound sideways off one leg, landing on the opposite leg and holding that landing position completely still for 3 seconds before bounding back. The hold is the point — it forces real landing control, not just distance.",
    keyPoints: [
      "Bound sideways, land on one leg",
      "Hold the landing still",
      "3 seconds each landing",
      "5 reps each side",
    ],
    muscleGroups: ["Glutes", "Quads", "Balance"],
    difficulty: "Pro",
  },

  // Core
  plank: {
    exerciseName: "Plank",
    description:
      "Forearms on the floor, elbows under shoulders, body rigid from head to heels. Squeeze glutes and brace the core, breathing normally throughout. Card value = number of seconds.",
    keyPoints: [
      "Forearms on floor, elbows under shoulders",
      "Body rigid head to heels",
      "Squeeze glutes, brace core",
      "Card value = number of seconds",
    ],
    muscleGroups: ["Core", "Shoulders", "Glutes"],
    difficulty: "Beginner",
  },
  crunch: {
    exerciseName: "Crunch",
    description:
      "Lie on your back, knees bent, feet flat. Curl the shoulders a few inches off the floor, squeezing the abs at the top, then lower under control. Keep the lower back on the floor throughout.",
    keyPoints: [
      "Knees bent, feet flat",
      "Curl shoulders off the floor",
      "Squeeze abs at the top",
      "Lower back stays down",
    ],
    muscleGroups: ["Upper Abs", "Core"],
    difficulty: "Beginner",
  },
  situp: {
    exerciseName: "Sit-up",
    description:
      "Lie on your back, knees bent, feet anchored or flat. Curl the whole torso up until you're sitting upright, then lower under control back to the floor. Full range of motion each rep.",
    keyPoints: [
      "Knees bent, feet anchored or flat",
      "Curl torso all the way upright",
      "Lower under control",
      "Full range of motion",
    ],
    muscleGroups: ["Abs", "Hip Flexors", "Core"],
    difficulty: "Beginner",
  },
  "mountain climber beginner": {
    exerciseName: "Mountain Climber",
    description:
      "High plank on hands. Drive one knee toward the chest, return, then immediately drive the other — like running in place in a plank. Keep the hips level and shoulders over the wrists.",
    keyPoints: [
      "High plank on hands",
      "Drive knee to chest, alternate",
      "Hips level throughout",
      "Shoulders over wrists",
    ],
    muscleGroups: ["Core", "Hip Flexors", "Shoulders"],
    difficulty: "Beginner",
  },
  "bicycle crunch beginner": {
    exerciseName: "Bicycle Crunch",
    description:
      "Lie on your back, hands behind the head. Bring one elbow toward the opposite knee while extending the other leg, then switch sides in a slow pedaling motion. Controlled tempo — no yanking the neck.",
    keyPoints: [
      "Elbow to opposite knee",
      "Extend the other leg",
      "Slow pedaling motion",
      "20 reps each side",
    ],
    muscleGroups: ["Obliques", "Abs", "Core"],
    difficulty: "Beginner",
  },
  "plank with shoulder tap": {
    exerciseName: "Plank with Shoulder Tap",
    description:
      "High plank on hands, feet set wide for stability. Lift one hand to tap the opposite shoulder, replace it, then repeat on the other side. Brace hard to keep the hips from rocking.",
    keyPoints: [
      "High plank, feet set wide",
      "Tap opposite shoulder",
      "Brace against hip rotation",
      "Alternate sides each rep",
    ],
    muscleGroups: ["Core", "Shoulders", "Obliques"],
    difficulty: "Beginner",
  },
  "basic crunch": {
    exerciseName: "Basic Crunch",
    description:
      "Lie on your back, knees bent, feet flat, hands lightly supporting the head. Curl the shoulders just off the floor, squeeze the abs, then lower under control. Card value = number of reps.",
    keyPoints: [
      "Knees bent, feet flat",
      "Curl shoulders off the floor",
      "Squeeze at the top",
      "Card value = number of reps",
    ],
    muscleGroups: ["Upper Abs", "Core"],
    difficulty: "Beginner",
  },
  "reverse crunch": {
    exerciseName: "Reverse Crunch",
    description:
      "Lie on your back, knees bent toward the chest. Pull the knees in further and lift the hips slightly off the floor, then lower under control without swinging the legs.",
    keyPoints: [
      "Knees bent toward chest",
      "Lift hips off the floor",
      "Lower under control",
      "No swinging or momentum",
    ],
    muscleGroups: ["Lower Abs", "Core"],
    difficulty: "Beginner",
  },
  "slow crunch": {
    exerciseName: "Slow Crunch",
    description:
      "Standard crunch, slowed to a 3 second rise and 3 second lower each rep. The slow tempo removes momentum and makes the abs do all the lifting instead of relying on a quick bounce.",
    keyPoints: [
      "3 sec up, 3 sec down",
      "Curl shoulders off the floor",
      "No bounce or momentum",
      "5 reps, full control",
    ],
    muscleGroups: ["Upper Abs", "Core"],
    difficulty: "Beginner",
  },
  "core finisher": {
    exerciseName: "Core Finisher",
    description:
      "A three-exercise circuit done back to back with no rest: a long Plank hold, then straight into Bicycle Crunch, then Dead Bug. Move from the last rep of one exercise directly into the first rep of the next.",
    keyPoints: [
      "30× Plank (seconds)",
      "10× Bicycle Crunch each side",
      "10× Dead Bug each side",
      "No rest between exercises — chain them together",
    ],
    muscleGroups: ["Full Core"],
    difficulty: "Beginner",
  },
  "bicycle crunch advanced": {
    exerciseName: "Bicycle Crunch",
    description:
      "Elbow to opposite knee while extending the other leg, alternating sides in a controlled pedaling motion. At Advanced tier, keep the tempo brisk while holding form — no yanking the neck, no rushing the twist.",
    keyPoints: [
      "Elbow to opposite knee",
      "Extend the other leg fully",
      "Controlled pedaling motion",
      "16 reps each side",
    ],
    muscleGroups: ["Obliques", "Abs", "Core"],
    difficulty: "Advanced",
  },
  "vup advanced": {
    exerciseName: "V-up",
    description:
      "Lie flat, arms extended overhead. Simultaneously lift the torso and straight legs, reaching hands toward feet at the top to form a V shape, then lower under control back to the floor.",
    keyPoints: [
      "Lie flat, arms overhead",
      "Lift torso and legs together",
      "Touch hands to feet at the top",
      "Lower under control",
    ],
    muscleGroups: ["Abs", "Hip Flexors", "Core"],
    difficulty: "Advanced",
  },
  "hollow body rock": {
    exerciseName: "Hollow Body Rock",
    description:
      "Hold a hollow body position — lower back pressed into the floor, arms and legs extended off the ground — and rock gently forward and back, keeping the shape locked the entire time.",
    keyPoints: [
      "Lower back pressed to floor",
      "Arms and legs extended",
      "Rock forward and back",
      "Keep the hollow shape locked",
    ],
    muscleGroups: ["Abs", "Core", "Hip Flexors"],
    difficulty: "Advanced",
  },
  "crossbody crunch": {
    exerciseName: "Cross-Body Crunch",
    description:
      "Lie on your back, one ankle crossed over the opposite knee. Curl the opposite elbow toward that crossed knee, twisting through the torso, then lower under control before switching sides.",
    keyPoints: [
      "Ankle crossed over opposite knee",
      "Elbow to opposite knee",
      "Twist through the torso",
      "12 reps each side",
    ],
    muscleGroups: ["Obliques", "Abs"],
    difficulty: "Advanced",
  },
  "bicycle with pause": {
    exerciseName: "Bicycle with Pause",
    description:
      "Standard bicycle crunch, but hold the elbow-to-knee position for a 2 second squeeze at the top of every rep before switching sides. The pause removes momentum and increases oblique time under tension.",
    keyPoints: [
      "Elbow to opposite knee",
      "Hold 2 sec squeeze at the top",
      "Extend the other leg fully",
      "14 reps each side",
    ],
    muscleGroups: ["Obliques", "Abs", "Core"],
    difficulty: "Advanced",
  },
  "spiderman plank": {
    exerciseName: "Spider-Man Plank",
    description:
      "High plank on hands. Bring one knee out and up toward the same-side elbow, then return and repeat on the other side. Keep the hips low and square — don't let them pike up as the knee comes through.",
    keyPoints: [
      "High plank on hands",
      "Knee to same-side elbow",
      "Hips stay low and square",
      "10 reps each side",
    ],
    muscleGroups: ["Obliques", "Core", "Hip Flexors"],
    difficulty: "Advanced",
  },
  "plank to downward dog": {
    exerciseName: "Plank to Downward Dog",
    description:
      "From a high plank, pike the hips up and back into a downward dog position, then return to plank. Keep the core braced through the transition rather than just folding at the hips.",
    keyPoints: [
      "Start in high plank",
      "Pike hips up and back",
      "Return to plank to complete the rep",
      "Brace the core through the transition",
    ],
    muscleGroups: ["Core", "Shoulders", "Hamstrings"],
    difficulty: "Advanced",
  },
  "hanging oblique raise": {
    exerciseName: "Hanging Oblique Raise",
    description:
      "Hang from a bar with a full grip. Raise both knees up and to one side, driving with the obliques rather than swinging, then lower under control before repeating to the other side.",
    keyPoints: [
      "Full hang from the bar",
      "Knees rise up and to one side",
      "No swinging — obliques drive it",
      "8 reps each side",
    ],
    muscleGroups: ["Obliques", "Core", "Grip"],
    difficulty: "Advanced",
  },
  "combo finisher advanced": {
    exerciseName: "Combo Finisher",
    description:
      "A back-to-back core circuit at Advanced tier — move directly from one exercise into the next with no rest, keeping full range of motion on every rep even as fatigue builds.",
    keyPoints: [
      "No rest between exercises",
      "Chain movements together",
      "Full range on every rep",
      "10 reps to finish",
    ],
    muscleGroups: ["Full Core"],
    difficulty: "Advanced",
  },
  "plank to pushup": {
    exerciseName: "Plank to Push-up",
    description:
      "Start in a forearm plank, then push up onto your hands one arm at a time into a high plank / push-up position, then lower back down to forearms one arm at a time. Keep the hips still throughout — no rocking side to side.",
    keyPoints: [
      "Forearm plank to hand plank",
      "One arm at a time, both directions",
      "Hips stay still, no rocking",
      "10 reps",
    ],
    muscleGroups: ["Core", "Shoulders", "Triceps"],
    difficulty: "Pro",
  },
  "hollow hold": {
    exerciseName: "Hollow Hold",
    description:
      "Lie on your back, press the lower back into the floor, and lift shoulders and legs off the ground simultaneously, arms extended overhead. Hold the shape rigid for the timed duration.",
    keyPoints: [
      "Lower back pressed to floor",
      "Shoulders and legs lifted together",
      "Arms extended overhead",
      "Hold 20 seconds",
    ],
    muscleGroups: ["Abs", "Core", "Hip Flexors"],
    difficulty: "Pro",
  },
  "vup pro": {
    exerciseName: "V-up",
    description:
      "Lie flat, arms extended overhead, then lift torso and straight legs simultaneously to form a V, touching hands toward feet at the top. At Pro tier, keep strict form at a higher rep count — no bent knees to cheat the range.",
    keyPoints: [
      "Lie flat, arms overhead",
      "Lift torso and legs together",
      "Touch hands toward feet",
      "15 reps, strict form",
    ],
    muscleGroups: ["Abs", "Hip Flexors", "Core"],
    difficulty: "Pro",
  },
  "russian twist pro": {
    exerciseName: "Russian Twist",
    description:
      "Sit with knees bent, torso leaned back slightly and feet off the floor for added difficulty. Rotate the torso to touch the floor beside each hip, alternating sides in a controlled twisting motion.",
    keyPoints: [
      "Lean back, feet off the floor",
      "Rotate torso side to side",
      "Touch the floor beside each hip",
      "25 reps each side",
    ],
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Pro",
  },
  "mountain climber pro": {
    exerciseName: "Mountain Climber",
    description:
      "High plank on hands, driving knees toward the chest in a fast alternating rhythm — like sprinting in place in a plank. At Pro tier, push the pace while keeping hips level and shoulders stacked over the wrists.",
    keyPoints: [
      "High plank on hands",
      "Fast alternating knee drive",
      "Hips level, shoulders over wrists",
      "40 reps",
    ],
    muscleGroups: ["Core", "Hip Flexors", "Cardio"],
    difficulty: "Pro",
  },
  "tuck dragon flag": {
    exerciseName: "Tuck Dragon Flag",
    description:
      "Lie on a bench, gripping it behind your head for anchor. Lift the hips and tucked knees off the bench, keeping the upper back as the only contact point, briefly holding at the top before lowering under control.",
    keyPoints: [
      "Grip bench behind the head",
      "Lift hips with knees tucked",
      "Upper back is the only contact",
      "Brief hold at the top",
    ],
    muscleGroups: ["Abs", "Core", "Lats"],
    difficulty: "Pro",
  },
  "windshield wipers tuck": {
    exerciseName: "Windshield Wipers Tuck",
    description:
      "Lie on your back, arms out for a base, knees tucked to the chest. Rotate the tucked knees side to side toward the floor, keeping the shoulders pinned flat throughout.",
    keyPoints: [
      "Arms out for a base",
      "Knees tucked to chest",
      "Rotate side to side",
      "Shoulders stay pinned flat",
    ],
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Pro",
  },
  "full toes to bar": {
    exerciseName: "Full Toes to Bar",
    description:
      "Hang from a bar with a full grip, legs straight. Raise the straight legs all the way up until the toes touch the bar, then lower under control without swinging.",
    keyPoints: [
      "Full hang, legs straight",
      "Raise legs to touch the bar",
      "No swinging — controlled raise",
      "Lower under control",
    ],
    muscleGroups: ["Abs", "Lats", "Grip"],
    difficulty: "Pro",
  },
  "hanging lhold": {
    exerciseName: "Hanging L-hold",
    description:
      "Hang from a bar with a full grip and raise both legs straight out in front until they're at 90° to the torso, forming an L shape. Hold the position rigid for the timed duration.",
    keyPoints: [
      "Full hang from the bar",
      "Legs extended to 90°",
      "Form a rigid L shape",
      "Hold 20 seconds",
    ],
    muscleGroups: ["Abs", "Hip Flexors", "Grip"],
    difficulty: "Pro",
  },
  "straddle planche attempt": {
    exerciseName: "Straddle Planche Attempt",
    description:
      "From a straddle-leg support position on the floor or blocks, lean forward and attempt to lift the feet off the ground, holding a brief horizontal hold before returning down. Build attempt by attempt.",
    keyPoints: [
      "Straddle-leg support position",
      "Lean forward, lift feet",
      "Brief horizontal hold attempts",
      "Reset between attempts",
    ],
    muscleGroups: ["Shoulders", "Core", "Chest"],
    difficulty: "Pro",
  },
  "hollow body planche rock": {
    exerciseName: "Hollow Body Planche Rock",
    description:
      "From a hollow body support position on the floor or blocks, rock the weight forward over the hands and back, keeping the hollow shape locked and the core rigid throughout each rock.",
    keyPoints: [
      "Hollow body support position",
      "Rock weight forward and back",
      "Keep the hollow shape locked",
      "10 controlled rocks",
    ],
    muscleGroups: ["Shoulders", "Core", "Chest"],
    difficulty: "Pro",
  },
  "human flag attempt": {
    exerciseName: "Human Flag Attempt",
    description:
      "Grip a vertical pole with both hands, one above the other, and attempt to lift the body sideways until horizontal, bracing the entire core and shoulders to fight rotation. Hold as long as possible.",
    keyPoints: [
      "Grip pole, hands stacked",
      "Lift the body sideways",
      "Brace against rotation",
      "Max effort — hold as long as possible",
    ],
    muscleGroups: ["Obliques", "Shoulders", "Lats"],
    difficulty: "Pro",
  },
  "combo finisher pro": {
    exerciseName: "Combo Finisher",
    description:
      "A back-to-back Pro-tier core circuit — move directly from one advanced core movement into the next with no rest, holding full range of motion under fatigue.",
    keyPoints: [
      "No rest between exercises",
      "Chain movements together",
      "Full range under fatigue",
      "3 reps each side to finish",
    ],
    muscleGroups: ["Full Core"],
    difficulty: "Pro",
  },
  "dragon flag": {
    exerciseName: "Dragon Flag",
    description:
      "Lie on a bench, gripping it behind your head. Lift the entire body — hips and straight legs together — off the bench so only the upper back touches, then lower under control, keeping the body rigid from shoulders to feet.",
    keyPoints: [
      "Grip bench behind the head",
      "Lift body straight, legs extended",
      "Only upper back touches the bench",
      "Lower under control",
    ],
    muscleGroups: ["Abs", "Core", "Lats"],
    difficulty: "Pro",
  },

  // Full Body
  "stepup hold": {
    exerciseName: "Step-up Hold",
    description:
      "Step fully onto a raised platform and hold at the top, standing tall on one leg with the trailing foot lifted slightly behind you. Switch legs for the second half of the hold.",
    keyPoints: [
      "Full foot on the platform",
      "Hold standing tall on top",
      "Trailing foot lifted behind",
      "10 sec per leg",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Beginner",
  },
  "full body combo beginner": {
    exerciseName: "Full Body Combo",
    description:
      "A beginner-friendly full-body circuit done back to back with no rest — move straight from the last rep of one exercise into the first rep of the next to keep the heart rate up throughout.",
    keyPoints: [
      "No rest between exercises",
      "Chain movements together",
      "Keep the heart rate up",
      "5 reps to finish",
    ],
    muscleGroups: ["Full Body"],
    difficulty: "Beginner",
  },
  "burpee beginner": {
    exerciseName: "Burpee",
    description:
      "Stand, squat down and place hands on the floor, step one foot back then the other into a plank, then step feet back forward and stand up. Stepping instead of jumping keeps this beginner-friendly.",
    keyPoints: [
      "Squat, hands to floor",
      "Step back to plank one foot at a time",
      "Step forward, then stand",
      "No jump required",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Beginner",
  },
  "burpee advanced": {
    exerciseName: "Burpee",
    description:
      "Squat down, jump both feet back to a plank, perform a push-up, jump feet forward, then jump up with arms overhead. Land soft and move straight into the next rep at Advanced pace.",
    keyPoints: [
      "Jump to plank, add a push-up",
      "Jump feet forward",
      "Jump up, arms overhead",
      "Land soft, keep the pace",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Advanced",
  },
  "burpee broad jump advanced": {
    exerciseName: "Burpee Broad Jump",
    description:
      "Perform a full burpee, but instead of a vertical jump at the top, explode forward into a broad jump for distance. Land soft, reset, and burpee again from the new spot.",
    keyPoints: [
      "Full burpee with push-up",
      "Explode forward, not upward",
      "Land soft after each jump",
      "6 reps",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Advanced",
  },
  "alternating lunge advanced": {
    exerciseName: "Alternating Lunge",
    description:
      "Step one leg forward into a lunge, front thigh to parallel, push back to standing, then repeat immediately on the other side. At Advanced pace, keep the tempo brisk without losing balance or form.",
    keyPoints: [
      "Step forward, front thigh to parallel",
      "Push back to standing",
      "Alternate legs immediately",
      "Brisk pace, controlled form",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "normal squat advanced": {
    exerciseName: "Normal Squat",
    description:
      "Feet shoulder-width, sit the hips back and down to parallel, chest up, then drive through the heels to stand. Standard bodyweight squat form used as a conditioning piece within the Full Body deck.",
    keyPoints: [
      "Feet shoulder-width",
      "Hips back and down to parallel",
      "Chest up throughout",
      "Drive through the heels",
    ],
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "Advanced",
  },
  "sumo jump squat advanced": {
    exerciseName: "Sumo Jump Squat",
    description:
      "Wide stance, toes turned out. Squat down between the legs and explode straight up into a jump. Land soft in the same wide stance and sink immediately into the next rep.",
    keyPoints: [
      "Wide stance, toes turned out",
      "Explode upward, full extension",
      "Land soft, wide stance",
      "10 reps",
    ],
    muscleGroups: ["Inner Thighs", "Glutes", "Quads"],
    difficulty: "Advanced",
  },
  "crossbody mountain climber advanced": {
    exerciseName: "Cross-body Mountain Climber",
    description:
      "High plank on hands. Drive one knee across the body toward the opposite elbow, return, then repeat with the other leg. The cross-body angle adds an oblique component to the standard mountain climber.",
    keyPoints: [
      "High plank on hands",
      "Knee drives to opposite elbow",
      "Alternate sides",
      "12 reps",
    ],
    muscleGroups: ["Core", "Obliques", "Hip Flexors"],
    difficulty: "Advanced",
  },
  "full body combo advanced": {
    exerciseName: "Full Body Combo",
    description:
      "An Advanced-tier full-body circuit — chain the listed movements back to back with no rest between them, holding full range of motion as fatigue builds through the round.",
    keyPoints: [
      "No rest between exercises",
      "Chain movements together",
      "Full range under fatigue",
      "5 reps to finish",
    ],
    muscleGroups: ["Full Body"],
    difficulty: "Advanced",
  },
  "burpee pro": {
    exerciseName: "Burpee",
    description:
      "Full burpee with push-up and overhead jump, performed at Pro tier pace with strict range of motion on every rep — full chest-to-floor push-up, full hip extension on the jump.",
    keyPoints: [
      "Jump to plank, full push-up",
      "Jump feet forward",
      "Full-extension jump, arms overhead",
      "Strict range every rep",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Pro",
  },
  "burpee broad jump pro": {
    exerciseName: "Burpee Broad Jump",
    description:
      "Full burpee with push-up, exploding forward into a maximal broad jump instead of a vertical jump. Land soft, reset your stance, and burpee again from the new spot without pausing to recover.",
    keyPoints: [
      "Full burpee with push-up",
      "Explode forward for distance",
      "Land soft, minimal reset",
      "Continuous pace",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Pro",
  },
  "man maker": {
    exerciseName: "Man Maker",
    description:
      "From a plank with hands on the floor (or light dumbbells), perform a push-up, then row each arm, jump the feet up to a squat, and finish with an overhead jump. One continuous rep, five in a row.",
    keyPoints: [
      "Push-up, then row each arm",
      "Jump feet up to a squat",
      "Finish with an overhead jump",
      "5 reps, continuous flow",
    ],
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Pro",
  },
  "crossbody mountain climber pro": {
    exerciseName: "Cross-body Mountain Climber",
    description:
      "High plank on hands, driving each knee across the body to the opposite elbow at a brisk, continuous pace. At Pro tier, hold hip height and plank rigidity even as the pace increases.",
    keyPoints: [
      "High plank on hands",
      "Knee drives to opposite elbow",
      "Hips stay level at speed",
      "15 reps",
    ],
    muscleGroups: ["Core", "Obliques", "Cardio"],
    difficulty: "Pro",
  },
  "explosive pullup": {
    exerciseName: "Explosive Pull-up",
    description:
      "Full dead hang, then pull explosively so the chest drives toward the bar rather than just the chin clearing it. Lower back to a complete dead hang under control before the next rep.",
    keyPoints: [
      "Full dead hang start",
      "Pull explosively, chest to bar",
      "Lower to a full hang",
      "Reset fully between reps",
    ],
    muscleGroups: ["Lats", "Biceps", "Upper Back"],
    difficulty: "Pro",
  },
  "muscleup attempt": {
    exerciseName: "Muscle-Up Attempt",
    description:
      "Pull explosively from a dead hang and drive the chest up and over the bar, transitioning the hands from a pull to a dip lockout in one motion. Focus on the explosive transition — celebrate every rep you land.",
    keyPoints: [
      "Explosive pull from a dead hang",
      "Chest drives up and over the bar",
      "Transition hands through the top",
      "Lockout to finish",
    ],
    muscleGroups: ["Lats", "Chest", "Triceps"],
    difficulty: "Pro",
  },
  "pullup to dip complex": {
    exerciseName: "Pull-up to Dip Complex",
    description:
      "Three strict pull-ups immediately followed by three parallel bar dips, with no rest between the two movements — one round. Complete the target number of rounds back to back.",
    keyPoints: [
      "3 pull-ups, no rest",
      "Straight into 3 dips",
      "No rest between movements",
      "4 rounds total",
    ],
    muscleGroups: ["Lats", "Triceps", "Chest"],
    difficulty: "Pro",
  },
  "clapping pushup": {
    exerciseName: "Clapping Push-up",
    description:
      "From a push-up position, lower with control, then push up explosively so both hands leave the floor — clap once in the air — and land softly back into the next rep.",
    keyPoints: [
      "Lower with control",
      "Push up explosively",
      "Clap in the air",
      "Land soft, absorb into the next rep",
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Pro",
  },
  "plyometric pushup": {
    exerciseName: "Plyometric Push-up",
    description:
      "Lower into a standard push-up, then push up explosively enough that both hands leave the floor. Land soft with elbows ready to absorb, and flow directly into the next rep.",
    keyPoints: [
      "Lower with control",
      "Explosive push, hands leave the floor",
      "Land soft, elbows ready",
      "Flow into the next rep",
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Pro",
  },
  "archer plyometric pushup": {
    exerciseName: "Archer Plyometric Push-up",
    description:
      "Start in a wide-hand push-up. Lower to one side, then push up explosively enough to transfer your weight laterally to the opposite hand, landing in the mirrored archer position. Alternate sides.",
    keyPoints: [
      "Wide-hand push-up start",
      "Lower to one side",
      "Explosive lateral transfer",
      "Land in the mirrored position",
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Pro",
  },
  "max clapping pushups": {
    exerciseName: "Max Clapping Push-ups",
    description:
      "Standard clapping push-ups performed for maximum reps within a fixed 30 second window. Push explosively enough to clap every rep, landing soft and going straight into the next.",
    keyPoints: [
      "Explosive push, clap each rep",
      "Land soft, reset fast",
      "30 sec window",
      "Count every full rep",
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Pro",
  },
  "pistol squat to jump": {
    exerciseName: "Pistol Squat to Jump",
    description:
      "Lower into a single-leg pistol squat, extended leg held forward, then drive explosively out of the bottom into a small jump on the same leg. Land soft and reset for the next rep before switching legs.",
    keyPoints: [
      "Single-leg squat to the bottom",
      "Explosive jump out of the bottom",
      "Land soft on the same leg",
      "Complete reps, then switch legs",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
  "pistol burpee": {
    exerciseName: "Pistol Burpee",
    description:
      "A standard burpee where the squat portion is replaced with a single-leg pistol squat. Drop to a plank, push-up, jump feet forward into the pistol position, stand on one leg, then jump up to finish.",
    keyPoints: [
      "Burpee with a pistol-squat stand",
      "Single leg through the squat portion",
      "Full push-up at the bottom",
      "Jump to finish",
    ],
    muscleGroups: ["Full Body", "Quads", "Balance"],
    difficulty: "Pro",
  },
  "pistol complex": {
    exerciseName: "Pistol Complex",
    description:
      "Three pistol squats immediately followed by three jump squats on the same side, with no rest between the two movements, then repeat on the other side. A single-leg strength-to-power combo.",
    keyPoints: [
      "3 pistol squats, no rest",
      "Straight into 3 jump squats",
      "No rest between movements",
      "Repeat each side",
    ],
    muscleGroups: ["Quads", "Glutes", "Balance"],
    difficulty: "Pro",
  },
};

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function getLocalExerciseInfo(
  name: string,
  difficulty?: string,
): LocalExerciseInfo | null {
  if (!name) return null;
  const key = normalizeKey(name);
  // When a difficulty is provided, prefer the difficulty-suffixed entry first
  // so colliding display names (e.g. "Normal Push-up", "Joker Combo") resolve
  // to the correct variant for the active deck.
  if (difficulty) {
    const suffixedKey = `${key} ${difficulty.toLowerCase()}`;
    if (LOCAL_EXERCISE_INFO[suffixedKey])
      return LOCAL_EXERCISE_INFO[suffixedKey];
  }
  // Direct match
  if (LOCAL_EXERCISE_INFO[key]) return LOCAL_EXERCISE_INFO[key];
  // Substring match against stored keys
  for (const storedKey of Object.keys(LOCAL_EXERCISE_INFO)) {
    if (key.includes(storedKey)) return LOCAL_EXERCISE_INFO[storedKey];
  }
  return null;
}

export function ExerciseInfoPanel({
  open,
  exercise,
  loading,
  exerciseName,
  difficulty,
  onClose,
}: ExerciseInfoPanelProps) {
  // Prefer the backend Exercise record; fall back to the local form-cue table
  // so the info icon always shows correct text for every Upper Body Beginner
  // card even when the backend has no record.
  const localFallback = exercise
    ? null
    : getLocalExerciseInfo(exerciseName ?? "", difficulty);
  const effective: Exercise | null =
    exercise ?? (localFallback ? { ...localFallback, videoUrl: "" } : null);

  const displayName = effective?.exerciseName ?? exerciseName ?? "Exercise";

  const difficultyColor =
    effective?.difficulty === "Beginner"
      ? "oklch(0.75 0.18 145)"
      : effective?.difficulty === "Intermediate"
        ? "oklch(0.75 0.20 70)"
        : effective?.difficulty === "Advanced"
          ? "oklch(0.68 0.24 25)"
          : "oklch(0.68 0.25 180)";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile overlay backdrop */}
          <motion.div
            key="info-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] md:hidden"
            style={{ background: "oklch(0 0 0 / 0.75)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="info-panel"
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-[61] flex flex-col overflow-hidden",
              // Mobile: full width bottom sheet / right panel
              "inset-y-0 right-0 w-full max-w-[430px]",
              // Desktop: side panel
              "md:w-[340px] md:max-w-[340px] md:right-0 md:inset-y-0",
            )}
            style={{
              background: "oklch(0.11 0.015 260)",
              borderLeft: "1px solid oklch(0.26 0.01 260 / 0.6)",
              boxShadow: "-16px 0 60px oklch(0 0 0 / 0.55)",
            }}
            data-ocid="workout-session.exercise_info_panel"
          >
            {/* Header */}
            <div
              className="flex items-start justify-between px-5 pt-12 pb-4"
              style={{
                borderBottom: "1px solid oklch(0.22 0.01 260 / 0.5)",
              }}
            >
              <div className="flex-1 min-w-0 pr-3">
                <p
                  className="text-[10px] font-display font-bold uppercase tracking-[0.22em] mb-1"
                  style={{ color: "oklch(0.68 0.25 180)" }}
                >
                  Exercise Info
                </p>
                <h2 className="font-display font-black text-xl text-foreground uppercase tracking-wide leading-tight">
                  {displayName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors duration-200"
                style={{
                  background: "oklch(0.18 0.01 260)",
                  border: "1px solid oklch(0.28 0.01 260 / 0.5)",
                }}
                aria-label="Close exercise info"
                data-ocid="workout-session.exercise_info_close_button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              {loading && (
                <div
                  className="flex flex-col items-center justify-center gap-3 py-12"
                  data-ocid="workout-session.exercise_info_loading_state"
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{
                      borderColor: "oklch(0.68 0.25 180 / 0.8)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <p className="text-xs text-white/50 font-body uppercase tracking-widest">
                    Loading...
                  </p>
                </div>
              )}

              {!loading && !effective && (
                <div
                  className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                  data-ocid="workout-session.exercise_info_empty_state"
                >
                  <p className="text-sm text-white/50 font-body">
                    No description available for this exercise yet.
                  </p>
                </div>
              )}

              {!loading && effective && (
                <>
                  {/* Muscle focus + difficulty */}
                  <div>
                    {effective.muscleGroups.length > 0 && (
                      <p
                        className="text-[10px] font-display font-bold uppercase tracking-[0.18em] mb-2"
                        style={{ color: "oklch(0.68 0.25 180)" }}
                      >
                        Muscle Focus
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {effective.muscleGroups.map((muscle) => (
                        <span
                          key={muscle}
                          className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                          style={{
                            background: "oklch(0.68 0.25 180 / 0.12)",
                            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
                            color: "oklch(0.68 0.25 180)",
                          }}
                        >
                          {muscle}
                        </span>
                      ))}
                      {effective.difficulty && (
                        <span
                          className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                          style={{
                            background: `${difficultyColor}18`,
                            border: `1px solid ${difficultyColor}50`,
                            color: difficultyColor,
                          }}
                        >
                          {effective.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "oklch(0.16 0.01 260)",
                      border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                    }}
                  >
                    <p
                      className="text-[10px] font-display font-bold uppercase tracking-[0.18em] mb-2"
                      style={{ color: "oklch(0.68 0.25 180)" }}
                    >
                      How to perform
                    </p>
                    <p className="text-sm font-body text-white/80 leading-relaxed">
                      {effective.description}
                    </p>
                  </div>

                  {/* Key points */}
                  {effective.keyPoints.length > 0 && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "oklch(0.16 0.01 260)",
                        border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                      }}
                    >
                      <p
                        className="text-[10px] font-display font-bold uppercase tracking-[0.18em] mb-3"
                        style={{ color: "oklch(0.68 0.25 180)" }}
                      >
                        Key Points
                      </p>
                      <ul className="flex flex-col gap-2.5">
                        {effective.keyPoints.map((point, i) => (
                          <li key={point} className="flex items-start gap-2.5">
                            <span
                              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display font-black mt-0.5"
                              style={{
                                background: "oklch(0.68 0.25 180 / 0.15)",
                                color: "oklch(0.68 0.25 180)",
                              }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-sm font-body text-white/80 leading-snug">
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Video placeholder */}
                  <div
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: "oklch(0.16 0.01 260)",
                      border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "oklch(0.20 0.015 260)",
                        border: "1px solid oklch(0.30 0.01 260 / 0.5)",
                      }}
                    >
                      <Video className="w-4 h-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-bold text-white/50 uppercase tracking-wide">
                        Video Tutorial
                      </p>
                      <p className="text-xs font-body text-white/35 mt-0.5">
                        Coming soon
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
