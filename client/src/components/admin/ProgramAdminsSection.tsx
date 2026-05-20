import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { api, type ApiProgramAdmin, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type ChainOption = ApiProgramAdmin["walletChain"];

/**
 * Per-event admin management (Phase 3 #95). Lists `program_admins` and lets
 * a global admin assign / remove per-program admins. Non-global admins see
 * the list only — add/remove controls are hidden.
 *
 * Each call is gated on a fresh SIWS signature; the parent passes
 * `signAuthHeader` (typically wired to `useWalletAuth().signAction`).
 */
export function ProgramAdminsSection({
  programSlug,
  signAuthHeader,
  isGlobalAdmin,
}: {
  programSlug: string;
  signAuthHeader: () => Promise<string>;
  isGlobalAdmin: boolean;
}) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<ApiProgramAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wallet, setWallet] = useState("");
  const [chain, setChain] = useState<ChainOption>("substrate");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const authHeader = await signAuthHeader();
      const res = await api.listProgramAdmins(programSlug, authHeader);
      setAdmins(res.data);
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
  }, [programSlug, load]);

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

  return (
    <section className="panel p-4 mb-3">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="label-hw text-display">·PROGRAM ADMINS</div>
        <p className="label-hw-dim hidden md:block">
          Global admins are always authorized; only wallets listed here can administer this program scope.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : admins.length === 0 ? (
        <p className="label-hw-dim py-3">No per-program admins assigned yet.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {admins.map((a) => (
            <li
              key={`${a.walletChain}:${a.wallet}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] text-display">{a.wallet}</p>
                <p className="label-hw-dim">{a.walletChain.toUpperCase()}</p>
              </div>
              {isGlobalAdmin && (
                <button
                  type="button"
                  onClick={() => handleRemove(a)}
                  aria-label={`Remove ${a.wallet}`}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-destructive hover:bg-destructive/10 px-2 py-1 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  REMOVE
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isGlobalAdmin && (
        <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4 md:flex-row">
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
      )}
    </section>
  );
}
