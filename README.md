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

**Android — build via GitHub Actions (recommended):** push to `main` and check the **Actions** tab for the "Build Android APK" workflow. It uses the repo variable `FORCE_PREMIUM_FOR_TESTING` (currently `false`).

**Android — build locally:** open `android/` in Android Studio, or run `./gradlew assembleDebug` with the Android SDK and JDK 17. On Windows, move the project to a plain ASCII path first (Gradle's batch scripts fail on non-ASCII paths such as Cyrillic folders).

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
