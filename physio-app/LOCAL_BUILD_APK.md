# Build the FizjoPlan APK

Three ways to get an installable Android APK, fastest first.

The project is already configured: package `com.fizjoplan.app`, version `1.0.0`,
versionCode `1`, `eas.json` `preview` profile = APK, works offline (no Supabase
keys needed).

---

## Option A — GitHub Actions (fastest, no local Android setup)

1. Push this project to a GitHub repo (the workflow file is already at
   `.github/workflows/android-apk.yml`).
2. Open the repo → **Actions** tab → run **Android APK** (it also runs on push
   to `main`/`master`).
3. When the **build-apk** job finishes, open the run → **Artifacts** →
   download **`fizjoplan-apk`**. Unzip to get the `.apk`.

No secrets are required for this path. (The release build is signed with the
debug key by Expo's Android template, so it installs on any device for testing.)

Optional cloud build: add a repo secret **`EXPO_TOKEN`** (from
<https://expo.dev> → Account → Access Tokens) to also run the `eas-cloud` job.

---

## Option B — EAS cloud build from your machine

Prereqs: **Node 18+** (<https://nodejs.org>) and a free **Expo account**
(<https://expo.dev>).

```bash
cd physio-app
npm install
npx expo install            # aligns RN/Expo to SDK 51
npm install -g eas-cli
eas login                   # use your Expo account
eas build -p android --profile preview
```

EAS prints a build URL; when it completes, **download the `.apk` from that URL**
(also visible under your project on expo.dev → Builds).

---

## Option C — Fully local build (no Expo account)

Prereqs:

1. **Node 18+** — <https://nodejs.org>
2. **JDK 17** — e.g. Temurin 17 (<https://adoptium.net>)
3. **Android Studio** — <https://developer.android.com/studio>
   - In Android Studio: **SDK Manager** → install **Android SDK Platform 34**
     and **Android SDK Build-Tools**.
   - Set env vars (macOS/Linux example):
     ```bash
     export ANDROID_HOME=$HOME/Library/Android/sdk   # Linux: $HOME/Android/Sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
     ```

Then:

```bash
cd physio-app
npm install
npx expo install
npx tsc --noEmit                       # expect 0 errors
npx expo prebuild --platform android   # generates the android/ project
cd android
./gradlew assembleRelease              # Windows: gradlew.bat assembleRelease
```

**APK output path:**
```
android/app/build/outputs/apk/release/app-release.apk
```

(If you prefer an explicitly debug-signed build: `./gradlew assembleDebug` →
`android/app/build/outputs/apk/debug/app-debug.apk`.)

---

## Install the APK on a device

- USB (with `adb` from the Android SDK platform-tools):
  ```bash
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  ```
- Or copy the `.apk` to the phone and tap it (enable
  *Settings → Install unknown apps* for your file manager).

---

## Notes

- The app runs **offline** out of the box (bundled sample exercises). To use a
  real database, fill `expo.extra.supabaseUrl` / `supabaseAnonKey` in `app.json`
  and run `supabase/schema.sql`, `supabase/migrations/0002_scale_and_quality.sql`,
  then `supabase/seed.sql`.
- No custom icon/splash is bundled, so the Expo default icon is used (cosmetic).
- If `npx expo install` reports SDK mismatches, accept its suggested versions
  (it aligns packages to the installed Expo SDK 51); do not manually upgrade Expo.
