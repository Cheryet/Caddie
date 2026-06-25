# TODO.md

Outstanding work — deferred items and dev-time workarounds to revisit before
production. Each entry is a deliberate trade-off, not a forgotten task: it
records *why* it was deferred so a future revisit can make the same call (or
not) with full context.

This file is the running answer to "what's left to finish the app." When an
item ships, strike it through with a date and move it to **## Done** at the
bottom. Cleaned up 2026-06-24 — completed-phase status narratives and
already-resolved/removed items were pruned; only open work remains.

---

# 1. Physical-device verification

On-device builds and Apple sign-in are working (Phase 4.4 was verified on a
real iPhone 2026-06-18). The remaining gaps are features that **cannot be
exercised on the iOS Simulator** and still need a real device pass.

## Pose skeleton — confirm Vision joint-name mapping on device
The Vision raw joint-name strings in `src/core/pose/landmarks.ts`
(`RAW_NAME_TO_JOINT`) were a best-guess — Vision never runs on the sim.
`toPoseFrame` logs `[pose] unmapped joint name: <name>` in `__DEV__` for
anything that doesn't map. Open a swing → tap Pose → watch the Metro console;
add any unmapped raw joints to the map. This is the one residual unknown in
Phase 3.2 and is also why the per-panel skeleton in Comparison (5.1) is only
visually confirmable on device.

## Camera preview (Phase 1.2) + recording (Phase 1.3) — granted+device branch
The sim has no camera, so `useCameraDevice('back')` returns `null` and only
the "No camera available" branch has been exercised. Verify the live branch on
device:
1. Trigger Camera modal (Record FAB) → allow Camera + Microphone prompts →
   live preview fills screen, back camera, Close button top-left.
2. Background → reopen → preview resumes (isActive lifecycle).
3. Fresh install with permissions denied → "Camera access needed" empty state
   + Open Settings CTA opens the Caddie settings page.
4. Record → 3-2-1 countdown → status pill counts up with red dot → controls
   hidden while recording → stop navigates to playback with localUri/club/
   angle/hand. Let one run to the 60s auto-stop cap. Close during countdown
   cancels to idle. Confirm `mmkv` last-club survives a cold restart.

Failure modes: black/frozen preview → `device` is null; crash on mount →
Info.plist usage strings or pod install; no permission alert → stale install.

---

# 2. Authentication & pre-launch infra

