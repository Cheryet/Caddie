# TODO.md

Deferred items and dev-time workarounds that need to be revisited before
production. Each entry is a deliberate trade-off, not a forgotten task — record
*why* it was deferred so the future revisit can make the same call (or not)
with full context.

Add new entries at the bottom under the section that fits. Strike through and
date items when they ship, then move them to the bottom under **## Done** so we
keep a paper trail.

---

## Physical-device verification — pending Apple Developer account

**Status:** Blocked on Apple Developer account activation. Account purchased
**2026-06-16**; Apple says confirmation can take up to 48h (expect active by
**~2026-06-18**).

**Why blocked:** Two things need a real iPhone —
1. Code signing for on-device builds (the project currently builds only for the
   simulator, no signing team).
2. **The Phase 3.2 pose skeleton can only be verified on a physical device.**
   Apple Vision's `VNDetectHumanBodyPoseRequest` cannot be set up on the iOS
   Simulator (fails with Vision error code 9, "Unable to setup request") — the
   body-pose model isn't in the simulator runtime. On the sim the feature now
   degrades gracefully (capability probe in `initialize()` → pose pill hidden).
   The pipeline is verified up to the Vision call (engine init, frame
   extraction); only the on-device model inference is unverified.

**What to do when the account is active:**
1. **Signing** — in Xcode (`ios/Caddie.xcworkspace`) → Caddie target → Signing &
   Capabilities → set Team to the new account, enable "Automatically manage
   signing". Change the bundle id off the RN template default
   (`org.reactjs.native.example.Caddie`) to a unique reverse-DNS id
   (e.g. `com.cheryet.caddie`) so provisioning works without collision.
2. **Run on device** — `npx react-native run-ios --device` (trust the developer
   cert on the phone the first time).
3. **Verify the pose skeleton** — open a swing → tap Pose → expect the gold
   skeleton over the golfer.
4. **If the skeleton is empty on device** — the Vision joint-name strings in
   `src/core/pose/landmarks.ts` (`RAW_NAME_TO_JOINT`) were a best-guess and are
   **unconfirmed** (Vision never ran on the sim). `toPoseFrame` logs
   `[pose] unmapped joint name: <real name>` in `__DEV__` for anything that
   doesn't map — watch the Metro console; those lines name the exact raw joints
   to add to the map. This is the one residual unknown in Phase 3.2.

---

## Pose overlay — pre-computed track (animates during playback)

