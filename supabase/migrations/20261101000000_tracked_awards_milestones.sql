-- Tracked programs (Free Society Hack): awards by track, the Ecosystem Prize
-- flag, the testnet transaction check and the 30-day milestone. Additive only:
-- the Bitrefill flow keeps its prize_* columns, and the current server ignores
-- these columns, so this can be applied before the server deploy.
--
-- 1. prizes: the prize won in each judged track, { "privacy"?: tier,
--    "agentic"?: tier }, where tier = { amount, currency, label } snapshotted
--    from programs.prize_tiers (a project can win in both tracks).
-- 2. ecosystem_prize: the Ecosystem Prize flag (a second award for up to two
--    Privacy podium projects; not a prize tier).
-- 3. tx_check: Stadium's check of the submitted testnet transaction,
--    { status, checkedAt, attempts }. Server-set only, never from the client.
-- 4. milestone: the Ecosystem Prize 30-day milestone (partner, dates,
--    delivery link, payout). Builders edit only the sentence and delivery link.
--
-- Mirrored in server/api/repositories/program-submission.repository.js and
-- client/src/lib/api.ts (ApiTrackedSubmission).

ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS prizes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS ecosystem_prize BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS tx_check JSONB;
ALTER TABLE program_submissions ADD COLUMN IF NOT EXISTS milestone JSONB;
