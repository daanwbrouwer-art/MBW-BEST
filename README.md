# MyBodyWeight

A calisthenics card-game workout app — draw a card, do the exercise. Built with React 19, Vite, TypeScript, Tailwind, TanStack Router/Query and Capacitor (Android/iOS), with Supabase for accounts and social features and RevenueCat for in-app subscriptions.

Guests can use the app without an account (progress lives in `localStorage`). Registered users get a Supabase account, which powers Train Together, chat, nearby athletes and park submissions.

**Live web version:** https://mbw-best.vercel.app

## Local development

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. The dev server also listens on your LAN IP so phones on the same Wi-Fi can open it — but browsers only allow location on `https` or `localhost`, so the map can't get your position over the LAN link (it shows an explanation instead).

Environment variables go in `.env` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVENUECAT_*`, `VITE_MAP_TILES_API_KEY`, and optionally `VITE_FORCE_PREMIUM_FOR_TESTING=true` (gives every user premium — test builds only, never the live site).

Checks:

```bash
npx tsc --noEmit -p .   # types
npx biome check src     # lint/format
npx vitest run          # tests
node --experimental-strip-types scripts/palette-audit.mjs   # theme contrast + colour-blind scores
```

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview it locally with `npm run preview`. `vite.config.js` uses `base: "/"` on Vercel (so deep links/refreshes work) and `"./"` everywhere else (the Capacitor bundle).

`scripts/optimize-images.mjs` converts `public/assets` PNG/JPG to WebP (max 1080px) and rewrites references — this took the assets from ~242 MB to ~14.5 MB.

## Deploying

- **Vercel (live site):** project `mbw-best`, linked to this GitHub repo. Every push deploys automatically; pushes to `main` go to production at https://mbw-best.vercel.app. Branch previews sit behind Vercel login, so share the production URL for reviews. `vercel.json` rewrites all routes to `index.html`.
- **GitHub Pages:** `.github/workflows/deploy.yml` also builds and deploys on every push to `main`.

## Native app (Android / iOS)

This project uses [Capacitor](https://capacitorjs.com) to wrap the web app for the Play Store / App Store. After any change to the web app, resync:

```bash
npm run build
npx cap sync
```

**Android — build via GitHub Actions (recommended):** push to `main` (or run it by hand from the **Actions** tab) and the "Build Android AAB" workflow builds a signed release `.aab` for the Play Console (signing keystore comes from repo secrets). It uses the repo variable `FORCE_PREMIUM_FOR_TESTING` (currently `false`).

**Android — build locally:** open `android/` in Android Studio, or run `./gradlew assembleDebug` with the Android SDK and JDK 21 (Capacitor 8 compiles for Java 21). On Windows, move the project to a plain ASCII path first (Gradle's batch scripts fail on non-ASCII paths such as Cyrillic folders).

**iOS:** open `ios/App/App.xcworkspace` in Xcode on a Mac (`npx cap open ios`). Apple requires macOS for iOS builds.

## Design system

### Themes

Defined in `src/theme/palettes.ts` (single source of truth) and applied as CSS variables by `applyPalette()`; `index.css` holds the same values for first paint.

| Theme | Main colour | Background | Highlight |
|---|---|---|---|
| **Volt** (default — the MyBodyWeight look) | Electric lime | Near-black | Magenta |
| **Blaze** | Bright burgundy | Ember-black | Violet |
| **Neon** | Hot cyan | Deep violet-black | Lime |

Users switch under **Profile → Appearance → Theme** (`/palette-lab`). The blind A/B preference test and results on that page only render in dev builds. Each theme sets its own background (`surface: { l, c }` → `--bg-l` / `--bg-c`); cards, borders and muted surfaces step up from it in `index.css`.

### Colour roles

Each area of the app owns a suit colour, plus two non-suit colours:

| Role | Suit | Used for |
|---|---|---|
| `primary` | ♠ Spades | Main actions, Home, workouts |
| `energy` | ♥ Hearts | Effort, streak section, Profile tab |
| `prestige` | ♦ Diamonds | Awards, premium, paywall |
| `pulse` | ♣ Clubs | Train Together, map, chat, nearby |
| `highlight` | — | Things that must pop: "Recommended" tags, unseen dots, streak counts, PRs/records |
| `success` | — | Completed — the same green in every theme |

Status rule: **grey** = not started / not done yet, **highlight** = streaks and records, **green** = completed (weekly goal met, weekly challenge done, ✓ weeks in the goal log).

Components never hardcode colours: use `oklch(var(--role))`, Tailwind classes (`bg-energy`, `text-highlight`, …), `<Button variant="energy|prestige|pulse">`, or `oklch(L C var(--role-h))` for dark tints. Minimum text size is 12px.

### Navigation

The bottom menu is a floating glass pill rendered once in `App.tsx` (`RootLayout`) on the five tab routes, with a sliding indicator tinted in the active tab's colour. Moving between tabs slides the page in from that side (CSS `.tab-slide-in` — not motion/react, whose mount animation got stuck invisible when a lazy page suspended). Tab pages preload in the background on idle.

## Security (applied 2026-11-02)

Migration `supabase/migrations/20261102120000_security_hardening.sql` (applied to production):

- Column-level grants on `profiles`; gender locked once set; stored coordinates rounded to ~1 km; `nearby_profiles` returns whole-km distances.
- Chat threads created only via RPC; Train Together invite codes must match exactly; only the host can update a session.
- Parks and park photos are submitted as `approved = false` — **approve them in the Supabase dashboard** to make them public. `park-photos` storage bucket (5 MB, jpeg/png/webp).
- `EXECUTE` revoked from `anon` on functions; 15 foreign-key indexes added.

Also: the `join-waitlist` edge function has IP rate limits, a honeypot field and optional Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`); Android `allowBackup="false"`; the paywall shows real store prices from RevenueCat; a route error boundary; and the app respects the OS "reduce motion" setting.

