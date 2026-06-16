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

## Done

<!-- Move items here with a date when shipped, e.g.:
- ~~Wire `react-native-config` iOS build phase~~ — 2026-06-15, was a Phase 0.1 scaffold gap surfaced by Phase 0.6 simulator test
-->
