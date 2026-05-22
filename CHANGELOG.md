# Changelog

All notable releases to Stadium are documented here.

## v1.0.0 — First official release

Stadium is the home for **WebZero's builder programs on Polkadot**. It started as the site for a single hackathon and is now a recurring-events platform: hackathons, the M2 incubator, dogfooding sessions, and PitchOff competitions all live in one place, where builders show their work, the community explores it, and organizers run each event end to end.

### Who it's for

- **Visitors & the community** — anyone who wants to browse what's been built and discover teams.
- **Builders & teams** — the people who ship projects in WebZero programs and want them seen, supported, and funded.
- **Organizers & admins** — the WebZero team (and per-event partners) who run programs, review work, and pay out winners.

---

## What you can do with Stadium

### Discover & explore — for everyone, no account needed

- **Start from the landing page**, an entry point with a "space" for each program type (Hackathons, M2 Incubator, Dogfooding, PitchOff) that explains what each is.
- **Browse the directory** of every project/entry, with search and filtering, and live index stats (total entries, winners, projects in M2, total paid out).
- **Open any program** to see all of its projects.
- **Dive into a project** across tabs — overview, milestones, team, and updates — including live links (site, repo, demo, slides) and a "seeking funding" signal when a team is raising.
- **See the winners** of past events on dedicated winners pages.
- **Set the vibe** with the hardware-style brightness rack: a time-of-day theme and a SoundCloud player that keeps playing as you move between pages.

### Show your work & take part — for builders & teams

- **Sign in with your wallet** using SIWS (Sign-In With Substrate), with support for Polkadot/Substrate, Ethereum, and Solana wallets.
- **Apply to a program** as a team — or, if you don't have a Stadium project yet, **apply as a non-member** and Stadium emails the right team on your behalf.
- **Create and edit your project** — name, description, links, tech stack, and categories.
- **Manage your team and payout address**, including per-member roles and socials.
- **Post project updates** to keep the community and organizers in the loop.
- **Raise your hand for funding** by setting a funding signal on your project.
- **Run the M2 incubator track** end to end: agree on milestones, submit your final deliverables, watch your review status, and propose what comes next with a continuation ("what's next, milestone 3?").
- **Attach a contact email to your wallet** so organizers can reach you.

### Run your event — for organizers & admins

- **Sign in two ways:** with an admin **wallet** (SIWS), or via an **email magic link** for view-only program admins who don't use a wallet — with an onboarding email when they're invited.
- **Work within a tiered admin model:** app admins, global admins, and per-program admins, so partners can be scoped to just their event.
- **Create and edit programs** — hackathon, M2 incubator, dogfooding, or PitchOff — with dates, status, and rich, templatable content sections.
- **Manage sponsors** for each program.
- **Collect and triage participation** in one unified inbox that merges in-app applications and signups, **import attendees from a Luma CSV**, and **export the inbox to CSV** (hardened against spreadsheet formula-injection).
- **Apply on behalf of any project** as an admin when you need to.
- **Invite co-admins** by wallet or by email, and manage the admin list per program.
- **Review M2 submissions** — approve them or request changes.
- **Record and confirm payouts** in multiple currencies (USDC / DOT).
- **Keep an audit trail** with a per-program audit log of admin actions.

### Trust, safety & platform

- **SIWS verification** always checks the address inside the signed message, never a request header.
- **One sign-in, fewer popups:** a short-lived HMAC session token replaces repeated wallet signatures; the signing secret is validated at server boot.
- **Hardened by default:** security headers (helmet) and rate limiting on sensitive and public endpoints.
- **Privacy-aware:** public project data excludes personal contact information.

---

## Under the hood

- **Client:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui, deployed to Vercel.
- **Server:** Express 5 (ESM) on Supabase (Postgres), deployed to Railway.
- **Auth:** Polkadot-JS extension + SIWS, plus Supabase email magic-link for non-wallet admins.

Live at <https://stadium.joinwebzero.com>.
