# MyBodyWeight

A calisthenics card-game workout app — draw a card, do the exercise. Built with React, Vite, TypeScript, and Tailwind.

This version runs entirely in the browser: accounts, profiles, and workout history are stored in `localStorage`, so it can be hosted as a plain static site (GitHub Pages, Vercel, Netlify, etc.) with no backend server required.

## Local development

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL.

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Deploying to GitHub Pages

This repo ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys automatically on every push to `main`. See the step-by-step guide the assistant provided alongside this project for the exact commands.

## Native app (Android / iOS)

This project uses [Capacitor](https://capacitorjs.com) to wrap the web app for the Play Store / App Store. The `android/` and `ios/` folders are native project scaffolds — after any change to the web app, resync them:

```bash
npm run build
npx cap sync
```

**Android — build via GitHub Actions (recommended, no local setup needed):**
Push to `main` and check the **Actions** tab for the "Build Android APK" workflow — it builds a debug APK on GitHub's servers and attaches it as a downloadable artifact. This avoids needing Android Studio/SDK installed locally.

**Android — build locally:** open the `android/` folder in [Android Studio](https://developer.android.com/studio) and use *Build > Build Bundle(s) / APK(s)*, or run `./gradlew assembleDebug` from a terminal with the Android SDK and JDK 17 installed. Note: if you're on Windows and the project path contains non-ASCII characters (e.g. Cyrillic), move it to a plain ASCII path first — Gradle's Windows batch scripts can fail to resolve non-ASCII paths.

**iOS:** open `ios/App/App.xcworkspace` in Xcode on a Mac (`npx cap open ios`), then build/run or archive for App Store submission. There is no Windows path for iOS builds — Apple requires Xcode on macOS.

**Before submitting to either store:**
- Change `appId` in `capacitor.config.ts` from the placeholder `com.mybodyweight.app` to your own reverse-domain identifier.
- Add real app icons/splash screens (`npx @capacitor/assets generate` can do this from a single source image).
- You'll need an Apple Developer account ($99/yr) for iOS and a Google Play Developer account ($25 one-time) for Android — both are things only you can create.

## Notes on this build

- **Accounts are per-browser.** Registering/logging in stores data in that browser's `localStorage` — there's no shared server, so an account created on one device/browser won't show up on another.
- **Password reset is local-only.** There's no email server, so "Forgot password" generates a reset token locally and takes you straight to the reset screen instead of emailing a link. Fine for personal/demo use; don't rely on this for real multi-user security.
- **Guest mode** still works exactly as before and doesn't persist any data.
