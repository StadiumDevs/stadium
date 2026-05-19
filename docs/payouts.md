# Payouts — how teams get paid

**Stadium *records* payments; it does not *execute* them.** An admin sends the
funds out-of-band, then records the payment in the admin panel with a
transaction-proof URL. There is no automated on-chain payout in the app today —
this is the deliberate "manual settlement" model for launch.

## The process

1. **Payout address** — each project carries a payout address (`donation_address`)
   and its chain (`donation_chain`): Substrate, Ethereum, or Solana. A team sets
   it on the project's Team & Payments tab.
2. **Send the funds** — an admin transfers the money, outside this app:
   - **Substrate** — via the program's Polkadot Asset Hub multisig (signed in
     Polkadot-JS by the multisig signers).
   - **Ethereum / Solana** — fully manual, from a treasury wallet on that chain.
3. **Record it** — in the admin Winners table → payment modal, the admin enters
   the milestone (`M1` / `M2` / `BOUNTY`), amount, currency, and the
   **transaction-proof URL**. This appends an entry to the project's
   `totalPaid` via `POST /m2-program/:projectId/confirm-payment`.

## What the app does / does not do

- ✅ Stores payout addresses for any supported chain and records confirmed
  payments (with a proof URL) against each project.
- ✅ `Test Payment` (admin panel) constructs a small (≤ 1 DOT) **unsigned**
  Substrate transfer so admins can sanity-check wallet wiring — test tooling
  only; it does not pay anyone.
- ❌ Does **not** move tokens or submit transactions for any chain. Every payout
  is a manual transfer that an admin performs and then records.

## M2 program grant

Each M2 project has a planned grant entitlement stored per project
(`m2_milestone_1_amount` / `m2_milestone_2_amount` / `m2_currency` — see #26),
defaulting to **$2,500 + $2,500 USDC**. This is what the team is *owed*; it is
still paid by manual settlement and recorded like any other payment.

## Future — automated execution

Automated on-chain payout execution (Substrate + EVM + Solana) is tracked in
issue **#85**. It needs funded treasury wallets per chain and a security
review, so it is out of scope for launch. Until it lands, every payout is
manual settlement + recording as described above.
