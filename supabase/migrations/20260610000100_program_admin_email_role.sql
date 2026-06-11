-- Distinguish judges from admins on the email-keyed grant table.
--
-- An email grant now carries a role: 'admin' (the existing behaviour — view
-- access to a program's admin surface) or 'judge' (scoped write access to the
-- scoring endpoints only, enforced in requireProgramJudge). Existing rows
-- default to 'admin', so behaviour is unchanged for everyone already invited.
--
-- A judge's write power is deliberately narrow: it never unlocks the
-- payment/approval/program-mutation routes, which keep their wallet-keyed
-- requireAdmin / requireProgramAdmin gates.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE program_admin_emails
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'judge'));
