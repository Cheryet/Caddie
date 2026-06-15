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

## Done

<!-- Move items here with a date when shipped, e.g.:
- ~~Wire `react-native-config` iOS build phase~~ — 2026-06-15, was a Phase 0.1 scaffold gap surfaced by Phase 0.6 simulator test
-->