## Email confirmation (currently disabled)
"Confirm email" is **off** so anyone can sign up with any email (incl. ones
they don't own). Fine for closed beta, unacceptable for public launch.
**Revisit when** setting up custom SMTP (Resend free tier recommended). Then:
1. Provision custom SMTP in Supabase → unlocks template editing on Free plan.
2. Re-enable "Confirm email" (Authentication → Providers → Email).
3. Paste a **code-first** "Confirm signup" template (link demoted/removed),
   since the app uses a 6-digit OTP path, not deep links.
4. E2E: sign up → 6-digit code in inbox → VerifyScreen → lands on tabs.

## Magic-link sign-in (hidden behind a flag)
Code paths (`useAuth`, `requestMagicLink`, `resendOtp`, VerifyScreen
`magiclink` mode) are wired and tested; only the AuthScreen affordance is
gated behind `MAGIC_LINK_ENABLED = false`. Same blocker as email confirmation
(link-only template, no deep links). **Revisit with custom SMTP**: flip the
flag, edit the Magic Link template to lead with `{{ .Token }}`, manual-test the
code flow.

## Apple / Google sign-in (placeholders only)
`SocialPlaceholder` buttons render as disabled "Coming soon". Out of MVP per
§4. Apple Sign In is required by Guideline 4.8 *if any* social auth ships, so
both must land together. **Revisit post-MVP**: spec a dedicated phase
(`@react-native-apple-authentication` + `@react-native-google-signin`), add
Supabase OAuth providers, wire the Pressables, verify 4.8 (Apple button
equally prominent).

## Site URL — Supabase auth redirect
Still the default `http://localhost:3000`. Harmless while email confirmation is
off (no link emails sent). **Revisit when re-enabling email confirmation** —
point it at a "Return to the app" page or the `caddie://` deep link if that
ever ships.

---

# 3. Observability — Phase 0.7 (Sentry + analytics), deferred entirely

Neither `@sentry/react-native` nor `posthog-react-native` is installed;
`App.tsx` has no error boundary or analytics wrapper. The `0.7 → 0.8`
dependency was broken deliberately to keep momentum on user-visible features.
**Land this before any non-dev user installs (TestFlight/beta).**

1. `npm i @sentry/react-native` → `pod install`. `src/core/sentry/client.ts`
   with `initSentry()` + `captureError()`, DSN via `env.SENTRY_DSN` (already in
   `config.ts`), transmission disabled in `__DEV__`.
2. `npm i posthog-react-native@^3` (lighter peer deps than v4).
   `src/core/analytics/posthog.ts` singleton using the MMKV-backed
   `customStorage` adapter; keys via `env.POSTHOG_API_KEY` / `POSTHOG_HOST`.
3. `App.tsx`: `initSentry()` at module top, `Sentry.wrap(App)`,
   `<PostHogProvider>` around the tree.
4. Identify the Supabase user in both SDKs from `useAuthBootstrap`; reset on
   sign-out.
5. Acceptance: deliberate `throw new Error('Sentry probe')`, verify in
   dashboard, revert.
6. Pre-TestFlight: wire Sentry sourcemap upload into the CI release build.

This also unblocks the **`video_imported`** analytics event (§7 line 216) and
the other canonical events that are currently un-wired.

---

# 4. Capture & library

## Camera flip / front camera (Phase 1.3)
Flip button renders (design parity) but `onPress` is a no-op; recording is
back-camera only (MVP §4 = "rear, 60fps"). **Revisit post-MVP**: add
`cameraPosition` state, pass to `useCameraDevice`, animate the icon. Front
camera needs horizontal-flip handling in the pose overlay — track as a subtask.

## Library — filter sheet + processing banner (Phase 1.8 / 1.4)
Search and the All/Driver/Irons/Analysed quick-chips shipped 2026-06-24. Still
deferred:
1. **Real filter sheet** (club / angle / date) — the "more filters" sliders
   button only toasts today. Build the Phase 1.8 `FilterSheet`, open it from
   `onPressMoreFilters`, feed selections into `filterVideos` (extend
   `LibraryFilter` beyond the four quick chips).
2. **"Processing N swings…" banner** above the grid — needs an in-flight
   upload-status signal. Extend `useUploadQueueBootstrap` to expose an
   in-flight count, render an info row.

## Video import deferrals (Phase 1.6)
1. **Thumbnail preview in `ImportConfirmSheet`** — use the installed
   `react-native-compressor` `createVideoThumbnail`. Deferred until testing
   says the missing still is confusing.
2. **iOS 14+ Limited Photo Library "Select More Photos" affordance** — PHPicker
   works scoped today, but we don't surface re-prompting.
3. **Multi-select import** — `selectionLimit` hardcoded to 1 ("one swing at a
   time"). Bulk import is a V1 nice-to-have.
4. **Maestro E2E** `import-video-appears-in-library.yaml` — lands when the
   Maestro suite is bootstrapped (pre-TestFlight).

## Video trim — library re-trim + hard cap
Trim shipped for recordings + imports (REVIEW mode → Trim → filmstrip →
trim-on-save). Deferred:
- **Library re-trim** — already-uploaded (`videoId`) clips can't be re-trimmed
  (needs download → trim → re-upload/replace). Trim is hidden for library
  sources today.
- **Hard max length** — only a min trim length is enforced; could add a ≤15s
  analysis cap.

## Spec doc reconciliation — image-picker vs. Vision Camera
`react-native-image-picker@^8` powers Phase 1.6, but `PROJECT_SPEC.md` §8 is
internally inconsistent: line 239 falsely claims Vision Camera does library
import, line 267 lists image-picker as "dropped", and Phase 1.6 line 1146 names
the wrong library (`camera-roll`). **Revisit on the next §8 dependency-table
audit**: prune the "dropped" line, fix the import claim, reconcile the 1.6
bullet.

---

# 5. Playback & drawing

## Impact-frame marker on the scrub track (Phase 1.7 #4 / Phase 3.3)
The small amber tick on the single-playback scrub track is not built. It reads
the impact timestamp from the Phase 3.3 pose-metrics compute layer (already
shipped). (Note: Comparison 5.1 has per-panel mark-impact ticks, but the
auto-derived marker on the main PlaybackScreen scrub is still open.)

## Frame-step granularity assumes 30fps (Phase 1.7)
`FRAME_STEP_MS = 1000/30`. Correct for our capture path but imported videos can
be 60/120/240fps. react-native-video v6 doesn't expose framerate. **Revisit**
when a user reports stepping feels off, or when pose sampling needs accurate
per-frame timing — likely a small native module reading
`AVAsset.nominalFrameRate` once at load.

## Top/bottom scrim falloff (Phase 1.7)
Scrims in `PlaybackChrome.tsx` use solid `rgba` instead of the design's
`linear-gradient(180deg, …)`. RN has no built-in gradient. **Revisit** if
another feature pulls in a gradient lib, or a side-by-side review flags it.

## Shake-to-undo (Phase 2.2)
Toolbar Undo button ships; the spec's shake gesture does not (needs a native
dep + `NSMotionUsageDescription` + pod install). **Revisit** if another feature
adds `react-native-shake`, or testing says the button is hard to discover.

## Drawing — selection & misc deferrals (Phase 2.3)
- **Multi-select** (lasso / shift-tap) — single-shape selection only.
- **Plane endpoint drag** — lines have draggable endpoints; planes don't.
- **Angle ray drag** — committed angles can't be reshaped.
- **Color-picker dismiss-on-outside-tap** — popover only closes on swatch
  select.
- **Freehand perf** — every RNGH `onUpdate` calls `setState`; long strokes
  could lag. Mitigations: throttle to ~16ms, or render the in-progress path via
  a Reanimated shared value.

## Drawing persistence + share — follow-ons (Phase 2.4)
- **Fresh-recording path persistence** — `localUri` routes skip persistence (no
  row yet); drawings made before re-opening from the library are lost.
- **Conflict resolution** — `videos.drawings` is last-writer-wins (fine for
  single-user MVP).
- **Deterministic share frame** — `captureRef()` grabs whatever's on-screen; if
  playing, it may not be the intended frame. Consider pausing inside `share()`
  and resuming after.
- **Schema migrations** — persisted shapes carry a `v: 1` marker; when `v: 2`
  ships (pose/analysis growth), write a one-time forward migrator and document
  the upgrade story.

---

# 6. Pose

## Pre-computed pose track — follow-ons
- **Cross-session persistence** — the track is in-memory only; re-opening a
  video re-analyzes. Persist to MMKV/Supabase so a clip analyzes once ever.
- **Native cancellation** — toggling pose off mid-analyze abandons the JS
  result but the native batch runs to completion (~10s wasted, harmless). Add
  `cancelAllCGImageGeneration` if it matters.
- **Real progress %** — currently an elapsed-time spinner; a progress bar needs
  native progress events (RCTEventEmitter).

## Derived pose-metrics overlay (Phase 3.3) — display deferred
The compute layer (`computePoseMetrics`, the four §3.3 metrics) ships and feeds
Phase 4 / the impact marker. The **on-screen collapsible metric overlay is
intentionally not built** — single-camera 2D proxies are approximate, and
surfacing them as precise readouts would mislead (product decision 2026-06-17).
**If ever wanted**: `usePoseMetrics(track, currentMs, swingHand)` hook +
`PoseMetricsOverlay` (`React.memo`, collapsible, `—` for nulls,
`pointerEvents="box-none"`). No design reference exists — needs a layout pass
(top-left card vs. bottom strip vs. left-edge pills) and a tokenised HUD
surface in `colors.pose`.

## `detectOnVideoFrame` availability guard (cleanup, from Phase 4.2)
`CaddiePose.m`'s singular `generateCGImageAsynchronouslyForTime:` (iOS 16+)
warns `-Wunguarded-availability-new` under an `iOS 14.0` guard. Add an iOS-16
guard or switch to the plural `generateCGImagesAsynchronouslyForTimes:` API on
a cleanup pass.

## Pose-path frame classification — device tuning (Phase 4.2)
The fallback timestamp schedule covers the Simulator and any device where pose
init fails. The precise pose-path canonical-frame classification
(`detectSwingPositions`) can only be tuned on a physical device (Vision can't
run on the sim). Verify/tune when doing on-device passes.

---

# 7. Analysis (Phase 4)

## Analysis report — deferred content (Phase 4.3 / 4.4)
- **Refresh-analysis affordance** — the hook exposes `refresh()` (used by
  error-retry) but there's no refresh button in the report UI yet (§14
  "regenerated only when the user taps refresh"). Add one.
