import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, Copy, Check } from "lucide-react";
import { api, type ApiAdminTierEntry, type AdminAuthArg, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type ChainOption = ApiAdminTierEntry["walletChain"];

/**
 * Shared editor for `app_admins` (tier 0) and `global_admins` (tier 1).
 * Identical UI; the parent supplies the API methods to call.
 */
export function AdminTierSection({
  title,
  description,
  emptyHint,
  load,
  add,
  remove,
  signAuthHeader,
}: {
  title: string;
  description?: string;
  emptyHint: string;
  load: (auth: AdminAuthArg) => Promise<{ data: ApiAdminTierEntry[] }>;
  add: (
    payload: Pick<ApiAdminTierEntry, "walletChain" | "wallet" | "label">,
    auth: AdminAuthArg,
  ) => Promise<{ data: ApiAdminTierEntry }>;
  remove: (wallet: string, walletChain: ChainOption, auth: AdminAuthArg) => Promise<void>;
  signAuthHeader: () => Promise<AdminAuthArg>;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ApiAdminTierEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [wallet, setWallet] = useState("");
  const [label, setLabel] = useState("");
  const [chain, setChain] = useState<ChainOption>("substrate");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await signAuthHeader();
      const res = await load(auth);
      setEntries(res.data);
    } catch (e) {
      toast({
        title: `Couldn't load ${title.toLowerCase()}`,
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [load, signAuthHeader, title, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (!wallet.trim()) return;
    setAdding(true);
    try {
      const auth = await signAuthHeader();
      const res = await add(
        { walletChain: chain, wallet: wallet.trim(), label: label.trim() || null },
        auth,
      );
      setEntries((prev) => {
        if (prev.some((a) => a.wallet === res.data.wallet && a.walletChain === res.data.walletChain)) {
          return prev;
        }
        return [...prev, res.data];
      });
      setWallet("");
      setLabel("");
      toast({ title: `${title} added` });
    } catch (e) {
      toast({
        title: `Couldn't add to ${title.toLowerCase()}`,
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCopyInvite = async (entry: ApiAdminTierEntry) => {
    const key = `${entry.walletChain}:${entry.wallet}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://stadium.joinwebzero.com";
    const tierLabel = title.toLowerCase();
    const message =
      `You're an admin on Stadium 🛰️\n\n` +
      `Tier: ${tierLabel}\n` +
      `Chain: ${entry.walletChain}\n` +
      `Wallet: ${entry.wallet}\n` +
      `Sign in: ${origin}/admin\n\n` +
      `If you haven't already, install the wallet extension for your chain (Polkadot-JS, MetaMask, or Phantom) ` +
      `and connect on the admin page. From there you can manage programs, sponsors, and signups.`;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedKey(key);
      toast({ title: "Invite copied to clipboard" });
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Clipboard access denied. Copy the wallet manually.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (entry: ApiAdminTierEntry) => {
    const key = `${entry.walletChain}:${entry.wallet}`;
    if (!confirm(`Remove ${entry.label || entry.wallet}?`)) return;
    setBusyKey(key);
    try {
      const auth = await signAuthHeader();
      await remove(entry.wallet, entry.walletChain, auth);
      setEntries((prev) =>
        prev.filter((a) => !(a.wallet === entry.wallet && a.walletChain === entry.walletChain)),
      );
      toast({ title: `${title} removed` });
    } catch (e) {
      toast({
        title: `Couldn't remove`,
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="panel p-4 mb-3">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="label-hw text-display">·{title.toUpperCase()}</div>
        {description && <p className="label-hw-dim hidden md:block max-w-md text-right">{description}</p>}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <p className="label-hw-dim py-3">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {entries.map((a) => {
            const key = `${a.walletChain}:${a.wallet}`;
            return (
              <li key={key} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] text-display">{a.wallet}</p>
                  <p className="label-hw-dim">
                    {a.walletChain.toUpperCase()}
                    {a.label ? ` · ${a.label}` : ""}
                    {a.addedBy ? ` · ADDED BY ${a.addedBy.toUpperCase()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(a)}
                    aria-label={`Copy invite for ${a.wallet}`}
                    title="Copy a pre-formatted invite message"
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-2 py-1 inline-flex items-center gap-1"
                  >
                    {copiedKey === key ? <Check className="h-3 w-3 text-led" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === key ? "COPIED" : "COPY INVITE"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(a)}
                    disabled={busyKey === key}
                    aria-label={`Remove ${a.wallet}`}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-destructive hover:bg-destructive/10 disabled:opacity-50 px-2 py-1 inline-flex items-center gap-1"
                  >
                    {busyKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    REMOVE
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 grid gap-2 border-t border-hairline pt-4 md:grid-cols-[1fr_140px_160px_auto]">
        <input
          placeholder="Wallet address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
        />
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value as ChainOption)}
          className="font-mono text-[11px] tracking-[0.14em] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
        >
          <option value="substrate">SUBSTRATE</option>
          <option value="ethereum">ETHEREUM</option>
          <option value="solana">SOLANA</option>
        </select>
        <input
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !wallet.trim()}
          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
        >
          {adding ? "ADDING…" : `ADD ${title.toUpperCase()}`}
        </button>
      </div>
    </section>
  );
}