**Decision:** When the user enables Pose, the whole clip's body pose is
**pre-computed once** (30fps samples) into a time-indexed track; the overlay
then looks up the pose for the current time. Deliberate step beyond
PROJECT_SPEC §22 3.2 ("run pose detection on the current frame as the user
scrubs").

**Why:** On-device per-frame detection (the literal §3.2 reading) was too slow
on a real device — first skeleton took 5+s (remote frame extraction) and it
lagged behind during playback; on-demand detection can't keep up with live
playback. Pre-computing makes scrubbing instant and the skeleton animate
smoothly during playback at any speed.

**How it works:**
- Native `detectPosesForVideo(uri, fps)` downloads the clip locally once
  (remote per-frame seeking is the bottleneck), batch-extracts frames via
  `generateCGImagesAsynchronouslyForTimes:`, runs Vision on each, returns
  `[{timeMs,width,height,landmarks}]`.
- `buildPoseTrack` maps + sorts; `poseAt(track, ms)` is an O(log n) lookup.
  `usePoseTrack` orchestrates analyze→ready, caches the track per uri for the
  session, and shows an "Analyzing pose…" indicator.
- The player runs `onProgress` at ~30fps while a track is live so the overlay
  animates in sync (`progressUpdateIntervalMs`).

**Deferred / future:**
- **Cross-session persistence** — the track is in-memory only; re-opening a
  video re-analyzes. Persist to MMKV/Supabase so a clip analyzes once ever.
- **Native cancellation** — toggling pose off mid-analyze abandons the result
  in JS, but the native batch runs to completion (~10s wasted compute,
  harmless). Add `cancelAllCGImageGeneration` if it matters.
- **Progress %** — currently an elapsed-time spinner (no RCTEventEmitter); a
  real progress bar needs native progress events.

---

## Authentication — email confirmation

**Status:** ✅ **Resolved 2026-06-17.** "Confirm email" is now **disabled**
on the project (Authentication → Providers → Email → "Confirm email" off).
Verified live the same day: a fresh signup returned a session token
immediately (no `confirmation_sent_at` dead-end), which both unblocks mobile
onboarding and let Phase 4.1's authenticated probes run with a real user JWT.

**Why deferred:** Supabase free tier's default "Confirm signup" email template
only contains a confirmation link, not the 6-digit `{{ .Token }}`. Our app
intentionally never wired deep links in Phase 0.6 (decision: OTP code path,
no `caddie://` scheme), so the link in the email is unusable on mobile — it
redirects to whatever Site URL is configured (default `http://localhost:3000`)
and the token can only be exchanged in a browser. Template editing requires
either Pro plan or custom SMTP, neither of which we have set up yet.

**Trade-off accepted:** Anyone can sign up with any email, including emails
they don't own. Low risk for MVP / closed beta; unacceptable for public launch.

**Revisit when:** Setting up custom SMTP (Resend recommended — free tier 3,000
emails/month, more than enough for early users). Once custom SMTP is wired,
Supabase unlocks template editing on the Free plan.

**What to do at revisit:**
1. Provision custom SMTP in Supabase dashboard
2. Re-enable "Confirm email" in Authentication → Providers → Email
3. Paste the templated body into "Confirm signup" — code-first, link
   demoted or removed entirely (see template draft in commit history /
   Phase 0.6 design doc)
4. End-to-end test: sign up → check inbox for 6-digit code → enter on
   VerifyScreen → land on tabs

---

## Authentication — magic link sign-in

**Status:** Hidden in the UI. Code paths in `useAuth`, `requestMagicLink`,
`resendOtp`, and `VerifyScreen`'s `magiclink` mode are still wired and tested.
Only the affordance in `AuthScreen` is gated behind `MAGIC_LINK_ENABLED = false`.

**Why deferred:** Same root cause as the email-confirmation item — Supabase's
default magic-link email template is link-only, no `{{ .Token }}`, and we
have no deep linking. Showing the "Email me a sign-in code instead" button
in dev / TestFlight would invite users into a dead-end flow.

**Trade-off accepted:** Sign-in is password-only until magic link is unlocked.
Lower friction features (passwordless sign-in) are postponed.

**Revisit when:** Same trigger as email confirmation — custom SMTP set up.

**What to do at revisit:**
1. Flip `MAGIC_LINK_ENABLED` to `true` in `src/features/auth/screens/AuthScreen.tsx`
2. Edit the "Magic Link" email template in Supabase to lead with `{{ .Token }}`
   (template draft in Phase 0.6 design doc)
3. Manual test: sign-in tab → tap "Email me a sign-in code instead" →
   inbox has code → enter on VerifyScreen → land on tabs

---

## Authentication — Apple / Google sign-in

**Status:** Placeholders only. `SocialPlaceholder` buttons render as disabled
"Coming soon" in `AuthScreen`.

**Why deferred:** Out of MVP per `PROJECT_SPEC.md` §4. Apple Sign In is
required by App Store Review Guideline 4.8 *if* any third-party social auth
ships, so the two providers must land together — neither is partial-deploy
friendly.

**Revisit when:** Post-MVP growth phase, when reducing signup friction is
worth the integration cost.

**What to do at revisit:**
1. Spec the dedicated phase in `PROJECT_SPEC.md` §22 (`@react-native-apple-authentication`
   + `@react-native-google-signin/google-signin`)
2. Add Supabase OAuth providers in dashboard
3. Replace `SocialPlaceholder` components with wired Pressables
4. Verify Guideline 4.8 compliance (Apple button equally prominent)

---

## Site URL — Supabase auth redirect

**Status:** Default `http://localhost:3000`. Harmless while
"Confirm email" is off, since no link emails are sent.

**Why deferred:** Linked to email confirmation — once we re-enable
confirmation and SMTP, the Site URL needs to point somewhere meaningful
(either a custom redirect page that says "Return to the app" or the
`caddie://` deep link once that ships).

**Revisit when:** Re-enabling email confirmation.

---

## Phase 0.7 — Sentry and analytics (deferred entirely)

**Status:** Phase skipped. Neither `@sentry/react-native` nor `posthog-react-native`
is installed. `App.tsx` has no error boundary and no analytics wrapper.

**Why deferred:** Crash reporting + product analytics deliver most of their
value once the app has real users (TestFlight onwards). Pre-MVP, the cost
of the native plumbing (Sentry's iOS pod, sourcemap upload phase, env wiring)
outweighed the benefit — pushed past the build-out phase so we keep momentum
on user-visible features.

**Trade-off accepted:** Any crash in dev / internal testing reaches us only
via the simulator console or a tester's screenshot, not a centralised
dashboard. Acceptable while the only testers are the dev team.

**Revisit when:** Approaching TestFlight or external beta. Aim to land this
before any non-dev user installs the app.

**What to do at revisit:**
1. Install `@sentry/react-native` — `npm install @sentry/react-native`
   then `cd ios && pod install`
2. Create `src/core/sentry/client.ts` exporting `initSentry()` +
   `captureError()`. DSN via `env.SENTRY_DSN` (already wired in
   `src/constants/config.ts`). Disable transmission in `__DEV__`.
3. Install `posthog-react-native@^3` (lighter peer-dep surface than v4).
   Create `src/core/analytics/posthog.ts` with a singleton client passing
   our MMKV-backed `customStorage` adapter (avoids the AsyncStorage peer
   dep entirely). API key + host via `env.POSTHOG_API_KEY` / `env.POSTHOG_HOST`.
4. Wire `App.tsx`: `initSentry()` at module top, export wrapped in
   `Sentry.wrap(App)`, mount `<PostHogProvider>` around the tree.
5. Optional but natural at this point: identify the Supabase user in both
   SDKs from `useAuthBootstrap` (`setSentryUser`, `posthog.identify`) and
   reset on sign-out.
6. Manual acceptance: temporarily flip the dev-disable flag, deliberate
   `throw new Error('Sentry probe')`, verify in Sentry dashboard, revert.
7. Pre-TestFlight: wire Sentry sourcemap upload into the CI release build.

**Spec reference:** `PROJECT_SPEC.md` §22 Phase 0.7 (lines 1087–1092). The
phase dependency arrow (`0.7 → 0.8`) is being broken deliberately — see
commit history when this phase is picked back up.

---

## ~~Profile-driven capture defaults (swing hand + camera angle)~~ — RESOLVED 2026-06-22 (Phase 5.4)

`CameraScreen` + `ImportConfirmSheet` now initialise `angle`/`swingHand` from
`src/utils/captureDefaults.ts` (and `club` from `loadLastClub`) instead of the
hardcoded `DEFAULT_*` constants; per-recording overrides remain. ProfileScreen's
Preferences rows write the defaults: **swing hand → `profiles.swing_hand`**
(`useProfile.updateSwingHand`) plus an MMKV mirror; **camera angle → MMKV**;
**club → MMKV (`lastClub`)**. We deliberately did **not** add
`default_camera_angle` / `default_club` columns — MMKV is sufficient for
device-local defaults (see the Phase 5.4 entry below for the cross-device
option). Satisfies `PROJECT_SPEC.md` §4 line 63 ("defaults to profile
preference, overridable per video").

---

## Camera flip (front camera) — Phase 1.3 deferred

**Status:** The Flip button in `CameraScreen` is wired into the UI
(per Design/Caddie Screens.dc.html line 366) but its `onPress` is a
no-op. Recording is back-camera only.

**Why deferred:** MVP §4 explicitly says "rear, 60fps" (PROJECT_SPEC.md
line 60). Front-camera support is a nice-to-have not in scope. Showing
the button keeps the layout faithful to the design; making it work is
half a day's work that no MVP demo requires.

**Revisit when:** Post-MVP UX polish, or if user testing reveals
golfers regularly want a selfie-mode swing check.

**What to do at revisit:**
1. Add a `cameraPosition` state in `CameraScreen` (`'back' | 'front'`)
2. Pass it to `useCameraDevice(cameraPosition)`
3. Wire the flip button's `onPress` to toggle, with a Reanimated
   crossfade or rotate on the icon for feedback
4. Pose-model mirroring (Phase 2.x) needs to handle front-camera
   horizontal flip; track that as a sub-task

---

## Physical-device verification — Phase 1.2 camera preview + Phase 1.3 recording

**Status:** Acceptance gap. Phase 1.2 shipped with the permission flow
verified on iOS Simulator (request dialog fires, denied → Open Settings
deep-link, no-device fallback renders for simulator's missing hardware).
The remaining acceptance criterion — "Camera preview renders on device"
— has not been exercised.

**Why deferred:** Tester only has the iOS Simulator available right now;
the simulator has no camera hardware, so `useCameraDevice('back')`
returns `null` and the "No camera available" branch renders. This is
expected and correct behaviour — the gap is verifying the *granted +
device-present* branch displays a live preview.

**Revisit when:** First time a physical iPhone is available — before
Phase 1.3 (Video recording) begins, ideally. Phase 1.3 builds on top of
the preview surface; if anything is wrong with the preview wiring we
want to find out before adding capture UI on top.

**What to verify:**
1. `npx react-native run-ios --device "<iPhone name>"` (or via Xcode
   build to a connected device)
2. Trigger Camera modal (Record FAB from the Home tab)
3. First launch: iOS shows the "Caddie would like to access the Camera"
   alert — tap Allow
4. Microphone alert fires next — tap Allow
5. **Confirm**: live camera preview fills the screen, back camera by
   default, no redbox, Close button visible top-left
6. Background the app → reopen → preview resumes (isActive lifecycle)
7. Re-launch via fresh install with permissions denied at install time —
   confirm the "Camera access needed" empty state renders with the
   Open Settings CTA; tap CTA → confirm iOS Settings opens on the
   Caddie page

**Failure modes to look for:**
- Preview is black/frozen → check `device` is non-null in dev tools
- App crashes on Camera mount → likely Info.plist usage descriptions
  missing or pod install incomplete
- Permission alert never shows → `canRequestPermission` is false on
  first launch (shouldn't be — usually means a stale install state;
  delete the app and reinstall)

**Phase 1.3 additions:**
8. Tap the record button → 3-2-1 countdown overlay appears → recording
   starts → top status pill flips to "0:01", "0:02", ... with red dot
9. During recording: angle / hand / club controls are hidden (locked)
10. Tap record again → recording stops → app navigates to the Playback
    placeholder showing the localUri + club + angle + hand
11. Start a new recording → let it run to 60 seconds → automatic stop
    and same navigation (max-duration cap)
12. While in countdown: tap Close → countdown cancels, returns to idle
13. Confirm `mmkv` last-club persists across app cold restarts

**Spec reference:** `PROJECT_SPEC.md` §22 Phase 1.2 line 1120 + Phase
1.3 lines 1122–1127.

---

## Library — filter sheet + upload "processing" banner (Phase 1.5 deferred)

**Status:** `LibraryScreen` ships the §22 Phase 1.5 acceptance, plus — as of
**2026-06-24** — client-side search and the All / Driver / Irons / Analysed
quick-filter chips from `Design/Caddie Screens.dc.html` §04. Remaining gaps:

1. ~~**Search bar** ("Search by club or date")~~ — **shipped 2026-06-24**:
   debounced `TextInput` → `filterVideos` over title/club_type
   (`src/features/library/libraryFilter.ts` + `useDebouncedValue`).
2. ~~**Filter chip row** (All / Driver / Irons / Analysed)~~ — **shipped
   2026-06-24** (`LibraryFilterBar`, local `useState` + `useMemo`). The
   sliders **"more filters" button is rendered but only toasts** — the real
   **filter sheet** (club / angle / date) is still deferred to Phase 1.8.
3. **"Processing N swings from this morning…" banner** surfacing an in-flight
   upload queue at the top of the loading state — still deferred.

**Why (still) deferred:** the filter sheet is §22 Phase 1.8 video-management
scope; the processing banner needs a real upload-status signal (Phase 1.4
NetInfo retry work). Bundling either now mixes phases.

**Revisit when:** the filter sheet → Phase 1.8; the banner → when the upload
queue exposes a visible in-flight state.

**What to do at revisit:**
1. Filter sheet: build the Phase 1.8 `FilterSheet`, open it from the sliders
   button (`onPressMoreFilters` in `LibraryScreen`), and feed its selections
   into `filterVideos` (extend `LibraryFilter` beyond the four quick chips).
2. Processing banner: extend `useUploadQueueBootstrap` to expose an
   "in-flight count" signal, render an info row above the grid.

---

## Library — DEV seed affordance

**Status:** `LibraryScreen` has a `__DEV__`-only "Seed test row" button
that inserts a fake `videos` row (no Storage upload — thumbnail_path
stays null so the card renders its fallback). Compiled out of release
builds. Exists because the developer is on simulator-only and otherwise
has no way to populate the grid without a physical device to record on.

**Revisit when:** First real recording lands via physical device, or
when proper "Import from photos" (Phase 1.6) provides a real path to
get a row into the table without seeding. At that point delete the
`onPressSeed` callback + the DEV button block.

---

## ~~Library — VideoDetail screen (Phase 1.8)~~ — REMOVED 2026-06-23 (Phase 5.5)

The placeholder `VideoDetailScreen` + its `VideoDetail` route were never
reached: the Library grid routes straight to root-stack `Playback`, and
Phase 1.8 video management shipped as the long-press Edit/Delete sheets
(`EditVideoSheet` / `DeleteConfirmSheet`), not a detail screen. Removed the
dead route, the param-list entry, and the file in the 5.5 cleanup. Re-add a
push screen here if a richer per-swing detail view is ever wanted.

---

## Spec contradiction — `react-native-image-picker` vs. Vision Camera "import capability"

**Status:** `react-native-image-picker@^8` is now installed and powers Phase
1.6's picker. The spec is internally inconsistent on this point:

- `PROJECT_SPEC.md` §8 line 239 claims Vision Camera does "photo library
  import" — it does not. No version of `react-native-vision-camera`
  exposes a PHPicker / library-enumeration API.
- `PROJECT_SPEC.md` §8 line 267 lists `react-native-image-picker` as
  "dropped". We've un-dropped it because the spec's stated replacement
  is fictional.
- `PROJECT_SPEC.md` §22 Phase 1.6 line 1146 says "Install
  `@react-native-camera-roll/camera-roll`" for import — camera-roll is
  for enumerating/saving, not for the PHPicker selection UI. We didn't
  install it for Phase 1.6 since we already get a URI from
  `react-native-image-picker`. The two libraries serve different roles;
  camera-roll's "save exported frames" use case lives in Phase 2.4
  (drawing export) which can install it then.

**Revisit when:** Next time we do a §8 dependency-table audit, prune the
"dropped" line and update the import claim to reference
`react-native-image-picker`. Also reconcile the Phase 1.6 bullet so
future readers don't try to install the wrong library.

---

## Phase 1.6 — Video import deferrals

**Status:** Phase 1.6 ships the §22 acceptance: PHPicker for selection,
photo library permission string in Info.plist, same upload pipeline as
recording, hard reject for videos >60s. Several adjacent affordances
are deferred:

1. **Thumbnail preview in `ImportConfirmSheet`.** The sheet collects
   angle/hand/club but doesn't show a still of the picked video. Adding
   it would require `react-native-compressor`'s `createVideoThumbnail`
   (already installed) to run synchronously inside the picker callback
   — easy but mixes concerns. Defer until user testing says the missing
   preview is confusing.

2. **iOS 14+ Limited Photo Library re-prompt.** If the user picked
   "Limited" access, our picker still works (PHPicker is scoped) but
   we don't expose the "Select More Photos" affordance. Most pickers
   surface this through a row in the picker UI itself.

3. **Multi-select import.** PHPicker supports `selectionLimit: N`. For
   Phase 1.6 we hardcode `1` to match the "one swing at a time" model.
   Bulk import is a V1 nice-to-have.

4. **`video_imported` analytics event.** PROJECT_SPEC.md §7 line 216
   lists this in the canonical event set. Wiring is blocked by Phase
   0.7 (Sentry + analytics) which is itself deferred.

5. **Maestro E2E flow.** `AI_IMPLEMENTATION_GUIDE.md` §13 line 484
   names `import-video-appears-in-library.yaml`. No Maestro
   infrastructure exists yet; the test will land when the rest of the
   Maestro suite is bootstrapped (typically pre-TestFlight).

**Revisit when:** Either user testing or pre-TestFlight checklist work
surfaces one of the above. None blocks Phase 1.7 (Playback) or 1.8
(Video management).

---

## Phase 1.7 — Video playback deferrals

**Status:** Phase 1.7 ships the §22 acceptance: react-native-video
player, custom transport (prev/play-pause/next), scrub slider,
0.25× / 0.5× / 1× speed, chrome auto-hide at 3s with tap-to-toggle.
Five design-bundle affordances are deliberately left out until their
owning phases land.

1. **Drawing toolbar** (right edge of `PlaybackScreen` in the design).
   Phase 2.1 — Drawing canvas foundation.
2. ~~**Pose toggle pill** (top-left, below the top bar).~~ DONE in
   Phase 3.2 — Pose overlay.
3. **"Analyse with AI" gold CTA** (centered above transport). Phase
   4.3 — Analysis screen UI; gated by Pro per §11.
4. **Impact frame marker** on the scrub track (the small amber tick
   in `Design/Caddie Screens.dc.html` line 253). Phase 3.3 — Derived
   pose metrics provides the impact-frame timestamp this marker
   reads from.
5. **Share current frame.** §4 line 82 lists it as MVP scope but it's
   absent from §22 Phase 1.7 bullets. The top-bar share button
   renders but only toasts "lands in the next update" — TODO when
   we wire `react-native-view-shot` + `@react-native-camera-roll/
   camera-roll` (both in the §8 dep table).

**Revisit cadence:** items 1–4 land naturally as their phases ship.
Item 5 (share) can land any time as a sub-feature; it doesn't gate
other work.

---

## Phase 1.7 — Frame-step granularity (30fps assumption)

**Status:** `FRAME_STEP_MS = 1000/30` in `src/constants/playback.ts`.
That's correct for Vision Camera's default capture (60fps was
mentioned in §4 line 60 but our Phase 1.3 default targetResolution
uses 30fps — see `CameraScreen.tsx`). Imported videos from the photo
library can be any fps.

**Why deferred:** react-native-video v6's `onLoad` exposes asset
`naturalSize` but not framerate. Reading the actual fps would
require a native bridge (AVAsset's `nominalFrameRate`) or
`react-native-create-thumbnail`-style probing. For Phase 1.7's
"frame-by-frame scrub" spec language, 30fps is a safe baseline that
matches our capture path.

**Revisit when:** A user reports stepping feels off on an imported
swing video they recorded at 60/120/240fps, or Phase 3.x adds pose
sampling which requires accurate per-frame timing. Likely fix is a
small native module that reads `AVAsset.nominalFrameRate` once at
load time.

---

## Phase 1.7 — Top scrim falloff (linear-gradient parity)

**Status:** Top and bottom scrims in `PlaybackChrome.tsx` use solid
`rgba(0,0,0,0.72)` / `rgba(0,0,0,0.55)` instead of the design's
`linear-gradient(180deg, ...)`. Visually similar but not identical —
the design fades to transparent at the inner edge.

**Why deferred:** RN has no built-in gradient. Faithful match needs
`react-native-linear-gradient` or `expo-linear-gradient` (pulls in
~50 KB native dep). Not worth a dep for the polish delta until we
either add the dep for another feature or user testing flags it.

**Revisit when:** Any other feature pulls in a gradient library, or
the chrome reads visibly different from the design in a side-by-side
review.

---

## Phase 1.8 — Orphan Storage cleanup job

**Status:** `useVideoManagement.onConfirmDelete` deletes the `videos`
row first, then fires `deleteVideo` + `deleteThumbnail` in the
background (Promise.all, errors swallowed with a `__DEV__` warn). If
Storage delete fails the row is already gone, so the user-visible
state is correct but the bucket holds an orphan file.

**Why deferred:** Failures here are rare in practice (network blip
after the row delete succeeded). Building a reconciliation job
requires either a Supabase scheduled function or a client-side
"orphan probe" — both are larger than Phase 1.8 scope.

**Revisit when:** Pre-TestFlight, or earlier if Storage costs
suggest we're paying for noticeable orphans. Two reasonable shapes:

1. **Server-side**: a Supabase Edge Function scheduled nightly that
   lists `storage.objects` and removes any whose path doesn't
   correspond to a row in `videos`. Single source of truth.
2. **Client-side**: on app launch, list the user's videos bucket,
   diff against `videos` rows, fire `deleteVideo` for the orphans.
   Simpler but only runs when the user opens the app.

The server-side path is preferred — it stays correct even if a
user uninstalls.

---

## Phase 1.8 — Edit/Delete deferrals

**Status:** Phase 1.8 ships the §22 acceptance: long-press → action
sheet → Edit or Delete sheet → Supabase update / row delete +
Storage delete, plus tags as a comma-separated `string[]`. Three
adjacent improvements stayed out:

1. **Chip-based tag entry.** Comma-separated text input ships for
   v1. Chip UI (type → enter → chip) is friendlier but ~80 LOC and
   needs a design pass. Defer until the tags column is genuinely
   surfaced anywhere — currently it's stored but not yet displayed
   on cards or in a filter (the library filter chips were also
   deferred from Phase 1.5).

2. **Haptic on long-press.** iOS-native context menus fire a haptic
   when they spring open; our `onLongPress` does not. `react-native-
   haptic-feedback` is listed in §8 line 248 but not yet installed.
   Defer until Haptics lands as a cross-cutting concern.

3. **Optimistic UI on delete.** Today we `await refresh()` after the
   row delete, which re-fetches the full grid. The card stays
   visible for the round-trip. Optimistic removal (pop the item
   from local state immediately) would feel snappier but requires
   coupling `useVideos` to `useVideoManagement` more tightly than
   v1 needs.

**Revisit when:** Optimistic delete is worth doing if users report
a perceptible delay between tap → card-gone. Haptic should land
with whatever other phase adds the dep first.

---

## Phase 2.1 — Drawing canvas foundation (what's next)

**Status:** Phase 2.1 ships the §22 acceptance: an absolute-positioned
SVG layer (`DrawingCanvas`) mounted between the VideoPlayer and the
PlaybackChrome, gesture capture via react-native-gesture-handler's
`Gesture.Pan` with `runOnJS` bridging back to JS callbacks. With no
tool selected (`'none'`) the canvas has `pointerEvents="none"` so
the player's tap-to-toggle-chrome behavior is preserved.

The foundation deliberately has NO visible UI of its own. Phases 2.2 →
2.4 fill in the rest:

1. **Phase 2.2 — Line and freehand tools**
   - Right-edge vertical toolbar (design at Caddie Screens.dc.html
     lines 201–231 — Select / Line / Plane / Circle / Freehand /
     Angle, plus a color dot below a divider)
   - Line tool: tap-drag creates a segment; endpoints draggable
   - Freehand: continuous path follows finger
   - `Shape` type defined; in-progress + committed shapes in
     `useDrawing`
   - Undo (last shape) — button + shake gesture
2. **Phase 2.3 — Circle / angle / plane / select**
   - Circle (drag radius), angle (3-point, degree readout),
     plane (extends to canvas edges), select+move, delete-selected
   - 4-color palette (`colors.drawing.{white,gold,red,blue}`)
3. **Phase 2.4 — Persistence + share**
   - Normalize shapes to [0,1] coords on save; debounce 1s writing
     to `videos.drawings` (already a `Json` column)
   - Load on PlaybackScreen open
   - `react-native-view-shot` for share button (captures the video
     frame + drawings overlay)

**Coordinate space note:** Phase 2.1 emits RAW pixel coordinates from
RNGH gestures (canvas-local). Phase 2.4 will normalize before
persistence so saved drawings replay on any device width.

---

## Phase 2.2 — Shake-to-undo deferred

**Status:** Phase 2.2 ships Undo as a toolbar button only (visible
below the color dot when at least one shape exists). The spec
bullet says "Undo: removes last shape (shake gesture + button)" —
the button half is done; shake is deferred.

**Why deferred:** Shake detection needs a native dep
(`react-native-shake` or rolling our own DeviceMotion bridge) plus
iOS `NSMotionUsageDescription` in Info.plist plus a `pod install`.
The button alone fully satisfies the undo affordance; shake is a
gesture-discoverability nice-to-have.

**Revisit when:** Either (a) we add `react-native-shake` for another
feature, or (b) user testing reports the toolbar Undo is hard to
discover. Steps:

1. `npm i react-native-shake`
2. Add `NSMotionUsageDescription` to `ios/Caddie/Info.plist`
3. `cd ios && pod install`
4. Hook in `PlaybackScreen` (or a new `useShake` util) that calls
   `drawing.undo()` on shake events. Guard with `tool !== 'none'`
   so a stray shake on the library doesn't trigger anything.

---

## Phase 2.2 — Drawing surface deferrals

**Status:** Phase 2.2 ships the §22 acceptance: Shape /
DrawingState types, useDrawing extended for commit + undo +
line-endpoint drag, line + freehand tools functional, full 7-tool
right-edge toolbar matching the design, button undo. Toolbar fades
with the rest of the chrome on the 3s auto-hide.

Several follow-on items belong to later phases:

1. **Circle, angle, plane, select tools** — Phase 2.3. The toolbar
   already renders their icons and they're toggleable; the canvas
   stays in pass-through mode when they're selected (`enabled`
   only flips for line + freehand). Phase 2.3 will fill in the
   shape-creation logic + hit-testing for select.
2. **Color picker** — Phase 2.3. The color dot in the toolbar is
   currently static white. `colors.drawing.{white,gold,red,blue}`
   are wired in the theme but no picker UI exists.
3. **Persistence + load** — Phase 2.4. Shapes live in memory only;
   leaving and re-entering PlaybackScreen drops them. Phase 2.4
   will normalize to [0,1] coords, write to `videos.drawings`
   (debounced 1s), and load on open.
4. **Share current frame** — Phase 2.4. Top-bar share button is
   still a toast placeholder.
5. **Freehand perf** — currently every onUpdate from RNGH triggers
   a setState; on extremely long strokes this could lag. Acceptable
   for v1; revisit if jank appears in user testing. Mitigations on
   the table: throttle setState (e.g. every 16ms), or render the
   in-progress shape via a Reanimated shared value path.

---

## Phase 2.3 — what's next

**Status:** Phase 2.3 ships the §22 acceptance: circle / plane / angle
/ select tools, 4-color picker popover from the toolbar's color dot,
trash button in the toolbar when something is selected, and a
gold-halo treatment on the selected shape. `useDrawing.onCanvasTap`
returns a consumed boolean so Angle and Select absorb taps without
toggling chrome.

Open follow-ons for Phase 2.4:

1. **Persistence + load.** Phase 2.4 normalizes shapes to [0,1] and
   debounce-writes to `videos.drawings`. Loads on PlaybackScreen
   open. Today shapes are in-memory only — leaving the screen drops
   them.
2. **Share current frame.** `react-native-view-shot` to capture the
   video frame + SVG overlay and either save to camera roll or open
   the share sheet. The top-bar share button currently only toasts
   "coming soon".

---

## Phase 2.3 — selection deferrals

- **Multi-select.** Single-shape selection only; lasso / shift-tap
  multi-select would be useful for batch delete + move but isn't
  in §22 scope.
- **Plane endpoint drag.** Lines have draggable endpoints when the
  Line tool is active; PlaneShape doesn't (yet). Consider adding
  endpoint drag when Select is active and a plane is the selected
  shape.
- **Angle ray drag.** Same as plane — once an angle is committed,
  rays can't be reshaped. Drag-to-edit would land alongside the
  same Select-mode endpoint affordance.
- **Color picker dismiss-on-outside-tap.** Currently the popover
  dismisses when a swatch is selected; tapping elsewhere on the
  screen doesn't close it. Acceptable since the popover is small;
  revisit if user testing flags it.

---

## Phase 2.4 — Drawing persistence + share — what's next

**Status:** Phase 2.4 ships the §22 acceptance:
- `useDrawingPersistence` loads saved drawings on `PlaybackScreen`
  open (videoId path) and debounce-writes any change to
  `videos.drawings` 1 second after it settles. Coordinates are
  normalized to `[0,1]` on disk with a `v: 1` version marker.
- `react-native-view-shot` installed; `useShareSwing` captures the
  player + canvas into a JPEG and hands off to iOS Share Sheet
  (which provides "Save Image" via the existing
  `NSPhotoLibraryAddUsageDescription`).
- Bad / unrecognized persisted JSON toasts "Could not load
  annotations." and falls through to a blank canvas (no crash).

Open follow-ons:

1. **Persistence for the fresh-recording path.** `localUri` routes
   skip persistence (no row yet). Once Phase 1.4's upload pipeline
   commits a row, the user could re-open from the library and the
   drawings would load — but if they leave the recording screen
   without re-opening, the drawings are lost. Acceptable for v1;
   revisit if user testing flags it.

2. **Conflict resolution.** If two devices edit the same video's
   `drawings`, last-writer-wins. Acceptable for a single-user MVP;
   revisit when multi-device sync is on the menu.

3. **Share format choice.** Currently always JPEG (quality 0.9).
   PNG would preserve transparency; not relevant for a snapshot of
   a video frame, so leaving JPEG.

4. **Sharing while paused vs. playing.** `view-shot` captures
   whatever is on-screen at the moment of `captureRef()`. If the
   video is playing the captured frame may not be the one the user
   intended. Phase 1.7 already pauses on most user interactions;
   we may want to explicitly pause inside `share()` and resume
   after to make the capture deterministic. TODO.

5. **Schema migrations.** The `v: 1` marker lets us evolve the
   persisted shape later. Phase 3+ pose data and Phase 4 analysis
   results may grow the schema; the upgrade story is: increment
   `v`, write a one-time forward migrator. Document this when
   `v: 2` ships.

---

## Phase 3.1 — Pose engine swapped to Apple Vision (spec deviation)

**Status:** Phase 3.1 ships working — `src/core/pose/` boots
successfully on iOS sim and reports `'ready'`. The actual engine
is **Apple Vision** (`VNDetectHumanBodyPoseRequest`), wired through
a local RN package at `packages/caddie-pose/` that exposes
`initialize()` + `detectOnImage(path)` via an Objective-C bridge.

**Why we deviated from the spec's named MediaPipe package:**

1. `react-native-mediapipe@0.6.0` targets Vision Camera 4's plugin
   header layout; we're on VC5. Build failed with
   `'VisionCamera/FrameProcessorPlugin.h' file not found`.
2. The package also requires `react-native-worklets-core` (not the
   `react-native-worklets` we have from Reanimated 4).
3. The package's whole architecture is built for live-camera frame
   processors — but our spec wants per-frame inference on recorded
   video during scrub (Phase 3.2). The frame-processor machinery
   would be unused machinery we'd still have to maintain.

PROJECT_SPEC.md §16 Risk 4 explicitly contemplates a direct native
bridge as the fallback. We took that path with Apple Vision instead
of MediaPipe iOS SDK because:
   - Apple Vision is built into iOS (0 MB binary cost vs ~50 MB
     for MediaPipe SDK + model file).
   - 19 body landmarks covers every joint the spec's §22 Phase 3.3
     metrics need: shoulders, elbows, wrists, hips, knees, ankles,
     hands, head, spine.
   - Zero third-party risk — Apple isn't deprecating Vision.

**Migration path back to MediaPipe** (if ever needed):
   - Only `packages/caddie-pose/` changes. The `src/core/pose/`
     abstraction stays.
   - Replace the ObjC bridge with one that loads
     `pose_landmarker_lite.task` and calls Google's
     `MediaPipeTasksVision` SDK.
   - 33 landmarks instead of 19 — would need to expand the
     landmark-name map (Phase 3.2's `landmarks.ts`).

**Engine internals worth knowing:**
   - `CaddiePose.m` in `packages/caddie-pose/ios/` runs detection
     on a dedicated serial dispatch queue so the JS thread stays
     responsive.
   - Vision normalises Y bottom-up; the bridge flips it so y=0 is
     top, matching our SVG / DrawingCanvas convention.
   - Landmark names come through as Vision's raw joint names
     (`left_shoulder_1_joint`, etc.). Phase 3.2 will add
     `src/core/pose/landmarks.ts` to map to a stable schema
     (`leftShoulder`, etc.) before consumers see them.

**Phase 3.2 — Pose overlay on playback — DONE.**
   - `PoseOverlay` (`src/features/pose/components/`) — React.memo SVG,
     `pointerEvents="none"`, draws bones + joints scaled into the
     `resizeMode="contain"` letterbox, key joints (wrists/hips/
     shoulders) highlighted, single translucent head circle, returns
     null when there's nothing to draw.
   - `usePoseFrame` (`src/features/pose/hooks/`) — debounced (settle-
     based), single-flight, latest-wins detection gated on
     enabled && ready && uri.
   - `src/core/pose/landmarks.ts` — raw Vision rig names → stable
     `PoseJoint` schema (+ defensive simple-name aliases), bone list,
     key/face joint sets, `toPoseFrame()` (confidence-filtered).
   - Toggle pill in `PlaybackChrome` (top-left, gold-when-active per
     DESIGN_SYSTEM §14); only shows once the engine reports `ready`.

   **Frame extraction decision (the crux):** view-shot can't capture
   `react-native-video`'s AVPlayerLayer on iOS (comes back black), so
   the `caddie-pose` bridge gained `detectOnVideoFrame(uri, timeMs)` —
   `AVAssetImageGenerator` grabs the exact upright frame, then runs the
   same Vision request. Engine work stays in the bridge (§16 Risk 4);
   the `src/core/pose` abstraction surface is unchanged. It returns the
   upright frame's width/height so the overlay projects landmarks
   without guessing display orientation. Podspec gained AVFoundation +
   CoreMedia. This same native method sets up Phase 4.2 frame
   extraction.

   **Verify on device/sim:** Apple Vision raw joint-name strings are
   mapped defensively (rig names + simple aliases); `toPoseFrame` emits
   a `__DEV__` warn for any unmapped name — watch the sim console on
   first real detection to confirm the rig names match.

---

## Phase 3.3 — metric overlay display deferred (compute layer shipped)

**Status:** Phase 3.3's compute half ships — `src/core/pose/metrics.ts`
(`computePoseMetrics`) derives the four §3.3 metrics (shoulder rotation,
hip–shoulder separation, spine tilt, head delta) from a `PoseFrame`, pure
and unit-tested, exported from `@/core/pose`. The **"small collapsible
metric overlay when pose active"** bullet is **intentionally not built.**

**Why deferred (product decision, 2026-06-17):** A single phone camera
can't recover true axial rotation, so these are 2D image-plane proxies —
approximate by nature. Surfacing approximate numbers as precise on-screen
readouts would mislead, and an always-on HUD clutters the premium
playback surface for limited payoff. The user explicitly chose to skip
the display for now.

**Why the compute layer still ships:** §3.3 says these metrics "feed into
Phase 4 frame classification," and TODO's Phase 1.7 item #4 (impact-frame
scrub marker) reads the impact timestamp from here. That consumer uses
the metrics as *relative* signals over the pre-computed track (peak
shoulder turn = top of backswing, separation crossing ≈ impact), where
curve shape matters, not absolute accuracy — so approximate is fine and
the headless module earns its place. Building it now keeps phase order
and de-risks Phase 4.

**What to do at revisit (if the overlay is ever wanted):**
1. `usePoseMetrics(track, currentMs, swingHand)` hook — derive the
   address baseline from `track[0]` head, round + memoize so the view
   only re-renders when displayed values change.
2. `PoseMetricsOverlay` — `React.memo`, collapsible, `—` for null
   metrics, `pointerEvents="box-none"` wrap so it never steals the
   tap-to-toggle-chrome behaviour. No design reference exists (DESIGN_
   SYSTEM §14 covers only the skeleton), so a layout pass is needed —
   the "top-left stat card vs. bottom strip vs. left-edge pills" options
   were drafted but not chosen.
3. Mount in `PlaybackScreen` only when `poseEnabled && poseTrack.status
   === 'ready'`; resolve `swingHand` from `source.meta.swingHand`
   (library) or `params.swingHand` (recording).
4. Add tokenised HUD surface/border to `colors.pose` rather than the
   inline `rgba(...)` the analyze-card currently uses.

---

## Phase 4.1 — analyze-swing Edge Function: deployed; Claude 200 e2e in 4.4

**Status:** DEPLOYED 2026-06-17 to project `kjhoqbxuylczuemgjgpc`
(`analyze-swing` v1, ACTIVE, `verify_jwt` on, import map applied).
`ANTHROPIC_API_KEY` secret set on the project. Locally verified
(`deno test` 19 ✅, `deno lint`/`deno check` ✅) + live-verified end-to-end
up to the Claude call (4 probes — auth, validation, and key-wired/reached-
Claude; the successful `200` insert lands in 4.4).

**Live-verified (4 probes, 2026-06-17):**
- **A.** No Authorization header → `401` with the *platform's* body
  (gateway rejected before the function ran).
- **B.** Anon-key Bearer → passes the platform gate and reaches the
  handler, whose `getUser()` rejects the session-less token with the
  function's OWN `401` body (`{"error":{"code":"unauthorized",…}}`) —
  proving the deployed code executes its auth logic.
- **C.** Real user JWT (throwaway signup, email-confirm now off) + a
  7-frame payload → the function's `400`
  (`{"error":{"code":"bad_request",…}}`) — the authenticated request
  cleared `getUser()` and was rejected by `AnalyzeRequestSchema`'s
  `frames.length === 8` rule. Validation path confirmed live.
- **D.** Real user JWT + 8 (fake-base64) frames → `502`
  (`{"error":{"code":"upstream_error",…}}`), NOT `config_error`. This
  proves the request passed validation + the daily-limit check, the
  `ANTHROPIC_API_KEY` secret is wired, the call actually reached the
  Claude API, and the upstream-error branch handles a bad image.

**Still to verify end-to-end (Phase 4.4):** only the *successful* `200`
insert — Claude returns valid JSON → `analyses` row + token counts +
`has_analysis`/`analyses_run` bookkeeping. Not forced here because a real
`200` needs real swing frames (synthetic frames trip the schema's
`positives` min-1, exactly as Probe D showed). Every step *up to* the
Claude call is now live-verified; this last hop is unit-tested (19 deno
tests) + typechecked against the real SDK, and exercises naturally in 4.4
with a real signed-in user + a real uploaded video + real extracted frames.

**In-4.1 scoping (deliberate, spec-faithful):**
- The 4.1 cost guard is the **daily limit**. The **cache-skip** guard
  ("cache hit skips API call") + a `refresh` param + the `useAnalysis`
  hook + one-in-flight blocking are **Phase 4.4** per §22. The function
  analyzes + inserts on every authorized call for now.
- Real 8-frame extraction is **Phase 4.2** (`frameExtractor.ts`); 4.1
  accepts whatever `frames[8]` it's handed.
- Prompt + Claude-output schema live server-side (Option A). The app-side
  `src/core/claude/` mirror (PROMPT_VERSION + API-envelope schema for the
  app to validate the function's response) lands in **Phase 4.4**.

**Toolchain:** Edge Functions are Deno (`deno` installed via brew). Run
`deno test|lint|check --config supabase/functions/analyze-swing/deno.json
supabase/functions/analyze-swing/`. The app's tsconfig/eslint/jest now
exclude `supabase/`.

---

## Phase 4.2 — Frame extraction utility: shipped (render verifies in 4.4)

**Status:** SHIPPED 2026-06-17. Headless utility that turns a swing video
into the 8 canonical analysis frames (base64 JPEGs ≤1200px @ q85). Consumed
in Phase 4.4 — nothing in the UI calls it yet (same shape as 4.1).

**What shipped:**
- `src/constants/swingPositions.ts` — extended the existing scaffold with a
  stable `id` per position + the fallback `fallbackFraction` schedule
  (10/20/30/45/55/65/75/90%). Kept `name`/`detection`/`as const`.
- `src/constants/config.ts` — `ANALYSIS_FRAME_MAX_PX = 1200`,
  `ANALYSIS_FRAME_JPEG_QUALITY = 85` (spec §22 4.2).
- **Native:** `caddie-pose`'s Obj-C bridge gains `extractJpegFrames(path,
  timesMs[], maxSize, quality) -> base64[]` — reuses the proven
  `localURLForVideo:` + `AVAssetImageGenerator` path (same decode pipeline
  Vision uses), encodes each frame to JPEG + base64, slots results by
  closest requested time, rejects on the first failed frame (clean 8-or-error).
- `core/pose` exposes it as `extractFrameJpegs`. **Deliberately NOT gated on
  the engine being `ready`:** frame extraction only decodes pixels (no
  Vision), so it must work when pose init fails (the Simulator, or any device
  where the Vision probe fails) — that's what lets the fallback path run.
- `src/utils/frameExtractor.ts` — `detectSwingPositions(track, swingHand)`
  (pure), `fallbackTimestamps(durationMs)` (pure), `extractAnalysisFrames`
  (orchestration: pose path when ready+classifiable, else fallback, then
  render). Returns `{ frames, strategy, timestampsMs }`.

**Deviation from the spec bullet (deliberate):** spec says detection happens
"via `detectPose`" (single image); we use the existing `precomputePoses`
batch track instead — locating "max shoulder rotation" / "wrists lowest"
needs poses across the WHOLE swing, so calling single-frame `detectPose`
~100× would be absurd + slower. The batch path already exists (3.2 overlay).

**swingHand (non-negotiable):** the spec's R-handed signals are generalised
to lead/trail; the load-bearing one — top-of-backswing = peak shoulder
rotation — is sign-normalised by hand inside `computePoseMetrics`, so the
same argmax finds the top for both hands. A unit test pins that a
right-handed swing read as left-handed bails to fallback (sign inverts).

**2D limits / device tuning:** these are single-camera image-plane signals
(see `core/pose/metrics`) — good enough to anchor the swing (top, impact)
and interpolate the rest by phase, but the precise pose-path classification
is tuned on a **physical device** (the Simulator can't run Vision at all),
same constraint as the pose overlay. Until then the **fallback covers the
Simulator** and any device where pose init fails.

**Verified:**
- `tsc` clean, `eslint src/` clean, **`jest` 370/370** (13 new: detector
  anchoring for both hands, ordering, wrong-hand → null, too-short → null,
  no-swing → null; the fallback schedule; orchestration branching across
  pose / not-ready / unclassifiable / pre-compute-throws).
- **Sim build+launch:** Debug build **SUCCEEDED, 0 errors**; the new Obj-C
  compiled, linked, and the app **booted clean** (Home renders, signed-in
  user, no redbox) → the native method is registered. A missing-symbol link
  error would have crashed at launch.

**Not yet exercised at runtime (lands in 4.4):** a real video → 8 base64
JPEGs. There's no UI caller until the analyze flow exists, so the native
method's *behaviour* (not just its linkage) verifies in 4.4 — the **fallback
path is checkable in the Simulator** then (no Vision needed), the pose path
on a device. The JS half is fully unit-tested; the native half mirrors the
already-proven batch extractor.

**Finding (pre-existing, not 4.2):** the build warns
`-Wunguarded-availability-new` at `CaddiePose.m` on the EXISTING
`detectOnVideoFrame`'s singular `generateCGImageAsynchronouslyForTime:`
(iOS 16+) under an `if (@available(iOS 14.0, *))` guard. My new method uses
the **plural** `generateCGImagesAsynchronouslyForTimes:` (iOS 14+), so it's
unaffected — but the singular call in 3.2's code should get an iOS-16 guard
or be switched to the plural API on a cleanup pass.

**4.4 wiring:** call `extractAnalysisFrames(uri, { swingHand, durationMs })`
in the analyze flow; pass `frames` to the Edge Function and feed
`timestampsMs`/`strategy` into `frameRefs`/diagnostics.

---

## Video trim / clip-to-swing

**Status:** ✅ Shipped (post-Phase 5.5 polish). Recordings + imports open
on the PlaybackScreen in REVIEW mode; a **Trim** button opens a
filmstrip + drag-handle TrimBar, and **Save to library** trims (once,
on save) then uploads — so only the swing is stored. Built on an
AVFoundation Obj-C bridge (`packages/caddie-trim` → `src/core/trim`,
mirrors caddie-pose), with the trim UI in `src/features/trimming`. The
filmstrip reuses `@/core/pose`'s `extractFrameJpegs`.

**Deferred:**
- **Library re-trim** — already-uploaded (`videoId`) clips can't be
  re-trimmed yet (would need download → trim → re-upload/replace). Trim
  is hidden for library sources; scoped to recordings + imports for now.
- **Hard max length** — only a min trim length is enforced; clips are
  already ≤60s from capture/import. A ≤15s analysis cap could be added.

Original scoping notes (kept for reference):

**Why it matters** (more than just UX polish):

1. **Storage cost.** Uncropped imports can be 30–60s of which only
   2–4s is the actual swing. At average 8–12 MB/swing (§13),
   trimming 2x reduces our Supabase Storage spend by the same
   factor.
2. **Analysis quality.** Phase 4's Claude Vision pipeline extracts
   8 canonical frames (Phase 4.2 §14 frame extraction strategy).
   If the source clip is 80% pre-swing fidgeting, the canonical-
   position detection hits the wrong frames and the AI gets
   useless inputs. Trim-first → analysis is dramatically more
   accurate.
3. **Pose-detection compute.** Phase 3.2 will run pose detection
   per-frame on scrub. Less video = less wasted inference.
4. **Playback UX.** Scrub bar covers the swing motion, not the
   walk-up. Frame-step buttons get to "address position" in 1 tap
   instead of 20.

**Where the affordance fits:**

a. **Inline in `EditVideoSheet`** (Phase 1.8) — add a "Trim swing"
   row alongside title / club / hand / tags. Most discoverable;
   matches the existing edit pattern.
b. **As a step in the import flow** (Phase 1.6) — after the user
   picks a video, present a trim step before the
   `ImportConfirmSheet`. Bigger commitment; users see it for every
   import.
c. **Right after recording** (Phase 1.3) — auto-detect the swing
   window via pose (Phase 3.2+) and pre-trim. The user can adjust.

Option (a) is the cheapest first ship and stays user-initiated.
Options (b) and (c) layer on later.

**Implementation tradeoffs:**

| Approach | Stored file size | Latency | Quality |
|---|---|---|---|
| Metadata-only trim (clip on playback) | Same as original | Instant | Lossless |
| Re-encode trim (write a new file) | Smaller | ~2–10s per swing | Slight loss |

For our goals (storage savings + analysis focus), **re-encode is
the right call**. Use `react-native-video-trim` or call AVFoundation
directly via a small Obj-C bridge (mirrors the `caddie-pose`
pattern). The bridge would expose:

```
trimVideo(inputPath, startSec, endSec): Promise<{ uri, durationSec }>
```

Then plug the trimmed URI into the existing upload pipeline (no
changes to `src/utils/upload.ts` needed).

**Open questions for when this is picked up:**

- Trim UI: standard iOS-style scrub-with-handles, or two-number
  inputs? Standard handles are expected by iPhone users.
- Hard or soft cap on max trimmed length? We currently cap at 60s
  on input; trim could enforce ≤15s for analysis sanity.
- Preview the trimmed range before commit, or trim-and-commit
  in one tap?
- For library-resident videos: trim creates a NEW file, replacing
  the storage object — or keeps the original and adds a "trimmed"
  derivative? Replacement is simpler; preservation is friendlier.

**Suggested phase placement:** Phase 1.9 (new), inserted between
1.8 (Video management) and 2.1 (Drawing canvas foundation) per
the dependency map. The drawing/pose phases don't depend on it,
so it could also slot in later — but doing it before AI analysis
(Phase 4.x) means analysis ships against trimmed videos, which is
a big quality win.

---

## Phase 4.3 — Analysis screen UI: shipped (mock data; wiring in 4.4)

**Status:** ✅ Components + screen built and unit-tested, rendering all three
states (loading / error / ready) from a typed mock. The data layer
(`useAnalysis` hook, Edge Function call, `analyses` cache, Pro gate, upgrade
flow) is Phase 4.4 / 4.5 — see those bullets below for what swaps in.

**Deliberate deviations (prototype vs. governing docs):**

1. **Score ring colour — bracket, not gold.** DESIGN_SYSTEM §5 SwingScore says
   "gold ring", but the high-fidelity prototype colours the ring by score
   *bracket* (78 = Great → success green) and reserves gold for the screen's
   single CTA (the §1 "gold once per screen" non-negotiable). We followed the
   prototype; `scoreBracket()` maps every bracket to a theme token. If we ever
   want the gold ring back, it's a one-line change in `scoreBracket`.

2. **IssueCard leading visual — severity glyph, not a frame thumbnail.** The
   §22 4.3 bullet says "frame thumbnail"; the prototype uses a severity-colour
   icon tile, and there are no real frames under mock data anyway. We followed
   the prototype. The data carries `frameIndex`, so a thumbnail
   (`frame_refs[frameIndex]`) can be added in 4.4 once real frames exist —
   decide then whether to keep the glyph, swap to the thumbnail, or show both.

**Deferred to a later phase:**

- **Pro gate state.** The prototype's third AnalysisScreen state (score visible
  + blurred teaser + "Get Pro" card) is the gated view. Phase 4.4 wraps the
  screen in `<ProGate feature="AI Coaching" />` / the in-context gate; 4.5
  builds the UpgradeSheet. Not built in 4.3.
- **Tempo card + "+N on last session" delta.** Both are in the prototype's
  ready screen but need pose-derived swing timing (backswing/downswing seconds,
  3:1 ratio) and prior-analysis history — neither is in the `analyses` model.
  Revisit with derived-pose metrics (Phase 3.3 compute layer) + progress
  tracking (V1). Omitted rather than faked.
- **Drill "Start" → real flow.** The gold "Start" CTA currently shows a
  "Guided drills are coming soon" Toast. `DrillCard` is already forward-
  compatible (AI_IMPLEMENTATION_GUIDE §13): pass a `thumbnailUri` + `onStart`
  and it renders a launchable video drill with no component change. Wire it to
  the static `src/constants/drills.ts` library (matched by `issue.name`) / V1
  drill videos when that lands.
- **Loading-state background still.** The prototype tucks a darkened swing
  frame behind the sparkle; with mock data there's no frame, so the background
  is solid. In 4.4 the loading state can show the current playback frame.
- **Staged-progress rows** ("Frames extracted / Pose detected / Generating
  coaching notes") are presentational in 4.3. 4.4 can drive them from the real
  pipeline (extract → pose → Claude). Note "Pose detected" won't be truthful on
  the Simulator (Vision can't run there) — gate the wording on the strategy the
  frame extractor actually used (`'pose'` vs `'fallback'`).

**Additions beyond the prototype's AnalysisScreen (spec-required):**

- **CoachingCard** renders the `summary` / `coaching_text` (a §22 4.3
  deliverable the prototype's analysis screen doesn't draw) in the Home
  screen's quoted-coaching style, with a *neutral* AI mark so gold stays on the
  drill CTA only.
- **Header share** uses RN's built-in `Share` on the summary + score (no new
  dep). Harmless on mock data; shares the real analysis in 4.4.

**Remove in 4.4:**

- `src/features/analysis/mockAnalysis.ts` — replaced by the `useAnalysis` hook
  (cached `analyses` row → `SwingAnalysis` via the `coaching_text`/`swing_score`
  → `summary`/`score` mapping).
- The `__DEV__` state switcher in `AnalysisScreen` — it exists only so all
  three states are inspectable on the Simulator; real state comes from the hook.

**Minor visual notes:** the drill "Start" reuses the `Button` primitive
(rounded-rect) rather than the mock's full-pill radius (one-Button rule wins,
AI_IMPLEMENTATION_GUIDE §7); the SwingScore ring drops the prototype's
`drop-shadow` glow (react-native-svg filter support is unreliable).

---

## Phase 4.4 — End-to-end analysis flow: wired (real Claude e2e pending device)

**Status:** ✅ Built in two commits. (a) `useAnalysis` + `parseAnalysis` +
AnalysisScreen wired to live data behind `<ProGate feature="AI Coaching" />`;
(b) the gold "Analyse with AI" CTA on PlaybackScreen → `Analysis { videoId }`.
Cache hit renders with no API call; a miss extracts the 8 frames and calls the
`analyze-swing` Edge Function (Claude key never ships). Full gate green;
sim build clean + the ProGate state verified on device.

**✅ Verified on device (2026-06-18) — closes the §4.1 "Claude 200 e2e in
4.4" item.** Recorded a real swing → "Analyse with AI" → the Edge Function
returned a 200 with a valid analysis → report rendered; re-opening hit the
cache (no second Claude call). Flow + logic confirmed working as intended;
some UI/UX polish on the report is noted for later but doesn't block.

**Deliberate decisions:**
- **Pro gate = the mandated `<ProGate feature="AI Coaching" />`**, NOT the
  prototype's bespoke "score visible + blurred teaser + Get Pro" gate. The
  CLAUDE.md non-negotiable ("Pro gating is always `<ProGate>`, never a custom
  modal") wins. A free user can't see a score anyway — computing it needs the
  Claude call. If we ever want the richer in-context gate, extend the ProGate
  component (don't inline a one-off).
- **Fresh-recording CTA appears only after upload completes** — a swing has no
  `videoId` until its row exists, and you can't analyse an unsaved swing. The
  CTA is hidden during the background upload, then revealed (PlaybackScreen
  captures `uploadRecording`'s returned `videoId`).
- **Null video meta defaults**: the Edge Function requires non-empty
  `cameraAngle`/`clubType`; when the row has null we send `'face-on'` /
  `'Unknown'`. Revisit if it skews Claude's read.

**Deferred:**
- **`previousIssues` is sent as `[]`.** §14 wants prior-swing issue context fed
  to the prompt for continuity — enrich from the user's recent `analyses` once
  progress tracking exists.
- **Loading staged-progress is still presentational** (carried from 4.3). 4.4
  could drive "Frames extracted / Pose detected / Generating…" from the real
  pipeline — and gate the "Pose detected" wording on the frame extractor's
  actual `strategy` ('pose' vs 'fallback'), since pose can't run on the sim.
- **Explicit "Refresh analysis" affordance**: the hook exposes `refresh()`
  (used by error-retry) but there's no refresh button in the report UI yet
  (§14 "regenerated only when the user taps refresh"). Add one when wanted.
- **UpgradeSheet (Phase 4.5)**: the ProGate "Upgrade to Pro" CTA is still the
  Phase-0.8 no-op (warns in `__DEV__`). 4.5 wires RevenueCat `purchasePackage`.

---

## Phase 4.5 — Upgrade flow: wired (sandbox purchase pending device)

**Status:** ✅ Built. RevenueCat client gained `getProPackages` /
`purchaseProPackage` (user-cancel handled) / `restorePro`; `useUpgrade`
orchestrates load → purchase/restore → `setIsPro` + dismiss; `UpgradeSheet`
is a Toast-style global singleton (`UpgradeSheet.show()`) with a host in
App.tsx; ProGate's "Upgrade to Pro" now opens it. Full gate green; sim build
clean.

**Pending on-device verification (the §22 4.5 "sandbox purchase works
end-to-end" exit):** RevenueCat offerings don't load on the Simulator (no
StoreKit config there — the persistent `[RevenueCat] Error fetching
offerings` toast), so the sheet shows its "plans unavailable" state on the
sim. The real purchase path needs a device + a StoreKit/sandbox tester
account + the `caddie_pro_monthly` / `caddie_pro_annual` products configured
in App Store Connect AND mapped to the RevenueCat dashboard offering. Verify
on device: tap a Pro gate → sheet shows the two plans with prices → buy the
sandbox monthly → `isPro` flips → the gated feature delivers; then Restore on
a fresh install brings Pro back. (Until products are configured the sheet
reads "unavailable" even on device.)

**Deliberate decisions:**
- **Restore lives in the UpgradeSheet** for now. PROJECT_SPEC §22 4.5 also
  wants a "Restore purchases" entry in SettingsScreen, but that screen is
  still a Phase-5.4 `Placeholder` — add the Settings entry (and "Manage
  subscription") when 5.4 builds it. The design's subscription *manage* sheet
  (switch plan / restore / renewal date, Screens.dc.html ~1540–1607) is also
  a 5.4 concern.
- **No design mock for the paywall** — the sheet is built on-brand from §17
  (crown, gold "Best value" annual, plan rows, restore). UI/UX polish later.
- **Plan tap purchases immediately** (§17 "Tap plan → purchasePackage()") —
  no intermediate "Subscribe" button.
- **`UpgradeSheet`/`useUpgrade` import ui primitives directly** (not the
  `@/components/ui` barrel) to keep the graph acyclic — the barrel re-exports
  ProGate, which imports the UpgradeSheet.

**Deferred / future:**
- **Free-trial / intro-offer copy** ("7-day free trial" in the design) — read
  it from the RC package's intro price instead of hardcoding, once products
  carry a trial.
- **Annual savings %** ("Save 50%") — compute from the two `priceString`s (or
  RC's relative discount) rather than just the "Best value" tag.
- **Promo-code redemption** (the design's Profile screen has a redeem row) —
  RevenueCat offer codes / promo entitlements; not in 4.5.

---

## Phase 5.1 — Side-by-side comparison

**Status:** ✅ 5.1a (pick two swings + independent playback/scrub/speed),
✅ 5.1b (Sync strip/toggle, per-panel mark-impact + amber scrub tick,
sync-coupled offset-aligned scrub + shared transport, per-panel pose overlay),
and ✅ 5.1c (landscape side-by-side via auto-rotation) shipped. Full gate green
(tsc / eslint / 517 jest); sim native build + launch clean.

**Sync semantics — Option A (the Design note's reading).** Once both panels
have an impact marked, Sync couples the two timelines by their impact offset:
scrubbing one drives the other to the same point relative to impact, and
play/pause is shared. **Each panel keeps its own speed** (Screens.dc.html §05:
*"Each video keeps its own speed … Sync locks the two timelines to that
frame"*), implemented by overriding only `seekMs` + `toggle` on the composed
panels in `useComparison` (ComparePanel's wiring is untouched). Consequence:
simultaneous play at *different* speeds drifts after impact — expected; at the
shared 0.5× default they stay aligned. If lockstep playback is ever wanted,
make Sync also share the rate (override `setRate`) so both run at one speed.

**Per-panel control placement (not in the static design).** The prototype
draws neither a per-video pose toggle nor a mark-impact control, but §5 +
§22 5.1 require "pose overlay per video" and the brief requires per-panel
mark-impact. Added as a top-right floating-glass-pill cluster mirroring the
top-left label pill: Pose (only when the engine is `ready`) + Impact (amber
flag when set). Revisit if a future design pass specifies these.

**Landscape — auto-rotation (5.1c).** The app is portrait-first; only the
Comparison screen opts into landscape (the Design's *primary* layout). Chosen
mechanism: `react-native-orientation-locker` (the lighter path — it ships the
JS bridge + the `Orientation` class, so the only native glue we own is one
AppDelegate hook). Wiring:
- `react-native-orientation-locker@1.7.0` added; isolated behind
  `src/core/orientation` (mirrors how core/pose hides caddie-pose).
- Info.plist: iPhone `UISupportedInterfaceOrientations` now lists portrait +
  landscape L/R (the superset; the AppDelegate narrows it per-window).
- `AppDelegate.swift` implements `supportedInterfaceOrientationsFor` →
  `Orientation.getOrientation()`; reachable from Swift via a new
  `Caddie-Bridging-Header.h` (`SWIFT_OBJC_BRIDGING_HEADER` set in pbxproj for
  Debug + Release).
- `OrientationBootstrap` locks portrait at launch; `ComparisonScreen`
  `useFocusEffect` unlocks on focus / re-locks on blur.
- Layout is responsive via `useWindowDimensions` (no separate route):
  `ComparisonPlayer` renders the portrait stack (Sync strip) or the landscape
  row (faint amber center axis + floating Sync pill); `SyncToggle` is shared
  (variants `strip`/`floating`); panels move their control cluster to the
  outer corners in landscape so neither collides with the center Sync.
- *Verified:* native build + launch clean on RN 0.86 / new arch (legacy module
  works through the interop layer). Rotating the sim to see side-by-side is a
  manual visual check (no rotate tool in this env) — handed to the user.

**Deferred:**
- **Header overflow "…" menu** (portrait design, top-right) — swap sides /
  reset / etc. The right header slot is intentionally an empty spacer for now;
  no dead button rendered.
- **Alpha-of-token colors → theme.** Two amber/green accents are currently
  local `rgba(...)` constants (consistent with this feature's other overlay
  chrome) rather than tokens: the Design's brighter sync-on green (#6DC98A,
  also inlined in `Badge.tsx`'s success variant; today the toggle reuses
  `semantic.success` #4A9B6F), and the landscape center-axis line
  (`rgba(196,125,42,0.3)` = `semantic.warning` at 30% in `ComparisonPlayer`).
  Promote both to named theme tokens (alpha variants, like `colors.pose.*`).
- **Impact tick vs. slider thumb inset.** The amber tick is positioned by a
  simple `left: fraction%` over the community Slider, which insets its track
  by ~half the thumb — so the tick is a hair off near the very ends (fine
  mid-swing, where impact lives). Tighten if it ever reads wrong.

**Pose is device-only to verify visually** — the Simulator can't run Apple
Vision body-pose, so the per-panel skeleton + "Analyzing pose…" indicator are
confirmed on a physical device (see the device-verification item up top). The
toggle correctly stays hidden on the sim (engine never reports `ready`).

---

## Phase 5.3 — Metronome audio swapped to react-native-audio-api (spec deviation)

**Decision:** The tempo metronome uses **react-native-audio-api** (Software
Mansion) for audio, not the `react-native-sound` named in PROJECT_SPEC §8.
Documented in §8 + §16 Risk 8; mirrors the §16 Risk 4 pattern (swap a
spec-named package that doesn't fit, keep the abstraction stable).

**Why:**
1. `react-native-sound` is uninstalled and effectively unmaintained (last
   release ~2021); it predates this app's New Architecture (RN 0.86, Fabric/
   Hermes, Reanimated 4, Nitro) — real build/compat risk.
2. A metronome needs accurate timing. `react-native-sound` would be driven by a
   JS `setInterval`, which drifts. `react-native-audio-api` exposes the Web
   Audio API, so clicks are scheduled on the audio clock via a look-ahead
   scheduler ("A Tale of Two Clocks") — sample-accurate, drift-free.
3. It synthesises the click with an `OscillatorNode` → no audio asset to
   source, bundle, or licence.
4. Same maintainer/stack as Reanimated (already a core dep), so low ecosystem
   risk.

**Where:** engine in `src/features/tempo/metronome.ts` (`createMetronome()` →
`start/setBpm/stop/dispose`); consumed by `src/features/tempo/hooks/useTempo.ts`.
The visual pulse (`PulseRing`) is a Reanimated loop at the beat duration,
decoupled from the audio scheduler (both driven by BPM) — matches the
prototype's CSS-timed rings.

**iOS audio session:** `AudioManager.setAudioSessionOptions({ iosCategory:
'playback', iosOptions: ['mixWithOthers'] })` so the click is audible through
the ring/silent switch and coexists with other audio. Audio plays on the
Simulator, so Phase 5.3 is fully sim-verifiable (unlike pose).

**Swap-back path:** only `metronome.ts` changes if we revert to another audio
library — `useTempo`'s engine interface stays identical.

**Residual / deferred:**
- **Haptics** — DESIGN_SYSTEM §8 calls for haptic feedback on key taps
  (play/stop, long-press save). `react-native-haptic-feedback` (PROJECT_SPEC §8)
  is **not installed**; haptics are deferred to Phase 5.5 polish to avoid a
  second native dep here. Metronome feedback is audio + visual for now.
- **Preset save failure** keeps the optimistic in-memory value and shows a Toast
  rather than reverting (a low-stakes write; reverting a just-made save is more
  jarring than a stale-until-retry value).

---

## Phase 5.4 — Profile & settings (built UI, deferred wiring)

ProfileScreen ships the full Design §06 layout; several rows are UI-only for
now (per the user — build the design, wire later). Remaining wiring:

- **Avatar upload** — deferred; needs a public `avatars` Storage bucket (+RLS)
  and an image-picker upload writing `profiles.avatar_url`. The edit pencil
  toasts "coming soon" today.
- **Local-only prefs** (`src/features/profile/profilePrefs.ts`, MMKV): the
  Auto-analyse, Pose-overlay-default, Practice-reminders, Weekly-email toggles
  and the Handicap input persist but drive nothing yet. Wire: auto-analyse →
  analysis pipeline; pose-default → PlaybackScreen's pose toggle initial;
  reminders/weekly-email → notification scheduling/push; handicap → a real
  `profiles.handicap` column (migration + types regen).
- **"Coming soon" rows**: Redeem promo code (RevenueCat redemption), Full-name
  edit, Password change, the header settings button.
- **Support links** use placeholder URLs (`PRIVACY_URL`/`TERMS_URL`/`HELP_URL`
  in `config.ts`) — point at real pages before launch.
- **Cross-device default angle/club**: device-local (MMKV) today; add
  `default_camera_angle`/`default_club` columns if we want them synced.
- **Pushed SettingsScreen route** is now unused (design consolidates into one
  ProfileScreen); placeholder + route remain harmless — remove or repurpose
  for a future detail screen (e.g. Manage subscription).
- **Clear cache** (spec'd) omitted — no defined cache layer to clear yet.

---

## react-native-orientation-locker — teardown listener warning (suppressed in dev)

**Symptom:** dev red box "Attempted to remove more Orientation listeners than
added", trace through `-[Orientation dealloc] → -[RCTEventEmitter
removeListeners:]`. Fires at module teardown (reload / app exit) on the New
Architecture (RN 0.86).

**Why it's benign:** RCTEventEmitter self-clamps (`_listenerCount = 0`), and
our code adds **no** orientation listeners — `core/orientation` only calls
`lockToPortrait` / `unlockAllOrientations` (imperative). It's an
`RCTLogError`, which red-boxes only in dev; release just logs.

**Mitigation (taken):** `LogBox.ignoreLogs([...])` in `index.js`, dev-only.

**Revisit:** drop the ignore if the library ships a New-Architecture fix. If
it ever surfaces in release or the lib stays unmaintained, options are
patch-package (clamp `removeListeners`) or a thin native shim — we only use
lock/unlock, so we don't need the event emitter at all.

---

## Done

- ~~Profile-driven capture defaults (swing hand + camera angle)~~ — 2026-06-22 (Phase 5.4); see the struck section above.

<!-- Move items here with a date when shipped, e.g.:
- ~~Wire `react-native-config` iOS build phase~~ — 2026-06-15, was a Phase 0.1 scaffold gap surfaced by Phase 0.6 simulator test
-->