- **`previousIssues` is sent as `[]`** — §14 wants prior-swing issue context in
  the prompt for continuity. Enrich from the user's recent `analyses` once
  progress tracking exists.
- **Loading staged-progress is presentational** — drive "Frames extracted /
  Pose detected / Generating coaching notes" from the real pipeline, and gate
  the "Pose detected" wording on the frame extractor's actual `strategy`
  (`'pose'` vs `'fallback'`), since pose can't run on the sim.
- **Loading-state background still** — show the current playback frame behind
  the sparkle instead of a solid background.
- **Tempo card + "+N on last session" delta** — needs pose-derived swing timing
  (backswing/downswing seconds, 3:1 ratio) + prior-analysis history; neither is
  in the `analyses` model. Revisit with progress tracking (V1).
- **Drill "Start" → real flow** — the gold CTA toasts "coming soon". `DrillCard`
  is forward-compatible (`thumbnailUri` + `onStart`); wire to
  `src/constants/drills.ts` / V1 drill videos, matched by `issue.name`.
- **Null video-meta defaults** — when a row has null angle/club the Edge
  Function gets `'face-on'` / `'Unknown'`. Revisit if it skews Claude's read.
- **IssueCard thumbnail** — currently a severity glyph; `frame_refs[frameIndex]`
  could show a real frame thumbnail. Decide glyph vs. thumbnail vs. both.

