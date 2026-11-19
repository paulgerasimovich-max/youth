@AGENTS.md

# Youth Group app

- Product spec and every decision made so far: `docs/SPEC.md`. Read it first and keep it updated when decisions change.
- The owner is not a developer: explain things in plain language, focusing on the logic, not on technical jargon.
- The app must have its OWN visual style (see `src/theme.ts`). Never reuse the style of the owner's other projects (website, money app, business app).
- UI language: English only (all buttons, labels, notifications, demo data). Talk to the owner in Russian.
- Copy tone: simple, casual, youth-friendly English — the way a friend talks. No formal or "smart-sounding" wording, but don't overdo slang either.
- Design-first: the owner reviews and edits how screens look before logic/backend work.
- Safe areas are mandatory on every screen: nothing (text, titles, buttons) may sit under the top notch / Dynamic Island / status bar strip, and the bottom needs padding for the home bar and rounded corners. Use `Screen` or `useSafeAreaInsets()`; full-bleed backgrounds (gradients) may extend under them, content may not. The browser preview simulates these insets via `src/components/PhonePreview.tsx`.
- Data security is requirement #1 (see SPEC): collect the minimum (name, sign-in email, optional birthday day+month — no phone, no password); every table has RLS and explicit grants; never add a table or policy without a matching test in `supabase/tests`. Run `npm run test:db` before `supabase db push`. The service-role key must never reach the app.
