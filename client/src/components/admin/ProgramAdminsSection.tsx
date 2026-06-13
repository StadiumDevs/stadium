import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, Mail, Wallet } from "lucide-react";
import { api, type ApiProgramAdmin, type ApiProgramAdminEmail, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type ChainOption = ApiProgramAdmin["walletChain"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The program's admins + judges. On the program page this renders a single
 * READ-ONLY list (email grants + per-program wallet admins). With `editable`
 * (used inside the program EDIT modal, global-admins only) it also shows the
 * add-wallet / invite-email forms and per-row REMOVE controls.
 *
 * Each mutating call is gated on a fresh auth header from `signAuthHeader`.
 * `reloadToken` lets the page refetch after edits made elsewhere (the modal).
 */
export function ProgramAdminsSection({
  programSlug,
  signAuthHeader,
  editable = false,
  reloadToken,
}: {
  programSlug: string;
  signAuthHeader: () => Promise<import("@/lib/api").AdminAuthArg>;
  editable?: boolean;
  reloadToken?: number;
}) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<ApiProgramAdmin[]>([]);
  const [emailAdmins, setEmailAdmins] = useState<ApiProgramAdminEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wallet, setWallet] = useState("");
  const [chain, setChain] = useState<ChainOption>("substrate");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "judge">("admin");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const authHeader = await signAuthHeader();
      const [walletRes, emailRes] = await Promise.all([
        api.listProgramAdmins(programSlug, authHeader),
        api.listProgramAdminEmails(programSlug, authHeader),
      ]);
      setAdmins(walletRes.data);
      setEmailAdmins(emailRes.data);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't load admins",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [programSlug, signAuthHeader, toast]);

  useEffect(() => {
    if (programSlug) load();
  }, [programSlug, load, reloadToken]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!EMAIL_RE.test(email)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const authHeader = await signAuthHeader();
      const res = await api.inviteProgramAdminEmail(programSlug, email, authHeader, inviteRole);
      setEmailAdmins((prev) =>
        prev.some((a) => a.email === res.data.email) ? prev.map((a) => (a.email === res.data.email ? res.data : a)) : [...prev, res.data],
      );
      setInviteEmail("");
      toast({
        title: inviteRole === "judge" ? "Judge invited" : "Admin invited",
        description: res.emailSent
          ? `Onboarding email sent to ${res.data.email}.`
          : `Added, but no email went out (${res.emailReason ?? "email not configured"}). Share the sign-in link manually.`,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message;
      toast({ title: "Couldn't invite admin", description: msg || "Unknown error", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveEmail = async (admin: ApiProgramAdminEmail) => {
    try {
      const authHeader = await signAuthHeader();
      await api.removeProgramAdminEmail(programSlug, admin.email, authHeader);
      setEmailAdmins((prev) => prev.filter((a) => a.email !== admin.email));
      toast({ title: "Admin removed" });
    } catch (e) {
      const err = e as Error;
      toast({ title: "Couldn't remove admin", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    if (!wallet.trim()) return;
    setAdding(true);
    try {
      const authHeader = await signAuthHeader();
      const res = await api.addProgramAdmin(
        programSlug,
        { wallet: wallet.trim(), walletChain: chain },
        authHeader,
      );
      setAdmins((prev) => {
        if (prev.some((a) => a.wallet === res.data.wallet && a.walletChain === res.data.walletChain)) {
          return prev;
        }
        return [...prev, res.data];
      });
      setWallet("");
      toast({ title: "Admin added" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message;
      toast({
        title: "Couldn't add admin",
        description: msg || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: ApiProgramAdmin) => {
    try {
      const authHeader = await signAuthHeader();
      await api.removeProgramAdmin(programSlug, admin.wallet, admin.walletChain, authHeader);
      setAdmins((prev) =>
        prev.filter((a) => !(a.wallet === admin.wallet && a.walletChain === admin.walletChain)),
      );
      toast({ title: "Admin removed" });
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't remove admin",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isEmpty = admins.length === 0 && emailAdmins.length === 0;

  return (
    <section className="panel p-4 mb-3">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="label-hw text-display">·PROGRAM ADMINS &amp; JUDGES</div>
        <p className="label-hw-dim hidden md:block">
          {editable
            ? "Admins manage the event; judges score submissions. Global admins are always authorized."
            : "Who can administer or judge this program."}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : isEmpty ? (
        <p className="label-hw-dim py-3">No admins or judges yet.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {emailAdmins.map((a) => (
            <li key={`email:${a.email}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-label-mid shrink-0" aria-hidden="true" />
                <span className="truncate font-mono text-[12px] text-display">{a.email}</span>
                <span className="label-hw-dim border border-hairline px-1.5 py-0.5 shrink-0">
                  {a.role === "judge" ? "JUDGE" : "ADMIN"}
                </span>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(a)}
                  aria-label={`Remove ${a.email}`}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-destructive hover:bg-destructive/10 px-2 py-1 inline-flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                  REMOVE
                </button>
              )}
            </li>
          ))}
          {admins.map((a) => (
            <li key={`wallet:${a.walletChain}:${a.wallet}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-label-mid shrink-0" aria-hidden="true" />
                <span className="truncate font-mono text-[12px] text-display">{a.wallet}</span>
                <span className="label-hw-dim border border-hairline px-1.5 py-0.5 shrink-0">
                  {a.walletChain.toUpperCase()} · ADMIN
                </span>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleRemove(a)}
                  aria-label={`Remove ${a.wallet}`}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-destructive hover:bg-destructive/10 px-2 py-1 inline-flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                  REMOVE
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <>
          {/* Invite an admin or judge by email (magic-link onboarding). */}
          <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4 md:flex-row">
            <input
              type="email"
              placeholder="invitee@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="md:flex-1 font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "judge")}
              className="md:w-[120px] font-mono text-[11px] tracking-[0.14em] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
            >
              <option value="admin">ADMIN</option>
              <option value="judge">JUDGE</option>
            </select>
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center justify-center gap-1.5"
            >
              {inviting ? "INVITING…" : "INVITE BY EMAIL"}
            </button>
          </div>

          {/* Add a per-program admin by wallet address. */}
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <input
              placeholder="Wallet address"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="md:flex-1 font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
            />
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value as ChainOption)}
              className="md:w-[140px] font-mono text-[11px] tracking-[0.14em] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
            >
              <option value="substrate">SUBSTRATE</option>
              <option value="ethereum">ETHEREUM</option>
              <option value="solana">SOLANA</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !wallet.trim()}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
            >
              {adding ? "ADDING…" : "ADD ADMIN"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
