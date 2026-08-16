// Morning notification content library. Every line is original copy (not a
// sourced quote), written short enough to read on a lock screen in 2-3
// seconds. Push title is always fixed; the body rotates daily through the
// three categories below (Quote -> Aspiration -> Reading -> repeat) so users
// see variety across a week instead of three of the same kind in a row.

export const DAILY_NOTIFICATION_TITLE = "Start your day.";

export const MOTIVATIONAL_QUOTES: string[] = [
  "Strength isn't built in a day. It's built in the days you almost skipped.",
  "The body you'll have in ten years is being written today.",
  "Discipline is just self-respect in motion.",
  "You don't rise to the occasion. You fall to your habits.",
  "Small effort, repeated without excuse, becomes an unstoppable force.",
  "Your future self is watching. Give them something to thank you for.",
  "Movement is the tax you pay for a long, capable life.",
  "The days you don't feel like it are the days that count the most.",
  "Consistency is a quiet kind of courage.",
  "You are not too old. You are only untrained.",
  "Every rep is a vote for the person you want to become.",
  "Rest is earned, not defaulted to.",
  "The body remembers what the mind forgets to appreciate.",
  "Progress hides inside boredom. Stay long enough to find it.",
  "Comfort is the enemy of a long, strong life.",
  "You don't need motivation. You need a decision you keep making.",
  "A strong body carries a clear mind further.",
  "The best time to start was years ago. The next best time is this morning.",
  "Nobody regrets the workout they finished.",
  "Longevity is built by the boring things done daily.",
  "Your habits today are a letter to your 80-year-old self.",
  "Discomfort now is freedom later.",
  "The strongest people you know are just the most consistent.",
  "Energy compounds like interest — start depositing early.",
  "Show up tired. That's when the real training happens.",
  "A body in motion tends to stay capable.",
  "You're not chasing perfect. You're chasing another day of trying.",
  "Every year you train is a year you buy back later.",
  "Strength is a decision made repeatedly, not a trait you're born with.",
  "The hardest part is never the workout. It's opening the app.",
  "Vitality isn't found. It's practiced.",
  "Your spine remembers every day you chose to move.",
  "The goal isn't to be young forever. It's to stay capable forever.",
  "One more rep today is one more year later.",
  "You are the average of the mornings you show up for.",
];

export const ASPIRATIONS: string[] = [
  "I am building a body that will still carry me at 90.",
  "Today I choose the version of me that shows up.",
  "I am someone who trains, even on the hard days.",
  "My future is shaped by what I do in the next ten minutes.",
  "I am not in a rush. I am in it for decades.",
  "I choose strength over comfort, today and tomorrow.",
  "I am becoming someone I don't have to apologize to.",
  "Every day I train is a day I take back from decline.",
  "I am investing in a body that will still say yes at 70.",
  "I choose to move like my future self is counting on me.",
  "I am proof that consistency beats intensity.",
  "Today I add one more brick to a lifetime of strength.",
  "I am not training for summer. I'm training for decades.",
  "I choose energy over ease.",
  "I am someone who keeps promises to myself.",
  "My body is not my obstacle. It's my inheritance to protect.",
  "I am becoming the strongest version of myself, one morning at a time.",
  "I choose to be capable, not just comfortable.",
  "I am training for the life I want at 80, starting today.",
  "Today I choose vitality over convenience.",
  "I am someone who finishes what they start, especially with themselves.",
  "I am not waiting for motivation. I am building discipline.",
  "I choose to be strong enough to help the people I love.",
  "I am becoming unbothered by difficulty.",
  "My longevity starts with this next decision.",
  "I choose the long game over the quick fix.",
  "I am someone who trains their mind and body, not just one.",
  "Today I choose to be someone my future self respects.",
  "I am building resilience, one rep at a time.",
  "I choose presence over autopilot.",
  "I am not chasing a body. I am building a life.",
  "I choose to age on my own terms.",
  "I am someone who shows up before I feel ready.",
  "Today I choose momentum over perfection.",
  "I am the architect of the decades ahead of me.",
];

export const BRAIN_ACTIVATION_READINGS: string[] = [
  "Your brain is most plastic in the first hour after waking. Use it to decide, not to scroll.",
  "The first thought you choose this morning sets the frame for the next twelve hours.",
  "Longevity isn't just years added to life — it's life added to years. Today, add some.",
  "A clear mind is trained the same way a strong body is: through repetition, not luck.",
  "Before you check your phone, ask: what does my future self need from me today?",
  "The brain treats effort as evidence. Give it proof this morning that you're someone who follows through.",
  "Five slow breaths before you move can recalibrate a whole day.",
  "You don't find focus. You build it, one distraction refused at a time.",
  "The mind, like the body, atrophies without use. Stretch both today.",
  "Curiosity is a muscle. Ask one real question before noon.",
  "What you repeat, your brain assumes is important. Choose your repetitions carefully.",
  "A long life is made of ordinary mornings handled with unusual care.",
  "The nervous system calms fastest through the body, not the mind. Move first, think second.",
  "Today, notice one thing you normally ignore. That's attention, trained.",
  "Your brain doesn't reward comfort. It rewards mastery. Chase the second one.",
  "Sleep repaired your brain overnight. Don't waste the clarity by rushing into noise.",
  "The first ten minutes of your day are the cheapest hour to invest in yourself.",
  "Longevity science keeps circling back to one theme: move often, rest well, connect deeply.",
  "A sharp mind at 80 is built by the choices made at 30.",
  "Silence for sixty seconds this morning is a rep for your attention span.",
  "The brain learns direction from your first action, not your best intention.",
  "What you do before 9am rarely feels important — and quietly decides everything.",
  "Neurons that fire together wire together. Fire the ones that serve the life you want.",
  "A body kept mobile keeps a mind kept sharp — the two were never separate.",
  "This morning, pick difficulty on purpose. It's the fastest way to feel awake.",
  "The brain treats novelty like fuel. Do one small thing differently today.",
  "Longevity isn't added by avoiding effort. It's added by recovering from it well.",
  "Attention is the resource everyone's fighting for. Spend yours on purpose this morning.",
  "A single deliberate breath can shift you from reactive to intentional.",
  "The mind you'll have at 70 is being trained by the mornings you're having now.",
  "Before the day fills up, decide what actually matters in it.",
  "Cognitive decline fears one thing most: a mind that keeps choosing to be used.",
  "You are not behind. You are simply early in a very long project.",
  "The first choice of the day is rarely dramatic — and almost always decisive.",
  "Today's clarity is yesterday's rest, this morning's stillness, and one good decision, stacked.",
];

const ROTATION: string[][] = [
  MOTIVATIONAL_QUOTES,
  ASPIRATIONS,
  BRAIN_ACTIVATION_READINGS,
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Quote -> Aspiration -> Reading -> repeat, cycling through all 35 lines of each category across the year. */
export function getDailyNotificationBody(date: Date = new Date()): string {
  const doy = dayOfYear(date);
  const category = ROTATION[doy % ROTATION.length];
  return category[doy % category.length];
}
