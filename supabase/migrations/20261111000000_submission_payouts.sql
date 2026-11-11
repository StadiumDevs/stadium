-- Prize payouts for tracked programs (Free Society Hack): the winner's payout
-- details and one payment record per award, with the transaction as proof.
-- Additive only: program_submissions.paid stays (the server keeps it in sync),
-- and the current server ignores these tables, so this can be applied first.
--
-- 1. submission_payout_details: what the winning point person sends (legal
--    name, country of tax residence, USDC network and address). Its own table
--    so it never reaches judges or public payloads. No ID documents.
-- 2. submission_payments: one row per award paid ('privacy', 'agentic' or
--    'ecosystem'), with amount, network, address and tx hash snapshotted
--    when an admin records the payment.
--
-- Service role only (RLS on, no policies), like the other tables.
-- Mirrored in server/api/repositories/payout.repository.js.

CREATE TABLE IF NOT EXISTS submission_payout_details (
  submission_id TEXT PRIMARY KEY REFERENCES program_submissions(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  tax_country TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL,
  submitted_by_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS submission_payments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES program_submissions(id) ON DELETE CASCADE,
  award TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  paid_by TEXT,
  note TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, award)
);

CREATE INDEX IF NOT EXISTS submission_payments_submission_idx ON submission_payments (submission_id);

ALTER TABLE submission_payout_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_payments ENABLE ROW LEVEL SECURITY;