## Upgrade flow (Phase 4.5) — sandbox verification + product config pending
Built and gate-green, but RevenueCat offerings don't load on the sim (no
StoreKit config) so the sheet shows "plans unavailable". To finish:
1. Configure `caddie_pro_monthly` / `caddie_pro_annual` in App Store Connect and
   map them to the RevenueCat dashboard offering.
2. On device + sandbox tester: tap a Pro gate → two plans with prices → buy
   monthly → `isPro` flips → gated feature delivers → Restore on a fresh
   install brings Pro back.

Deferred copy/features:
- **Free-trial / intro-offer copy** — read from the RC package's intro price
  instead of hardcoding, once products carry a trial.
- **Annual savings %** ("Save 50%") — compute from the two `priceString`s.
- **Promo-code redemption** (Profile redeem row) — RevenueCat offer codes /
  promo entitlements.

---

# 8. Comparison / tempo / profile (Phase 5)

## Comparison (Phase 5.1) — deferred
- **Header overflow "…" menu** (swap sides / reset) — the right header slot is
  an empty spacer; no dead button rendered.
- **Alpha-of-token colors → theme** — promote two local `rgba(...)` accents to
  named tokens: the brighter sync-on green (`#6DC98A`, also inlined in
  `Badge.tsx`'s success variant) and the landscape center-axis line
  (`semantic.warning` at 30%).
- **Impact tick vs. slider thumb inset** — the amber tick uses `left: %` over
  the community Slider, which insets the track by ~half the thumb, so it's a
  hair off near the extreme ends (fine mid-swing where impact lives).
- **Lockstep playback (optional)** — Sync keeps each panel's own speed
  (per the design); simultaneous play at *different* speeds drifts after
  impact. If lockstep is ever wanted, make Sync also share the rate.

## Tempo metronome (Phase 5.3) — deferred
- **Haptics** — DESIGN_SYSTEM §8 wants haptic feedback on key taps;
  `react-native-haptic-feedback` is not installed (deferred to avoid a second
  native dep here). Audio + visual only for now. This is the natural home for
  haptics as a cross-cutting concern (also wanted: long-press on Edit/Delete in
  Library, drawing taps).
- **Preset save failure** keeps the optimistic in-memory value + Toast rather
  than reverting (deliberate; low-stakes write).

## Profile & settings (Phase 5.4) — built UI, deferred wiring
- **Avatar upload** — needs a public `avatars` Storage bucket (+RLS) + an
  image-picker upload writing `profiles.avatar_url`. Edit pencil toasts today.
- **Local-only prefs drive nothing yet** (`profilePrefs.ts`, MMKV): wire
  Auto-analyse → analysis pipeline; Pose-overlay-default → PlaybackScreen pose
  toggle initial; Practice-reminders / Weekly-email → notification scheduling /
  push; Handicap → a real `profiles.handicap` column (migration + types regen).
- **"Coming soon" rows** — Redeem promo code (RevenueCat redemption), Full-name
  edit, Password change, the header settings button.
- **Support links** use placeholder URLs (`PRIVACY_URL` / `TERMS_URL` /
  `HELP_URL` in `config.ts`) — point at real pages before launch.
- **Cross-device default angle/club** — device-local (MMKV) today; add
  `default_camera_angle` / `default_club` columns if we want them synced.
- **Restore purchases / Manage subscription in Settings** — §22 4.5 wants a
  "Restore" entry in SettingsScreen; Restore currently lives only in the
  UpgradeSheet. Add it (plus the design's switch-plan / renewal-date manage
  sheet) when this screen is fully built out.
- **Pushed SettingsScreen route** is now unused (design consolidates into one
  ProfileScreen) — remove or repurpose for a future detail screen (e.g. Manage
  subscription).
- **Clear cache** (spec'd) omitted — no defined cache layer to clear yet.

---

# 9. Cleanup / tech-debt

## Library — DEV seed affordance
`LibraryScreen` has a `__DEV__`-only "Seed test row" button (fake `videos`
row, no Storage upload) so the sim-only dev can populate the grid. Compiled out
of release. **Remove `onPressSeed` + the DEV button block** once real
recordings land via device.

## Orphan Storage cleanup job (Phase 1.8)
`onConfirmDelete` deletes the `videos` row first, then fires Storage deletes in
the background (errors swallowed). A failed Storage delete leaves an orphan file
(user-visible state stays correct). **Revisit pre-TestFlight** — preferred fix
is a server-side Supabase Edge Function scheduled nightly that diffs
`storage.objects` against `videos` rows and removes orphans (stays correct even
after uninstall).

## Edit/Delete polish (Phase 1.8)
- **Chip-based tag entry** — comma-separated text input ships; chip UI (type →
  enter → chip) is friendlier (~80 LOC + design pass). Defer until tags are
  surfaced on cards or in a filter.
- **Optimistic delete** — today we `await refresh()` (full re-fetch) so the card
  lingers for the round-trip. Optimistic removal needs tighter `useVideos` ↔
  `useVideoManagement` coupling.
- **Haptic on long-press** — see Haptics under Tempo (5.3).

## orientation-locker teardown warning (suppressed in dev)
Dev red box "Attempted to remove more Orientation listeners than added" fires at
module teardown on the New Architecture (RN 0.86). Benign (RCTEventEmitter
self-clamps; we add no listeners, only call lock/unlock). Mitigated with a
dev-only `LogBox.ignoreLogs`. **Revisit** if the library ships a New-Arch fix,
or if it surfaces in release — options are patch-package (clamp
`removeListeners`) or a thin native shim.

---

# Done

- ~~Profile-driven capture defaults (swing hand + camera angle)~~ — 2026-06-22
  (Phase 5.4). CameraScreen + ImportConfirmSheet init from
  `captureDefaults.ts`; ProfileScreen Preferences write swing_hand + MMKV
  mirrors. Deliberately no `default_camera_angle` / `default_club` columns.
- ~~Email confirmation dead-end~~ — 2026-06-17 disabled "Confirm email" so
  signups return a session immediately (re-enabling it tracked in §2 above).
- ~~Phase 3.2 pose overlay~~ — done (PoseOverlay + usePoseFrame + landmarks map
  + toggle pill); device joint-name confirmation still tracked in §1.
- ~~Phase 4.1 analyze-swing Edge Function 200 e2e~~ — closed 2026-06-18 by the
  Phase 4.4 on-device run (real swing → 200 → report → cache hit on re-open).
- ~~Library VideoDetail screen / route~~ — removed 2026-06-23 (Phase 5.5); grid
  routes straight to root-stack Playback, management is the long-press sheets.
- ~~Drawing tools 2.1–2.4 (line/freehand/circle/angle/plane/select, color
  picker, persistence, share)~~ — shipped; only the polish items in §5 remain.
- ~~Video trim core~~ — shipped (recordings + imports); library re-trim + hard
  cap tracked in §4.

<!-- Move items here with a date when shipped. -->
