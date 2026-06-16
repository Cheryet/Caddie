# TODO.md

Deferred items and dev-time workarounds that need to be revisited before
production. Each entry is a deliberate trade-off, not a forgotten task — record
*why* it was deferred so the future revisit can make the same call (or not)
with full context.

Add new entries at the bottom under the section that fits. Strike through and
date items when they ship, then move them to the bottom under **## Done** so we
keep a paper trail.

---

## Authentication — email confirmation

**Status:** Workaround in place. Email confirmation is **disabled** on the
Supabase project (Authentication → Providers → Email → "Confirm email" off).

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

## Profile-driven capture defaults (swing hand + camera angle)

**Status:** `CameraScreen` hardcodes swing hand to `'right'` and camera
angle to `'face-on'` as the per-recording defaults. The screen still
lets the user override them per-recording (segmented controls), but it
ignores any profile preference.

**Why deferred:** ProfileScreen doesn't exist yet, and the `profiles`
table is missing `default_camera_angle` / `default_club` columns. Adding
them would require a migration + types regen + UI to set them. Out of
scope for Phase 1.3 — would prematurely overlap Phase 1.5 (ProfileScreen).

**Spec reference:** `PROJECT_SPEC.md` §4 line 63 — "Swing hand selector —
right or left handed (defaults to profile preference, overridable per
video)". Today we satisfy the *overridable per video* half; the *defaults
to profile preference* half is pending.

**Revisit when:** ProfileScreen lands (Phase 1.5 or earlier). Steps:
1. Add `default_camera_angle` + `default_club` columns to `profiles`
   via a Supabase migration; regenerate `src/types/database.ts`
2. Build a `useProfilePreferences` hook in `src/features/profile/hooks/`
3. In `CameraScreen`, replace the `useState` initialisers for
   `angle`, `swingHand`, `club` with hook-derived defaults; keep
   the local `useState` for per-recording overrides
4. Wire ProfileScreen's "Default camera angle" + "Default club" rows
   to update the profile row (see Design/Caddie Screens.dc.html line 1099)

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

## Library — search, filter chips, processing banner (Phase 1.5 deferred)

**Status:** `LibraryScreen` ships with the §22 Phase 1.5 acceptance — a
2-col `FlashList` grid, pull-to-refresh, skeleton loading, empty state
with record CTA, and `VideoCard` per the §11 anatomy. Three affordances
from `Design/Caddie Screens.dc.html` §04 are intentionally left out:

1. **Search bar** ("Search by club or date") under the header
2. **Filter chip row** (All / Driver / Irons / Analysed) and the filter
   modal trigger
3. **"Processing N swings from this morning…" banner** that surfaces an
   in-flight upload queue at the top of the loading state

**Why deferred:** §22 Phase 1.5 lists exactly four bullets — install
flash-list, useVideos hook, grid+refresh+empty+skeleton, VideoCard. The
above three are correctness for a later iteration, not Phase 1.5 scope.
Bundling them now would mix two phases and create test/refactor churn
when the real upload-status surfaces in Phase 1.4's NetInfo retry work
or Phase 1.8's filter sheet.

**Revisit when:** Library has enough rows that "find the swing from
two weeks ago" matters (search/filter), or when the upload queue surfaces
a visible state (processing banner — likely Phase 1.4 follow-up).

**What to do at revisit:**
1. Search: controlled TextInput → debounce → `videos.filter` over
   title/club_type (client-side is fine until row counts exceed ~500)
2. Filter chips: lift selected filter into local `useState`, derive
   visible list with `useMemo`
3. Processing banner: extend `useUploadQueueBootstrap` to expose an
   "in-flight count" signal, render an info row above the grid

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

## Library — VideoDetail screen (Phase 1.8)

**Status:** `VideoDetailScreen` is still a `Placeholder`. The Library
grid does NOT route into it — card tap goes straight to root-stack
`Playback` (matches the design caption: "Tapping a card runs the
expand-from-thumbnail transition into Playback"). The route remains in
`LibraryStackParamList` because the rename/retag/delete sheet from
Phase 1.8 will land there.

**Revisit when:** Phase 1.8 (Video management). The screen should host
the metadata edit form (title, club, angle, hand, tags) and a delete
action that fires both row delete + Storage delete.

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
2. **Pose toggle pill** (top-left, below the top bar). Phase 3.2 —
   Pose overlay.
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

**Phase 3.2 picks up from here:**
   - The abstraction's `detectPose(imagePath)` is wired and ready.
   - Build the `PoseOverlay` SVG component that subscribes to
     `usePoseStatus`, calls `detectPose` on the current frame,
     renders the skeleton.
   - Add the landmark-name map for stable schema.
   - Toggle on/off in the playback chrome.

---

## Future feature — Video trim / clip-to-swing

**Status:** Not scoped to any current phase. Captured as a user
suggestion worth doing.

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

## Done

<!-- Move items here with a date when shipped, e.g.:
- ~~Wire `react-native-config` iOS build phase~~ — 2026-06-15, was a Phase 0.1 scaffold gap surfaced by Phase 0.6 simulator test
-->