## Recent fixes

- **Ace/King after a timed hold** (e.g. Pike Hold 20 s) now scales the seconds (Ace → 40 s, King → 10 s, minimum 5 s) instead of turning the hold into reps; they also keep the previous card's each-leg/each-side flag. Tests in `src/store/workout.test.ts`.
- **Map:** "Tap here to enable" now re-asks for location on the web (or explains why it can't); the add-park **+** shows "Create a free account to add parks" when anonymous sign-in is unavailable.
- **Streak card:** PR chip wraps instead of cutting off the number.

## QA fixes for the closed test (branch `fix/qa-closed-test`, in progress)

A consumer-style QA pass on the live site (2026-11-06, 198 checks, report: https://claude.ai/artifact/XqruPTTVo4NU3DmxoCkBMg) found 20 issues. All are fixed on this branch; independent review rounds 1 and 2 found further issues, also fixed. **Nothing is deployed and the migration is not applied yet.**

What changed:

- **Social (B1):** `profiles` is owner-only since 2026-11-02, so other users' names now come from `get_usernames(uuid[])` (connected people only: friends, accepted party members, chat peers; respects blocks; batches of 200) and `find_profile_by_username`. Friend requests go through `send_friend_request(username)`; direct `INSERT` on `friendships` is revoked.
- **Usernames:** unique (case-insensitive), `[A-Za-z0-9_]{3,32}`, neutral default `athlete_NNNNNN` instead of the email prefix, sign-up checks `username_available`.
- **Accounts (found in review, not in the QA report):** `src/lib/accountSession.ts` + `accountScope.ts`. Local data is owned by one account (`mbw_owner`); a different account signing in wipes it; sign-out keeps it (streaks are local-only) but flushes unsynced data, ends the Supabase session, logs RevenueCat out. RevenueCat is now linked with `Purchases.logIn(userId)` (it never was — premium granted by user ID only works after this ships). Background syncs are guarded so they never write into another account's data.
- **Onboarding (H1, H2):** answers sync to `profiles.onboarding` (newest wins; weight/height/age never leave the device); explicit retake mode returns to Profile; no loading flash in `OnboardingGuard` (fixed the React #185 loop, L3).
- **Workouts (H3, H4, M1):** each workout has a uuid; history upsert ignores duplicates and is marked saved only after success (limited retries); real deck id `Category-Difficulty`; an in-progress workout survives a reload with a Home Resume/Discard card; the clock saves training time (`elapsedSeconds`), so pauses and time away don't count.
- **Custom decks (B2, M4, M5):** Save bar pinned to the bottom; images on a light background; decks sync to `custom_decks` (tombstones, synced flag, 100-deck cap); guests have their own decks.
- **Other:** "Party not found / ended" screens (M2), Leave party from the owner picker (M3), readable park names/equipment (M6, `src/lib/parkLabels.ts`), styled 404 (L2), help icon instead of the bell (L1), restore-purchases feedback (L5), switch and overlay accessibility labels (L4).
- **Database:** `supabase/migrations/20261106120000_fix_train_together_policy_recursion.sql` (applied) and `20261106130000_qa_social_onboarding_decks.sql` (**not applied** — apply together with deploying this branch; it renames the 2 reviewer accounts' usernames).

Review round 3 (DB, client logic, browser) also fixed:

- **Parks:** unnamed parks show where they are ("Near Hoofdstraat, Wageningen"), reverse geocoded with Nominatim only when a park is opened, at most 1 request/s, cached on the device (`src/lib/parkPlace.ts`); pins and clusters have accessible names.
- **Retake assessment:** decided from state when the questionnaire opens (no flag left behind by a system Back); keeps the original completion date.
- **Accounts:** a tab whose account changed in another tab reloads instead of writing the old account's data; a guest's leftover workout or web mock premium doesn't carry into an existing account; the trial only applies to signed-in users.
- **Sync:** editing weight/height/age doesn't overwrite newer answers from another device; a deck deleted on one device stays deleted; a late onboarding download no longer shows the questionnaire again.
- **Workout clock:** wall-clock based; time in the background (screen off between sets) counts up to 5 minutes per absence.
- **Display:** holds show seconds (not "0 reps") and stay out of rep totals; Profile workouts/calories come from the history; Narrow Squat is a leg exercise.
- **Accessibility:** How to play and park sheets are dialogs (Escape, focus); about 30 icon buttons and the onboarding sliders have labels; Escape resumes a paused workout; sign-in/sign-up fields have autocomplete hints.

Review round 4 also fixed: a tab reloading after another tab's sign-in no longer writes its old workout/guest mode back; `get_usernames` no longer counts a chat thread as a connection (chat names come from the chat RPCs); guests (anonymous sessions) can't look up usernames or send friend requests; Retake assessment is an explicit `/onboarding?retake=1` (returning guests and system Back no longer open the edit flow); keyboard can open map pins and pin names survive re-clustering; pause and Joker overlays are dialogs; holds show seconds in the pause list too; guest summary copy says what is kept on the phone (streak, records) and what needs an account (history).

Review round 5 found nothing above Low in any area (DB, client, browser). Its fixes: starting a chat now needs a reason to know the person (they're discoverable, an accepted friend, or in a party with you), the "same gender only" refusal no longer reveals the recipient's gender, and blocked pairs disappear from the chat list; guests can't start chats or join parties by code; pause sheet keeps focus inside and returns it; focus returns to the map pin after closing a park; Pro preview shows holds in seconds without "0–N" ranges; the guest Achievements banner no longer promises cross-device sync.

Known Low items left: party invite codes are 6 characters with no attempt limit (pre-existing); `username_available` lets anyone check whether a name exists (needed by the sign-up form); Nominatim requests carry no app contact (add an `email=` parameter with a project address).
- [ ] Apply the migration, regenerate `src/lib/database.types.ts` from the live DB and compare with the hand-written types.
- [ ] Re-run the live consumer QA (two accounts: friends, party names, chat, block/report) on a Vercel preview, then merge to `main` and deploy; build a new Android bundle (also carries the new launcher icons).

## Open items

Things only the project owner can do:

- [ ] Supabase → Authentication → enable **leaked-password protection**.
- [ ] Decide on **Anonymous Sign-Ins** (Authentication → Providers). Off = guests must create an account to add parks.
- [ ] Add Turnstile keys to the waitlist if spam appears.
- [ ] Settle the Founding Member wording ("for life" vs "3 months").
- [ ] Moderate submitted parks/photos (`approved = true`).
- [ ] Test Train Together, park submission and chat end-to-end with two real accounts.
- [ ] **Web premium is free:** on the website, Subscribe uses a mock checkout that always succeeds (real billing only exists in the native app). Hide or redirect Subscribe on the web if the site is meant as a real product.

Code follow-ups:

- [ ] 39 image references point to illustrations that don't exist yet (see `ILLUSTRATIONS_NEEDED.md`).
- [ ] Untested: R8/minify for the Android release build; `supabase db pull` to resync migrations with production.
- [ ] Optional: light theme (about 330 component tints assume a dark background).

## Known issues

- **OneDrive breaks `node_modules`.** This repo lives in a OneDrive folder, which removes files inside `node_modules`, restores deleted files (e.g. the old PNGs) and keeps old dev servers' `esbuild.exe` locked. If builds fail with "Cannot find module", stop running dev servers and reinstall (`npm ci`), or better, move the project out of OneDrive. A stray `node_modules/vitest/node_modules/vite` breaks tests with "Cannot find package 'rolldown'" — delete that folder.
- **Accounts:** guest progress is per-browser (`localStorage`); registered accounts sync through Supabase.
