import { useCallback, useEffect, useMemo, useState } from "react";
import { api, USE_MOCK_DATA, type AdminAuthArg } from "@/lib/api";
import {
  AWARD_DUE_TEXT,
  explorerUrl,
  networkLabel,
  shortAddress,
  type PayoutAward,
  type PayoutDetailsInput,
  type PayoutRow,
  type PayoutsTable,
} from "@/lib/payouts";
import { countryName } from "@/lib/countries";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PayoutDetailsForm } from "@/components/program/tracked/PayoutDetailsForm";
import { useToast } from "@/hooks/use-toast";

const field = "w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5";
const btn = "font-mono text-[10px] tracking-[0.14em] border px-2.5 py-1 disabled:opacity-50";
const primary = `${btn} border-display bg-display text-shell`;
const secondary = `${btn} border-hairline text-display hover:border-display`;

type Recording = { row: PayoutRow; award: PayoutAward };

/**
 * Prize payouts (platform admins): who has sent payout details, and a payment
 * record (tx hash as proof) per award. Recording a payment emails the winner
 * the transaction link and marks the entry paid once every award is paid.
 */
export function PayoutsAdminSection({ programSlug, getAuth }: { programSlug: string; getAuth: () => Promise<AdminAuthArg> }) {
  const { toast } = useToast();
  const [table, setTable] = useState<PayoutsTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [txHash, setTxHash] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PayoutRow | null>(null);
  const [undoing, setUndoing] = useState<Recording | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setTable(await api.listPayouts(programSlug, await getAuth()));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [getAuth, programSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const owed = (table?.rows ?? []).flatMap((r) => r.awards.filter((a) => a.payable && a.due !== "forfeited").map((a) => ({ r, a })));
    return {
      winners: owed.length ? new Set(owed.map((x) => x.r.submissionId)).size : 0,
      awards: owed.length,
      detailsIn: (table?.rows ?? []).filter((r) => r.details && r.awards.some((a) => a.payable && a.due !== "forfeited")).length,
      paid: owed.filter((x) => x.a.payment).length,
      total: owed.reduce((n, x) => n + x.a.amount, 0),
      paidTotal: owed.filter((x) => x.a.payment).reduce((n, x) => n + x.a.amount, 0),
      missing: (table?.rows ?? []).filter((r) => !r.details && r.awards.some((a) => a.payable && a.due !== "forfeited")).length,
    };
  }, [table]);

  const openRecord = (row: PayoutRow, award: PayoutAward) => {
    setRecording({ row, award });
    setTxHash("");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNote("");
  };

  const record = async () => {
    if (!recording) return;
    setBusy(true);
    try {
      const r = await api.recordPayoutPayment(
        programSlug,
        recording.row.submissionId,
        recording.award.award,
        { txHash: txHash.trim(), paidAt: paidAt || undefined, note: note.trim() || undefined },
        await getAuth(),
      );
      toast({
        title: `Marked paid: ${recording.row.projectTitle}`,
        description: r.emailed ? "The winner was emailed the transaction link." : USE_MOCK_DATA ? "Playground: no email sent." : `Not emailed (${r.emailReason ?? "unknown"}). Send them the link yourself.`,
      });
      setRecording(null);
      await load();
    } catch (e) {
      toast({ title: "Couldn't record the payment", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!undoing) return;
    try {
      await api.undoPayoutPayment(programSlug, undoing.row.submissionId, undoing.award.award, await getAuth());
      toast({ title: "Payment record removed" });
      await load();
    } catch (e) {
      toast({ title: "Couldn't undo", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUndoing(null);
    }
  };

  const saveDetails = async (input: PayoutDetailsInput) => {
    if (!editing) return;
    setBusy(true);
    try {
      await api.savePayoutDetails(programSlug, editing.submissionId, input, await getAuth());
      toast({ title: "Payout details saved" });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Couldn't save the details", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const requestDetails = async () => {
    try {
      const r = await api.requestPayoutDetails(programSlug, await getAuth());
      toast({
        title: USE_MOCK_DATA ? `Playground: ${r.eligible} winner(s) would be emailed` : `Emailed ${r.sent} winner(s)`,
        description: r.failed ? `${r.failed} failed: see the server log.` : undefined,
      });
    } catch (e) {
      toast({ title: "Couldn't send the emails", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRequestOpen(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const blob = await api.downloadPayoutsCsv(programSlug, await getAuth());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${programSlug}-payouts.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Couldn't download the CSV", description: (e as Error).message, variant: "destructive" });
    }
  };

  const preview = recording?.row.details ? explorerUrl(recording.row.details.network, txHash) : null;
  const currency = table?.currency ?? "USDC";

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Payouts" data-testid="payouts-admin">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="label-hw text-display">·PRIZE PAYOUTS</div>
          <p className="label-hw-dim normal-case mt-1">
            Winners send their own payout details from their project page (signed in with their submission email). Record each payment with
            its transaction hash: the winner is emailed the link.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} onClick={() => setRequestOpen(true)} disabled={!counts.missing} data-testid="payouts-request">
            EMAIL PAYOUT LINKS ({counts.missing})
          </button>
          <button type="button" className={secondary} onClick={downloadCsv} disabled={!table?.rows.length} data-testid="payouts-csv">
            DOWNLOAD CSV
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-warn">{error}</p>}
      {table && (
        <p className="font-mono text-[12px] text-body" data-testid="payouts-summary">
          {counts.winners} winners · details in {counts.detailsIn}/{counts.winners} · paid {counts.paid}/{counts.awards} awards · {counts.paidTotal}/
          {counts.total} {currency}
          {table.deadline ? ` · details due ${table.deadline}` : ""}
        </p>
      )}
      {table && table.rows.length === 0 && <p className="label-hw-dim">No winners yet. Award prizes and publish the results first.</p>}

      {table && table.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" data-testid="payouts-table">
            <thead>
              <tr className="label-hw-dim text-left">
                <th className="py-1 pr-3 font-normal">PROJECT</th>
                <th className="py-1 pr-3 font-normal">AWARD</th>
                <th className="py-1 pr-3 font-normal">DETAILS</th>
                <th className="py-1 pr-3 font-normal">PAYMENT</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.flatMap((r) =>
                r.awards.map((a, i) => (
                  <tr key={`${r.submissionId}-${a.award}`} className="border-t border-hairline-subtle align-top" data-testid="payout-row" data-award={a.award} data-submission={r.submissionId}>
                    <td className="py-2 pr-3">
                      {i === 0 && (
                        <>
                          <div className="text-display">{r.projectTitle}</div>
                          <div className="label-hw-dim normal-case">
                            {r.submitterName} · {r.email}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="text-body">{a.label}</div>
                      <div className="font-mono text-display">
                        {a.amount} {a.currency}
                      </div>
                      {a.payable && a.due !== "now" && <div className="label-hw-dim normal-case">{AWARD_DUE_TEXT[a.due]}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      {!a.payable ? (
                        <span className="label-hw-dim normal-case">Paid by {a.paidBy}</span>
                      ) : i > 0 && r.awards[0].payable ? (
                        <span className="label-hw-dim normal-case">same as above</span>
                      ) : r.details ? (
                        <div data-testid="payout-details">
                          <div className="text-body">
                            {r.details.legalName} · {countryName(r.details.taxCountry)}
                          </div>
                          <div className="font-mono text-display">
                            {networkLabel(r.details.network)}: {shortAddress(r.details.address)}{" "}
                            <button
                              type="button"
                              className="text-label-dim hover:text-display underline"
                              onClick={() => void navigator.clipboard?.writeText(r.details!.address).then(() => toast({ title: "Address copied" }))}
                              aria-label={`Copy ${r.projectTitle} payout address`}
                            >
                              copy
                            </button>
                          </div>
                          <button type="button" className="label-hw-dim hover:text-display underline normal-case" onClick={() => setEditing(r)}>
                            edit
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-warn" data-testid="payout-missing">
                            Not sent yet
                          </span>{" "}
                          <button type="button" className="label-hw-dim hover:text-display underline normal-case" onClick={() => setEditing(r)}>
                            enter
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {!a.payable || a.due === "forfeited" ? (
                        <span className="label-hw-dim normal-case">{a.due === "forfeited" ? AWARD_DUE_TEXT.forfeited : "n/a"}</span>
                      ) : a.payment ? (
                        <div data-testid="payout-paid">
                          <a href={a.payment.txUrl ?? undefined} target="_blank" rel="noreferrer" className="text-display underline">
                            Paid {a.payment.paidAt.slice(0, 10)} ↗
                          </a>
                          {a.payment.note && <div className="label-hw-dim normal-case">{a.payment.note}</div>}
                          <button type="button" className="block label-hw-dim hover:text-display underline normal-case" onClick={() => setUndoing({ row: r, award: a })}>
                            undo
                          </button>
                        </div>
                      ) : (
                        <button type="button" className={primary} disabled={!r.details} onClick={() => openRecord(r, a)} data-testid="payout-record">
                          RECORD PAYMENT
                        </button>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!recording} onOpenChange={(o) => !o && setRecording(null)}>
        <DialogContent className="bg-panel border-hairline" data-testid="payout-record-dialog">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-display">Record payment</DialogTitle>
            <DialogDescription>
              {recording && (
                <>
                  {recording.row.projectTitle}: {recording.award.label}, {recording.award.amount} {recording.award.currency} on{" "}
                  {networkLabel(recording.row.details?.network)} to <span className="font-mono break-all">{recording.row.details?.address}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="label-hw-dim">TRANSACTION HASH</span>
              <input className={field} value={txHash} onChange={(e) => setTxHash(e.target.value)} spellCheck={false} data-testid="payout-tx" />
              {txHash.trim() &&
                (preview ? (
                  <a href={preview} target="_blank" rel="noreferrer" className="block text-[11px] text-display underline break-all" data-testid="payout-tx-preview">
                    {preview} ↗
                  </a>
                ) : (
                  <span className="block text-[11px] text-warn">Not a {networkLabel(recording?.row.details?.network)} transaction hash.</span>
                ))}
            </label>
            <label className="block space-y-1">
              <span className="label-hw-dim">PAID ON</span>
              <input type="date" className={field} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="label-hw-dim">NOTE (OPTIONAL, ADMINS ONLY)</span>
              <input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="label-hw-dim normal-case">Saving emails the winner the transaction link.</p>
            <div className="flex gap-2">
              <button type="button" className={primary} disabled={!preview || busy} onClick={record} data-testid="payout-record-save">
                {busy ? "SAVING…" : "MARK PAID"}
              </button>
              <button type="button" className={secondary} onClick={() => setRecording(null)}>
                CANCEL
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-panel border-hairline">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-display">Payout details</DialogTitle>
            <DialogDescription>{editing?.projectTitle}: entered by an admin (for example from an email).</DialogDescription>
          </DialogHeader>
          {editing && table && (
            <PayoutDetailsForm networks={table.networks} currency={currency} initial={editing.details} asAdmin saving={busy} onSave={saveDetails} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!undoing} onOpenChange={(o) => !o && setUndoing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this payment record?</AlertDialogTitle>
            <AlertDialogDescription>
              {undoing?.row.projectTitle}: {undoing?.award.label}. This removes the record in Stadium only; it does not touch the transaction or
              email the winner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={undo}>Undo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={requestOpen} onOpenChange={setRequestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email payout links?</AlertDialogTitle>
            <AlertDialogDescription>
              Emails the {counts.missing} winner(s) who haven't sent payout details a link to their project page
              {table?.deadline ? `, asking for them by ${table.deadline}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={requestDetails} data-testid="payouts-request-confirm">
              Send emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
